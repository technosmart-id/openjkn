/**
 * SatuSehat ORPC Router
 * Handles SatuSehat enrollment operations for participants and healthcare facilities
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import * as jknSchema from "@/lib/db/schema/jkn";
import { protectedProcedure } from "../server";
import {
  isConfigured,
  buildPatientResource,
  buildOrganizationResource,
  buildCoverageResource,
  buildRelatedPersonResource,
  buildEnrollmentBundle,
  upsertPatient,
  upsertOrganization,
  upsertCoverage,
  upsertRelatedPerson,
  executeBundle,
  searchPatientByNIK,
  searchPatientByBPJS,
  searchOrganizationByCode,
  searchPractitionerByNIK,
  upsertLocation,
  upsertEncounter,
  buildEncounterResource,
  buildLocationResource,
  type SatuSehatError,
  type FHIRPatient,
  type FHIOrganization,
} from "@/lib/satusehat";

const satusehatResourceTypeEnum = z.enum(["Patient", "Organization", "Coverage", "RelatedPerson"]);
const satusehatSyncStatusEnum = z.enum(["PENDING", "SYNCED", "FAILED", "UPDATE_NEEDED"]);

// Input schemas
const enrollParticipantInputSchema = z.object({
  participantId: z.number(),
  includeCoverage: z.boolean().default(true),
  syncFamilyMembers: z.boolean().default(false),
  force: z.boolean().default(false),
});

const enrollFacilityInputSchema = z.object({
  facilityId: z.number(),
});

const syncParticipantInputSchema = z.object({
  participantId: z.number(),
  force: z.boolean().default(false),
});

const searchPatientInputSchema = z.object({
  identifier: z.string(),
  type: z.enum(["nik", "bpjs"]),
});

// Helper function to check if SatuSehat is configured
function checkConfiguration() {
  if (!isConfigured()) {
    throw new Error(
      "SatuSehat is not configured. Please set SATUSEHAT_CLIENT_ID and SATUSEHAT_CLIENT_SECRET environment variables."
    );
  }
}

// Helper function to map JKN participant to FHIR data
function mapParticipantToFHIR(participant: any) {
  return {
    id: participant.id,
    identityNumber: participant.identityNumber,
    familyCardNumber: participant.familyCardNumber,
    firstName: participant.firstName,
    lastName: participant.lastName,
    nameOnCard: participant.nameOnCard,
    bpjsNumber: participant.bpjsNumber,
    gender: participant.gender,
    birthPlace: participant.birthPlace,
    birthDate: new Date(participant.birthDate),
    religion: participant.religion,
    maritalStatus: participant.maritalStatus,
    phoneNumber: participant.phoneNumber,
    email: participant.email,
    addressStreet: participant.addressStreet,
    addressRt: participant.addressRt,
    addressRw: participant.addressRw,
    addressVillage: participant.addressVillage,
    addressDistrict: participant.addressDistrict,
    addressCity: participant.addressCity,
    addressProvince: participant.addressProvince,
    addressPostalCode: participant.addressPostalCode,
    participantSegment: participant.participantSegment,
    treatmentClass: participant.treatmentClass,
    satusehatId: participant.satusehatId,
  };
}

function mapFacilityToFHIR(facility: any) {
  return {
    id: facility.id,
    code: facility.code,
    name: facility.name,
    type: facility.type,
    class: facility.class,
    address: facility.address,
    village: facility.village,
    district: facility.district,
    city: facility.city,
    province: facility.province,
    postalCode: facility.postalCode,
    phoneNumber: facility.phoneNumber,
    email: facility.email,
    satusehatId: facility.satusehatId,
  };
}

function mapFamilyMemberToFHIR(member: any) {
  return {
    id: member.id,
    identityNumber: member.identityNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    relationship: member.relationship,
    pisaCode: member.pisaCode,
    gender: member.gender,
    birthPlace: member.birthPlace,
    birthDate: new Date(member.birthDate),
    phoneNumber: member.phoneNumber,
    email: member.email,
    bpjsNumber: member.bpjsNumber,
    headOfFamilyIdentityNumber: member.headOfFamilyIdentityNumber || "", // Will be filled separately
    satusehatId: member.satusehatId,
  };
}

export const satusehatRouter = {
  // Health check
  healthCheck: protectedProcedure.handler(async () => {
    return {
      configured: isConfigured(),
      message: isConfigured()
        ? "SatuSehat integration is configured and ready"
        : "SatuSehat integration is not configured",
    };
  }),

  // Enroll a participant to SatuSehat
  enrollParticipant: protectedProcedure
    .input(enrollParticipantInputSchema)
    .handler(async ({ input }) => {
      checkConfiguration();

      // Get participant data
      const participant = await db.query.participant.findFirst({
        where: eq(jknSchema.participant.id, input.participantId),
      });

      if (!participant) {
        throw new Error("Participant not found");
      }

      const participantData = mapParticipantToFHIR(participant);

      // Check if already synced
      if (participant.satusehatId && !input.force) {
        return {
          success: true,
          message: "Participant already enrolled in SatuSehat",
          satusehatId: participant.satusehatId,
          resourceType: "Patient",
        };
      }

      // Fetch family members if requested
      let familyMembers: any[] = [];
      if (input.syncFamilyMembers) {
        familyMembers = await db.query.familyMember.findMany({
          where: eq(jknSchema.familyMember.headOfFamilyId, input.participantId),
        });
      }

      try {
        // Build FHIR Patient resource
        const patientResource = buildPatientResource(participantData, {
          existingSatusehatId: participant.satusehatId || undefined,
        });

        // Create/update patient in SatuSehat
        const patientResult = await upsertPatient(patientResource);

        // Update local database with SatuSehat ID
        await db
          .update(jknSchema.participant)
          .set({ satusehatId: patientResult.id })
          .where(eq(jknSchema.participant.id, input.participantId));

        // Create sync record
        await db.insert(jknSchema.satusehatSync).values({
          participantId: input.participantId,
          resourceType: "Patient",
          satusehatResourceId: patientResult.id,
          satusehatUrl: `${process.env.SATUSEHAT_API_URL}/Patient/${patientResult.id}`,
          status: "SYNCED",
          lastSyncedAt: new Date(),
        });

        const results: {
          patient: { id: string; resourceType: string };
          coverage?: { id: string; resourceType: string };
          relatedPersons?: Array<{
            id: string;
            resourceType: string;
            familyMemberId: number;
          }>;
        } = {
          patient: {
            id: patientResult.id,
            resourceType: "Patient",
          },
        };

        // Optionally create Coverage resource
        if (input.includeCoverage) {
          const coverageResource = buildCoverageResource(
            participantData,
            {
              reference: `Patient/${patientResult.id}`,
            } as any,
            {
              subscriberId: participant.bpjsNumber || undefined,
            }
          );

          try {
            const coverageResult = await upsertCoverage(coverageResource);
            results.coverage = {
              id: coverageResult.id,
              resourceType: "Coverage",
            };

            // Create sync record for coverage
            await db.insert(jknSchema.satusehatSync).values({
              participantId: input.participantId,
              resourceType: "Coverage",
              satusehatResourceId: coverageResult.id,
              satusehatUrl: `${process.env.SATUSEHAT_API_URL}/Coverage/${coverageResult.id}`,
              status: "SYNCED",
              lastSyncedAt: new Date(),
            });
          } catch (error) {
            // Log but don't fail the entire operation
            console.error("Failed to create coverage:", error);
          }
        }

        // Sync family members if requested
        if (input.syncFamilyMembers && familyMembers.length > 0) {
          results.relatedPersons = [];

          for (const member of familyMembers) {
            const memberData = mapFamilyMemberToFHIR({
              ...member,
              headOfFamilyIdentityNumber: participant.identityNumber,
            });

            const relatedPersonResource = buildRelatedPersonResource(
              memberData,
              {
                reference: `Patient/${patientResult.id}`,
              } as any,
              {
                existingSatusehatId: member.satusehatId || undefined,
              }
            );

            try {
              const relatedPersonResult = await upsertRelatedPerson(
                relatedPersonResource
              );

              // Update family member with SatuSehat ID
              await db
                .update(jknSchema.familyMember)
                .set({ satusehatId: relatedPersonResult.id })
                .where(eq(jknSchema.familyMember.id, member.id));

              // Create sync record
              await db.insert(jknSchema.satusehatSync).values({
                familyMemberId: member.id,
                resourceType: "RelatedPerson",
                satusehatResourceId: relatedPersonResult.id,
                satusehatUrl: `${process.env.SATUSEHAT_API_URL}/RelatedPerson/${relatedPersonResult.id}`,
                status: "SYNCED",
                lastSyncedAt: new Date(),
              });

              results.relatedPersons!.push({
                id: relatedPersonResult.id,
                resourceType: "RelatedPerson",
                familyMemberId: member.id,
              });
            } catch (error) {
              console.error(`Failed to sync family member ${member.id}:`, error);
            }
          }
        }

        return {
          success: true,
          message: "Participant successfully enrolled in SatuSehat",
          results,
        };
      } catch (error) {
        // Create failed sync record
        await db.insert(jknSchema.satusehatSync).values({
          participantId: input.participantId,
          resourceType: "Patient",
          satusehatResourceId: "",
          status: "FAILED",
          lastSyncedAt: new Date(),
          lastSyncError: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof Error && error.name === "SatuSehatError") {
          throw error;
        }
        throw new Error(
          `Failed to enroll participant in SatuSehat: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // Enroll a healthcare facility to SatuSehat
  enrollFacility: protectedProcedure
    .input(enrollFacilityInputSchema)
    .handler(async ({ input }) => {
      checkConfiguration();

      // Get facility data
      const facility = await db.query.healthcareFacility.findFirst({
        where: eq(jknSchema.healthcareFacility.id, input.facilityId),
      });

      if (!facility) {
        throw new Error("Healthcare facility not found");
      }

      const facilityData = mapFacilityToFHIR(facility);

      // Check if already synced
      if (facility.satusehatId) {
        return {
          success: true,
          message: "Facility already enrolled in SatuSehat",
          satusehatId: facility.satusehatId,
          resourceType: "Organization",
        };
      }

      try {
        // Build FHIR Organization resource
        const organizationResource = buildOrganizationResource(facilityData, {
          existingSatusehatId: facility.satusehatId || undefined,
        });

        // Create/update organization in SatuSehat
        const organizationResult = await upsertOrganization(organizationResource);

        // Update local database with SatuSehat ID
        await db
          .update(jknSchema.healthcareFacility)
          .set({ satusehatId: organizationResult.id })
          .where(eq(jknSchema.healthcareFacility.id, input.facilityId));

        // Create sync record
        await db.insert(jknSchema.satusehatSync).values({
          healthcareFacilityId: input.facilityId,
          resourceType: "Organization",
          satusehatResourceId: organizationResult.id,
          satusehatUrl: `${process.env.SATUSEHAT_API_URL}/Organization/${organizationResult.id}`,
          status: "SYNCED",
          lastSyncedAt: new Date(),
        });

        return {
          success: true,
          message: "Facility successfully enrolled in SatuSehat",
          satusehatId: organizationResult.id,
          resourceType: "Organization",
        };
      } catch (error) {
        // Create failed sync record
        await db.insert(jknSchema.satusehatSync).values({
          healthcareFacilityId: input.facilityId,
          resourceType: "Organization",
          satusehatResourceId: "",
          status: "FAILED",
          lastSyncedAt: new Date(),
          lastSyncError: error instanceof Error ? error.message : String(error),
        });

        throw new Error(
          `Failed to enroll facility in SatuSehat: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // Sync/update an existing participant in SatuSehat
  syncParticipant: protectedProcedure
    .input(syncParticipantInputSchema)
    .handler(async ({ input }) => {
      checkConfiguration();

      const participant = await db.query.participant.findFirst({
        where: eq(jknSchema.participant.id, input.participantId),
      });

      if (!participant) {
        throw new Error("Participant not found");
      }

      if (!participant.satusehatId) {
        throw new Error("Participant not enrolled in SatuSehat. Use enrollParticipant first.");
      }

      const participantData = mapParticipantToFHIR(participant);

      try {
        const patientResource = buildPatientResource(participantData, {
          existingSatusehatId: participant.satusehatId,
        });

        const result = await upsertPatient(patientResource);

        // Update sync record
        await db
          .update(jknSchema.satusehatSync)
          .set({
            status: "SYNCED",
            lastSyncedAt: new Date(),
            lastSyncError: null,
            syncVersion: sql`syncVersion + 1`,
          })
          .where(
            and(
              eq(jknSchema.satusehatSync.participantId, input.participantId),
              eq(jknSchema.satusehatSync.resourceType, "Patient")
            )
          );

        return {
          success: true,
          message: "Participant successfully synced to SatuSehat",
          satusehatId: result.id,
        };
      } catch (error) {
        // Update sync record as failed
        await db
          .update(jknSchema.satusehatSync)
          .set({
            status: "FAILED",
            lastSyncedAt: new Date(),
            lastSyncError: error instanceof Error ? error.message : String(error),
          })
          .where(
            and(
              eq(jknSchema.satusehatSync.participantId, input.participantId),
              eq(jknSchema.satusehatSync.resourceType, "Patient")
            )
          );

        throw new Error(
          `Failed to sync participant to SatuSehat: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // Search for a patient in SatuSehat
  searchPatient: protectedProcedure
    .input(searchPatientInputSchema)
    .handler(async ({ input }) => {
      checkConfiguration();

      try {
        const patient =
          input.type === "nik"
            ? await searchPatientByNIK(input.identifier)
            : await searchPatientByBPJS(input.identifier);

        if (!patient) {
          return {
            found: false,
            patient: null,
          };
        }

        return {
          found: true,
          patient: {
            id: patient.id,
            identifier: patient.identifier,
            name: patient.name,
            gender: patient.gender,
            birthDate: patient.birthDate,
            telecom: patient.telecom,
            address: patient.address,
          },
        };
      } catch (error) {
        throw new Error(
          `Failed to search patient: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // Get sync status for a participant
  getSyncStatus: protectedProcedure
    .input(z.object({ participantId: z.number() }))
    .handler(async ({ input }) => {
      const syncRecords = await db.query.satusehatSync.findMany({
        where: eq(jknSchema.satusehatSync.participantId, input.participantId),
        orderBy: [desc(jknSchema.satusehatSync.lastSyncedAt)],
      });

      const participant = await db.query.participant.findFirst({
        where: eq(jknSchema.participant.id, input.participantId),
      });

      return {
        satusehatId: participant?.satusehatId ?? null,
        syncRecords,
        summary: {
          total: syncRecords.length,
          synced: syncRecords.filter((r) => r.status === "SYNCED").length,
          failed: syncRecords.filter((r) => r.status === "FAILED").length,
          pending: syncRecords.filter((r) => r.status === "PENDING").length,
        },
      };
    }),

  // Get sync status for a facility
  getFacilitySyncStatus: protectedProcedure
    .input(z.object({ facilityId: z.number() }))
    .handler(async ({ input }) => {
      const syncRecords = await db.query.satusehatSync.findMany({
        where: eq(jknSchema.satusehatSync.healthcareFacilityId, input.facilityId),
        orderBy: [desc(jknSchema.satusehatSync.lastSyncedAt)],
      });

      const facility = await db.query.healthcareFacility.findFirst({
        where: eq(jknSchema.healthcareFacility.id, input.facilityId),
      });

      return {
        satusehatId: facility?.satusehatId ?? null,
        syncRecords,
      };
    }),

  // List all sync records with filtering
  listSyncRecords: protectedProcedure
    .input(
      z.object({
        status: satusehatSyncStatusEnum.optional(),
        resourceType: satusehatResourceTypeEnum.optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .handler(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      const conditions: ReturnType<typeof eq | typeof sql>[] = [];

      if (input.status) {
        conditions.push(eq(jknSchema.satusehatSync.status, input.status));
      }

      if (input.resourceType) {
        conditions.push(eq(jknSchema.satusehatSync.resourceType, input.resourceType));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(jknSchema.satusehatSync)
          .where(whereClause)
          .orderBy(desc(jknSchema.satusehatSync.lastSyncedAt))
          .limit(input.limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(jknSchema.satusehatSync)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.count || 0;

      return {
        data,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
  // Trigger Encounter Proof of Concept
  triggerEncounterPOC: protectedProcedure
    .input(
      z.object({
        participantId: z.number(),
        doctorNik: z.string(),
        facilityId: z.number(),
        locationName: z.string().default("Poli Umum"),
      })
    )
    .handler(async ({ input }) => {
      checkConfiguration();

      const results: any = {
        steps: [],
      };

      try {
        // Step 1: Organization (Your Facility)
        const facility = await db.query.healthcareFacility.findFirst({
          where: eq(jknSchema.healthcareFacility.id, input.facilityId),
        });

        if (!facility) throw new Error("Facility not found");

        let facilitySatusehatId = facility.satusehatId;

        if (!facilitySatusehatId) {
          console.log(`Auto-enrolling facility ${facility.name} (${facility.code}) to SatuSehat...`);
          const facilityData = mapFacilityToFHIR(facility);
          const organizationResource = buildOrganizationResource(facilityData, {});
          const organizationResult = await upsertOrganization(organizationResource);

          facilitySatusehatId = organizationResult.id;

          // Update local database
          await db
            .update(jknSchema.healthcareFacility)
            .set({ satusehatId: facilitySatusehatId })
            .where(eq(jknSchema.healthcareFacility.id, input.facilityId));

          // Create sync record
          await db.insert(jknSchema.satusehatSync).values({
            healthcareFacilityId: input.facilityId,
            resourceType: "Organization",
            satusehatResourceId: facilitySatusehatId,
            satusehatUrl: `${process.env.SATUSEHAT_API_URL}/Organization/${facilitySatusehatId}`,
            status: "SYNCED",
            lastSyncedAt: new Date(),
          });
        }

        results.steps.push({
          step: 1,
          name: "Organization Reference",
          id: facilitySatusehatId,
          status: "SUCCESS",
        });

        // Step 2: Location (The Room/Polyclinic)
        const locationResource = buildLocationResource(
          mapFacilityToFHIR(facility),
          input.locationName
        );
        const locationResult = await upsertLocation(locationResource);
        results.steps.push({
          step: 2,
          name: "Location POST",
          id: locationResult.id,
          status: "SUCCESS",
        });

        // Step 3: Patient (The Subject)
        const participant = await db.query.participant.findFirst({
          where: eq(jknSchema.participant.id, input.participantId),
        });
        if (!participant) throw new Error("Participant not found");

        const patientResult = await searchPatientByNIK(
          participant.identityNumber
        );
        if (!patientResult)
          throw new Error(
            `Patient with NIK ${participant.identityNumber} not found in SatuSehat`
          );

        results.steps.push({
          step: 3,
          name: "Patient GET",
          id: patientResult.id,
          status: "SUCCESS",
        });

        // Step 4: Practitioner (The Doctor)
        const practitionerResult = await searchPractitionerByNIK(input.doctorNik);
        if (!practitionerResult)
          throw new Error(
            `Practitioner with NIK ${input.doctorNik} not found in SatuSehat`
          );

        results.steps.push({
          step: 4,
          name: "Practitioner GET",
          id: practitionerResult.id,
          status: "SUCCESS",
        });

        // Final Step: The Encounter Resource
        const encounterResource = buildEncounterResource({
          patientId: patientResult.id!,
          practitionerId: practitionerResult.id!,
          organizationId: facilitySatusehatId!,
          locationId: locationResult.id,
          status: "arrived",
        });

        const encounterResult = await upsertEncounter(encounterResource);

        // Record the sync
        await db.insert(jknSchema.satusehatSync).values({
          participantId: input.participantId,
          healthcareFacilityId: input.facilityId,
          resourceType: "Encounter",
          satusehatResourceId: encounterResult.id,
          satusehatUrl: `${process.env.SATUSEHAT_API_URL}/Encounter/${encounterResult.id}`,
          status: "SYNCED",
          lastSyncedAt: new Date(),
        });

        return {
          success: true,
          message: "Encounter POC triggered successfully",
          encounterId: encounterResult.id,
          details: results.steps,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error in POC",
          details: results.steps,
        };
      }
    }),
};

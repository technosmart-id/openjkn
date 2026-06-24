/**
 * FHIR Resource Builders for SatuSehat Integration
 * Maps JKN data models to FHIR R4 resources
 */

import type {
  FHIRAddress,
  FHIRBundleEntry,
  FHIRContactPoint,
  FHIRCoverage,
  FHIREncounter,
  FHIRHumanName,
  FHIRIdentifier,
  FHIRLocation,
  FHIRMeta,
  FHIOrganization,
  FHIRPatient,
  FHIRReference,
  FHIRRelatedPerson,
} from "./fhir-types";
import {
  SATUSEHAT_CODES,
  SATUSEHAT_SYSTEMS,
} from "./fhir-types";

// JKN data types (from schema)
export type JKNGender = "LAKI_LAKI" | "PEREMPUAN";
export type JKNMaritalStatus = "KAWIN" | "BELUM_KAWIN" | "JANDA" | "DUDA";
export type JKNRelationship =
  | "SUAMI"
  | "ISTRI"
  | "ANAK_TANGGUNGAN"
  | "ANAK_TIDAK_TANGGUNGAN"
  | "ORANG_TUA"
  | "FAMILY_LAIN";

export interface JKNParticipantData {
  id: number;
  identityNumber: string;
  familyCardNumber: string;
  firstName: string;
  lastName?: string | null;
  nameOnCard?: string | null;
  bpjsNumber?: string | null;
  gender: JKNGender;
  birthPlace: string;
  birthDate: Date;
  religion: string;
  maritalStatus: JKNMaritalStatus;
  phoneNumber?: string | null;
  email?: string | null;
  addressStreet?: string | null;
  addressRt?: string | null;
  addressRw?: string | null;
  addressVillage?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressPostalCode?: string | null;
  participantSegment: string;
  treatmentClass: string;
  satusehatId?: string | null;
}

export interface JKNFamilyMemberData {
  id: number;
  identityNumber: string;
  firstName: string;
  lastName?: string | null;
  relationship: JKNRelationship;
  pisaCode: string;
  gender: JKNGender;
  birthPlace: string;
  birthDate: Date;
  phoneNumber?: string | null;
  email?: string | null;
  bpjsNumber?: string | null;
  headOfFamilyIdentityNumber: string;
  satusehatId?: string | null;
}

export interface JKNHealthcareFacilityData {
  id: number;
  code: string;
  name: string;
  type: string;
  class?: string | null;
  address?: string | null;
  village?: string | null;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  satusehatId?: string | null;
}

/**
 * Map JKN gender to FHIR gender
 */
export function mapGender(gender: JKNGender): "male" | "female" | "other" | "unknown" {
  return gender === "LAKI_LAKI" ? "male" : "female";
}

/**
 * Map JKN marital status to FHIR marital status
 */
export function mapMaritalStatus(
  status: JKNMaritalStatus
): { coding: Array<{ system: string; code: string; display: string }> } | null {
  const mapping: Record<JKNMaritalStatus, string> = {
    KAWIN: "M",
    BELUM_KAWIN: "S",
    JANDA: "W",
    DUDA: "D",
  };

  const code = mapping[status];
  if (!code) return null;

  return {
    coding: [
      {
        system: SATUSEHAT_SYSTEMS.MARITAL_STATUS,
        code,
        display: status,
      },
    ],
  };
}

/**
 * Build FHIR identifiers for a patient
 */
export function buildPatientIdentifiers(
  data: Pick<
    JKNParticipantData,
    "identityNumber" | "bpjsNumber" | "familyCardNumber"
  >
): FHIRIdentifier[] {
  const identifiers: FHIRIdentifier[] = [];

  // NIK (Nomor Induk Kependudukan) - Primary identifier
  identifiers.push({
    system: SATUSEHAT_SYSTEMS.NIK,
    value: data.identityNumber,
    use: "official",
  });

  // BPJS Number
  if (data.bpjsNumber) {
    identifiers.push({
      system: SATUSEHAT_SYSTEMS.BPJS,
      value: data.bpjsNumber,
      use: "usual",
    });
  }

  // Family Card Number (No. KK)
  identifiers.push({
    system: "https://fhir.kemkes.go.id/id/kartu-keluarga",
    value: data.familyCardNumber,
    use: "secondary",
  });

  return identifiers;
}

/**
 * Build FHIR human name for a patient
 */
export function buildPatientName(
  data: Pick<JKNParticipantData, "firstName" | "lastName" | "nameOnCard">
): FHIRHumanName[] {
  const givenNames = data.firstName ? [data.firstName] : [];
  const family = data.lastName || undefined;
  const text = data.nameOnCard || `${data.firstName} ${data.lastName || ""}`.trim();

  return [
    {
      use: "official",
      text,
      given: givenNames.length > 0 ? givenNames : undefined,
      family,
    },
  ];
}

/**
 * Build FHIR contact points (phone, email)
 */
export function buildContactPoints(
  data: Pick<JKNParticipantData, "phoneNumber" | "email">
): FHIRContactPoint[] {
  const contacts: FHIRContactPoint[] = [];

  if (data.phoneNumber) {
    contacts.push({
      system: "phone",
      value: data.phoneNumber,
      use: "mobile",
    });
  }

  if (data.email) {
    contacts.push({
      system: "email",
      value: data.email,
      use: "home",
    });
  }

  return contacts;
}

/**
 * Build FHIR address for a patient
 */
export function buildAddress(
  data: Pick<
    JKNParticipantData,
    | "addressStreet"
    | "addressRt"
    | "addressRw"
    | "addressVillage"
    | "addressDistrict"
    | "addressCity"
    | "addressProvince"
    | "addressPostalCode"
  >
): FHIRAddress | undefined {
  const lines: string[] = [];
  if (data.addressStreet) lines.push(data.addressStreet);
  if (data.addressRt || data.addressRw) {
    lines.push(`RT ${data.addressRt || ""}/RW ${data.addressRw || ""}`.trim());
  }

  if (lines.length === 0 && !data.addressCity && !data.addressProvince) {
    return undefined;
  }

  return {
    use: "home",
    type: "physical",
    line: lines.length > 0 ? lines : undefined,
    city: data.addressCity ?? undefined,
    district: data.addressDistrict ?? undefined,
    state: data.addressProvince ?? undefined,
    postalCode: data.addressPostalCode ?? undefined,
    country: "ID", // Indonesia
  };
}

/**
 * Build FHIR Meta for SatuSehat
 */
export function buildMeta(lastUpdated?: Date): FHIRMeta {
  const meta: FHIRMeta = {
    profile: [
      "https://fhir.kemkes.go.id/r4/StructureDefinition/Patient", // Patient profile
    ],
  };

  if (lastUpdated) {
    meta.lastUpdated = lastUpdated.toISOString();
  }

  return meta;
}

/**
 * Build a complete FHIR Patient resource from JKN participant data
 */
export function buildPatientResource(
  data: JKNParticipantData,
  options?: { existingSatusehatId?: string }
): FHIRPatient {
  const patient: FHIRPatient = {
    resourceType: "Patient",
    id: options?.existingSatusehatId || undefined,
    meta: buildMeta(),
    identifier: buildPatientIdentifiers(data),
    name: buildPatientName(data),
    gender: mapGender(data.gender),
    birthDate: data.birthDate.toISOString().split("T")[0],
  };

  // Add contact points
  const contacts = buildContactPoints(data);
  if (contacts.length > 0) {
    patient.telecom = contacts;
  }

  // Add address
  const address = buildAddress(data);
  if (address) {
    patient.address = [address];
  }

  // Add marital status
  const maritalStatus = mapMaritalStatus(data.maritalStatus);
  if (maritalStatus) {
    patient.maritalStatus = {
      coding: [maritalStatus as any],
      text: data.maritalStatus,
    };
  }

  return patient;
}

/**
 * Build a FHIR Organization resource for healthcare facilities
 */
export function buildOrganizationResource(
  data: JKNHealthcareFacilityData,
  options?: { existingSatusehatId?: string }
): FHIOrganization {
  const organization: FHIOrganization = {
    resourceType: "Organization",
    id: options?.existingSatusehatId || undefined,
    meta: {
      profile: [
        "https://fhir.kemkes.go.id/r4/StructureDefinition/Organization", // Organization profile
      ],
    },
    identifier: [
      {
        system: SATUSEHAT_SYSTEMS.FACILITY_ID,
        value: data.code,
        use: "official",
      },
    ],
    name: data.name,
    active: true,
    type: [
      {
        coding: [
          {
            system: SATUSEHAT_SYSTEMS.ORGANIZATION_TYPE,
            code: "fac",
            display: "Fasilitas Kesehatan",
          },
        ],
        text: data.type,
      },
    ],
  };

  // Add contact points
  const contacts: FHIRContactPoint[] = [];
  if (data.phoneNumber) {
    contacts.push({
      system: "phone",
      value: data.phoneNumber,
      use: "work",
    });
  }
  if (data.email) {
    contacts.push({
      system: "email",
      value: data.email,
      use: "work",
    });
  }
  if (contacts.length > 0) {
    organization.telecom = contacts;
  }

  // Add address
  if (data.address || data.city || data.province) {
    const lines: string[] = [];
    if (data.address) lines.push(data.address);

    organization.address = [
      {
        use: "work",
        type: "physical",
        line: lines.length > 0 ? lines : undefined,
        city: data.city ?? undefined,
        district: data.district ?? undefined,
        state: data.province ?? undefined,
        postalCode: data.postalCode ?? undefined,
        country: "ID",
      },
    ];
  }

  return organization;
}

/**
 * Build a FHIR Coverage resource for JKN insurance
 */
export function buildCoverageResource(
  participantData: JKNParticipantData,
  patientReference: FHIRReference,
  options?: { subscriberId?: string; existingSatusehatId?: string }
): FHIRCoverage {
  const coverage: FHIRCoverage = {
    resourceType: "Coverage",
    id: options?.existingSatusehatId || undefined,
    meta: {
      profile: [
        "https://fhir.kemkes.go.id/r4/StructureDefinition/Coverage", // Coverage profile
      ],
    },
    status: "active",
    type: {
      coding: [
        {
          system: SATUSEHAT_SYSTEMS.COVERAGE_TYPE,
          code: "jkn", // Jaminan Kesehatan Nasional
          display: "Jaminan Kesehatan Nasional",
        },
      ],
    },
    beneficiary: patientReference,
    payor: [
      {
        reference: "Organization/1000", // BPJS Kesehatan organization reference
        display: "BPJS Kesehatan",
      },
    ],
  };

  // Add subscriber ID (BPJS number if available)
  if (options?.subscriberId || participantData.bpjsNumber) {
    coverage.subscriberId = options?.subscriberId || participantData.bpjsNumber || undefined;
    coverage.subscriber = patientReference;
    coverage.policyHolder = patientReference;
  }

  // Add class for treatment class (Kelas Rawat)
  coverage.class = [
    {
      type: {
        coding: [
          {
            system: SATUSEHAT_SYSTEMS.COVERAGE_CLASS,
            code: "kelas-rawat",
            display: "Kelas Rawat",
          },
        ],
      },
      value: participantData.treatmentClass,
      name: `Kelas ${participantData.treatmentClass}`,
    },
  ];

  // Add relationship based on participant segment
  if (participantData.participantSegment) {
    coverage.relationship = {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
          code: "self",
          display: participantData.participantSegment,
        },
      ],
      text: participantData.participantSegment,
    };
  }

  return coverage;
}

/**
 * Build a FHIR RelatedPerson resource for family members
 */
export function buildRelatedPersonResource(
  familyMemberData: JKNFamilyMemberData,
  patientReference: FHIRReference,
  options?: { existingSatusehatId?: string }
): FHIRRelatedPerson {
  const relatedPerson: FHIRRelatedPerson = {
    resourceType: "RelatedPerson",
    id: options?.existingSatusehatId || undefined,
    meta: {
      profile: [
        "https://fhir.kemkes.go.id/r4/StructureDefinition/RelatedPerson", // RelatedPerson profile
      ],
    },
    patient: patientReference,
    active: true,
    gender: mapGender(familyMemberData.gender),
    birthDate: familyMemberData.birthDate.toISOString().split("T")[0],
  };

  // Add identifier
  relatedPerson.identifier = [
    {
      system: SATUSEHAT_SYSTEMS.NIK,
      value: familyMemberData.identityNumber,
      use: "official",
    },
  ];

  if (familyMemberData.bpjsNumber) {
    relatedPerson.identifier?.push({
      system: SATUSEHAT_SYSTEMS.BPJS,
      value: familyMemberData.bpjsNumber,
      use: "usual",
    });
  }

  // Add name
  const givenNames = familyMemberData.firstName ? [familyMemberData.firstName] : [];
  const family = familyMemberData.lastName || undefined;
  relatedPerson.name = [
    {
      use: "official",
      given: givenNames.length > 0 ? givenNames : undefined,
      family,
    },
  ];

  // Add contact points
  const contacts: FHIRContactPoint[] = [];
  if (familyMemberData.phoneNumber) {
    contacts.push({
      system: "phone",
      value: familyMemberData.phoneNumber ?? "",
      use: "mobile",
    });
  }
  if (familyMemberData.email) {
    contacts.push({
      system: "email",
      value: familyMemberData.email ?? "",
      use: "home",
    });
  }
  if (contacts.length > 0) {
    relatedPerson.telecom = contacts;
  }

  // Add relationship mapping
  const relationshipMap: Record<JKNRelationship, string> = {
    SUAMI: "husband",
    ISTRI: "spouse",
    ANAK_TANGGUNGAN: "child",
    ANAK_TIDAK_TANGGUNGAN: "child",
    ORANG_TUA: "parent",
    FAMILY_LAIN: "other",
  };

  const relationshipCode = relationshipMap[familyMemberData.relationship] || "other";
  relatedPerson.relationship = [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
          code: relationshipCode,
          display: familyMemberData.relationship,
        },
      ],
      text: familyMemberData.relationship,
    },
  ];

  return relatedPerson;
}

/**
 * Create a Bundle entry for a resource
 */
export function createBundleEntry(
  resource: FHIRPatient | FHIOrganization | FHIRCoverage | FHIRRelatedPerson,
  requestMethod: "POST" | "PUT" = "POST",
  fullPath?: string
): FHIRBundleEntry {
  const entry: FHIRBundleEntry = {
    resource,
    request: {
      method: requestMethod,
      url: resource.resourceType + (resource.id ? `/${resource.id}` : ""),
    },
  };

  if (fullPath) {
    entry.fullUrl = fullPath;
  }

  return entry;
}

/**
 * Build a transaction bundle for enrolling a participant with family members
 */
export function buildEnrollmentBundle(
  patient: FHIRPatient,
  organization?: FHIOrganization,
  coverage?: FHIRCoverage,
  relatedPersons?: FHIRRelatedPerson[]
): {
  resourceType: string;
  type: string;
  entry: FHIRBundleEntry[];
} {
  const entries: FHIRBundleEntry[] = [];

  // Add patient
  entries.push(createBundleEntry(patient, patient.id ? "PUT" : "POST"));

  // Add organization if provided
  if (organization) {
    entries.push(createBundleEntry(organization, organization.id ? "PUT" : "POST"));
  }

  // Add coverage if provided
  if (coverage) {
    entries.push(createBundleEntry(coverage, coverage.id ? "PUT" : "POST"));
  }

  // Add related persons if provided
  if (relatedPersons) {
    for (const relatedPerson of relatedPersons) {
      entries.push(createBundleEntry(relatedPerson, relatedPerson.id ? "PUT" : "POST"));
    }
  }

  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries,
  };
}

/**
 * Build a FHIR Location resource for a clinic room/poly
 */
export function buildLocationResource(
  facilityData: JKNHealthcareFacilityData,
  locationName: string,
  options?: { existingSatusehatId?: string }
): FHIRLocation {
  const location: FHIRLocation = {
    resourceType: "Location",
    id: options?.existingSatusehatId || undefined,
    status: "active",
    name: locationName,
    mode: "instance",
    physicalType: {
      coding: [
        {
          system: SATUSEHAT_SYSTEMS.LOCATION_PHYSICAL_TYPE,
          code: "ro",
          display: "Room",
        },
      ],
    },
    managingOrganization: {
      reference: `Organization/${facilityData.satusehatId || "1000"}`,
      display: facilityData.name,
    },
  };

  return location;
}

/**
 * Build a FHIR Encounter resource (Arrived/In-Progress)
 */
export function buildEncounterResource(data: {
  patientId: string;
  practitionerId: string;
  organizationId: string;
  locationId: string;
  status?: "arrived" | "in-progress";
  startTime?: Date;
}): FHIREncounter {
  const startTime = data.startTime || new Date();

  const encounter: FHIREncounter = {
    resourceType: "Encounter",
    status: data.status || "arrived",
    class: {
      system: SATUSEHAT_SYSTEMS.ENCOUNTER_CLASS,
      code: "AMB",
      display: "ambulatory",
    },
    subject: {
      reference: `Patient/${data.patientId}`,
    },
    participant: [
      {
        individual: {
          reference: `Practitioner/${data.practitionerId}`,
        },
      },
    ],
    period: {
      start: startTime.toISOString(),
    },
    location: [
      {
        location: {
          reference: `Location/${data.locationId}`,
        },
      },
    ],
    serviceProvider: {
      reference: `Organization/${data.organizationId}`,
    },
  };

  return encounter;
}

/**
 * FHIR R4 Resource Types for SatuSehat Integration
 * Based on https://hl7.org/fhir/R4/ and SatuSehat API specifications
 */

// FHIR Primitive Types
export type FHIRId = string;
export type FHIRUri = string;
export type FHIRUrl = string;
export type FHIRCanonical = string;
export type FHIRBase64Binary = string;
export type FHIRInstant = string;
export type FHIRDate = string;
export type FHIRDateTime = string;
export type FHIRTime = string;
export type FHIRCode = string;
export type FHIROid = string;
export type FHIRIdType = string;
export type FHIRUnsignedInt = number;
export type FHIRPositiveInt = number;
export type FHIRMarkdown = string;
export type FHIRUnsignedLong = string;

// FHIR Data Types
export interface FHIRIdentifier {
  id?: string;
  use?: "usual" | "official" | "temp" | "secondary" | "old";
  type?: FHIRCodeableConcept;
  system: FHIRUri;
  value: string;
  period?: FHIRPeriod;
  assigner?: FHIRReference;
}

export interface FHIRHumanName {
  id?: string;
  use?: "usual" | "official" | "temp" | "nickname" | "anonymous" | "old" | "maiden";
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FHIRPeriod;
}

export interface FHIRContactPoint {
  id?: string;
  system?: "phone" | "fax" | "email" | "pager" | "url" | "sms" | "other";
  value: string;
  use?: "home" | "work" | "temp" | "old" | "mobile";
  rank?: FHIRPositiveInt;
  period?: FHIRPeriod;
}

export interface FHIRAddress {
  id?: string;
  use?: "home" | "work" | "temp" | "old" | "billing";
  type?: "postal" | "physical" | "both";
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FHIRPeriod;
}

export interface FHIRPeriod {
  id?: string;
  start?: FHIRDateTime;
  end?: FHIRDateTime;
}

export interface FHIRCoding {
  id?: string;
  system: FHIRUri;
  version?: string;
  code: FHIRCode;
  display?: string;
  userSelected?: boolean;
}

export interface FHIRCodeableConcept {
  id?: string;
  coding: FHIRCoding[];
  text?: string;
}

export interface FHIRReference {
  id?: string;
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

export interface FHIRAttachment {
  id?: string;
  contentType?: string;
  language?: string;
  data?: FHIRBase64Binary;
  url?: FHIRUrl;
  size?: FHIRUnsignedInt;
  hash?: FHIRBase64Binary;
  title?: string;
  creation?: FHIRDateTime;
}

// FHIR Resource Types
export interface FHIRMeta {
  versionId?: FHIRId;
  lastUpdated?: FHIRInstant;
  source?: FHIRUri;
  profile?: FHIRCanonical[];
  security?: FHIRCoding[];
  tag?: FHIRCoding[];
}

export interface FHIRResource {
  resourceType: string;
  id?: FHIRId;
  meta?: FHIRMeta;
  implicitRules?: FHIRUri;
  language?: FHIRCode;
}

// Patient Resource
export interface FHIRPatient extends FHIRResource {
  resourceType: "Patient";
  identifier: FHIRIdentifier[];
  active?: boolean;
  name: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: FHIRDate;
  deceased?: boolean | FHIRDateTime;
  address?: FHIRAddress[];
  maritalStatus?: FHIRCodeableConcept;
  multipleBirth?: boolean | number;
  photo?: FHIRAttachment[];
  contact?: FHIRPatientContact[];
  communication?: FHIRPatientCommunication[];
  generalPractitioner?: FHIRReference[];
  managingOrganization?: FHIRReference;
  link?: FHIRPatientLink[];
}

export interface FHIRPatientContact {
  id?: string;
  relationship?: FHIRCodeableConcept[];
  name?: FHIRHumanName;
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress;
  gender?: "male" | "female" | "other" | "unknown";
  organization?: FHIRReference;
  period?: FHIRPeriod;
}

export interface FHIRPatientCommunication {
  id?: string;
  language: FHIRCodeableConcept;
  preferred?: boolean;
}

export interface FHIRPatientLink {
  id?: string;
  other: FHIRReference;
  type: "replaced-by" | "replaces" | "refer" | "seealso";
}

// Organization Resource
export interface FHIOrganization extends FHIRResource {
  resourceType: "Organization";
  identifier?: FHIRIdentifier[];
  active?: boolean;
  type?: FHIRCodeableConcept[];
  name: string;
  alias?: string[];
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress[];
  partOf?: FHIRReference;
  contact?: FHIOrganizationContact[];
  endpoint?: FHIRReference[];
}

export interface FHIOrganizationContact {
  id?: string;
  purpose?: FHIRCodeableConcept;
  name?: FHIRHumanName;
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress;
}

// Coverage Resource (for JKN insurance)
export interface FHIRCoverage extends FHIRResource {
  resourceType: "Coverage";
  identifier?: FHIRIdentifier[];
  status: "active" | "cancelled" | "draft" | "entered-in-error";
  type?: FHIRCodeableConcept;
  policyHolder?: FHIRReference;
  subscriber?: FHIRReference;
  subscriberId?: string;
  beneficiary: FHIRReference;
  dependent?: string;
  relationship?: FHIRCodeableConcept;
  period?: FHIRPeriod;
  payor: FHIRReference[];
  class?: FHIRCoverageClass[];
  order?: FHIRPositiveInt;
  network?: string;
  costToBeneficiary?: FHIRCoverageCostToBeneficiary[];
  subrogation?: boolean;
  contract?: FHIRReference[];
}

export interface FHIRCoverageClass {
  id?: string;
  type: FHIRCodeableConcept;
  value: string;
  name?: string;
}

export interface FHIRCoverageCostToBeneficiary {
  id?: string;
  type?: FHIRCodeableConcept;
  category?: FHIRCodeableConcept;
  network?: FHIRCodeableConcept;
  unit?: FHIRQuantity;
  term?: FHIRCodeableConcept;
  value?: FHIRMoney;
  exception?: FHIRCoverageException[];
}

export interface FHIRQuantity {
  id?: string;
  value?: number;
  comparator?: "<" | "<=" | ">=" | ">" | "ad" | "no established";
  unit?: string;
  system?: FHIRUri;
  code?: FHIRCode;
}

export interface FHIRMoney {
  id?: string;
  value: number;
  currency: string;
}

export interface FHIRCoverageException {
  id?: string;
  type: FHIRCodeableConcept;
  period?: FHIRPeriod;
}

// RelatedPerson Resource (for family members)
export interface FHIRRelatedPerson extends FHIRResource {
  resourceType: "RelatedPerson";
  identifier?: FHIRIdentifier[];
  active?: boolean;
  patient: FHIRReference;
  relationship?: FHIRCodeableConcept[];
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: FHIRDate;
  address?: FHIRAddress[];
  photo?: FHIRAttachment[];
  period?: FHIRPeriod;
  communication?: FHIRPatientCommunication[];
}

// Practitioner Resource
export interface FHIRPractitioner extends FHIRResource {
  resourceType: "Practitioner";
  identifier: FHIRIdentifier[];
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: FHIRDate;
  photo?: FHIRAttachment[];
  qualification?: FHIRPractitionerQualification[];
  communication?: FHIRCodeableConcept[];
}

export interface FHIRPractitionerQualification {
  id?: string;
  identifier?: FHIRIdentifier[];
  code: FHIRCodeableConcept;
  period?: FHIRPeriod;
  issuer?: FHIRReference;
}

// Location Resource
export interface FHIRLocation extends FHIRResource {
  resourceType: "Location";
  identifier?: FHIRIdentifier[];
  status?: "active" | "suspended" | "inactive";
  operationalStatus?: FHIRCoding;
  name?: string;
  alias?: string[];
  description?: string;
  mode?: "instance" | "kind";
  type?: FHIRCodeableConcept[];
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress;
  physicalType?: FHIRCodeableConcept;
  position?: {
    longitude: number;
    latitude: number;
    altitude?: number;
  };
  managingOrganization?: FHIRReference;
  partOf?: FHIRReference;
  hoursOfOperation?: Array<{
    daysOfWeek?: string[];
    allDay?: boolean;
    openingTime?: string;
    closingTime?: string;
  }>;
  availabilityExceptions?: string;
  endpoint?: FHIRReference[];
}

// Encounter Resource
export interface FHIREncounter extends FHIRResource {
  resourceType: "Encounter";
  identifier?: FHIRIdentifier[];
  status:
    | "planned"
    | "arrived"
    | "triaged"
    | "in-progress"
    | "onleave"
    | "finished"
    | "cancelled"
    | "entered-in-error"
    | "unknown";
  statusHistory?: Array<{
    status: string;
    period: FHIRPeriod;
  }>;
  class: FHIRCoding;
  classHistory?: Array<{
    class: FHIRCoding;
    period: FHIRPeriod;
  }>;
  type?: FHIRCodeableConcept[];
  serviceType?: FHIRCodeableConcept;
  priority?: FHIRCodeableConcept;
  subject?: FHIRReference;
  episodeOfCare?: FHIRReference[];
  basedOn?: FHIRReference[];
  participant?: FHIREncounterParticipant[];
  appointment?: FHIRReference[];
  period?: FHIRPeriod;
  length?: FHIRQuantity;
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  diagnosis?: FHIREncounterDiagnosis[];
  account?: FHIRReference[];
  hospitalization?: FHIREncounterHospitalization;
  location?: FHIREncounterLocation[];
  serviceProvider?: FHIRReference;
  partOf?: FHIRReference;
}

export interface FHIREncounterParticipant {
  id?: string;
  type?: FHIRCodeableConcept[];
  period?: FHIRPeriod;
  individual?: FHIRReference;
}

export interface FHIREncounterDiagnosis {
  id?: string;
  condition: FHIRReference;
  use?: FHIRCodeableConcept;
  rank?: FHIRPositiveInt;
}

export interface FHIREncounterHospitalization {
  id?: string;
  preAdmissionIdentifier?: FHIRIdentifier;
  origin?: FHIRReference;
  admitSource?: FHIRCodeableConcept;
  reAdmission?: FHIRCodeableConcept;
  dietPreference?: FHIRCodeableConcept[];
  specialCourtesy?: FHIRCodeableConcept[];
  specialArrangement?: FHIRCodeableConcept[];
  destination?: FHIRReference;
  dischargeDisposition?: FHIRCodeableConcept;
}

export interface FHIREncounterLocation {
  id?: string;
  location: FHIRReference;
  status?: "planned" | "active" | "reserved" | "completed";
  physicalType?: FHIRCodeableConcept;
  period?: FHIRPeriod;
}

// Bundle Resource (for batch operations)
export type FHIRBundleType =
  | "document"
  | "message"
  | "transaction"
  | "transaction-response"
  | "batch"
  | "batch-response"
  | "history"
  | "searchset"
  | "collection";

export interface FHIRBundleLink {
  relation: string;
  url: FHIRUrl;
}

export interface FHIRBundleEntry {
  id?: string;
  fullUrl?: FHIRUri;
  resource?: FHIRResource;
  request?: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    url: string;
  };
  response?: {
    status: string;
    location?: string;
    etag?: string;
    lastModified?: FHIRInstant;
  };
}

export interface FHIRBundle extends FHIRResource {
  resourceType: "Bundle";
  type: FHIRBundleType;
  total?: number;
  link?: FHIRBundleLink[];
  entry: FHIRBundleEntry[];
  signature?: FHIRSignature;
}

export interface FHIRSignature {
  id?: string;
  type: FHIRCoding[];
  when: FHIRInstant;
  who: FHIRReference;
  onBehalfOf?: FHIRReference;
  targetFormat?: FHIRCode;
  sigFormat?: FHIRCode;
  data: FHIRBase64Binary;
}

// Operation Outcome (for error responses)
export interface FHIRExtension {
  url: string;
  value?: string | number | boolean;
}

export interface FHIROperationOutcomeIssue {
  severity: "fatal" | "error" | "warning" | "information";
  code: string;
  details?: FHIRCodeableConcept;
  diagnostics?: string;
  location?: string[];
  expression?: string[];
}

export interface FHIROperationOutcome extends FHIRResource {
  resourceType: "OperationOutcome";
  issue: FHIROperationOutcomeIssue[];
}

// SatuSehat specific systems
export const SATUSEHAT_SYSTEMS = {
  // Identifier systems
  NIK: "https://fhir.kemkes.go.id/id/nik",
  BPJS: "https://fhir.kemkes.go.id/id/bpjs-kesehatan",
  PASSPORT: "http://hl7.org/fhir/sid/passport",

  // Organization identifier
  FACILITY_ID: "https://fhir.kemkes.go.id/id/organization-faskes",

  // Terminology systems
  ADMINISTRATIVE_GENDER: "http://hl7.org/fhir/administrative-gender",
  MARITAL_STATUS: "http://hl7.org/fhir/ValueSet/marital-status",
  CONTACT_POINT_SYSTEM: "http://hl7.org/fhir/contact-point-system",
  CONTACT_POINT_USE: "http://hl7.org/fhir/contact-point-use",
  ADDRESS_USE: "http://hl7.org/fhir/address-use",
  ADDRESS_TYPE: "http://hl7.org/fhir/address-type",
  NAME_USE: "http://hl7.org/fhir/name-use",
  IDENTIFIER_USE: "http://hl7.org/fhir/identifier-use",

  // Indonesian specific
  INDO_PROVINCE: "https://fhir.kemkes.go.id/CodeSystem/indo-province",
  INDO_CITY: "https://fhir.kemkes.go.id/CodeSystem/indo-city",
  INDO_DISTRICT: "https://fhir.kemkes.go.id/CodeSystem/indo-district",
  INDO_VILLAGE: "https://fhir.kemkes.go.id/CodeSystem/indo-village",

  // Organization type
  ORGANIZATION_TYPE: "http://terminology.hl7.org/CodeSystem/organization-type",
  HEALTHCARE_SERVICE: "http://terminology.hl7.org/CodeSystem/service-category",

  // Coverage
  COVERAGE_TYPE: "https://fhir.kemkes.go.id/CodeSystem/coverage-type",
  COVERAGE_CLASS: "https://fhir.kemkes.go.id/CodeSystem/coverage-class",

  // Encounter & Location
  ENCOUNTER_STATUS: "http://hl7.org/fhir/encounter-status",
  ENCOUNTER_CLASS: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  LOCATION_PHYSICAL_TYPE: "http://terminology.hl7.org/CodeSystem/location-physical-type",
} as const;

// SatuSehat specific codes
export const SATUSEHAT_CODES = {
  GENDER: {
    MALE: "male",
    FEMALE: "female",
    OTHER: "other",
    UNKNOWN: "unknown",
  },
  MARITAL_STATUS: {
    MARRIED: "M", // KAWIN
    SINGLE: "S", // BELUM_KAWIN
    DIVORCED: "D", // JANDA/DUDA
    WIDOWED: "W", // JANDA
    LEGALLY_SEPARATED: "L",
  },
  ADDRESS_USE: {
    HOME: "home",
    WORK: "work",
    TEMP: "temp",
    OLD: "old",
    BILLING: "billing",
  },
  ORGANIZATION_TYPE: {
    FACILITY: "prov",
    INSURER: "pay",
    GOV: "gov",
  },
} as const;

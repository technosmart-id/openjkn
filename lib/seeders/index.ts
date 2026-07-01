import { faker } from "@faker-js/faker/locale/id_ID";
import { generateId } from "better-auth";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, session, user } from "@/lib/db/schema/auth";
import {
  bankInformation,
  contributionPayment,
  dataChangeRequest,
  dentalFacility,
  employmentIdentity,
  familyMember,
  healthcareFacility,
  participant,
  participantHealthcareFacility,
  registrationApplication,
} from "@/lib/db/schema/jkn";

// Default admin credentials
export const DEFAULT_ADMIN = {
  email: "admin@jkn.go.id",
  password: "admin123456",
  name: "Admin JKN",
} as const;

const SEGMENTS = [
  "PU_PNS_PUSAT",
  "PU_PNS_DAERAH",
  "PU_TNI_AD",
  "PU_POLRI",
  "PBPU",
  "BP",
  "PBI_APBN",
] as const;

const TREATMENT_CLASSES = ["I", "II", "III"] as const;
const FACILITY_TYPES = [
  "PUSKESMAS",
  "KLINIK",
  "RS_TIP_D",
  "RS_TIP_C",
  "RS_BEDAH",
] as const;
const BANKS = ["BCA", "BRI", "BNI", "MANDIRI", "BTN"] as const;

function randomItem<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

export async function seedHealthcareFacilities(count = 20) {
  console.log(`Seeding ${count} healthcare facilities...`);

  const facilities: Array<Omit<typeof healthcareFacility.$inferInsert, "id">> =
    [];
  for (let i = 0; i < count; i++) {
    // Use methods that work with Indonesian locale
    const city = faker.location.city();
    const state = faker.location.state();
    const street = faker.location.streetAddress();

    const facility = {
      code: `FASKES${String(i + 1).padStart(3, "0")}`,
      name: `${faker.company.name()} ${randomItem(FACILITY_TYPES)}`,
      type: randomItem(FACILITY_TYPES),
      address: `${street}, ${city}`,
      city,
      province: state,
      phoneNumber: faker.phone.number(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    facilities.push(facility);
  }

  await db.insert(healthcareFacility).values(facilities);
  console.log(`✓ Seeded ${count} healthcare facilities`);

  return facilities;
}

export async function seedDentalFacilities(count = 10) {
  console.log(`Seeding ${count} dental facilities...`);

  const facilities: Array<{
    code: string;
    name: string;
    address: string;
    city: string;
    province: string;
    phoneNumber: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (let i = 0; i < count; i++) {
    const city = faker.location.city();
    const state = faker.location.state();
    const street = faker.location.streetAddress();

    const facility = {
      code: `GIGI${String(i + 1).padStart(3, "0")}`,
      name: `Praktik Gigi ${faker.person.fullName()}`,
      address: street,
      city,
      province: state,
      phoneNumber: faker.phone.number(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    facilities.push(facility);
  }

  await db.insert(dentalFacility).values(facilities);
  console.log(`✓ Seeded ${count} dental facilities`);

  return facilities;
}

function createEmploymentIdentity(
  index: number,
  employerName: string
): Omit<typeof employmentIdentity.$inferInsert, "id"> {
  const city = faker.location.city();
  const state = faker.location.state();

  return {
    participantId: index + 1,
    institutionName: employerName,
    institutionCode: `INS${String(index + 1).padStart(6, "0")}`,
    salaryPayerInstitution: employerName,
    salaryPayerInstitutionCode: `PAY${String(index + 1).padStart(4, "0")}`,
    oldEmployeeId: `OLD${String(index + 1).padStart(8, "0")}`,
    newEmployeeId: `EMP${String(index + 1).padStart(6, "0")}`,
    grade: "I",
    rank: faker.person.jobTitle(),
    baseSalary: faker.number
      .int({ min: 3_000_000, max: 15_000_000 })
      .toString(),
    employmentStartDate: randomDate(new Date(2020, 0, 1), new Date()),
    gradeStartDate: randomDate(new Date(2020, 0, 1), new Date()),
    position: faker.person.jobTitle(),
    employeeStatus: "TETAP",
    companyAddress: faker.location.streetAddress(),
    companyVillage: city,
    companyDistrict: faker.location.county(),
    companyCity: city,
    companyProvince: state,
    companyPostalCode: faker.location.zipCode(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createFamilyMember(
  participantIndex: number
): Omit<typeof familyMember.$inferInsert, "id"> {
  const isChild = randomBoolean();
  const city = faker.location.city();
  const fullName = faker.person.fullName();
  const nameParts = fullName.split(" ");
  const isStudent = isChild && randomBoolean();
  const birthDate = faker.date.birthdate({ mode: "age", min: 1, max: 25 });
  const studentVerificationDate = isStudent
    ? new Date(new Date().getFullYear() - 1, 0, 1)
    : null;

  const data: ReturnType<typeof createFamilyMember> = {
    headOfFamilyId: participantIndex + 1,
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || null,
    identityNumber: faker.string.numeric(16),
    relationship: isChild ? "ANAK_TANGGUNGAN" : "ISTRI",
    pisaCode: isChild ? "4" : "2",
    childOrder: isChild ? faker.number.int({ min: 1, max: 5 }) : null,
    isStudent,
    gender: faker.person.sex() === "female" ? "PEREMPUAN" : "LAKI_LAKI",
    birthPlace: city,
    birthDate,
    phoneNumber: faker.phone.number() || null,
    email: faker.internet.email() || null,
    bpjsNumber: null,
    employeeId: null,
    studentVerificationNumber: isStudent ? faker.string.alphanumeric(10) : null,
    studentVerificationDate,
    photoUrl: null,
    primaryFacilityId: null,
    dentalFacilityId: null,
    hasCommercialInsurance: false,
    commercialInsurancePolicyNumber: null,
    commercialInsuranceCompanyName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return data;
}

function createBankAccount(
  index: number
): Omit<typeof bankInformation.$inferInsert, "id"> {
  return {
    participantId: index + 1,
    bankName: randomItem(BANKS),
    accountNumber: faker.finance.accountNumber(10),
    accountHolderName: faker.person.fullName(),
    autoDebitAuthorized: randomBoolean(),
    virtualAccountNumber: `VA${String(index + 1).padStart(12, "0")}`,
    autoDebitDocumentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createPrimaryFacility(
  index: number,
  facilityId: number,
  treatmentClass: (typeof TREATMENT_CLASSES)[number]
): Omit<typeof participantHealthcareFacility.$inferInsert, "id"> {
  return {
    participantId: index + 1,
    primaryFacilityId: facilityId,
    treatmentClass,
    effectiveDate: new Date(),
    createdAt: new Date(),
  };
}

function createDentalFacility(
  index: number,
  facilityId: number,
  treatmentClass: (typeof TREATMENT_CLASSES)[number]
): Omit<typeof participantHealthcareFacility.$inferInsert, "id"> {
  return {
    participantId: index + 1,
    dentalFacilityId: facilityId,
    treatmentClass,
    effectiveDate: new Date(),
    createdAt: new Date(),
  };
}

function createParticipantData(
  index: number,
  segment: (typeof SEGMENTS)[number],
  isActive: boolean
): Omit<typeof participant.$inferInsert, "id"> & {
  treatmentClass: (typeof TREATMENT_CLASSES)[number];
} {
  const city = faker.location.city();
  const state = faker.location.state();
  const street = faker.location.streetAddress();
  const fullName = faker.person.fullName();
  const nameParts = fullName.split(" ");
  const birthDate = faker.date.birthdate({ mode: "age", min: 18, max: 80 });

  // Format date as YYYY-MM-DD for database date column
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const data: ReturnType<typeof createParticipantData> = {
    bpjsNumber: `${String(index + 1).padStart(13, "0")}`,
    familyCardNumber: faker.string.numeric(16),
    identityNumber: faker.string.numeric(16),
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || null,
    nameOnCard: fullName,
    pisaCode: "1",
    gender: faker.person.sex() === "female" ? "PEREMPUAN" : "LAKI_LAKI",
    bloodType: "O",
    birthPlace: city,
    birthDate: formatDate(birthDate),
    religion: "ISLAM",
    maritalStatus: "KAWIN",
    phoneNumber: faker.phone.number(),
    email: faker.internet.email(),
    addressStreet: street,
    addressRt: faker.string.numeric(3),
    addressRw: faker.string.numeric(3),
    addressVillage: city,
    addressDistrict: faker.location.county(),
    addressCity: city,
    addressProvince: state,
    addressPostalCode: faker.location.zipCode(),
    mailingAddressSame: true,
    mailingAddressStreet: null,
    mailingAddressRt: null,
    mailingAddressRw: null,
    mailingAddressVillage: null,
    mailingAddressDistrict: null,
    mailingAddressCity: null,
    mailingAddressProvince: null,
    mailingAddressPostalCode: null,
    npwp: faker.string.numeric(15),
    photoUrl: null,
    occupation: faker.person.jobTitle(),
    monthlyIncome: faker.number
      .int({ min: 3_000_000, max: 15_000_000 })
      .toString(),
    visaNumber: null,
    hasCommercialInsurance: false,
    commercialInsurancePolicyNumber: null,
    commercialInsuranceCompanyName: null,
    participantSegment: segment,
    treatmentClass: randomItem(TREATMENT_CLASSES),
    isLifetimeMember: true,
    userId: null,
    isActive,
    statusPeserta: isActive ? "AKTIF" : "NON_AKTIF",
    statusBayar: "LUNAS",
    effectiveDate: null,
    expiryDate: null,
  };

  // Add timestamps last
  data.createdAt = randomDate(new Date(2023, 0, 1), new Date());
  data.updatedAt = new Date();

  // Only add deactivated fields if inactive
  if (isActive) {
    data.deactivatedAt = null;
    data.deactivationReason = null;
  } else {
    data.deactivatedAt = randomDate(new Date(2023, 0, 1), new Date());
    data.deactivationReason = "Non-payment";
  }

  return data;
}

export async function seedParticipants(count = 50) {
  console.log(`Seeding ${count} participants...`);

  // Get facilities
  const faskesList = await db.query.healthcareFacility.findMany();
  const gigiList = await db.query.dentalFacility.findMany();

  // Use plain arrays to let Drizzle infer columns from actual data
  const participants: Record<string, unknown>[] = [];
  const employmentIdentities: Record<string, unknown>[] = [];
  const familyMembers: Record<string, unknown>[] = [];
  const banks: Record<string, unknown>[] = [];
  const participantFacilities: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const segment = randomItem(SEGMENTS);
    const isActive = randomBoolean();

    const participantData = createParticipantData(
      i,
      segment,
      isActive
    ) as Record<string, unknown>;
    delete participantData.id;
    participants.push(participantData);
  }

  // Use raw SQL to insert participants, excluding the 'id' column
  // Drizzle's ORM always includes all columns from the schema, including auto-increment
  for (const p of participants) {
    await db.execute(
      sql`INSERT INTO "participant" (
        "bpjsNumber", "familyCardNumber", "identityNumber", "firstName", "lastName", "nameOnCard", "pisaCode",
        "gender", "bloodType", "birthPlace", "birthDate", "religion", "maritalStatus", "phoneNumber", "email",
        "addressStreet", "addressRt", "addressRw", "addressVillage", "addressDistrict", "addressCity", "addressProvince",
        "addressPostalCode", "mailingAddressSame", "mailingAddressStreet", "mailingAddressRt", "mailingAddressRw",
        "mailingAddressVillage", "mailingAddressDistrict", "mailingAddressCity", "mailingAddressProvince",
        "mailingAddressPostalCode", "npwp", "photoUrl", "occupation", "monthlyIncome", "visaNumber",
        "hasCommercialInsurance", "commercialInsurancePolicyNumber", "commercialInsuranceCompanyName",
        "participantSegment", "treatmentClass", "isLifetimeMember", "userId", "createdAt", "updatedAt",
        "effectiveDate", "expiryDate", "isActive", "statusPeserta", "statusBayar", "deactivatedAt",
        "deactivationReason"
      ) VALUES (
        ${p.bpjsNumber}, ${p.familyCardNumber}, ${p.identityNumber}, ${p.firstName}, ${p.lastName}, ${p.nameOnCard}, ${p.pisaCode},
        ${p.gender}, ${p.bloodType}, ${p.birthPlace}, ${p.birthDate}, ${p.religion}, ${p.maritalStatus}, ${p.phoneNumber}, ${p.email},
        ${p.addressStreet}, ${p.addressRt}, ${p.addressRw}, ${p.addressVillage}, ${p.addressDistrict}, ${p.addressCity}, ${p.addressProvince},
        ${p.addressPostalCode}, ${p.mailingAddressSame}, ${p.mailingAddressStreet}, ${p.mailingAddressRt}, ${p.mailingAddressRw},
        ${p.mailingAddressVillage}, ${p.mailingAddressDistrict}, ${p.mailingAddressCity}, ${p.mailingAddressProvince},
        ${p.mailingAddressPostalCode}, ${p.npwp}, ${p.photoUrl}, ${p.occupation}, ${p.monthlyIncome}, ${p.visaNumber},
        ${p.hasCommercialInsurance}, ${p.commercialInsurancePolicyNumber}, ${p.commercialInsuranceCompanyName},
        ${p.participantSegment}, ${p.treatmentClass}, ${p.isLifetimeMember}, ${p.userId}, ${p.createdAt}, ${p.updatedAt},
        ${p.effectiveDate}, ${p.expiryDate}, ${p.isActive}, ${p.statusPeserta}, ${p.statusBayar}, ${p.deactivatedAt},
        ${p.deactivationReason}
      )`
    );
  }

  // Get the inserted participants with their actual IDs
  const insertedParticipants = await db.query.participant.findMany();

  // Update related records with actual participant IDs
  for (const participantRecord of insertedParticipants) {
    const actualParticipantId = participantRecord.id;
    const segment = participantRecord.participantSegment;
    const isEmployed = segment.startsWith("PU_");
    const hasFamily = randomBoolean();

    // Add employment identity for PPU
    if (isEmployed) {
      const empData = createEmploymentIdentity(
        actualParticipantId - 1,
        faker.company.name()
      ) as Record<string, unknown>;
      delete empData.id;
      empData.participantId = actualParticipantId;
      employmentIdentities.push(empData);
    }

    // Add family members
    if (hasFamily) {
      const familyCount = faker.number.int({ min: 1, max: 4 });
      for (let j = 0; j < familyCount; j++) {
        const famData = createFamilyMember(actualParticipantId - 1) as Record<
          string,
          unknown
        >;
        delete famData.id;
        famData.headOfFamilyId = actualParticipantId;
        familyMembers.push(famData);
      }
    }

    // Add bank account
    const bankData = createBankAccount(actualParticipantId - 1) as Record<
      string,
      unknown
    >;
    delete bankData.id;
    bankData.participantId = actualParticipantId;
    banks.push(bankData);

    // Assign facilities (1 primary, 1 dental)
    const treatmentClass = participantRecord.treatmentClass;
    if (faskesList.length > 0) {
      const facilityData = createPrimaryFacility(
        actualParticipantId - 1,
        randomItem(faskesList).id,
        treatmentClass
      ) as Record<string, unknown>;
      delete facilityData.id;
      facilityData.participantId = actualParticipantId;
      participantFacilities.push(facilityData);
    }

    if (gigiList.length > 0) {
      const facilityData = createDentalFacility(
        actualParticipantId - 1,
        randomItem(gigiList).id,
        treatmentClass
      ) as Record<string, unknown>;
      delete facilityData.id;
      facilityData.participantId = actualParticipantId;
      participantFacilities.push(facilityData);
    }
  }

  await db.insert(employmentIdentity).values(employmentIdentities as any);
  await db.insert(familyMember).values(familyMembers as any);
  await db.insert(bankInformation).values(banks as any);
  await db
    .insert(participantHealthcareFacility)
    .values(participantFacilities as any);

  console.log(`✓ Seeded ${count} participants`);
  console.log(`  - ${employmentIdentities.length} employment identities`);
  console.log(`  - ${familyMembers.length} family members`);
  console.log(`  - ${banks.length} bank accounts`);
  console.log(`  - ${participantFacilities.length} facility assignments`);

  return participants;
}

export async function seedRegistrations(count = 30) {
  console.log(`Seeding ${count} registrations...`);

  const participantsList = await db.query.participant.findMany();
  const statuses = [
    "DRAFT",
    "VERIFIKASI",
    "VIRTUAL_ACCOUNT_DIBUAT",
    "MENUNGGU_PEMBAYARAN",
    "AKTIF",
    "DITOLAK",
    "DIBATALKAN",
  ] as const;

  const registrations: (typeof registrationApplication.$inferInsert)[] = [];
  for (let i = 0; i < count; i++) {
    const participantRecord = participantsList[i % participantsList.length];
    const status = randomItem(statuses);

    const baseUrl = faker.internet.url();
    const registration = {
      applicationNumber: `REG${Date.now()}${String(i).padStart(4, "0")}`,
      participantId: participantRecord.id,
      status,
      participantSegment: participantRecord.participantSegment,
      treatmentClass: participantRecord.treatmentClass,
      familyCardDocumentUrl: `${baseUrl}/kk.pdf`,
      identityDocumentUrl: `${baseUrl}/ktp.pdf`,
      bankBookDocumentUrl: `${baseUrl}/buku.pdf`,
      autodebitLetterDocumentUrl: `${baseUrl}/autodebet.pdf`,
      enteredBy: "admin",
      enteredAt: randomDate(new Date(2024, 0, 1), new Date()),
      verifiedBy: status !== "DRAFT" ? "admin" : null,
      verifiedAt: status !== "DRAFT" ? new Date() : null,
      virtualAccountCreated:
        status === "VIRTUAL_ACCOUNT_DIBUAT" ||
        status === "MENUNGGU_PEMBAYARAN" ||
        status === "AKTIF",
      virtualAccountCreatedAt:
        status === "VIRTUAL_ACCOUNT_DIBUAT" ||
        status === "MENUNGGU_PEMBAYARAN" ||
        status === "AKTIF"
          ? new Date()
          : null,
      firstPaymentDeadline:
        status === "MENUNGGU_PEMBAYARAN" || status === "AKTIF"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
      rejectionReason: status === "DITOLAK" ? "Dokumen tidak lengkap" : null,
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date(),
    };

    registrations.push(registration);
  }

  await db.insert(registrationApplication).values(registrations);
  console.log(`✓ Seeded ${count} registrations`);

  return registrations;
}

export async function seedPayments(count = 100) {
  console.log(`Seeding ${count} payments...`);

  const participantsList = await db.query.participant.findMany();
  const statuses = ["PENDING", "PAID", "FAILED"] as const;
  const methods = ["AUTO_DEBIT", "MANUAL", "VIRTUAL_ACCOUNT"] as const;

  const payments: (typeof contributionPayment.$inferInsert)[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (let i = 0; i < count; i++) {
    const participantRecord = participantsList[i % participantsList.length];
    const status = randomItem(statuses);
    const method = randomItem(methods);
    const isPaid = status === "PAID";

    // Generate dates within the last 12 months
    const monthsAgo = Math.floor(i / 8);
    const paymentMonth = ((currentMonth - monthsAgo - 1) % 12) + 1;
    const paymentYear =
      currentYear - Math.floor((currentMonth - paymentMonth) / 12);

    const payment = {
      paymentNumber: `PAY${Date.now()}${String(i).padStart(4, "0")}`,
      participantId: participantRecord.id,
      periodMonth: paymentMonth,
      periodYear: paymentYear,
      amount: faker.number.int({ min: 100_000, max: 500_000 }).toFixed(2),
      adminFee: faker.number.int({ min: 5000, max: 20_000 }).toFixed(2),
      penaltyAmount: faker.number.int({ min: 0, max: 100_000 }).toFixed(2),
      totalAmount: "0", // Will be calculated properly in real app
      paymentMethod: method,
      bankName: randomItem(BANKS),
      virtualAccountNumber: `VA${String(i + 1).padStart(12, "0")}`,
      status,
      paymentDate: isPaid
        ? randomDate(
            new Date(paymentYear, paymentMonth - 1, 1),
            new Date(paymentYear, paymentMonth, 10)
          )
        : null,
      paymentReference: isPaid ? `REF${faker.string.alphanumeric(10)}` : null,
      createdAt: randomDate(
        new Date(paymentYear, paymentMonth - 1, 1),
        new Date()
      ),
      updatedAt: new Date(),
    };

    payments.push(payment);
  }

  await db.insert(contributionPayment).values(payments);
  console.log(`✓ Seeded ${count} payments`);

  return payments;
}

export async function seedChangeRequests(count = 20) {
  console.log(`Seeding ${count} change requests...`);

  const participantsList = await db.query.participant.findMany();
  const changeTypes = [
    "ALAMAT",
    "TEMPAT_KERJA",
    "GAJI",
    "FASKES",
    "DATA_KELUARGA",
    "NAMA",
  ] as const;
  const statuses = ["PENDING", "VERIFIED", "APPROVED", "REJECTED"] as const;

  const requests: (typeof dataChangeRequest.$inferInsert)[] = [];
  for (let i = 0; i < count; i++) {
    const participantRecord = participantsList[i % participantsList.length];
    const changeType = randomItem(changeTypes);
    const status = randomItem(statuses);

    const newCity = faker.location.city();
    const newStreet = faker.location.streetAddress();

    const request = {
      participantId: participantRecord.id,
      changeType,
      previousData: {
        addressStreet: participantRecord.addressStreet,
        addressCity: participantRecord.addressCity,
      },
      newData: {
        addressStreet: newStreet,
        addressCity: newCity,
      },
      supportingDocumentUrl: `${faker.internet.url()}/doc.pdf`,
      status,
      verifiedBy: status !== "PENDING" ? "admin" : null,
      verifiedAt: status !== "PENDING" ? new Date() : null,
      verificationNotes: status === "REJECTED" ? "Data tidak valid" : null,
      enteredBy: "admin",
      enteredAt: randomDate(new Date(2024, 0, 1), new Date()),
      createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      updatedAt: new Date(),
    };

    requests.push(request);
  }

  await db.insert(dataChangeRequest).values(requests);
  console.log(`✓ Seeded ${count} change requests`);

  return requests;
}

export async function seedAdminUser() {
  console.log("Seeding default admin user...");

  // Use scryptAsync for password hashing (Better Auth default)
  // Format: {saltHex}:{derivedKeyHex}
  const { scryptAsync } = await import("@noble/hashes/scrypt.js");
  const { hex } = await import("@better-auth/utils/hex");
  const crypto = await import("node:crypto");

  const userId = generateId();
  const accountId = generateId();

  // Generate 16-byte salt and encode as hex
  const salt = hex.encode(crypto.webcrypto.getRandomValues(new Uint8Array(16)));

  // Normalize password with NFKC (Better Auth requirement)
  const password = DEFAULT_ADMIN.password.normalize("NFKC");

  // Derive key using scryptAsync with Better Auth's parameters
  const key = await scryptAsync(password, salt, {
    N: 16_384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16_384 * 16 * 2,
  });

  // Format as {saltHex}:{derivedKeyHex}
  const passwordHash = `${salt}:${hex.encode(key)}`;

  // Check if admin user already exists using raw SQL
  const { sql } = await import("drizzle-orm");
  const existingUsers = await db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .where(sql`${user.email} = ${DEFAULT_ADMIN.email}`)
    .limit(1);

  if (existingUsers.length > 0) {
    console.log("  ⊗ Admin user already exists, skipping...");
    return existingUsers[0];
  }

  // Create user and account
  await db.insert(user).values({
    id: userId,
    email: DEFAULT_ADMIN.email,
    name: DEFAULT_ADMIN.name,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(account).values({
    id: accountId,
    userId,
    accountId: userId,
    providerId: "credential",
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✓ Seeded admin user (${DEFAULT_ADMIN.email})`);

  const created = await db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .where(sql`${user.email} = ${DEFAULT_ADMIN.email}`)
    .limit(1);

  return created[0];
}

export async function clearAllData() {
  console.log("Clearing all JKN data...");

  // Import sql for raw SQL condition
  const { sql } = await import("drizzle-orm");

  // Helper function to safely delete from a table
  async function safeDelete(table: unknown, tableName: string) {
    try {
      // @ts-expect-error - Drizzle delete expects specific table type
      await db.delete(table).where(sql`1=1`);
      console.log(`  ✓ Cleared ${tableName}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const causeErrMsg =
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : "";
      if (
        errMsg.includes("does not exist") ||
        causeErrMsg.includes("does not exist")
      ) {
        console.log(`  ⊗ Table ${tableName} does not exist yet, skipping...`);
      } else {
        throw error;
      }
    }
  }

  // Delete auth data first (due to foreign key constraints)
  await safeDelete(session, "session");
  await safeDelete(account, "account");
  await safeDelete(user, "user");

  // Use Drizzle delete with where(sql) to delete all rows
  // Delete in correct order: child tables first, then parent tables
  await safeDelete(contributionPayment, "contribution_payment");
  await safeDelete(dataChangeRequest, "data_change_request");
  await safeDelete(registrationApplication, "registration_application");
  await safeDelete(
    participantHealthcareFacility,
    "participant_healthcare_facility"
  );
  await safeDelete(bankInformation, "bank_information");
  await safeDelete(familyMember, "family_member");
  await safeDelete(employmentIdentity, "employment_identity");
  await safeDelete(participant, "participant");
  await safeDelete(dentalFacility, "dental_facility");
  await safeDelete(healthcareFacility, "healthcare_facility");

  console.log("✓ Cleared all JKN data");
}

/**
 * Seed anomaly-rich participant data to exercise every rule in rules.py.
 *
 * Each "scenario" block maps directly to a named rule:
 *   AKTIF_UMUR_>110, UMUR_NEGATIF, KEPALA_KELUARGA_ANAK,
 *   KELUARGA_>50_ANGGOTA, KELUARGA_BESAR, KAWIN_UMUR_<16,
 *   ANAK_TAPI_UMUR_>25, TANPA_KEPALA_KELUARGA, RASIO_AKTIF_RENDAH
 *
 * Family grouping is done via familyCardNumber — members sharing the same
 * familyCardNumber will be grouped together in the ML pipeline.
 */
export async function seedAnomalyData() {
  console.log("🚨 Seeding anomaly data...");

  const today = new Date();

  /**
   * Helper: subtract years from today to get a birthDate string (YYYY-MM-DD).
   * Pass negative years to get a future date (UMUR_NEGATIF).
   */
  function birthDateFromAge(years: number): string {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - years);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /** Insert a single participant row and return its auto-generated id. */
  async function insertParticipant(p: {
    bpjsNumber: string;
    familyCardNumber: string;
    identityNumber: string;
    firstName: string;
    lastName: string | null;
    nameOnCard: string;
    pisaCode: string;
    gender: "LAKI_LAKI" | "PEREMPUAN";
    birthDate: string;
    maritalStatus: "KAWIN" | "BELUM_KAWIN" | "JANDA" | "DUDA";
    isActive: boolean;
    participantSegment: string;
    treatmentClass: "I" | "II" | "III";
  }): Promise<number> {
    await db.execute(
      sql`INSERT INTO "participant" (
        "bpjsNumber", "familyCardNumber", "identityNumber",
        "firstName", "lastName", "nameOnCard", "pisaCode",
        "gender", "bloodType", "birthPlace", "birthDate",
        "religion", "maritalStatus", "phoneNumber", "email",
        "addressStreet", "addressRt", "addressRw",
        "addressVillage", "addressDistrict", "addressCity",
        "addressProvince", "addressPostalCode",
        "mailingAddressSame", "mailingAddressStreet",
        "mailingAddressRt", "mailingAddressRw",
        "mailingAddressVillage", "mailingAddressDistrict",
        "mailingAddressCity", "mailingAddressProvince",
        "mailingAddressPostalCode", "npwp", "photoUrl",
        "occupation", "monthlyIncome", "visaNumber",
        "hasCommercialInsurance",
        "commercialInsurancePolicyNumber",
        "commercialInsuranceCompanyName",
        "participantSegment", "treatmentClass",
        "isLifetimeMember", "userId",
        "createdAt", "updatedAt",
        "effectiveDate", "expiryDate",
        "isActive", "statusPeserta", "statusBayar",
        "deactivatedAt", "deactivationReason"
      ) VALUES (
        ${p.bpjsNumber}, ${p.familyCardNumber}, ${p.identityNumber},
        ${p.firstName}, ${p.lastName}, ${p.nameOnCard}, ${p.pisaCode},
        ${p.gender}, ${"O"}, ${"Jakarta"}, ${p.birthDate},
        ${"ISLAM"}, ${p.maritalStatus}, ${"021-00000000"}, ${`${p.bpjsNumber}@anomali.test`},
        ${"Jl Anomali No 1"}, ${"001"}, ${"001"},
        ${"Kelurahan"}, ${"Kecamatan"}, ${"Jakarta"},
        ${"DKI Jakarta"}, ${"10000"},
        ${true}, ${null},
        ${null}, ${null},
        ${null}, ${null},
        ${null}, ${null},
        ${null}, ${faker.string.numeric(15)}, ${null},
        ${"Tidak Bekerja"}, ${"3000000"}, ${null},
        ${false},
        ${null},
        ${null},
        ${p.participantSegment}, ${p.treatmentClass},
        ${true}, ${null},
        ${new Date()}, ${new Date()},
        ${null}, ${null},
        ${p.isActive},
        ${p.isActive ? "AKTIF" : "NON_AKTIF"},
        ${"LUNAS"},
        ${p.isActive ? null : new Date()},
        ${p.isActive ? null : "Anomali test"}
      )`
    );
    const rows = await db.execute(
      sql`SELECT id FROM "participant" WHERE "bpjsNumber" = ${p.bpjsNumber} LIMIT 1`
    );
    return (rows.rows[0] as { id: number }).id;
  }

  /** Insert a family member row linked to a participant head-of-family. */
  async function insertFamilyMember(fm: {
    headOfFamilyId: number;
    firstName: string;
    relationship: string;
    pisaCode: string;
    gender: "LAKI_LAKI" | "PEREMPUAN";
    birthDate: string;
    isStudent?: boolean;
  }): Promise<void> {
    await db.insert(familyMember).values({
      headOfFamilyId: fm.headOfFamilyId,
      firstName: fm.firstName,
      lastName: null,
      identityNumber: faker.string.numeric(16),
      relationship: fm.relationship as any,
      pisaCode: fm.pisaCode,
      childOrder: fm.pisaCode === "4" ? 1 : null,
      isStudent: fm.isStudent ?? false,
      gender: fm.gender,
      birthPlace: "Jakarta",
      birthDate: new Date(fm.birthDate),
      phoneNumber: null,
      email: null,
      bpjsNumber: null,
      employeeId: null,
      studentVerificationNumber: null,
      studentVerificationDate: null,
      photoUrl: null,
      primaryFacilityId: null,
      dentalFacilityId: null,
      hasCommercialInsurance: false,
      commercialInsurancePolicyNumber: null,
      commercialInsuranceCompanyName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 1 — AKTIF_UMUR_>110
  // Active participant born 120 years ago
  // ──────────────────────────────────────────────────────
  {
    const id = await insertParticipant({
      bpjsNumber: "ANOM0000000001",
      familyCardNumber: "ANOMFAM000001",
      identityNumber: faker.string.numeric(16),
      firstName: "Nenek",
      lastName: "Tua Banget",
      nameOnCard: "Nenek Tua Banget",
      pisaCode: "1",
      gender: "PEREMPUAN",
      birthDate: birthDateFromAge(120), // 120 tahun — mustahil aktif
      maritalStatus: "JANDA",
      isActive: true,
      participantSegment: "PBI_APBN",
      treatmentClass: "III",
    });
    console.log(`  ✓ Scenario 1 AKTIF_UMUR_>110 (id=${id})`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 2 — UMUR_NEGATIF
  // Birth date 5 years in the future
  // ──────────────────────────────────────────────────────
  {
    const futureBirth = new Date(today);
    futureBirth.setFullYear(futureBirth.getFullYear() + 5);
    const futureBirthStr = `${futureBirth.getFullYear()}-${String(futureBirth.getMonth() + 1).padStart(2, "0")}-01`;
    const id = await insertParticipant({
      bpjsNumber: "ANOM0000000002",
      familyCardNumber: "ANOMFAM000002",
      identityNumber: faker.string.numeric(16),
      firstName: "Belum",
      lastName: "Lahir",
      nameOnCard: "Belum Lahir",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: futureBirthStr,
      maritalStatus: "BELUM_KAWIN",
      isActive: true,
      participantSegment: "PBPU",
      treatmentClass: "I",
    });
    console.log(`  ✓ Scenario 2 UMUR_NEGATIF (id=${id})`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 3 — KEPALA_KELUARGA_ANAK
  // Head of family (pisaCode=1) aged 8 — a child registered as KK head
  // ──────────────────────────────────────────────────────
  {
    const id = await insertParticipant({
      bpjsNumber: "ANOM0000000003",
      familyCardNumber: "ANOMFAM000003",
      identityNumber: faker.string.numeric(16),
      firstName: "Bocah",
      lastName: "Kepala Keluarga",
      nameOnCard: "Bocah Kepala Keluarga",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(8),
      maritalStatus: "BELUM_KAWIN",
      isActive: true,
      participantSegment: "PBI_APBN",
      treatmentClass: "III",
    });
    console.log(`  ✓ Scenario 3 KEPALA_KELUARGA_ANAK (id=${id})`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 4 — KELUARGA_>50_ANGGOTA
  // One family with 55 members (head + 54 dependents)
  // ──────────────────────────────────────────────────────
  {
    const headId = await insertParticipant({
      bpjsNumber: "ANOM0000000004",
      familyCardNumber: "ANOMFAM000004",
      identityNumber: faker.string.numeric(16),
      firstName: "Bapak",
      lastName: "Lima Puluh",
      nameOnCard: "Bapak Lima Puluh",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(45),
      maritalStatus: "KAWIN",
      isActive: true,
      participantSegment: "PU_PNS_PUSAT",
      treatmentClass: "I",
    });
    // 54 anak-anak untuk total 55 anggota keluarga
    for (let i = 0; i < 54; i++) {
      await insertFamilyMember({
        headOfFamilyId: headId,
        firstName: `Anak${String(i + 1).padStart(2, "0")}`,
        relationship: "ANAK_TANGGUNGAN",
        pisaCode: "4",
        gender: i % 2 === 0 ? "LAKI_LAKI" : "PEREMPUAN",
        birthDate: birthDateFromAge(faker.number.int({ min: 5, max: 20 })),
      });
    }
    console.log(
      `  ✓ Scenario 4 KELUARGA_>50_ANGGOTA (id=${headId}, 55 members)`
    );
  }

  // ──────────────────────────────────────────────────────
  // Scenario 5 — KELUARGA_BESAR (>10 anggota, masuk soft rule)
  // 12-member family — normal enough to exist but triggers KELUARGA_BESAR
  // ──────────────────────────────────────────────────────
  {
    const headId = await insertParticipant({
      bpjsNumber: "ANOM0000000005",
      familyCardNumber: "ANOMFAM000005",
      identityNumber: faker.string.numeric(16),
      firstName: "Keluarga",
      lastName: "Besar",
      nameOnCard: "Keluarga Besar",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(50),
      maritalStatus: "KAWIN",
      isActive: true,
      participantSegment: "PBPU",
      treatmentClass: "II",
    });
    for (let i = 0; i < 11; i++) {
      await insertFamilyMember({
        headOfFamilyId: headId,
        firstName: `AnggotaB${i + 1}`,
        relationship: i === 0 ? "ISTRI" : "ANAK_TANGGUNGAN",
        pisaCode: i === 0 ? "2" : "4",
        gender: i === 0 ? "PEREMPUAN" : i % 2 === 0 ? "LAKI_LAKI" : "PEREMPUAN",
        birthDate:
          i === 0
            ? birthDateFromAge(45)
            : birthDateFromAge(faker.number.int({ min: 5, max: 20 })),
      });
    }
    console.log(`  ✓ Scenario 5 KELUARGA_BESAR (id=${headId}, 12 members)`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 6 — KAWIN_UMUR_<16
  // Participant marked KAWIN but only 14 years old
  // ──────────────────────────────────────────────────────
  {
    const id = await insertParticipant({
      bpjsNumber: "ANOM0000000006",
      familyCardNumber: "ANOMFAM000006",
      identityNumber: faker.string.numeric(16),
      firstName: "Kawin",
      lastName: "Bocah",
      nameOnCard: "Kawin Bocah",
      pisaCode: "1",
      gender: "PEREMPUAN",
      birthDate: birthDateFromAge(14),
      maritalStatus: "KAWIN",
      isActive: true,
      participantSegment: "PBI_APBN",
      treatmentClass: "III",
    });
    console.log(`  ✓ Scenario 6 KAWIN_UMUR_<16 (id=${id})`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 7 — ANAK_TAPI_UMUR_>25
  // Family member with relationship=ANAK_TANGGUNGAN aged 30
  // ──────────────────────────────────────────────────────
  {
    const headId = await insertParticipant({
      bpjsNumber: "ANOM0000000007",
      familyCardNumber: "ANOMFAM000007",
      identityNumber: faker.string.numeric(16),
      firstName: "Orang",
      lastName: "Tua Normal",
      nameOnCard: "Orang Tua Normal",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(55),
      maritalStatus: "KAWIN",
      isActive: true,
      participantSegment: "PU_SWASTA",
      treatmentClass: "II",
    });
    await insertFamilyMember({
      headOfFamilyId: headId,
      firstName: "Anak",
      relationship: "ANAK_TANGGUNGAN",
      pisaCode: "4",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(30), // anak umur 30 — harusnya sudah mandiri
    });
    console.log(`  ✓ Scenario 7 ANAK_TAPI_UMUR_>25 (head id=${headId})`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 8 — TANPA_KEPALA_KELUARGA
  // Family where all members have pisaCode != 1 (no proper head)
  // Implemented as a participant with pisaCode=4 (ANAK) as the only member
  // ──────────────────────────────────────────────────────
  {
    const id = await insertParticipant({
      bpjsNumber: "ANOM0000000008",
      familyCardNumber: "ANOMFAM000008",
      identityNumber: faker.string.numeric(16),
      firstName: "Anak",
      lastName: "Tanpa KK",
      nameOnCard: "Anak Tanpa KK",
      pisaCode: "4", // ANAK tapi terdaftar sebagai peserta tunggal — no kepala keluarga
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(15),
      maritalStatus: "BELUM_KAWIN",
      isActive: true,
      participantSegment: "PBI_APBN",
      treatmentClass: "III",
    });
    // Tambah satu anggota keluarga lain yang juga pisaCode=4 agar jml_keluarga>1
    await insertFamilyMember({
      headOfFamilyId: id,
      firstName: "Adik",
      relationship: "ANAK_TANGGUNGAN",
      pisaCode: "4",
      gender: "PEREMPUAN",
      birthDate: birthDateFromAge(12),
    });
    console.log(`  ✓ Scenario 8 TANPA_KEPALA_KELUARGA (id=${id})`);
  }

  // ──────────────────────────────────────────────────────
  // Scenario 9 — RASIO_AKTIF_RENDAH
  // Large family (7 members) where only 1 is active → rasio < 0.2
  // ──────────────────────────────────────────────────────
  {
    const headId = await insertParticipant({
      bpjsNumber: "ANOM0000000009",
      familyCardNumber: "ANOMFAM000009",
      identityNumber: faker.string.numeric(16),
      firstName: "Kepala",
      lastName: "Rasio Rendah",
      nameOnCard: "Kepala Rasio Rendah",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(40),
      maritalStatus: "KAWIN",
      isActive: true, // hanya kepala yang aktif
      participantSegment: "PBPU",
      treatmentClass: "III",
    });
    // 6 anggota non-aktif (tapi di familyMember table semua dianggap aktif oleh ML transformer)
    // Untuk trigger rule ini kita butuh beberapa participant NON_AKTIF dengan familyCardNumber yang sama
    for (let i = 0; i < 6; i++) {
      await insertParticipant({
        bpjsNumber: `ANOM000000100${i}`,
        familyCardNumber: "ANOMFAM000009", // same family card — same id_keluarga
        identityNumber: faker.string.numeric(16),
        firstName: `NonAktif${i + 1}`,
        lastName: "Rendah",
        nameOnCard: `NonAktif${i + 1} Rendah`,
        pisaCode: i === 0 ? "2" : "4",
        gender: i % 2 === 0 ? "LAKI_LAKI" : "PEREMPUAN",
        birthDate: birthDateFromAge(faker.number.int({ min: 5, max: 35 })),
        maritalStatus: "BELUM_KAWIN",
        isActive: false, // NON_AKTIF — bikin rasio aktif < 0.2
        participantSegment: "PBI_APBN",
        treatmentClass: "III",
      });
    }
    console.log(
      `  ✓ Scenario 9 RASIO_AKTIF_RENDAH (head id=${headId}, 7 members, 1 aktif)`
    );
  }

  // ──────────────────────────────────────────────────────
  // Scenario 10 — Kombinasi: KEPALA_KELUARGA_ANAK + KELUARGA_BESAR
  // Child head of household with 12 family members
  // ──────────────────────────────────────────────────────
  {
    const headId = await insertParticipant({
      bpjsNumber: "ANOM0000000010",
      familyCardNumber: "ANOMFAM000010",
      identityNumber: faker.string.numeric(16),
      firstName: "Bocah",
      lastName: "KK Besar",
      nameOnCard: "Bocah KK Besar",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(10), // kepala keluarga usia 10 + keluarga besar
      maritalStatus: "BELUM_KAWIN",
      isActive: true,
      participantSegment: "PBI_APBN",
      treatmentClass: "III",
    });
    for (let i = 0; i < 12; i++) {
      await insertFamilyMember({
        headOfFamilyId: headId,
        firstName: `AnggotaC${i + 1}`,
        relationship: "ANAK_TANGGUNGAN",
        pisaCode: "4",
        gender: i % 2 === 0 ? "LAKI_LAKI" : "PEREMPUAN",
        birthDate: birthDateFromAge(faker.number.int({ min: 1, max: 8 })),
      });
    }
    console.log(
      `  ✓ Scenario 10 KEPALA_KELUARGA_ANAK+KELUARGA_BESAR (id=${headId})`
    );
  }

  // ──────────────────────────────────────────────────────
  // Scenario 11 — Multiple ANAK_TAPI_UMUR_>25 in same family
  // Several adult "children" registered under one family
  // ──────────────────────────────────────────────────────
  {
    const headId = await insertParticipant({
      bpjsNumber: "ANOM0000000011",
      familyCardNumber: "ANOMFAM000011",
      identityNumber: faker.string.numeric(16),
      firstName: "Bapak",
      lastName: "Anak Dewasa",
      nameOnCard: "Bapak Anak Dewasa",
      pisaCode: "1",
      gender: "LAKI_LAKI",
      birthDate: birthDateFromAge(65),
      maritalStatus: "KAWIN",
      isActive: true,
      participantSegment: "PENSIUNAN_PNS",
      treatmentClass: "I",
    });
    const adultAges = [28, 31, 35, 40];
    for (const age of adultAges) {
      await insertFamilyMember({
        headOfFamilyId: headId,
        firstName: `AnakDewasa${age}`,
        relationship: "ANAK_TANGGUNGAN",
        pisaCode: "4",
        gender: "LAKI_LAKI",
        birthDate: birthDateFromAge(age),
      });
    }
    console.log(`  ✓ Scenario 11 multi-ANAK_TAPI_UMUR_>25 (head id=${headId})`);
  }

  console.log("✓ Anomaly seeding complete — 11 scenarios inserted");
}

export async function seedAll() {
  console.log("🌱 Starting comprehensive database seeding...\n");

  await clearAllData();

  // Seed admin user first
  await seedAdminUser();

  await seedHealthcareFacilities(20);
  await seedDentalFacilities(10);
  await seedParticipants(50);
  await seedAnomalyData(); // inject anomaly-rich records
  await seedRegistrations(30);
  await seedPayments(100);
  await seedChangeRequests(20);

  console.log("\n✨ Database seeding completed!");
  console.log("\n📧 Default admin credentials:");
  console.log(`   Email: ${DEFAULT_ADMIN.email}`);
  console.log(`   Password: ${DEFAULT_ADMIN.password}`);
}

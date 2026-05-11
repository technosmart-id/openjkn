-- Add satusehatId columns that exist in Drizzle schema but were never migrated
-- Also creates the satusehat_sync tracking table

-- Add satusehatId to participant
ALTER TABLE "participant" ADD COLUMN IF NOT EXISTS "satusehatId" TEXT;

-- Add satusehatId to healthcare_facility
ALTER TABLE "healthcare_facility" ADD COLUMN IF NOT EXISTS "satusehatId" TEXT;

-- Add satusehatId to family_member
ALTER TABLE "family_member" ADD COLUMN IF NOT EXISTS "satusehatId" TEXT;

-- Create satusehat_sync_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "satusehat_sync_status" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'UPDATE_NEEDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create satusehat_sync table
CREATE TABLE IF NOT EXISTS "satusehat_sync" (
  "id" SERIAL PRIMARY KEY,
  "participantId" INTEGER REFERENCES participant("id") ON DELETE CASCADE,
  "familyMemberId" INTEGER REFERENCES family_member("id") ON DELETE CASCADE,
  "healthcareFacilityId" INTEGER REFERENCES healthcare_facility("id") ON DELETE CASCADE,
  "resourceType" VARCHAR(50) NOT NULL,
  "satusehatResourceId" TEXT NOT NULL,
  "satusehatUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SYNCED',
  "lastSyncedAt" TIMESTAMP(3) NOT NULL,
  "lastSyncError" TEXT,
  "syncVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

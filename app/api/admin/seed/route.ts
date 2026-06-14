import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";
import {
  clearAllData,
  seedAdminUser,
  seedAll,
  seedChangeRequests,
  seedDentalFacilities,
  seedHealthcareFacilities,
  seedParticipants,
  seedPayments,
  seedRegistrations,
} from "@/lib/seeders";

async function runMigrations() {
  const sqlFiles = [
    "lib/db/migrations/0000_create_auth_tables.sql",
    "lib/db/migrations/create_jkn_tables.sql",
    "lib/db/migrations/0001_fix_jkn_tables.sql",
  ];

  for (const file of sqlFiles) {
    try {
      const sqlContent = readFileSync(join(process.cwd(), file), "utf-8");
      // Use pool directly to execute raw SQL
      const { pool } = await import("@/lib/db");
      await pool.query(sqlContent);
      console.log(`✓ Executed ${file}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already exists")) {
        console.log(`⊗ ${file} - tables already exist`);
      } else {
        console.error(`Error executing ${file}:`, errMsg);
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, count } = body;

    const result = { message: "", stats: {} as Record<string, number> };

    switch (action) {
      case "all":
        await runMigrations();
        await seedAll();
        result.message = "Database seeded successfully with all data";
        result.stats = {
          facilities: 20,
          dental: 10,
          participants: 50,
          registrations: 30,
          payments: 100,
          changes: 20,
        };
        break;

      case "facilities": {
        await runMigrations();
        const facilities = await seedHealthcareFacilities(count || 20);
        result.message = `Seeded ${facilities.length} healthcare facilities`;
        result.stats = { facilities: facilities.length };
        break;
      }

      case "dental": {
        await runMigrations();
        const dental = await seedDentalFacilities(count || 10);
        result.message = `Seeded ${dental.length} dental facilities`;
        result.stats = { dental: dental.length };
        break;
      }

      case "participants": {
        await runMigrations();
        const participants = await seedParticipants(count || 50);
        result.message = `Seeded ${participants.length} participants`;
        result.stats = { participants: participants.length };
        break;
      }

      case "registrations": {
        await runMigrations();
        const registrations = await seedRegistrations(count || 30);
        result.message = `Seeded ${registrations.length} registrations`;
        result.stats = { registrations: registrations.length };
        break;
      }

      case "payments": {
        await runMigrations();
        const payments = await seedPayments(count || 100);
        result.message = `Seeded ${payments.length} payments`;
        result.stats = { payments: payments.length };
        break;
      }

      case "changes": {
        await runMigrations();
        const changes = await seedChangeRequests(count || 20);
        result.message = `Seeded ${changes.length} change requests`;
        result.stats = { changes: changes.length };
        break;
      }

      case "admin": {
        await runMigrations();
        await seedAdminUser();
        result.message = "Admin user created successfully";
        result.stats = { admin: 1 };
        break;
      }

      case "clear":
        await clearAllData();
        result.message = "All data cleared successfully";
        result.stats = {};
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      {
        error: "Seeding failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

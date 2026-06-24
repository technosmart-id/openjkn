import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  try {
    const { seedAll } = await import("@/lib/seeders");
    await seedAll();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

main();

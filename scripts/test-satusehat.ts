import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Use require to prevent hoisting so dotenv is loaded first
const {
  getAccessToken,
  healthCheck,
  isConfigured,
} = require("../lib/satusehat");

async function main() {
  console.log("🚀 Testing SatuSehat Connection...");

  if (!isConfigured()) {
    console.error(
      "❌ SatuSehat is not configured. Check your .env.local file."
    );
    process.exit(1);
  }

  console.log("✅ Configuration detected.");
  console.log(`📍 API URL: ${process.env.SATUSEHAT_API_URL}`);
  console.log(`📍 Org ID: ${process.env.SATUSEHAT_ORGANIZATION_ID}`);

  try {
    console.log("\n🔑 Attempting to get Access Token...");
    const token = await getAccessToken();
    console.log("✅ Token successfully retrieved!");
    console.log(`🎫 Token starts with: ${token.substring(0, 10)}...`);

    console.log("\n🏥 Running API Health Check...");
    const isHealthy = await healthCheck();
    if (isHealthy) {
      console.log("✅ SatuSehat API is reachable and healthy.");
    } else {
      console.warn(
        "⚠️ SatuSehat API health check failed (but token was retrieved)."
      );
    }

    console.log("\n✨ Connection Test PASSED!");
  } catch (error) {
    console.error("\n❌ Connection Test FAILED!");
    console.error(error);
    process.exit(1);
  }
}

main();

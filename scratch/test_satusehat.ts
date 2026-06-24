require('dotenv').config({ path: '.env.local' });

const { healthCheck, searchPatientByNIK } = require('../lib/satusehat/api-service');

async function runTest() {
  console.log("Testing SatuSehat API Connection...");
  console.log("API URL:", process.env.SATUSEHAT_API_URL);

  try {
    const isHealthy = await healthCheck();
    console.log("Health Check (metadata):", isHealthy ? "SUCCESS" : "FAILED");

    console.log("Testing searchPatientByNIK...");
    const patient = await searchPatientByNIK("1234567890123456");
    console.log("Search Result:", patient ? "Found" : "Not Found (but API responded)");

    console.log("\nTest completed successfully! The API is reachable.");
  } catch (error) {
    console.error("\nTest FAILED!");
    console.error(error);
  }
}

runTest();

import "dotenv/config";
import db from "./src/db/index.js";
import {
  auditLogs,
  alerts,
  integrationEvents,
  integrationBaselines,
  integrationPermissions,
  integrationCredentials,
  dataResources,
  integrations,
  users,
} from "./src/db/schema.js";

async function clearDatabase() {
  console.log("Clearing all tables...\n");

  const tables = [
    { name: "audit_logs", table: auditLogs },
    { name: "alerts", table: alerts },
    { name: "integration_events", table: integrationEvents },
    { name: "integration_baselines", table: integrationBaselines },
    { name: "integration_permissions", table: integrationPermissions },
    { name: "integration_credentials", table: integrationCredentials },
    { name: "data_resources", table: dataResources },
    { name: "integrations", table: integrations },
    { name: "users", table: users },
  ];

  for (const { name, table } of tables) {
    const result = await db.delete(table);
    console.log(`  Cleared ${name}`);
  }

  console.log("\nDone. Database is empty.");
}

clearDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

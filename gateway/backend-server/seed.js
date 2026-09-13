import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import db from "./src/db/index.js";
import {
  users,
  integrations,
  integrationCredentials,
  dataResources,
  integrationPermissions,
  integrationEvents,
  integrationBaselines,
  alerts,
  auditLogs,
} from "./src/db/schema.js";

const INTEGRATIONS = [
  { name: "delivery-provider", slug: "delivery-provider", description: "Third-party delivery service" },
  { name: "payment-provider", slug: "payment-provider", description: "Payment processing service" },
  { name: "messaging-provider", slug: "messaging-provider", description: "SMS and email messaging" },
  { name: "analytics-provider", slug: "analytics-provider", description: "Business analytics service" },
  { name: "identity-provider", slug: "identity-provider", description: "Identity verification service" },
];

const RESOURCES = [
  { name: "customers", category: "customer_profile", sensitivity: "confidential" },
  { name: "customer_addresses", category: "customer_address", sensitivity: "confidential" },
  { name: "customer_contacts", category: "customer_contact", sensitivity: "confidential" },
  { name: "orders", category: "order_data", sensitivity: "confidential" },
  { name: "payments", category: "payment_data", sensitivity: "restricted" },
  { name: "identity_verification", category: "identity_data", sensitivity: "restricted" },
  { name: "analytics", category: "analytics_data", sensitivity: "internal" },
  { name: "auth_tokens", category: "authentication_data", sensitivity: "restricted" },
  { name: "system_config", category: "internal_data", sensitivity: "restricted" },
];

const PERMISSIONS = {
  "delivery-provider": [
    { resource: "customer_addresses", action: "read", allowed: true, max: 100, maxHour: 5000 },
    { resource: "orders", action: "read", allowed: true, max: 50, maxHour: 2000 },
    { resource: "customers", action: "read", allowed: true, max: 500, maxHour: 5000 },
    { resource: "payments", action: "read", allowed: false, max: 0, maxHour: 0 },
    { resource: "identity_verification", action: "read", allowed: false, max: 0, maxHour: 0 },
  ],
  "payment-provider": [
    { resource: "payments", action: "read", allowed: true, max: 1000, maxHour: 10000 },
    { resource: "payments", action: "write", allowed: true, max: 100, maxHour: 5000 },
    { resource: "orders", action: "read", allowed: true, max: 200, maxHour: 5000 },
    { resource: "customers", action: "read", allowed: true, max: 100, maxHour: 2000 },
    { resource: "customer_addresses", action: "read", allowed: false, max: 0, maxHour: 0 },
  ],
  "messaging-provider": [
    { resource: "customer_contacts", action: "read", allowed: true, max: 500, maxHour: 10000 },
    { resource: "customers", action: "read", allowed: true, max: 200, maxHour: 5000 },
    { resource: "payments", action: "read", allowed: false, max: 0, maxHour: 0 },
  ],
  "analytics-provider": [
    { resource: "analytics", action: "read", allowed: true, max: 5000, maxHour: 50000 },
    { resource: "orders", action: "read", allowed: true, max: 1000, maxHour: 20000 },
    { resource: "customers", action: "read", allowed: true, max: 1000, maxHour: 20000 },
    { resource: "payments", action: "read", allowed: false, max: 0, maxHour: 0 },
  ],
  "identity-provider": [
    { resource: "identity_verification", action: "read", allowed: true, max: 500, maxHour: 5000 },
    { resource: "identity_verification", action: "write", allowed: true, max: 100, maxHour: 2000 },
    { resource: "customers", action: "read", allowed: true, max: 200, maxHour: 5000 },
    { resource: "payments", action: "read", allowed: false, max: 0, maxHour: 0 },
  ],
};

function randomIp() {
  return `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(auditLogs);
  await db.delete(alerts);
  await db.delete(integrationEvents);
  await db.delete(integrationBaselines);
  await db.delete(integrationPermissions);
  await db.delete(integrationCredentials);
  await db.delete(dataResources);
  await db.delete(integrations);
  await db.delete(users);

  // 1. Create users
  const hashedPassword = await bcrypt.hash("password123", 10);
  const [admin] = await db
    .insert(users)
    .values({ name: "Admin User", email: "admin@gwatch.dev", password: hashedPassword, role: "admin" })
    .returning();

  const [analyst] = await db
    .insert(users)
    .values({ name: "Analyst User", email: "analyst@gwatch.dev", password: hashedPassword, role: "analyst" })
    .returning();

  const [viewer] = await db
    .insert(users)
    .values({ name: "Viewer User", email: "viewer@gwatch.dev", password: hashedPassword, role: "viewer" })
    .returning();

  console.log(`Created ${3} users`);

  // 2. Create integrations
  const createdIntegrations = [];
  for (const integ of INTEGRATIONS) {
    const [created] = await db
      .insert(integrations)
      .values(integ)
      .returning();
    createdIntegrations.push(created);
  }
  console.log(`Created ${createdIntegrations.length} integrations`);

  // 3. Create credentials for each integration
  const credTypes = ["api_key", "bearer_token", "webhook_signature"];
  for (const integ of createdIntegrations) {
    const credType = credTypes[randomInt(0, 2)];
    const fakeCred = `${integ.slug}-key-${Date.now()}-${randomInt(1000, 9999)}`;
    const credHash = await bcrypt.hash(fakeCred, 10);

    await db.insert(integrationCredentials).values({
      integrationId: integ.id,
      type: credType,
      credentialHash: credHash,
      name: `${integ.name}-primary`,
      status: "active",
    });
  }
  console.log("Created credentials for all integrations");

  // 4. Create data resources
  const createdResources = [];
  for (const res of RESOURCES) {
    const [created] = await db.insert(dataResources).values(res).returning();
    createdResources.push(created);
  }
  console.log(`Created ${createdResources.length} data resources`);

  // 5. Create permissions
  let permCount = 0;
  for (const integ of createdIntegrations) {
    const perms = PERMISSIONS[integ.slug] || [];
    for (const p of perms) {
      const resource = createdResources.find((r) => r.name === p.resource);
      if (!resource) continue;

      await db.insert(integrationPermissions).values({
        integrationId: integ.id,
        resourceId: resource.id,
        action: p.action,
        allowed: p.allowed,
        maxRecordsPerRequest: p.max,
        maxRecordsPerHour: p.maxHour,
      });
      permCount++;
    }
  }
  console.log(`Created ${permCount} permissions`);

  // 6. Create baselines
  for (const integ of createdIntegrations) {
    await db.insert(integrationBaselines).values({
      integrationId: integ.id,
      avgRequestsPerMinute: randomInt(5, 20),
      avgRequestsPerHour: randomInt(200, 800),
      avgRecordsPerRequest: randomInt(1, 10),
      normalEndpoints: ["/customers/:id/address", "/orders", "/analytics"],
      normalDataCategories: ["customer_address", "order_data", "analytics_data"],
      normalHttpMethods: ["GET"],
      normalSourceIps: ["10.0.0.1", "10.0.0.2", "10.0.0.3"],
      totalRequests: randomInt(1000, 5000),
    });
  }
  console.log("Created baselines");

  // 7. Create normal events (for delivery-provider)
  const deliveryInteg = createdIntegrations.find((i) => i.slug === "delivery-provider");
  const events = [];

  // Normal events
  for (let i = 0; i < 20; i++) {
    events.push({
      integrationId: deliveryInteg.id,
      method: "GET",
      path: `/customers/${randomInt(100, 999)}/address`,
      resource: "customer_addresses",
      action: "read",
      dataCategory: "customer_address",
      recordsAccessed: randomInt(1, 5),
      sourceIp: randomIp(),
      userAgent: "delivery-app/1.0",
      authenticationMethod: "api_key",
      responseStatus: 200,
      responseTime: randomInt(50, 300),
      riskScore: randomInt(0, 15),
      decision: "allow",
      anomalyDetected: false,
    });
  }

  // Anomalous events
  // High volume
  events.push({
    integrationId: deliveryInteg.id,
    method: "GET",
    path: "/customers",
    resource: "customers",
    action: "read",
    dataCategory: "customer_profile",
    recordsAccessed: 10000,
    sourceIp: randomIp(),
    userAgent: "delivery-app/1.0",
    authenticationMethod: "api_key",
    responseStatus: 200,
    responseTime: 2500,
    riskScore: 70,
    decision: "alert",
    anomalyDetected: true,
    anomalyType: "excessive_records,new_endpoint",
  });

  // New data category (payments)
  events.push({
    integrationId: deliveryInteg.id,
    method: "GET",
    path: "/payments",
    resource: "payments",
    action: "read",
    dataCategory: "payment_data",
    recordsAccessed: 50,
    sourceIp: randomIp(),
    userAgent: "delivery-app/1.0",
    authenticationMethod: "api_key",
    responseStatus: 200,
    responseTime: 200,
    riskScore: 65,
    decision: "alert",
    anomalyDetected: true,
    anomalyType: "new_data_category,new_endpoint",
  });

  // Unauthorized access
  events.push({
    integrationId: deliveryInteg.id,
    method: "GET",
    path: "/identity-verification",
    resource: "identity_verification",
    action: "read",
    dataCategory: "identity_data",
    recordsAccessed: 100,
    sourceIp: "192.168.1.100",
    userAgent: "delivery-app/1.0",
    authenticationMethod: "api_key",
    responseStatus: 403,
    responseTime: 50,
    riskScore: 90,
    decision: "block",
    anomalyDetected: true,
    anomalyType: "unauthorized_access,unknown_ip",
  });

  // Blocked request
  events.push({
    integrationId: deliveryInteg.id,
    method: "POST",
    path: "/admin/users",
    resource: "system_config",
    action: "write",
    dataCategory: "internal_data",
    recordsAccessed: 5000,
    sourceIp: "192.168.1.100",
    userAgent: "delivery-app/1.0",
    authenticationMethod: "api_key",
    responseStatus: 403,
    responseTime: 30,
    riskScore: 95,
    decision: "block",
    anomalyDetected: true,
    anomalyType: "unauthorized_access,excessive_records,unknown_ip",
  });

  // Payment provider events
  const paymentInteg = createdIntegrations.find((i) => i.slug === "payment-provider");
  for (let i = 0; i < 10; i++) {
    events.push({
      integrationId: paymentInteg.id,
      method: "GET",
      path: `/transactions/${randomInt(1000, 9999)}`,
      resource: "payments",
      action: "read",
      dataCategory: "payment_data",
      recordsAccessed: randomInt(1, 20),
      sourceIp: randomIp(),
      userAgent: "payment-sdk/2.0",
      authenticationMethod: "bearer_token",
      responseStatus: 200,
      responseTime: randomInt(30, 150),
      riskScore: randomInt(0, 10),
      decision: "allow",
      anomalyDetected: false,
    });
  }

  // Insert all events
  await db.insert(integrationEvents).values(events);
  console.log(`Created ${events.length} events`);

  // 8. Create alerts
  const alertData = [
    {
      integrationId: deliveryInteg.id,
      severity: "high",
      title: "Excessive records requested",
      description: "delivery-provider requested 10,000 customer records (normal: 5)",
      riskScore: 70,
      status: "open",
    },
    {
      integrationId: deliveryInteg.id,
      severity: "critical",
      title: "Unauthorized payment data access",
      description: "delivery-provider accessed payment data without permission",
      riskScore: 65,
      status: "open",
    },
    {
      integrationId: deliveryInteg.id,
      severity: "critical",
      title: "Unauthorized identity data access blocked",
      description: "delivery-provider attempted to access identity verification data",
      riskScore: 90,
      status: "acknowledged",
      acknowledgedAt: new Date(),
    },
    {
      integrationId: deliveryInteg.id,
      severity: "critical",
      title: "Admin endpoint access blocked",
      description: "delivery-provider attempted to write to admin users endpoint",
      riskScore: 95,
      status: "resolved",
      resolvedAt: new Date(),
    },
    {
      integrationId: paymentInteg.id,
      severity: "medium",
      title: "Unknown IP detected",
      description: "payment-provider accessed from unfamiliar IP address",
      riskScore: 40,
      status: "open",
    },
  ];

  for (const alert of alertData) {
    await db.insert(alerts).values(alert);
  }
  console.log(`Created ${alertData.length} alerts`);

  // 9. Create audit logs
  const auditEntries = [
    { userId: admin.id, action: "integration_created", resourceType: "integration", resourceId: deliveryInteg.id, metadata: { name: "delivery-provider" } },
    { userId: admin.id, action: "integration_created", resourceType: "integration", resourceId: paymentInteg.id, metadata: { name: "payment-provider" } },
    { userId: admin.id, action: "credential_created", resourceType: "credential", metadata: { type: "api_key" } },
    { userId: analyst.id, action: "alert_acknowledged", resourceType: "alert", metadata: { title: "Unauthorized identity data access blocked" } },
    { userId: admin.id, action: "alert_resolved", resourceType: "alert", metadata: { title: "Admin endpoint access blocked" } },
    { userId: admin.id, action: "permission_changed", resourceType: "permission", metadata: { integration: "delivery-provider", resource: "payments", allowed: false } },
  ];

  for (const entry of auditEntries) {
    await db.insert(auditLogs).values(entry);
  }
  console.log(`Created ${auditEntries.length} audit logs`);

  console.log("\nSeed completed!");
  console.log("\nTest accounts (password: password123):");
  console.log("  Admin:   admin@gwatch.dev");
  console.log("  Analyst: analyst@gwatch.dev");
  console.log("  Viewer:  viewer@gwatch.dev");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

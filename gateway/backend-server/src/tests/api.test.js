import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createServer } from "http";
import app from "../app.js";
import { initSocket } from "../socket/index.js";

let server;
let baseUrl;
let db;

before(async () => {
  server = createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  const dbModule = await import("../db/index.js");
  db = dbModule.default;
});

after(() => {
  server.close();
});

async function request(method, path, body, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ==================== AUTH TESTS ====================

describe("Authentication", () => {
  it("should register a new user", async () => {
    const { status, data } = await request("POST", "/api/auth/register", {
      name: "Test User",
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: "password123",
      role: "admin",
    });
    assert.strictEqual(status, 201);
    assert.ok(data.token);
    assert.ok(data.user);
    assert.strictEqual(data.user.role, "admin");
  });

  it("should not register with duplicate email", async () => {
    const email = `dup-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    await request("POST", "/api/auth/register", {
      name: "First",
      email,
      password: "password123",
    });
    const { status } = await request("POST", "/api/auth/register", {
      name: "Second",
      email,
      password: "password123",
    });
    assert.strictEqual(status, 400);
  });

  it("should login with valid credentials", async () => {
    const email = `login-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    await request("POST", "/api/auth/register", {
      name: "Login User",
      email,
      password: "password123",
    });
    const { status, data } = await request("POST", "/api/auth/login", {
      email,
      password: "password123",
    });
    assert.strictEqual(status, 200);
    assert.ok(data.token);
  });

  it("should reject invalid password", async () => {
    const { status } = await request("POST", "/api/auth/login", {
      email: "nonexistent@example.com",
      password: "wrong",
    });
    assert.strictEqual(status, 401);
  });

  it("should return user on /me with valid token", async () => {
    const email = `me-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { data: reg } = await request("POST", "/api/auth/register", {
      name: "Me User",
      email,
      password: "password123",
    });
    const { status, data } = await request("GET", "/api/auth/me", null, {
      Authorization: `Bearer ${reg.token}`,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.user.email, email);
  });

  it("should reject /me without token", async () => {
    const { status } = await request("GET", "/api/auth/me");
    assert.strictEqual(status, 401);
  });
});

// ==================== INTEGRATION TESTS ====================

describe("Integrations", () => {
  let adminToken;
  let integrationId;
  const unique = `integ-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  before(async () => {
    const email = `admin-${unique}@example.com`;
    const { data } = await request("POST", "/api/auth/register", {
      name: "Admin",
      email,
      password: "password123",
      role: "admin",
    });
    adminToken = data.token;
  });

  it("should create an integration", async () => {
    const { status, data } = await request(
      "POST",
      "/api/integrations",
      { name: unique, description: "Test integration" },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 201);
    assert.ok(data.integration);
    assert.strictEqual(data.integration.slug, unique);
    integrationId = data.integration.id;
  });

  it("should list integrations", async () => {
    const { status, data } = await request("GET", "/api/integrations", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.integrations));
  });

  it("should get integration by id", async () => {
    const { status, data } = await request(
      "GET",
      `/api/integrations/${integrationId}`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(data.integration.id, integrationId);
  });

  it("should update integration", async () => {
    const { status, data } = await request(
      "PATCH",
      `/api/integrations/${integrationId}`,
      { status: "suspended" },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(data.integration.status, "suspended");
  });

  it("should require auth to create", async () => {
    const { status } = await request("POST", "/api/integrations", {
      name: "no-auth",
    });
    assert.strictEqual(status, 401);
  });
});

// ==================== CREDENTIAL TESTS ====================

describe("Credentials", () => {
  let adminToken;
  let integrationId;
  const unique = `cred-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  before(async () => {
    const email = `admin-${unique}@example.com`;
    const { data } = await request("POST", "/api/auth/register", {
      name: "Cred Admin",
      email,
      password: "password123",
      role: "admin",
    });
    adminToken = data.token;

    const { data: integ } = await request(
      "POST",
      "/api/integrations",
      { name: unique },
      { Authorization: `Bearer ${adminToken}` }
    );
    integrationId = integ.integration.id;
  });

  it("should create a credential", async () => {
    const { status, data } = await request(
      "POST",
      `/api/integrations/${integrationId}/credentials`,
      { type: "api_key", name: "primary", credential: `key-${unique}` },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 201);
    assert.ok(data.credential);
  });

  it("should list credentials", async () => {
    const { status, data } = await request(
      "GET",
      `/api/integrations/${integrationId}/credentials`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.credentials));
    assert.ok(data.credentials.length > 0);
  });

  it("should not expose credential hash", async () => {
    const { data } = await request(
      "GET",
      `/api/integrations/${integrationId}/credentials`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    for (const cred of data.credentials) {
      assert.strictEqual(cred.credentialHash, undefined);
    }
  });
});

// ==================== PERMISSION TESTS ====================

describe("Permissions", () => {
  let adminToken;
  let integrationId;
  let resourceId;
  const unique = `perm-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  before(async () => {
    const email = `admin-${unique}@example.com`;
    const { data } = await request("POST", "/api/auth/register", {
      name: "Perm Admin",
      email,
      password: "password123",
      role: "admin",
    });
    adminToken = data.token;

    const { data: integ } = await request(
      "POST",
      "/api/integrations",
      { name: unique },
      { Authorization: `Bearer ${adminToken}` }
    );
    integrationId = integ.integration.id;

    const { data: res } = await request(
      "POST",
      "/api/resources",
      { name: `res-${unique}`, category: "customer_profile", sensitivity: "confidential" },
      { Authorization: `Bearer ${adminToken}` }
    );
    resourceId = res.resource.id;
  });

  it("should set permission", async () => {
    const { status, data } = await request(
      "POST",
      `/api/integrations/${integrationId}/permissions`,
      { resourceId, action: "read", allowed: true, maxRecordsPerRequest: 100 },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 200);
    assert.ok(data.permission);
    assert.strictEqual(data.permission.allowed, true);
  });

  it("should list permissions", async () => {
    const { status, data } = await request(
      "GET",
      `/api/integrations/${integrationId}/permissions`,
      null,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.permissions));
  });
});

// ==================== ANOMALY DETECTION TESTS ====================

describe("Anomaly Detection", () => {
  it("should detect new endpoint", async () => {
    const { detectAnomalies } = await import("../services/anomaly.service.js");

    const event = { path: "/payments", dataCategory: "payment_data", recordsAccessed: 10 };
    const baseline = {
      normalEndpoints: ["/customers/:id/address", "/orders"],
      normalDataCategories: ["customer_address", "order_data"],
      normalSourceIps: ["10.0.0.1"],
      avgRecordsPerRequest: 2,
      avgRequestsPerHour: 500,
      totalRequests: 100,
    };

    const result = detectAnomalies(event, baseline);
    assert.strictEqual(result.hasAnomaly, true);
    assert.ok(result.anomalies.some((a) => a.type === "new_endpoint"));
  });

  it("should detect new data category", async () => {
    const { detectAnomalies } = await import("../services/anomaly.service.js");

    const event = { path: "/payments", dataCategory: "payment_data", recordsAccessed: 5 };
    const baseline = {
      normalEndpoints: ["/payments"],
      normalDataCategories: ["customer_address", "order_data"],
      normalSourceIps: [],
      avgRecordsPerRequest: 2,
      avgRequestsPerHour: 500,
      totalRequests: 100,
    };

    const result = detectAnomalies(event, baseline);
    assert.ok(result.anomalies.some((a) => a.type === "new_data_category"));
  });

  it("should detect excessive records", async () => {
    const { detectAnomalies } = await import("../services/anomaly.service.js");

    const event = { path: "/customers", dataCategory: "customer_profile", recordsAccessed: 20000 };
    const baseline = {
      normalEndpoints: ["/customers"],
      normalDataCategories: ["customer_profile"],
      normalSourceIps: [],
      avgRecordsPerRequest: 5,
      avgRequestsPerHour: 500,
      totalRequests: 100,
    };

    const result = detectAnomalies(event, baseline);
    assert.ok(result.anomalies.some((a) => a.type === "excessive_records"));
  });

  it("should detect unknown IP", async () => {
    const { detectAnomalies } = await import("../services/anomaly.service.js");

    const event = {
      path: "/customers",
      dataCategory: "customer_profile",
      recordsAccessed: 5,
      sourceIp: "203.0.113.50",
    };
    const baseline = {
      normalEndpoints: ["/customers"],
      normalDataCategories: ["customer_profile"],
      normalSourceIps: ["10.0.0.1", "10.0.0.2"],
      avgRecordsPerRequest: 5,
      avgRequestsPerHour: 500,
      totalRequests: 100,
    };

    const result = detectAnomalies(event, baseline);
    assert.ok(result.anomalies.some((a) => a.type === "unknown_ip"));
  });

  it("should not flag normal activity", async () => {
    const { detectAnomalies } = await import("../services/anomaly.service.js");

    const event = {
      path: "/customers/123/address",
      dataCategory: "customer_address",
      recordsAccessed: 1,
      sourceIp: "10.0.0.1",
    };
    const baseline = {
      normalEndpoints: ["/customers/:id/address"],
      normalDataCategories: ["customer_address"],
      normalSourceIps: ["10.0.0.1", "10.0.0.2"],
      avgRecordsPerRequest: 2,
      avgRequestsPerHour: 500,
      totalRequests: 100,
    };

    const result = detectAnomalies(event, baseline);
    assert.strictEqual(result.hasAnomaly, false);
    assert.strictEqual(result.score, 0);
  });
});

// ==================== RISK SCORING TESTS ====================

describe("Risk Scoring", () => {
  it("should calculate low risk for normal activity", async () => {
    const { calculateRiskScore } = await import("../services/anomaly.service.js");

    const detection = { anomalies: [], score: 0 };
    const result = calculateRiskScore(detection, false);
    assert.strictEqual(result.level, "low");
    assert.strictEqual(result.score, 0);
  });

  it("should calculate high risk for unauthorized access", async () => {
    const { calculateRiskScore } = await import("../services/anomaly.service.js");

    const detection = {
      anomalies: [{ type: "new_endpoint", message: "New endpoint" }],
      score: 20,
    };
    const result = calculateRiskScore(detection, true);
    assert.ok(result.score >= 60);
    assert.ok(result.level === "high" || result.level === "critical");
  });

  it("should cap score at 100", async () => {
    const { calculateRiskScore } = await import("../services/anomaly.service.js");

    const detection = {
      anomalies: Array(10).fill({ type: "test", message: "test" }),
      score: 90,
    };
    const result = calculateRiskScore(detection, true);
    assert.strictEqual(result.score, 100);
    assert.strictEqual(result.level, "critical");
  });
});

// ==================== ACTION DECISION TESTS ====================

describe("Action Decisions", () => {
  it("should allow low risk", async () => {
    const { decideAction } = await import("../services/anomaly.service.js");
    const result = decideAction("low");
    assert.strictEqual(result.decision, "allow");
  });

  it("should monitor medium risk", async () => {
    const { decideAction } = await import("../services/anomaly.service.js");
    const result = decideAction("medium");
    assert.strictEqual(result.decision, "monitor");
    assert.strictEqual(result.monitor, true);
  });

  it("should alert on high risk", async () => {
    const { decideAction } = await import("../services/anomaly.service.js");
    const result = decideAction("high");
    assert.strictEqual(result.decision, "alert");
    assert.strictEqual(result.alert, true);
  });

  it("should block critical risk", async () => {
    const { decideAction } = await import("../services/anomaly.service.js");
    const result = decideAction("critical");
    assert.strictEqual(result.decision, "block");
    assert.strictEqual(result.alert, true);
  });
});

// ==================== GATEWAY TESTS ====================

describe("Gateway", () => {
  let adminToken;
  let integrationId;
  let credentialValue;
  const unique = `gw-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  before(async () => {
    const email = `admin-${unique}@example.com`;
    const { data } = await request("POST", "/api/auth/register", {
      name: "Gateway Admin",
      email,
      password: "password123",
      role: "admin",
    });
    adminToken = data.token;

    const { data: integ } = await request(
      "POST",
      "/api/integrations",
      { name: unique },
      { Authorization: `Bearer ${adminToken}` }
    );
    integrationId = integ.integration.id;

    credentialValue = `gw-key-${unique}`;
    await request(
      "POST",
      `/api/integrations/${integrationId}/credentials`,
      { type: "api_key", name: "gw-key", credential: credentialValue },
      { Authorization: `Bearer ${adminToken}` }
    );
  });

  it("should reject request without credentials", async () => {
    const { status } = await request("GET", "/gateway/test");
    assert.strictEqual(status, 401);
  });

  it("should reject request with invalid credentials", async () => {
    const { status } = await request("GET", "/gateway/test", null, {
      "X-API-Key": "invalid-key",
    });
    assert.strictEqual(status, 401);
  });
});

// ==================== DASHBOARD TESTS ====================

describe("Dashboard", () => {
  let adminToken;

  before(async () => {
    const email = `admin-dash-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { data } = await request("POST", "/api/auth/register", {
      name: "Dashboard Admin",
      email,
      password: "password123",
      role: "admin",
    });
    adminToken = data.token;
  });

  it("should return overview", async () => {
    const { status, data } = await request("GET", "/api/dashboard/overview", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(status, 200);
    assert.ok(typeof data.totalIntegrations === "number");
    assert.ok(typeof data.activeIntegrations === "number");
    assert.ok(typeof data.requestsToday === "number");
  });

  it("should return activity", async () => {
    const { status, data } = await request("GET", "/api/dashboard/activity", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.activity));
  });

  it("should return risk stats", async () => {
    const { status, data } = await request("GET", "/api/dashboard/risk", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(status, 200);
    assert.ok(data.riskDistribution);
    assert.ok(data.decisionCounts);
  });
});

// ==================== DEV SIMULATOR TESTS ====================

describe("Dev Simulator", () => {
  let adminToken;

  before(async () => {
    const email = `admin-dev-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const { data } = await request("POST", "/api/auth/register", {
      name: "Dev Admin",
      email,
      password: "password123",
      role: "admin",
    });
    adminToken = data.token;
  });

  it("should list scenarios", async () => {
    const { status, data } = await request("GET", "/api/dev/scenarios", null, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.scenarios));
    assert.ok(data.scenarios.length > 0);
  });
});

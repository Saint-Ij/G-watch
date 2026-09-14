/**
 * End-to-end proxy test script.
 *
 * Prerequisites:
 *   1. Backend running on http://localhost:3000
 *   2. Mock backend running on http://localhost:4000 (node test/mock-backend.js)
 *   3. Database seeded (npm run seed)
 *
 * Usage:
 *   node test/proxy-test.js
 */

const GATEWAY = "http://localhost:3000";
const MOCK_BACKEND = "http://localhost:4000";

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function gatewayRequest(method, path, apiKey) {
  const headers = {};
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const res = await fetch(`${GATEWAY}/gateway${path}`, {
    method,
    headers,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  console.log("=== G-Watch Proxy Gateway Test ===\n");

  // 1. Login as admin
  console.log("1. Logging in as admin...");
  const login = await api("POST", "/api/auth/login", {
    email: "admin@gwatch.dev",
    password: "password123",
  });
  if (login.status !== 200) {
    console.error("   LOGIN FAILED:", login.data);
    process.exit(1);
  }
  const token = login.data.token;
  console.log("   OK\n");

  // 2. Check mock backend is running
  console.log("2. Checking mock backend...");
  try {
    const health = await fetch(`${MOCK_BACKEND}/health`);
    const healthData = await health.json();
    console.log(`   Mock backend: ${healthData.status}\n`);
  } catch (err) {
    console.error("   Mock backend not running. Start it with: node test/mock-backend.js");
    process.exit(1);
  }

  // 3. Create integration with targetUrl pointing to mock backend
  console.log("3. Creating integration with targetUrl...");
  const createIntg = await api("POST", "/api/integrations", {
    name: "test-proxy-backend",
    description: "Test integration with proxy to mock backend",
    targetUrl: MOCK_BACKEND,
  }, token);
  if (createIntg.status !== 201) {
    console.error("   CREATE FAILED:", createIntg.data);
    process.exit(1);
  }
  const integration = createIntg.data.integration;
  console.log(`   Created: ${integration.name} (id: ${integration.id})`);
  console.log(`   Slug: ${integration.slug}`);
  console.log(`   Target: ${integration.targetUrl}\n`);

  // 4. Create API key credential
  console.log("4. Creating API key credential...");
  const credValue = `test-key-${Date.now()}`;
  const createCred = await api("POST", `/api/integrations/${integration.id}/credentials`, {
    type: "api_key",
    name: "test-key",
    credential: credValue,
  }, token);
  if (createCred.status !== 201) {
    console.error("   CREDENTIAL FAILED:", createCred.data);
    process.exit(1);
  }
  console.log(`   Created credential: ${createCred.data.credential.name}`);
  console.log(`   API Key: ${credValue}\n`);

  // 5. Create data resources (customers, orders)
  console.log("5. Creating data resources...");
  const resources = [];
  for (const [name, category, sensitivity] of [
    ["customers", "customer_profile", "confidential"],
    ["orders", "order_data", "confidential"],
    ["payments", "payment_data", "restricted"],
  ]) {
    const r = await api("POST", "/api/resources", { name, category, sensitivity }, token);
    if (r.status === 201) {
      resources.push(r.data.resource);
    } else {
      // Resource may already exist - try to find it
      console.log(`   (resource ${name}: ${r.data.error || "created"})`);
    }
  }
  console.log(`   Resources: ${resources.length}\n`);

  // 6. Set permissions (allow customers and orders, deny payments)
  console.log("6. Setting permissions...");
  for (const res of resources) {
    const allowed = res.name !== "payments";
    await api("POST", `/api/integrations/${integration.id}/permissions`, {
      resourceId: res.id,
      action: "read",
      allowed,
      maxRecordsPerRequest: allowed ? 100 : 0,
      maxRecordsPerHour: allowed ? 5000 : 0,
    }, token);
    console.log(`   ${res.name}: ${allowed ? "ALLOWED" : "DENIED"}`);
  }
  console.log();

  // 7. Test proxy requests
  console.log("7. Testing proxy requests...\n");

  const tests = [
    { method: "GET", path: "/customers", label: "List customers" },
    { method: "GET", path: "/customers/1", label: "Get customer 1" },
    { method: "GET", path: "/customers/1/address", label: "Get customer 1 address" },
    { method: "GET", path: "/orders", label: "List orders" },
    { method: "GET", path: "/orders/101", label: "Get order 101" },
  ];

  for (const test of tests) {
    console.log(`   ${test.method} /gateway${test.path} (${test.label})`);

    const start = Date.now();
    const result = await gatewayRequest(test.method, test.path, credValue);
    const elapsed = Date.now() - start;

    console.log(`   Status: ${result.status} | Latency: ${elapsed}ms`);

    if (result.status === 200 && result.data?.data) {
      const preview = JSON.stringify(result.data.data).substring(0, 120);
      console.log(`   Response: ${preview}...`);
    } else if (result.data?.error) {
      console.log(`   Error: ${result.data.error}`);
    }

    // Check G-Watch response headers
    const decision = result.headers?.get("x-gwatch-decision");
    const riskScore = result.headers?.get("x-gwatch-risk-score");
    const latency = result.headers?.get("x-gwatch-latency");
    if (decision) {
      console.log(`   G-Watch: decision=${decision} risk=${riskScore} proxy_latency=${latency}ms`);
    }
    console.log();
  }

  // 8. Test permission denial (payments)
  console.log("8. Testing permission denial (payments)...");
  const blockedResult = await gatewayRequest("GET", "/payments", credValue);
  console.log(`   Status: ${blockedResult.status}`);
  console.log(`   Response: ${JSON.stringify(blockedResult.data)}\n`);

  // 9. Test non-existent endpoint (should still proxy)
  console.log("9. Testing unknown endpoint...");
  const unknownResult = await gatewayRequest("GET", "/nonexistent", credValue);
  console.log(`   Status: ${unknownResult.status}`);
  console.log(`   Response: ${JSON.stringify(unknownResult.data)}\n`);

  // 10. Verify events were recorded with correct response statuses
  console.log("10. Checking recorded events...");
  const events = await api("GET", "/api/dashboard/activity?limit=15", null, token);
  if (events.status === 200) {
    const activity = events.data.activity || [];
    console.log(`    Total recent events: ${activity.length}`);
    for (const evt of activity.slice(0, 8)) {
      console.log(`    - ${evt.method} ${evt.path} | risk: ${evt.riskScore} | decision: ${evt.decision}`);
    }
  }

  // 11. Cleanup
  console.log("\n11. Cleaning up test integration...");
  await api("DELETE", `/api/integrations/${integration.id}`, null, token);
  console.log("    Deleted test integration\n");

  console.log("=== Proxy test complete ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

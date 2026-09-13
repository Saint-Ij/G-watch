# API Documentation

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

### POST /api/auth/register
Register a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "admin"
}
```

**Roles:** `admin`, `analyst`, `viewer`

**Response (201):**
```json
{
  "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com", "role": "admin" },
  "token": "jwt-token"
}
```

### POST /api/auth/login
Login with email and password.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com", "role": "admin" },
  "token": "jwt-token"
}
```

### GET /api/auth/me
Get current authenticated user. Requires auth.

---

## Integrations

### POST /api/integrations
Create a new integration. Requires `admin` or `analyst` role.

**Body:**
```json
{
  "name": "delivery-provider",
  "description": "Third-party delivery service"
}
```

### GET /api/integrations
List all integrations.

### GET /api/integrations/:id
Get integration by ID.

### PATCH /api/integrations/:id
Update integration. Requires `admin` or `analyst` role.

**Body:**
```json
{
  "status": "suspended",
  "riskLevel": "high"
}
```

### DELETE /api/integrations/:id
Delete integration. Requires `admin` role.

---

## Credentials

### POST /api/integrations/:id/credentials
Create a credential for an integration.

**Body:**
```json
{
  "type": "api_key",
  "name": "production-key",
  "credential": "your-secret-key-here"
}
```

**Types:** `api_key`, `bearer_token`, `webhook_signature`

### GET /api/integrations/:id/credentials
List credentials (hashes not exposed).

### DELETE /api/integrations/:id/credentials/:credentialId
Revoke a credential.

---

## Permissions

### POST /api/integrations/:id/permissions
Set a permission for an integration.

**Body:**
```json
{
  "resourceId": "uuid-of-resource",
  "action": "read",
  "allowed": true,
  "maxRecordsPerRequest": 1000,
  "maxRecordsPerHour": 10000
}
```

**Actions:** `read`, `write`, `delete`

### GET /api/integrations/:id/permissions
List permissions for an integration.

### DELETE /api/integrations/:id/permissions/:permissionId
Delete a permission.

---

## Data Access Map

### GET /api/integrations/:id/data-access
Returns what the integration can access vs what it actually accesses.

**Response:**
```json
{
  "integration": "delivery-provider",
  "permissions": [
    {
      "category": "customer_address",
      "resourceName": "customer_addresses",
      "action": "read",
      "allowed": true,
      "sensitivity": "confidential"
    }
  ]
}
```

---

## Security Gateway

### ANY /gateway/*
All HTTP methods accepted. The gateway processes requests through the full monitoring pipeline.

**Identification methods:**
- `X-API-Key: <key>` header
- `Authorization: Bearer <token>` header

**Headers:**
- `X-Records-Count: <number>` (optional, tells system how many records were accessed)

**Response (200):**
```json
{
  "status": "processed",
  "decision": "allow",
  "riskScore": 5,
  "riskLevel": "low",
  "anomalyDetected": false
}
```

**Response (403 - blocked):**
```json
{
  "error": "Request blocked",
  "riskScore": 90,
  "riskLevel": "critical",
  "reasons": ["Access to unauthorized resource", "20000 records requested"]
}
```

---

## Alerts

### GET /api/alerts
List alerts. Query params: `status`, `severity`, `integrationId`.

### GET /api/alerts/:id
Get alert by ID.

### PATCH /api/alerts/:id
Update alert.

### POST /api/alerts/:id/acknowledge
Acknowledge an alert.

### POST /api/alerts/:id/resolve
Resolve an alert.

---

## Dashboard

### GET /api/dashboard/overview
Returns summary statistics.

### GET /api/dashboard/activity?limit=20
Returns recent gateway activity.

### GET /api/dashboard/risk
Returns risk distribution and decision counts.

### GET /api/dashboard/data-access
Returns data category access statistics.

### GET /api/dashboard/integrations/:id
Returns detailed dashboard for a specific integration.

---

## Data Resources

### POST /api/resources
Create a data resource. Requires `admin` role.

**Body:**
```json
{
  "name": "customers",
  "category": "customer_profile",
  "sensitivity": "confidential",
  "description": "Customer profile data"
}
```

### GET /api/resources
List all data resources.

---

## Audit Logs

### GET /api/audit-logs
List audit logs. Requires `admin` or `analyst` role. Query params: `userId`, `action`, `resourceType`.

---

## Dev Simulator (Development only)

### GET /api/dev/scenarios
List available test scenarios.

### POST /api/dev/simulate-event
Simulate a custom gateway event.

**Body:**
```json
{
  "integrationSlug": "delivery-provider",
  "method": "GET",
  "path": "/customers",
  "dataCategory": "customer_profile",
  "recordsAccessed": 10000,
  "sourceIp": "10.0.0.5"
}
```

### POST /api/dev/simulate-scenario/:name
Run a predefined scenario. Names: `NORMAL`, `HIGH_VOLUME`, `NEW_DATA`, `UNAUTHORIZED`, `REPEATED_ATTACK`, `SUSPICIOUS_IP`.

---

## Socket.IO Events

Connect to the server and listen for:

- `integration:event` - Any gateway event
- `integration:anomaly` - Anomaly detected
- `alert:new` - New alert created
- `integration:risk` - Integration risk level changed

**Event payload example:**
```json
{
  "integrationId": "uuid",
  "integrationName": "delivery-provider",
  "riskScore": 85,
  "level": "critical",
  "decision": "block"
}
```

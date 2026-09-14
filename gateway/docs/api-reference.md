# API Reference

Base URL: `http://localhost:3000`

All endpoints (except auth) require an `Authorization: Bearer <token>` header. Get a token by logging in first.

---

## Authentication

### POST /api/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "admin@gwatch.dev",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@gwatch.dev",
    "role": "admin"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### POST /api/auth/register

Create a new account. Every new user automatically receives admin privileges.

**Request:**
```json
{
  "name": "New User",
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "New User",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

---

### GET /api/auth/me

Get the currently logged-in user.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@gwatch.dev",
    "role": "admin"
  }
}
```

---

## Dashboard

These endpoints power the dashboard charts and stats.

### GET /api/dashboard/overview

Aggregate stats for today.

**Response:**
```json
{
  "totalIntegrations": 6,
  "activeIntegrations": 6,
  "requestsToday": 130,
  "anomaliesToday": 40,
  "openAlerts": 2,
  "blockedRequests": 3,
  "highRiskIntegrations": 0
}
```

---

### GET /api/dashboard/trust-scores

Trust scores for all integrations.

**Response:**
```json
{
  "integrations": [
    {
      "integrationId": "uuid",
      "name": "delivery-provider",
      "slug": "delivery-provider",
      "status": "active",
      "riskLevel": "low",
      "trustScore": 80,
      "trustLevel": "high",
      "totalEvents": 118,
      "anomalyCount": 39,
      "blockCount": 2,
      "openAlerts": 0,
      "permissionCount": 5,
      "allowedPermissions": 3,
      "lastSeenAt": "2026-09-13T14:18:57.869Z"
    }
  ]
}
```

---

### GET /api/dashboard/data-access-matrix

Which integrations can access which data.

**Response:**
```json
{
  "categories": ["customer_profile", "customer_address", "payment_data"],
  "matrix": [
    {
      "integrationId": "uuid",
      "name": "delivery-provider",
      "slug": "delivery-provider",
      "status": "active",
      "riskLevel": "low",
      "cells": [
        {
          "category": "customer_address",
          "permitted": true,
          "action": "read",
          "sensitivity": "confidential",
          "accessed": true,
          "accessCount": 15,
          "hasAnomaly": false
        }
      ],
      "permittedCount": 3,
      "accessedCount": 2,
      "unusedAccess": 1,
      "unauthorizedAccess": 0,
      "totalCategories": 7
    }
  ]
}
```

---

### GET /api/dashboard/risk-timeline

Risk scores over time (for charts).

**Response:**
```json
{
  "timeline": [
    {
      "timestamp": "2026-09-13T14:21:05.836Z",
      "avgRisk": 8,
      "maxRisk": 13,
      "total": 10,
      "anomalies": 0,
      "blocked": 0
    }
  ],
  "totalEvents": 130
}
```

---

### GET /api/dashboard/risk

Risk distribution across all events.

**Response:**
```json
{
  "riskDistribution": { "low": 90, "medium": 25, "high": 10, "critical": 5 },
  "decisionCounts": { "allow": 85, "monitor": 20, "alert": 10, "block": 5, "rate_limit": 10 },
  "totalEvents": 130
}
```

---

### GET /api/dashboard/data-access

Data category usage stats.

**Response:**
```json
{
  "dataCategories": { "customer_address": 50, "customer_profile": 30 },
  "totalEvents": 130
}
```

---

### GET /api/dashboard/activity

Recent gateway events.

**Query params:** `limit` (number, default 20)

**Response:**
```json
{
  "activity": [
    {
      "id": "uuid",
      "integrationId": "uuid",
      "method": "GET",
      "path": "/customers/123/address",
      "riskScore": 5,
      "decision": "allow",
      "anomalyDetected": false,
      "createdAt": "2026-09-13T14:18:57.869Z"
    }
  ]
}
```

---

### GET /api/dashboard/integrations/:id

Single integration detail with stats.

**Response:**
```json
{
  "integration": {
    "id": "uuid",
    "name": "delivery-provider",
    "slug": "delivery-provider",
    "status": "active",
    "riskLevel": "low"
  },
  "totalRequests": 118,
  "blockedRequests": 2,
  "anomalies": 39,
  "dataCategories": { "customer_address": 50 },
  "endpoints": { "/customers/123/address": 50 },
  "permissions": [
    {
      "id": "uuid",
      "action": "read",
      "allowed": true,
      "category": "customer_address",
      "resourceName": "customer_addresses"
    }
  ],
  "recentAlerts": [],
  "trustScore": 80
}
```

---

## Integrations

### GET /api/integrations

List all integrations (you see only your own unless you're admin).

**Response:**
```json
{
  "integrations": [
    {
      "id": "uuid",
      "name": "delivery-provider",
      "slug": "delivery-provider",
      "description": "Third-party delivery tracking",
      "status": "active",
      "riskLevel": "low",
      "createdAt": "2026-09-13T10:00:00.000Z",
      "updatedAt": "2026-09-13T10:00:00.000Z",
      "lastSeenAt": "2026-09-13T14:18:57.869Z"
    }
  ]
}
```

---

### POST /api/integrations

Create a new integration.

**Required role:** admin

**Request:**
```json
{
  "name": "my-integration",
  "description": "What this integration does",
  "targetUrl": "https://api.yourapp.com"
}
```

**Response (201):**
```json
{
  "integration": {
    "id": "uuid",
    "name": "my-integration",
    "slug": "my-integration",
    "description": "What this integration does",
    "status": "active",
    "riskLevel": "low"
  }
}
```

---

### GET /api/integrations/:id

Get one integration.

**Response:**
```json
{
  "integration": {
    "id": "uuid",
    "name": "my-integration",
    "slug": "my-integration",
    "description": "What this integration does",
    "status": "active",
    "riskLevel": "low",
    "ownerId": "uuid"
  }
}
```

---

### PATCH /api/integrations/:id

Update an integration.

**Required role:** admin

**Request (all fields optional):**
```json
{
  "name": "new-name",
  "description": "Updated description",
  "status": "suspended",
  "riskLevel": "high",
  "targetUrl": "https://new-backend.com"
}
```

Status options: `active`, `suspended`, `disabled`
Risk level options: `low`, `medium`, `high`, `critical`

---

### DELETE /api/integrations/:id

Delete an integration.

**Required role:** admin

---

## Credentials

### POST /api/integrations/:id/credentials

Add a credential (API key, token, or signature).

**Required role:** admin

**Request:**
```json
{
  "type": "api_key",
  "name": "partner-key",
  "credential": "the-actual-key-value"
}
```

Type options: `api_key`, `bearer_token`, `webhook_signature`

---

### GET /api/integrations/:id/credentials

List credentials for an integration.

---

### DELETE /api/integrations/:id/credentials/:credentialId

Revoke a credential.

**Required role:** admin

---

## Permissions

### POST /api/integrations/:id/permissions

Grant or deny access to a data category.

**Required role:** admin

**Request:**
```json
{
  "resourceId": "uuid-of-data-resource",
  "action": "read",
  "allowed": true,
  "maxRecordsPerRequest": 1000,
  "maxRecordsPerHour": 10000
}
```

Action options: `read`, `write`, `delete`

---

### GET /api/integrations/:id/permissions

List permissions for an integration.

---

### DELETE /api/integrations/:id/permissions/:permissionId

Remove a permission.

**Required role:** admin

---

### GET /api/integrations/:id/data-access

Get the data access map for one integration.

---

## Alerts

### GET /api/alerts

List alerts. All roles can access.

**Query params (all optional):**
- `status` — filter by status (e.g., `open`, `acknowledged`, `resolved`)
- `severity` — filter by severity (e.g., `high`, `critical`)
- `integrationId` — filter by integration

---

### GET /api/alerts/:id

Get alert detail. Includes related event and integration.

---

### PATCH /api/alerts/:id

Update alert fields.

**Required role:** admin

---

### POST /api/alerts/:id/acknowledge

Mark alert as acknowledged.

**Required role:** admin

---

### POST /api/alerts/:id/resolve

Mark alert as resolved.

**Required role:** admin

---

### POST /api/alerts/:id/review

Admin review with decision.

**Required role:** admin

**Request:**
```json
{
  "adminDecision": "block",
  "adminNotes": "Unauthorized access pattern detected"
}
```

Decision options:
- `allow` — normal traffic, no action needed
- `monitor` — watch closely
- `rate_limit` — throttle the integration
- `alert` — escalate for investigation
- `block` — stop all requests

---

## Data Resources

### GET /api/resources

List all data resources (customer_profile, payment_data, etc.).

---

### POST /api/resources

Create a data resource.

**Required role:** admin

**Request:**
```json
{
  "name": "customer_data",
  "category": "customer_profile",
  "sensitivity": "confidential",
  "description": "Customer profile information"
}
```

Category options: `customer_profile`, `customer_contact`, `customer_address`, `order_data`, `payment_data`, `identity_data`, `analytics_data`, `authentication_data`, `internal_data`

Sensitivity options: `public`, `internal`, `confidential`, `restricted`

---

## Gateway Proxy (Transparent Mode)

Third-party integrations send requests here. G-Watch intercepts and proxies to your backend.

### ANY /* (catch-all route)

**Headers:**
- `X-Api-Key: <key>` (required)

**Optional headers:**
- `X-Records-Count: <number>` — for anomaly detection

**Response (200 — allowed):**
```json
{
  "status": "processed",
  "decision": "allow",
  "riskScore": 5,
  "riskLevel": "low",
  "anomalyDetected": false
}
```

**Response (403 — blocked):**
```json
{
  "error": "Request blocked",
  "riskScore": 85,
  "riskLevel": "critical",
  "reasons": ["Unauthorized access to payment_data", "Volume spike detected"]
}
```

**Response (429 — rate limited):**
```json
{
  "error": "Rate limit exceeded",
  "limit": "100 requests per minute",
  "retryAfter": 45
}
```

---

## Gateway Proxy (Explicit Mode)

Same as transparent, but the third party calls `/gateway/:slug/*` explicitly.

### POST /gateway/:integrationSlug/*

**Headers:**
- `X-Api-Key: <key>` (required)

Same response formats as transparent mode.

---

## Dev Routes (Development Only)

Base: `/api/dev`

These only work in development mode.

### GET /api/dev/scenarios

List available simulation scenarios.

---

### POST /api/dev/simulate-event

Fire a single custom event.

**Request:**
```json
{
  "integrationSlug": "delivery-provider",
  "method": "GET",
  "path": "/customers",
  "dataCategory": "customer_profile",
  "recordsAccessed": 100,
  "sourceIp": "10.0.0.5"
}
```

---

### POST /api/dev/simulate-scenario/:name

Fire a predefined scenario.

Available scenarios: `NORMAL`, `HIGH_VOLUME`, `NEW_DATA`, `UNAUTHORIZED`, `REPEATED_ATTACK`, `SUSPICIOUS_IP`

---

### POST /api/dev/simulate-batch

Fire N events in sequence.

**Request:**
```json
{
  "scenarioName": "NORMAL",
  "count": 30,
  "delayMs": 80
}
```

**Response:**
```json
{
  "scenario": "NORMAL",
  "results": [...],
  "summary": {
    "total": 30,
    "allowed": 30,
    "monitored": 0,
    "alerted": 0,
    "blocked": 0,
    "avgRiskScore": 8,
    "maxRiskScore": 15,
    "anomaliesDetected": 0
  }
}
```

---

### GET /api/dev/integrations

List integrations for the dev simulator.

---

### POST /api/dev/reset

Clear all dev data (events, alerts, baselines, audit logs).

# G-Watch: Third-Party Integration Behaviour Monitoring Platform

A security backend that monitors external integrations with your system, detects unusual behaviour, and takes automated protective actions.

## What This System Does

When third-party services (delivery providers, payment processors, analytics tools, etc.) access your backend, this system:

1. **Identifies** which integration is making the request
2. **Validates** their credentials
3. **Checks** if they have permission for the requested resource
4. **Records** the activity
5. **Compares** against normal behaviour patterns
6. **Detects** anomalies
7. **Calculates** a risk score
8. **Decides** what action to take (allow, monitor, alert, or block)
9. **Notifies** the dashboard in real-time via Socket.IO

### Example Flow

```
Normal:
  delivery-api → GET /customers/123/address → 1 record → ALLOW

Suspicious:
  delivery-api → GET /payments → payment data → first time → ALERT

Critical:
  delivery-api → GET /customers → 20,000 records → baseline is 500 → BLOCK
```

## Architecture

```
External Integration
        ↓
   HTTP Request
        ↓
  Security Gateway
        ↓
  Identify Integration
        ↓
  Validate Credential
        ↓
  Check Permission
        ↓
  Record Activity
        ↓
  Compare Against Baseline
        ↓
  Detect Anomaly
        ↓
  Calculate Risk Score (0-100)
        ↓
  Apply Policy
        ↓
  ALLOW / MONITOR / RATE LIMIT / ALERT / BLOCK
        ↓
  Store Event
        ↓
  Notify Dashboard (Socket.IO)
```

## Tech Stack

- Node.js + Express.js
- PostgreSQL + Drizzle ORM
- Socket.IO for real-time updates
- Zod for validation
- bcrypt for password hashing
- JWT for authentication

## Project Structure

```
src/
  config/          - Environment and database config
  db/              - Database connection and schema
  middleware/      - Auth, validation, gateway identification
  routes/          - API route definitions
  controllers/     - Request handlers (thin)
  services/        - Business logic
  utils/           - Helpers, logging, JWT
  socket/          - Socket.IO setup
  app.js           - Express app setup
  server.js        - Server entry point
```

## How Integrations Are Identified

The gateway supports multiple identification methods:

1. **API Key** - `X-API-Key: <key>` header
2. **Bearer Token** - `Authorization: Bearer <token>` header
3. **Webhook Signature** - For webhook-based integrations

Every request is resolved to an `integrationId` and the authentication method is recorded.

## Permission System

Each integration has explicit permissions per data resource and action:

| Resource | Action | Allowed | Max Records/Request |
|----------|--------|---------|-------------------|
| customer_address | read | yes | 100 |
| payment_data | read | no | 0 |

If an integration accesses a resource without permission, it's flagged as unauthorized.

## Anomaly Detection

Uses simple rule-based detection (no AI/ML):

| Anomaly | Score | Description |
|---------|-------|-------------|
| New endpoint | +20 | Accessing a path not seen before |
| New data category | +25 | Accessing data type not seen before |
| Excessive records | +25 | Requesting 10x+ normal records |
| Unknown IP | +15 | Request from unfamiliar IP |
| Unauthorized access | +40 | Accessing forbidden resource |
| Unusual time | +10 | Request at 1-5 AM (with other anomalies) |
| High request volume | +20 | 20x+ normal request rate |

## Risk Scoring

Score range: 0-100

| Range | Level | Action |
|-------|-------|--------|
| 0-30 | LOW | Allow |
| 31-60 | MEDIUM | Allow + Monitor |
| 61-80 | HIGH | Allow + Alert |
| 81-100 | CRITICAL | Block |

Every risk score includes human-readable reasons.

## Rate Limiting

In-memory rate limiting per integration:
- 100 requests/minute
- 1000 requests/hour

When exceeded: HTTP 429 response + alert generated.

## Socket.IO Real-time Events

| Event | When |
|-------|------|
| `integration:event` | Any gateway request processed |
| `integration:anomaly` | Anomaly detected |
| `alert:new` | New alert created |
| `integration:risk` | Integration risk level changed |

## Database Setup

### Prerequisites
- PostgreSQL running
- Create database: `createdb gwatch_security`

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gwatch_security
JWT_SECRET=your-secret-here
NODE_ENV=development
```

### Run Migrations

```bash
npm run db:push
```

### Seed Database

```bash
npm seed
```

This creates:
- 1 admin user
- 5 integrations with different permissions
- Credentials for each integration
- 9 data resources
- Permissions per integration
- Baselines for behaviour tracking
- Normal and anomalous events
- Alerts at various severities
- Audit logs

**Test account (password: `password123`):**
- Admin: `admin@gwatch.dev`

## Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000`

## Running Tests

```bash
npm test
```

## API Quick Start

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123","role":"admin"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use the token from login response
TOKEN="your-token-here"

# Create integration
curl -X POST http://localhost:3000/api/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-service","description":"My external service"}'

# Simulate a normal event (dev mode)
curl -X POST http://localhost:3000/api/dev/simulate-scenario/NORMAL \
  -H "Authorization: Bearer $TOKEN"

# Simulate an attack
curl -X POST http://localhost:3000/api/dev/simulate-scenario/UNAUTHORIZED \
  -H "Authorization: Bearer $TOKEN"

# Check dashboard
curl http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"
```

## Development Simulator

In development mode, the `/api/dev` endpoints let you simulate gateway events without real third-party integrations.

**Pre-built scenarios:**
- `NORMAL` - Legitimate delivery request
- `HIGH_VOLUME` - 10,000 records requested
- `NEW_DATA` - Accessing payment data for first time
- `UNAUTHORIZED` - Accessing forbidden identity data
- `REPEATED_ATTACK` - Admin endpoint access attempt
- `SUSPICIOUS_IP` - Unknown IP address

Each scenario runs through the exact same monitoring pipeline as real requests.

## Data Resources

| Resource | Category | Sensitivity |
|----------|----------|-------------|
| customers | customer_profile | confidential |
| customer_addresses | customer_address | confidential |
| customer_contacts | customer_contact | confidential |
| orders | order_data | confidential |
| payments | payment_data | restricted |
| identity_verification | identity_data | restricted |
| analytics | analytics_data | internal |
| auth_tokens | authentication_data | restricted |
| system_config | internal_data | restricted |

# G-Watch Gateway

**Third-party integration behaviour monitoring platform**

G-Watch sits between your backend and third-party integrations. It monitors every request in real time, detects anomalies, calculates risk, and gives you full visibility and control — without changing the third party's code.

---

## What G-Watch Does

```
Third-party Integration
        │
        │  Sends request to your backend
        │
        ▼
┌───────────────────────────────┐
│         G-Watch               │
│                               │
│  ✓ Validates API key          │
│  ✓ Checks rate limits         │
│  ✓ Detects anomalies          │
│  ✓ Calculates risk (0-100)    │
│  ✓ Blocks if dangerous        │
│  ✓ Logs everything            │
│                               │
│  If allowed → proxies to your │
│  real backend and returns the │
│  actual response              │
└───────────────────────────────┘
        │
        ▼
Your Backend API
```

**The third party never knows G-Watch exists.** You give them G-Watch's URL instead of yours. Their code works unchanged.

---

## Quick Start

### 1. Install

```bash
# Clone the repo
git clone <repo-url> && cd gateway

# Backend
cd backend-server
cp .env.example .env     # Edit JWT_SECRET and DATABASE_URL
npm install

# Frontend
cd ../frontend-dashboard
npm install
```

### 2. Set Up Database

```bash
cd backend-server
npx drizzle-kit push      # Create tables
npm run seed              # Add demo data
```

### 3. Start

```bash
# Terminal 1 — Backend
cd backend-server
npm run dev               # http://localhost:3000

# Terminal 2 — Frontend
cd frontend-dashboard
npm run dev               # http://localhost:5173
```

### 4. Login

Open http://localhost:5173 and sign in:

| Email | Password | Role |
|-------|----------|------|
| `admin@gwatch.dev` | `password123` | Admin (full access) |

Every new account automatically gets admin privileges.

---

## How to Connect Your Backend

### Step 1: Create an Integration

```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gwatch.dev","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Create integration (point to your real backend)
curl -X POST http://localhost:3000/api/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-api","description":"My backend","targetUrl":"https://api.yourapp.com"}'
```

### Step 2: Create an API Key

```bash
# Get the integration ID from the step above
curl -X POST http://localhost:3000/api/integrations/INTEGRATION_ID/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"api_key","name":"partner-key","credential":"my-secret-key-123"}'
```

### Step 3: Give the Third Party

- **URL**: `http://localhost:3000` (or your production G-Watch URL)
- **API Key**: `my-secret-key-123`

### Step 4: They Call Your Backend Normally

```bash
# Third party sends requests to G-Watch (thinks it's your backend)
curl http://localhost:3000/customers/123 \
  -H "X-Api-Key: my-secret-key-123"

# G-Watch intercepts → evaluates → proxies to https://api.yourapp.com/customers/123
# Returns the real response from your backend
```

**That's it.** The third party's code doesn't change. G-Watch handles everything transparently.

---

## Two Proxy Modes

| Mode | How it works | When to use |
|------|-------------|-------------|
| **Transparent** | Third party calls G-Watch's URL directly. They don't know G-Watch exists. | Third party can't change their code. |
| **Explicit** | Third party calls `/gateway/:slug/*` explicitly. They know they're being monitored. | Third party is cooperative. |

---

## Features

### Real-Time Monitoring Dashboard
- Overview stats (requests today, anomalies, blocked, open alerts)
- Risk distribution charts
- Decision breakdown (allowed / monitored / alerted / blocked)
- Activity feed with live updates

### Trust Score
Every integration gets a 0-100 trust score based on:
- Risk level (low/medium/high/critical)
- Anomaly rate (last 50 events)
- Block rate
- Open alerts

### Data Access Matrix
A grid showing which integrations can access which data categories:
- Green = permitted and used
- Dim green = permitted but unused
- Red = unauthorized access
- Grey = no access

### Anomaly Detection
Detects in real time:
- Volume spikes (requests exceed baseline)
- New data categories (accessing something new)
- Unauthorized access (no permission)
- Unknown IP addresses
- Unusual hours (1 AM - 5 AM)

### Admin-in-the-Loop Review
The system recommends an action. The admin decides:
- **Allow** — normal traffic, ignore
- **Monitor** — watch closely
- **Rate Limit** — throttle the integration
- **Alert** — escalate for investigation
- **Block** — stop all requests

Every decision is logged to the audit trail.

### False-Alarm Proof Demo
Click "Run Demo" on the dashboard. It fires 30 normal requests (no alerts) then 30 attack requests (gets blocked). Proves the system distinguishes busy days from actual threats.

---

## Project Structure

```
gateway/
├── backend-server/          Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── routes/          API endpoints
│   │   ├── controllers/     Request handlers
│   │   ├── services/        Business logic
│   │   ├── middleware/       Auth, rate limiting
│   │   ├── db/              Database schema
│   │   └── config/          Environment config
│   ├── seed.js              Demo data
│   └── clear.js             Clear database
│
└── frontend-dashboard/      React + Vite
    └── src/
        ├── pages/           Dashboard, Alerts, Integrations
        ├── components/      Charts, Matrix, Simulation
        ├── api.js           API client
        ├── socket.js        Real-time connection
        └── store.jsx        Auth state
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express v5, PostgreSQL |
| ORM | Drizzle ORM |
| Auth | JWT + bcrypt |
| Real-time | Socket.IO |
| Frontend | React 19, Vite 8 |
| Charts | Recharts |
| Validation | Zod |

---

## Environment Variables

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gwatch_security
JWT_SECRET=your-secret-here    # Required — server won't start without it
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start backend with hot reload |
| `npm run seed` | Populate database with demo data |
| `npm run clear` | Empty all tables |
| `npm test` | Run unit tests |
| `npm run test:proxy` | Test the proxy end-to-end |
| `npm run mock-backend` | Start a mock backend for testing |

---

## Documentation

| Doc | What's in it |
|-----|-------------|
| [Architecture](docs/architecture.md) | How the system works, data flow, algorithms |
| [Integration Guide](docs/integration-guide.md) | Step-by-step guide to connect your backend |
| [API Reference](docs/api-reference.md) | Every endpoint with examples |
| [Deployment](docs/deployment.md) | Production setup, nginx config, troubleshooting |
| [Feature Overview](docs/feature-overview.md) | How each capability is addressed |

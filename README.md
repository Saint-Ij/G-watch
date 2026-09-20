# G-Watch

G-Watch is a prototype security gateway for third-party API integrations.

It sits between a business backend and external services such as delivery,
payment, marketing, analytics, or scraping tools. Every request passes through
G-Watch first, where it is identified, checked against permissions, scored for
risk, logged, and either forwarded to the real backend or blocked.

In this repository, the "real backend" is a small synthetic e-commerce API, and
the third parties are demo services that generate normal and suspicious traffic.

## What You Can Do With It

- Run a monitored API gateway on `http://localhost:3000`
- Run a React security dashboard on `http://localhost:5173`
- Run a sample e-commerce backend on `http://localhost:4000`
- Simulate legitimate third-party traffic
- Simulate compromised or malicious third-party traffic
- Watch requests, risk scores, alerts, audit logs, and trust scores update

## How The Pieces Fit Together

```text
Third-party demo services
  delivery, payment, marketing, malicious scraper
              |
              | HTTP requests with X-Api-Key
              v
G-Watch gateway backend
  validates credentials, checks permissions, scores risk,
  logs events, emits real-time dashboard updates
              |
              | only if allowed
              v
E-commerce backend
  synthetic customers, products, orders, and payments

React dashboard
  talks to G-Watch backend and shows events, alerts, resources,
  integrations, audit logs, and documentation pages
```

## Repository Structure

```text
G-watch/
├── gateway/
│   ├── backend-server/          Node.js + Express + PostgreSQL gateway API
│   ├── frontend-dashboard/      React + Vite dashboard
│   └── docs/                    Gateway architecture and API docs
├── E-commerce/
│   └── backend/                 FastAPI sample e-commerce API
├── api-integrations/            FastAPI demo third-party services
└── README.md                    This file
```

## Main Technologies

| Area | Technology |
| --- | --- |
| Gateway backend | Node.js, Express, Socket.IO, Drizzle ORM |
| Gateway database | PostgreSQL |
| Dashboard | React, Vite, React Router, Recharts |
| Target API | Python, FastAPI, JSON files |
| Demo integrations | Python, FastAPI, httpx |

## Prerequisites

Install these before starting:

- Node.js 20 or newer
- npm
- Python 3.12 or newer
- PostgreSQL
- Git

You also need a PostgreSQL database named `gwatch_security`.

```bash
createdb gwatch_security
```

If your PostgreSQL username, password, host, or port is different, update the
`DATABASE_URL` value in `gateway/backend-server/.env`.

## Quick Start

The full app runs best with four terminals:

1. E-commerce backend
2. G-Watch gateway backend
3. React dashboard
4. Optional demo integration services

### 1. Set Up The E-commerce Backend

This is the protected API that G-Watch forwards safe requests to.

```bash
cd E-commerce/backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python seed.py
python -m uvicorn server:app --host 0.0.0.0 --port 4000 --reload
```

Check that it works:

```bash
curl http://localhost:4000/health
```

Swagger docs are available at:

```text
http://localhost:4000/docs
```

### 2. Set Up The G-Watch Gateway Backend

Open a new terminal:

```bash
cd gateway/backend-server
cp .env.example .env
npm install
npm run db:push
npm run seed
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

Check that it works:

```bash
curl http://localhost:3000/health
```

The default seeded login is:

| Email | Password |
| --- | --- |
| `admin@gwatch.dev` | `password123` |

Important: `npm run seed` creates demo integrations and hashed demo
credentials. The generated credential values are not printed or recoverable
after hashing, so for real proxy demos you should create your own API keys from
the dashboard or API.

### 3. Set Up The Dashboard

Open a new terminal:

```bash
cd gateway/frontend-dashboard
npm install
npm run dev
```

Open the dashboard:

```text
http://localhost:5173
```

Log in with:

```text
admin@gwatch.dev
password123
```

The dashboard uses Vite's development proxy, so browser calls to `/api`,
`/gateway`, and `/socket.io` are forwarded to the backend on port `3000`.

## Create A Working Integration Key

To send requests through G-Watch, an integration needs:

- a target URL, usually `http://localhost:4000`
- an active credential, usually an API key
- permissions for the resources it can access

You can do this in the dashboard, or with the API.

### Login And Store A Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gwatch.dev","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

### Create A New Integration

```bash
curl -X POST http://localhost:3000/api/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-delivery",
    "description": "Demo delivery provider",
    "targetUrl": "http://localhost:4000"
  }'
```

Copy the returned integration `id`.

### Create An API Key

Choose your own key value. G-Watch stores only a hash of it.

```bash
curl -X POST http://localhost:3000/api/integrations/INTEGRATION_ID/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_key",
    "name": "demo-key",
    "credential": "demo-delivery-key"
  }'
```

### Add Permissions

First list resources:

```bash
curl http://localhost:3000/api/resources \
  -H "Authorization: Bearer $TOKEN"
```

Then create permissions using the resource IDs you need. For example, allow
read access to customers:

```bash
curl -X POST http://localhost:3000/api/integrations/INTEGRATION_ID/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "CUSTOMERS_RESOURCE_ID",
    "action": "read",
    "allowed": true,
    "maxRecordsPerRequest": 500,
    "maxRecordsPerHour": 5000
  }'
```

## Send Traffic Through G-Watch

After the integration has a target URL, API key, and permissions, call G-Watch
instead of calling the e-commerce backend directly.

```bash
curl http://localhost:3000/customers \
  -H "X-Api-Key: demo-delivery-key"
```

G-Watch will:

1. identify the integration from the API key
2. check the key is active
3. infer the resource from the path
4. check permissions
5. calculate risk
6. log the event
7. forward the request to `http://localhost:4000/customers` if allowed
8. return the e-commerce backend response

G-Watch also adds response headers such as:

```text
x-gwatch-decision
x-gwatch-risk-score
x-gwatch-risk-level
x-gwatch-latency
```

## Run The Demo Third-Party Services

The `api-integrations` folder contains five small FastAPI apps:

| Service | Port | Behavior |
| --- | --- | --- |
| Delivery | `5001` | Normal address and order traffic |
| Payment Analytics | `5002` | Normal payment and order traffic |
| Marketing | `5003` | Normal customer-profile traffic |
| Compromised Delivery | `5004` | Delivery identity trying forbidden access |
| Malicious Scraper | `5005` | Bulk scraping and payment probing |

Set them up:

```bash
cd api-integrations
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and add the API keys you created in G-Watch:

```env
GWATCH_URL=http://localhost:3000
DELIVERY_X_API_KEY=demo-delivery-key
PAYMENT_ANALYTICS_X_API_KEY=your-payment-key
MARKETING_X_API_KEY=your-marketing-key
COMPROMISED_DELIVERY_X_API_KEY=demo-delivery-key
MALICIOUS_SCRAPER_X_API_KEY=your-scraper-key
```

Run each service in its own terminal:

```bash
python delivery_service.py
python payment_analytics_service.py
python marketing_service.py
python compromised_delivery_service.py
python malicious_scraper_service.py
```

Trigger scenarios:

```bash
curl -X POST http://localhost:5001/run
curl -X POST http://localhost:5002/run
curl -X POST http://localhost:5003/run
curl -X POST http://localhost:5004/run
curl -X POST http://localhost:5005/run
```

Then open the dashboard and check:

- Dashboard overview
- Integrations
- Alerts
- Event log
- Audit logs
- Resources

## Gateway Proxy Modes

G-Watch supports two request styles.

### Transparent Mode

The third party calls G-Watch as if it is the real backend:

```bash
curl http://localhost:3000/customers \
  -H "X-Api-Key: demo-delivery-key"
```

G-Watch forwards the request to the integration's `targetUrl` using the same
path.

### Explicit Gateway Mode

The third party calls a `/gateway/...` path:

```bash
curl http://localhost:3000/gateway/demo-delivery/customers \
  -H "X-Api-Key: demo-delivery-key"
```

G-Watch still identifies the integration from the API key. The extra path
segment is stripped before the request is forwarded to the target backend.

## E-commerce API Endpoints

The sample backend exposes:

```text
GET  /health
GET  /customers
GET  /customers/{customer_id}
GET  /customers/{customer_id}/address
POST /customers

GET  /products
GET  /products/{product_id}
POST /products

GET  /orders
GET  /orders/{order_id}
POST /orders

GET  /payments
GET  /payments/{payment_id}
POST /payments
```

List endpoints support pagination:

```bash
curl "http://localhost:4000/customers?page=1&limit=10"
```

## Gateway Backend Scripts

Run these from `gateway/backend-server`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start backend with Node watch mode |
| `npm start` | Start backend normally |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run seed` | Reset and seed demo data |
| `npm run clear` | Clear database data |
| `npm test` | Run backend tests |
| `npm run test:proxy` | Run proxy test script |
| `npm run mock-backend` | Run mock backend for proxy testing |

## Dashboard Scripts

Run these from `gateway/frontend-dashboard`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production assets |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Environment Variables

### Gateway Backend

File: `gateway/backend-server/.env`

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gwatch_security
JWT_SECRET=change-this-to-a-secure-random-string
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Demo Integrations

File: `api-integrations/.env`

```env
GWATCH_URL=http://localhost:3000
GWATCH_TIMEOUT=10
RUN_ON_START=false
DELIVERY_X_API_KEY=
PAYMENT_ANALYTICS_X_API_KEY=
MARKETING_X_API_KEY=
COMPROMISED_DELIVERY_X_API_KEY=
MALICIOUS_SCRAPER_X_API_KEY=
```

## How G-Watch Makes Decisions

For each request, the gateway looks at:

- credential validity
- integration status
- requested resource
- requested action
- permission rules
- requested record count
- historical baseline
- source IP
- endpoint novelty
- data category novelty
- request volume
- unusual access time

Risk scores are from `0` to `100`:

| Score | Level | Typical decision |
| --- | --- | --- |
| `0-30` | Low | Allow |
| `31-60` | Medium | Monitor |
| `61-80` | High | Alert |
| `81-100` | Critical | Block |

Decisions and events are saved to PostgreSQL and broadcast to the dashboard over
Socket.IO.

## Troubleshooting

### `JWT_SECRET environment variable is required`

Create the backend environment file:

```bash
cd gateway/backend-server
cp .env.example .env
```

Then set `JWT_SECRET` to any non-empty secret in development.

### Database connection fails

Make sure PostgreSQL is running and the database exists:

```bash
createdb gwatch_security
```

Also check `DATABASE_URL` in `gateway/backend-server/.env`.

### Dashboard cannot log in

Make sure the gateway backend is running on port `3000`, then reseed:

```bash
cd gateway/backend-server
npm run seed
```

Use:

```text
admin@gwatch.dev
password123
```

### Requests through G-Watch return `Permission denied`

The integration exists and the key is valid, but it does not have permission for
that resource/action. Add a permission in the dashboard or through
`POST /api/integrations/:id/permissions`.

### Requests through G-Watch return `Target backend unreachable`

Start the e-commerce backend:

```bash
cd E-commerce/backend
source .venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 4000 --reload
```

Also confirm the integration `targetUrl` is `http://localhost:4000`.

### Demo integration says `API key is not configured`

Open `api-integrations/.env` and set the API key for that service. The key must
match a credential you created in G-Watch.

## Useful Documentation In This Repo

- `gateway/README.md`: gateway overview and feature summary
- `gateway/backend-server/README.md`: backend architecture and API quick start
- `gateway/backend-server/API.md`: backend API details
- `gateway/docs/architecture.md`: architecture notes
- `gateway/docs/api-reference.md`: API reference
- `gateway/docs/deployment.md`: deployment notes
- `gateway/docs/integration-guide.md`: integration guide
- `E-commerce/backend/README.md`: sample target API docs
- `api-integrations/README.md`: demo third-party service docs

## Prototype Notes

This is a development prototype, not a production-ready security product.

- The e-commerce backend uses JSON files instead of a production database.
- The e-commerce backend intentionally has no authentication; G-Watch is the
  security layer in front of it.
- Gateway rate limiting is in memory.
- Seeded credentials are hashed, and their original values are not recoverable.
- The default `JWT_SECRET` in `.env.example` must be changed for real use.
- Permissions and detection rules are intentionally simple so the behavior is
  easy to understand during demos.

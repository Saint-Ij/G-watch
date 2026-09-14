# Architecture

G-Watch Gateway monitors third-party API integrations in real time, detecting anomalies and blocking threats before they reach your backend.

---

## System Diagram

```
┌─────────────────────┐
│  Third-Party APIs   │   Delivery service, payment processor, etc.
│  (external services)│   Each has an API key issued by G-Watch
└─────────┬───────────┘
          │ HTTP requests with X-Api-Key
          ▼
┌─────────────────────────────────────────────────────┐
│                G-Watch Gateway                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Auth     │→ │ Rate     │→ │ Anomaly Detection │  │
│  │ (API key │  │ Limiter  │  │ (new endpoint,    │  │
│  │  check)  │  │          │  │  new category,    │  │
│  └──────────┘  └──────────┘  │  excessive volume, │  │
│                              │  unknown IP)       │  │
│                              └────────┬──────────┘  │
│                                       │              │
│                              ┌────────▼──────────┐  │
│                              │ Risk Scoring       │  │
│                              │ (0-100 score,      │  │
│                              │  low/med/high/crit)│  │
│                              └────────┬──────────┘  │
│                                       │              │
│                              ┌────────▼──────────┐  │
│                              │ Decision Engine    │  │
│                              │ allow/monitor/     │  │
│                              │ rate_limit/alert/  │  │
│                              │ block              │  │
│                              └────────┬──────────┘  │
│                                       │              │
│                    ┌──────────────────┼─────────┐    │
│                    ▼                  ▼         ▼    │
│              ┌──────────┐    ┌──────────┐ ┌──────┐  │
│              │ Event Log│    │ Alerts   │ │Audit │  │
│              │ (realtime│    │ (auto-   │ │ Log  │  │
│              │ Socket.IO)│   │ created) │ │      │  │
│              └──────────┘    └──────────┘ └──────┘  │
│                                       │              │
│                              ┌────────▼──────────┐  │
│                              │ Proxy to Backend   │  │
│                              │ (if allowed)       │  │
│                              └────────┬──────────┘  │
└───────────────────────────────────────┼──────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │ Your Backend     │
                              │ (ecommerce API)  │
                              │ Port 4000        │
                              └──────────────────┘
```

---

## Components

### Backend Server (Node.js/Express v5)

| Component | Purpose |
|-----------|---------|
| Auth middleware | Validates API keys (bcrypt-hashed), JWT tokens for dashboard users |
| Rate limiter | 100 requests/minute, 1000/hour per integration |
| Anomaly detector | Detects new endpoints, new data categories, excessive records, volume spikes, unknown IPs |
| Risk scorer | Calculates 0-100 score based on anomalies + permission denials |
| Decision engine | Maps risk level to action (allow/monitor/alert/block) |
| Transparent proxy | Forwards requests to backend, preserving all original headers |
| Socket.IO | Streams events to dashboard in real time |

### Frontend Dashboard (React 19 + Vite)

| Page | Purpose |
|------|---------|
| Dashboard | Stats overview, charts, trust scores, risk timeline, data access matrix |
| Integrations | List and manage third-party integrations |
| Integration Detail | Permissions, credentials, data categories, endpoints, alerts per integration |
| Event Log | Real-time streaming of all gateway events |
| Alerts | View, acknowledge, resolve, and review security alerts |
| Resources | Define data categories and sensitivity levels |
| Audit Log | Track all admin actions |

---

## Data Flow

1. Third party sends `GET /customers/123` to G-Watch with `X-Api-Key: xxx`
2. G-Watch identifies the integration from the API key
3. G-Watch extracts resource name from URL path (`customers`)
4. G-Watch checks if the integration has permission for `customers:read`
5. G-Watch runs anomaly detection against the integration's baseline
6. G-Watch calculates risk score (0-100)
7. G-Watch decides: allow, monitor, alert, or block
8. If allowed → proxies to `http://localhost:4000/customers/123`
9. Returns backend response to third party
10. Event is logged and streamed to dashboard via Socket.IO
11. If risk is high → alert is automatically created

---

## Proxy Modes

### Transparent Mode (recommended)

Third party calls G-Watch as if it were the real backend:

```
Third party → GET http://localhost:3000/customers/123
              Header: X-Api-Key: xxx
              → G-Watch → GET http://localhost:4000/customers/123
              → Response returned to third party
```

The third party doesn't know G-Watch exists.

### Explicit Mode

Third party knows they're going through G-Watch:

```
Third party → GET http://localhost:3000/gateway/delivery-service/customers/123
              Header: X-Api-Key: xxx
              → G-Watch → GET http://localhost:4000/customers/123
              → Response returned to third party
```

---

## Security Model

| Layer | What it does |
|-------|-------------|
| Authentication | API key validated via bcrypt hash lookup (cached, refreshed every 60s) |
| Authorization | Per-resource, per-action permission checks |
| Rate limiting | 100 req/min, 1000 req/hour per integration |
| Anomaly detection | 6 detection types: new endpoint, new category, excessive records, volume spike, unknown IP, unusual time |
| Risk scoring | 0-100 scale, mapped to low/medium/high/critical |
| Auto-blocking | Critical risk = request blocked, never forwarded to backend |
| Alerting | High/critical risk = alert created for admin review |

---

## Demo Architecture

For the demo setup, the system runs with:

```
Third-party APIs (5 services, ports 5001-5005)
    ↓
G-Watch Gateway (port 3000)
    ↓
Ecommerce Backend (port 4000, fake data)
```

See `TEAMMATE-GUIDE.md` for details on what each teammate builds.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js, Express v5, PostgreSQL, Drizzle ORM |
| Frontend | React 19, Vite 8, Recharts, Socket.IO client |
| Auth | JWT (dashboard users), bcrypt API keys (integrations) |
| Real-time | Socket.IO (WebSocket + polling fallback) |
| Validation | Zod schemas |
| Security | Helmet, express-rate-limit, CORS |

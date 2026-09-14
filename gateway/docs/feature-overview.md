# Feature Overview

How G-Watch addresses each core capability.

---

## 1. Multi-Integration Monitoring

A platform that monitors several third-party integrations simultaneously, with some behaving normally and some misbehaving.

- 5 seeded integrations: `delivery-provider`, `payment-provider`, `messaging-provider`, `analytics-provider`, `identity-provider`
- Dev simulator with 6 predefined scenarios:
  - `NORMAL` — Expected low-risk request
  - `HIGH_VOLUME` — Volume spike (10,000 records)
  - `NEW_DATA` — Accessing unfamiliar data category
  - `UNAUTHORIZED` — Accessing data without permission
  - `REPEATED_ATTACK` — Repeated forbidden access
  - `SUSPICIOUS_IP` — Request from unknown IP
- `POST /api/dev/simulate-batch` fires N events in sequence for demos
- Seed data includes normal and anomalous events for each integration

---

## 2. Live Data Access Map

A live map of what data each integration can reach and what it touches.

- Data Access Matrix (`GET /api/dashboard/data-access-matrix`) shows integrations × data categories
- 9 data categories: customer_profile, customer_address, customer_contact, order_data, payment_data, identity_data, analytics_data, authentication_data, internal_data
- Each cell shows: permitted, action, sensitivity, accessed, access count, anomaly flag
- Visual component (`DataAccessMatrix.jsx`) renders as a color-coded grid:
  - Green = permitted and used
  - Dim green = permitted but unused
  - Red = unauthorized access
  - Grey = no access
- Summary columns: Permitted / Used / Unused / Unauthorized per integration

---

## 3. Real-Time Anomaly Detection

Detection of abnormal partner behaviour while it is happening.

- Anomaly detection runs on every gateway request
- 5 anomaly types detected:
  1. Volume spike (requests exceed baseline)
  2. New data category (accessing something new)
  3. Unauthorized access (no permission)
  4. Unknown IP address
  5. Unusual hours (1 AM - 5 AM)
- Real-time Socket.IO events push to the dashboard:
  - `integration:event` — every request
  - `integration:anomaly` — anomaly detected
  - `integration:risk` — risk level changed
  - `alert:new` — alert created
- Risk score calculated from 0-100 based on anomalies

---

## 4. Graded Response System

A graded response rather than a binary on/off switch.

- 5 response levels:
  - **Allow** — Normal traffic, no action
  - **Monitor** — Watch closely
  - **Rate Limit** — Throttle (100/min, 1000/hour)
  - **Alert** — Create alert for investigation
  - **Block** — Return 403, stop request
- Admin review workflow:
  1. System recommends an action based on risk score
  2. Admin sees recommendation + full risk analysis
  3. Admin chooses from 5 options (can agree or override)
  4. Admin adds notes explaining reasoning
  5. Decision logged to audit trail

---

## 5. False-Alarm Proof

Proof that a busy day does not trigger false alarms.

- Simulation component on Dashboard
- Click "Run Demo":
  1. **Phase 1:** 30 normal requests → avg risk LOW, zero blocks
  2. **Phase 2:** 30 attack requests → avg risk HIGH, multiple blocks
- Risk sparkline chart shows the contrast visually
- Side-by-side comparison panel with metrics and verdicts
- Progress bar and phase indicator during execution

---

## 6. Admin-in-the-Loop Decision Making

System recommends, admin decides.

- System never auto-enforces blocking
- Every high/critical alert includes `recommendedDecision`
- Admin reviews via modal with:
  - Full risk analysis (score, level, anomalies, IP, path, data category)
  - System recommendation highlighted
  - 5-level decision picker
  - Notes field
- Audit trail logs every review: admin ID, decision, notes, timestamp
- Admin can view, acknowledge, resolve, and review alerts

---

## 7. Visual Data Access Map

A visual grid showing integration access patterns at a glance.

- Grid view of integrations × data categories
- Color-coded cells
- Summary columns per integration
- Sensitivity labels
- Anomaly indicators

---

## Additional Capabilities

### Trust Score System
- 0-100 score per integration
- Computed from: risk level, anomaly rate, block rate, open alerts
- SVG ring chart display
- Trust levels: High (80-100), Medium (60-79), Low (40-59), Critical (0-39)

### Comprehensive Audit Trail
- Every admin action logged
- Filterable audit log page
- IP address tracking

### Real-Time Updates
- Socket.IO pushes all events to connected dashboards
- Activity feed updates live
- Alert notifications appear immediately

# G-Watch Third-Party Services

These are five demo third-party services that send requests through G-Watch
on `http://localhost:3000` so G-Watch can monitor, rate-limit, and block them.

They are intentionally simple FastAPI apps. Each one exposes:

- `GET /health`
- `GET /`
- `POST /run`

`POST /run` executes that service's traffic scenario.

## Services

| Service | Port | G-Watch integration | Behaviour |
| --- | --- | --- | --- |
| Delivery | 5001 | `delivery-provider` | Legitimate order/address traffic |
| Payment Analytics | 5002 | `payment-provider` | Legitimate payment/order traffic |
| Marketing | 5003 | `messaging-provider` | Legitimate customer-profile traffic |
| Compromised Delivery | 5004 | `delivery-provider` | Uses delivery credentials to violate permissions |
| Malicious Scraper | 5005 | `analytics-provider` | Bulk scraping and forbidden payment probing |

## Setup

Create and activate the dedicated venv:

```bash
cd api-integrations
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Then export the values, for example:

```bash
export GWATCH_URL=http://localhost:3000
export DELIVERY_X_API_KEY=...
export PAYMENT_ANALYTICS_X_API_KEY=...
export MARKETING_X_API_KEY=...
export COMPROMISED_DELIVERY_X_API_KEY=...
export MALICIOUS_SCRAPER_X_API_KEY=...
```

The API keys must match active `X-Api-Key` credentials assigned to the
corresponding integrations in G-Watch.

> Compromised Delivery should reuse the same key as Delivery. It is the same
> integration acting maliciously.

## Run

Run each service in its own terminal:

```bash
cd api-integrations
source .venv/bin/activate

python delivery_service.py
python payment_analytics_service.py
python marketing_service.py
python compromised_delivery_service.py
python malicious_scraper_service.py
```

Each service binds to its assigned port by default. You can override a port
with the `PORT` environment variable.

Trigger a scenario:

```bash
curl -X POST http://localhost:5001/run
curl -X POST http://localhost:5002/run
curl -X POST http://localhost:5003/run
curl -X POST http://localhost:5004/run
curl -X POST http://localhost:5005/run
```

## Expected G-Watch behaviour

- Delivery, Payment Analytics, and Marketing should mostly be allowed or
  monitored, with low-to-medium risk scores.
- Compromised Delivery should be blocked when it tries payment, write, or
  identity-verification access.
- Malicious Scraper should be blocked when it tries payment data, and its
  repeated bulk reads should surface as suspicious volume or anomalies.

Open the G-Watch dashboard to see the resulting events, alerts, trust scores,
and audit trail.

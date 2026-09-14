# Integration Guide

This guide walks you through connecting your backend to G-Watch, step by step.

> **For the demo setup:** See [TEAMMATE-GUIDE.md](../TEAMMATE-GUIDE.md) for instructions on building the ecommerce backend and third-party APIs.

---

## What You Need Before Starting

- A running G-Watch instance (backend + frontend)
- Your backend API running somewhere (can be localhost for testing)
- A tool to make HTTP requests (curl, Postman, or your browser)
- An admin account on G-Watch

---

## Step 1: Login and Get a Token

First, authenticate with G-Watch to get a JWT token.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gwatch.dev","password":"password123"}'
```

Save the token:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gwatch.dev","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

---

## Step 2: Create an Integration

Tell G-Watch about the third-party integration you want to monitor.

```bash
curl -X POST http://localhost:3000/api/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "delivery-provider",
    "description": "Third-party delivery tracking",
    "targetUrl": "https://api.yourapp.com"
  }'
```

Parameters:
- **name** (required): A short name for the integration (letters, numbers, dashes)
- **description** (optional): What this integration does
- **targetUrl** (optional): Your real backend URL. If set, G-Watch proxies requests to this URL.

Save the integration ID:

```bash
INTEGRATION_ID=$(curl -s -X POST http://localhost:3000/api/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"delivery-provider","description":"Third-party delivery tracking","targetUrl":"https://api.yourapp.com"}' \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
```

---

## Step 3: Create an API Key

The third party needs an API key to authenticate with G-Watch.

```bash
curl -X POST http://localhost:3000/api/integrations/$INTEGRATION_ID/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_key",
    "name": "partner-key",
    "credential": "my-secret-key-123"
  }'
```

Parameters:
- **type** (required): `"api_key"`, `"bearer_token"`, or `"webhook_signature"`
- **name** (required): A label for this credential
- **credential** (required): The actual key value (the third party will use this)

---

## Step 4: Set Permissions (Optional but Recommended)

Define what data the integration is allowed to access.

First, list available data resources:

```bash
curl http://localhost:3000/api/resources \
  -H "Authorization: Bearer $TOKEN"
```

Then grant permissions:

```bash
curl -X POST http://localhost:3000/api/integrations/$INTEGRATION_ID/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "RESOURCE_UUID",
    "action": "read",
    "allowed": true,
    "maxRecordsPerRequest": 1000,
    "maxRecordsPerHour": 10000
  }'
```

Parameters:
- **resourceId** (required): The ID of the data resource
- **action** (required): `"read"`, `"write"`, or `"delete"`
- **allowed** (required): `true` or `false`
- **maxRecordsPerRequest** (optional): Limit per request
- **maxRecordsPerHour** (optional): Limit per hour

---

## Step 5: Give the Third Party Their Credentials

Now share these details with the third party:

| Item | Value |
|------|-------|
| **G-Watch URL** | `http://localhost:3000` (or your production URL) |
| **API Key** | `my-secret-key-123` |
| **Endpoint** | Just append your API path to the URL |

That's it. The third party doesn't need to change their code.

---

## Step 6: Third Party Makes Requests

The third party sends requests to G-Watch's URL instead of your backend:

```bash
# They think they're calling your API:
curl http://localhost:3000/customers/123 \
  -H "X-Api-Key: my-secret-key-123"
```

What happens:
1. G-Watch receives the request
2. Validates the API key
3. Checks rate limits
4. Detects anomalies
5. Calculates risk score
6. If allowed → proxies to `https://api.yourapp.com/customers/123`
7. Returns your backend's real response

The third party gets the same response as if they called your backend directly.

---

## Explicit Mode (Alternative)

If you want the third party to know they're going through G-Watch, use the explicit gateway endpoint:

```bash
# Third party calls:
curl http://localhost:3000/gateway/delivery-provider/customers/123 \
  -H "X-Api-Key: my-secret-key-123"
```

The difference is just the URL path:
- **Transparent:** `http://localhost:3000/customers/123`
- **Explicit:** `http://localhost:3000/gateway/delivery-provider/customers/123`

---

## Testing Your Integration

### Test with a Normal Request

```bash
curl http://localhost:3000/customers/123 \
  -H "X-Api-Key: my-secret-key-123"
```

Expected: Real response from your backend.

### Test with a Blocked Request

```bash
curl http://localhost:3000/admin/users \
  -H "X-Api-Key: my-secret-key-123"
```

Expected: May be blocked if the risk score is high.

### Test with the Dev Simulator

```bash
# Fire a normal request
curl -X POST http://localhost:3000/api/dev/simulate-scenario/NORMAL \
  -H "Authorization: Bearer $TOKEN"

# Fire an attack request
curl -X POST http://localhost:3000/api/dev/simulate-scenario/REPEATED_ATTACK \
  -H "Authorization: Bearer $TOKEN"
```

### Check the Dashboard

Open http://localhost:5173 and watch the activity feed. You'll see:
- Every request logged with risk score
- Anomalies detected in real time
- Trust score updating
- Alerts appearing when risk is high

---

## Managing Your Integration

### View Integration Details

```bash
curl http://localhost:3000/api/integrations/$INTEGRATION_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Suspend an Integration

```bash
curl -X PATCH http://localhost:3000/api/integrations/$INTEGRATION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}'
```

### Revoke an API Key

```bash
curl -X DELETE http://localhost:3000/api/integrations/$INTEGRATION_ID/credentials/CREDENTIAL_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Review an Alert

```bash
curl -X POST http://localhost:3000/api/alerts/ALERT_ID/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminDecision":"block","adminNotes":"Unauthorized access pattern"}'
```

---

## What the Third Party Sees

When everything works, the third party's experience is:

```bash
# They call your "API" (actually G-Watch)
curl http://localhost:3000/customers/123 \
  -H "X-Api-Key: my-secret-key-123"

# They get the real response from your backend
# {
#   "id": 123,
#   "name": "John Doe",
#   "email": "john@example.com"
# }
```

They might also see extra headers:
```
x-gwatch-decision: allow
x-gwatch-risk-score: 5
x-gwatch-integration-id: uuid
```

These are harmless. The third party can ignore them.

---

## Troubleshooting

### "401 Unauthorized"
- API key is wrong or doesn't exist
- Check the credential was created for the correct integration

### "429 Too Many Requests"
- Rate limit exceeded
- Wait a minute or increase limits in the code

### "403 Request Blocked"
- Risk score is too high
- Check the dashboard for anomalies
- Review the alert and decide: allow, monitor, or block

### "No response from backend"
- `targetUrl` is not set on the integration
- Your backend is not running
- Network issue between G-Watch and your backend

### Dashboard shows no data
- Check the activity feed for logged events
- Verify the integration exists and is active
- Check if Socket.IO connection is established (green dot in header)

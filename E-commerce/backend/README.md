# G-Watch E-commerce REST API

## Overview

This is a simple REST API that provides synthetic e-commerce data for the G-Watch cybersecurity prototype.

The API runs on port `4000`. Third-party services send requests through the G-Watch gateway on port `3000`, which handles API keys, permissions, monitoring, rate limiting, and blocking.

This backend intentionally has no authentication or security controls because G-Watch provides that security layer.

## Features

- 100 synthetic customers
- 50 synthetic products
- 500 synthetic orders
- 200 synthetic payments
- Paginated list endpoints
- Individual record endpoints
- Customer address endpoint
- POST endpoints for creating records
- JSON file storage
- HTTP 404 responses for missing records

## Project Structure

```text
E-commerce/backend/
├── server.py
├── seed.py
├── requirements.txt
├── data/
│   ├── customers.json
│   ├── products.json
│   ├── orders.json
│   └── payments.json
├── routes/
│   ├── customers.py
│   ├── products.py
│   ├── orders.py
│   └── payments.py
└── utils/
    ├── json_store.py
    └── pagination.py
```

## Main Files

- `server.py`: Creates the FastAPI application and runs it on port `4000`.
- `seed.py`: Generates the synthetic e-commerce data.
- `routes/`: Contains one route file for each resource.
- `utils/json_store.py`: Reads and writes JSON records.
- `utils/pagination.py`: Provides shared pagination.
- `data/`: Stores the generated JSON datasets.

## Setup

From the repository root:

```bash
cd E-commerce/backend
```

Create and activate a virtual environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Generate the data:

```bash
python seed.py
```

Expected counts:

```text
Customers: 100
Products: 50
Orders: 500
Payments: 200
```

## Run the Server

```bash
python -m uvicorn server:app --host 0.0.0.0 --port 4000 --reload
```

The API is available at:

```text
http://127.0.0.1:4000
```

Swagger documentation:

```text
http://127.0.0.1:4000/docs
```

Health check:

```text
http://127.0.0.1:4000/health
```

## REST Endpoints

### Customers

```text
GET  /customers
GET  /customers/{customer_id}
GET  /customers/{customer_id}/address
POST /customers
```

### Products

```text
GET  /products
GET  /products/{product_id}
POST /products
```

### Orders

```text
GET  /orders
GET  /orders/{order_id}
POST /orders
```

Orders can be filtered using:

```text
GET /orders?customer_id=1
GET /orders?status=DELIVERED
```

### Payments

```text
GET  /payments
GET  /payments/{payment_id}
POST /payments
```

Payments can be filtered using:

```text
GET /payments?customer_id=1
GET /payments?order_id=1
GET /payments?status=SUCCESSFUL
```

## Pagination

All list endpoints accept `page` and `limit`.

Example:

```text
GET /customers?page=1&limit=10
```

Response format:

```json
{
  "data": [],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

## HTTP Responses

- `200`: Request completed successfully
- `201`: New record created
- `404`: Requested record not found
- `409`: Duplicate or conflicting record
- `422`: Invalid request data

## Data Reset

POST requests add records to the JSON files. To restore the original required counts, run:

```bash
python seed.py
```

## G-Watch Integration

```text
Third-party service
        ↓
G-Watch gateway on port 3000
        ↓
E-commerce API on port 4000
```

G-Watch validates and monitors requests before forwarding allowed requests to this API.

## Prototype Limitations

- JSON files are used instead of a production database
- No authentication or API-key validation
- No rate limiting
- No update or delete endpoints
- Product stock is not automatically reduced
- Simultaneous file writes are not handled

These limitations are acceptable because this backend is a hackathon prototype and G-Watch provides the security layer.

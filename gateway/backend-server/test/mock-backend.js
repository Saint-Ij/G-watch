import express from "express";

// Mock backend that simulates a real API
const app = express();
app.use(express.json());

// Simple in-memory store
const customers = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", address: "123 Main St" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", address: "456 Oak Ave" },
  { id: 3, name: "Carol White", email: "carol@example.com", address: "789 Pine Rd" },
];

const orders = [
  { id: 101, customerId: 1, item: "Laptop", amount: 999.99, status: "shipped" },
  { id: 102, customerId: 2, item: "Phone", amount: 699.99, status: "processing" },
];

// Log all requests
app.use((req, res, next) => {
  console.log(`[Mock Backend] ${req.method} ${req.url}`);
  console.log(`[Mock Backend] G-Watch headers:`);
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.startsWith("x-gwatch") || key === "x-forwarded-for") {
      console.log(`  ${key}: ${value}`);
    }
  }
  next();
});

// Customer endpoints
app.get("/customers", (req, res) => {
  res.json({ data: customers, total: customers.length });
});

app.get("/customers/:id", (req, res) => {
  const customer = customers.find((c) => c.id === parseInt(req.params.id));
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json({ data: customer });
});

app.get("/customers/:id/address", (req, res) => {
  const customer = customers.find((c) => c.id === parseInt(req.params.id));
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json({ data: { address: customer.address } });
});

// Order endpoints
app.get("/orders", (req, res) => {
  res.json({ data: orders, total: orders.length });
});

app.get("/orders/:id", (req, res) => {
  const order = orders.find((o) => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ data: order });
});

// Payment endpoint (should be blocked for delivery-provider)
app.get("/payments", (req, res) => {
  res.json({ data: [], message: "Payment data retrieved" });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "mock-backend", timestamp: new Date().toISOString() });
});

// Catch-all
app.all("*", (req, res) => {
  res.status(404).json({ error: "Not found", path: req.url });
});

const PORT = process.env.MOCK_PORT || 4000;
app.listen(PORT, () => {
  console.log(`[Mock Backend] Running on http://localhost:${PORT}`);
  console.log(`[Mock Backend] Endpoints:`);
  console.log(`  GET /customers`);
  console.log(`  GET /customers/:id`);
  console.log(`  GET /customers/:id/address`);
  console.log(`  GET /orders`);
  console.log(`  GET /orders/:id`);
  console.log(`  GET /payments`);
  console.log(`  GET /health`);
});

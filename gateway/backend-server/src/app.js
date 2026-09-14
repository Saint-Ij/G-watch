import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import integrationRoutes from "./routes/integration.routes.js";
import gatewayRoutes from "./routes/gateway.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import devRoutes from "./routes/dev.routes.js";
import transparentRoutes from "./routes/transparent.routes.js";
import config from "./config/index.js";

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

// Logging
app.use(morgan("tiny"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes (dashboard, integrations, alerts, etc.)
app.use("/api/auth", authRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/audit-logs", auditRoutes);
if (config.nodeEnv === "development") {
  app.use("/api/dev", devRoutes);
}

// Gateway route (explicit: third party calls /gateway/:slug/*)
app.use("/gateway", gatewayRoutes);

// Transparent proxy (catch-all: third party calls G-Watch as if it were the real backend)
// Mounted LAST so it doesn't intercept /api/*, /gateway/*, or /health routes
app.use("/", transparentRoutes);

// 404 handler (only reached if transparent proxy doesn't match)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum("user_role", ["admin", "analyst", "viewer"]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "active",
  "suspended",
  "disabled",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const credentialTypeEnum = pgEnum("credential_type", [
  "api_key",
  "bearer_token",
  "webhook_signature",
]);

export const credentialStatusEnum = pgEnum("credential_status", [
  "active",
  "revoked",
  "expired",
]);

export const sensitivityEnum = pgEnum("sensitivity", [
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export const actionEnum = pgEnum("action_type", ["read", "write", "delete"]);

export const decisionEnum = pgEnum("decision", [
  "allow",
  "monitor",
  "rate_limit",
  "alert",
  "block",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "open",
  "acknowledged",
  "resolved",
  "false_positive",
]);

// ==================== TABLES ====================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("admin"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    status: integrationStatusEnum("status").notNull().default("active"),
    riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
    targetUrl: varchar("target_url", { length: 500 }),
    managedBy: uuid("managed_by").references(() => users.id),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at"),
  },
  (table) => [
    index("integrations_slug_idx").on(table.slug),
    index("integrations_status_idx").on(table.status),
  ]
);

export const integrationCredentials = pgTable(
  "integration_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    type: credentialTypeEnum("type").notNull(),
    credentialHash: varchar("credential_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    status: credentialStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    index("credentials_integration_idx").on(table.integrationId),
    index("credentials_hash_idx").on(table.credentialHash),
  ]
);

export const dataResources = pgTable(
  "data_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    category: varchar("category", { length: 255 }).notNull(),
    sensitivity: sensitivityEnum("sensitivity").notNull().default("internal"),
    description: text("description"),
  },
  (table) => [index("resources_category_idx").on(table.category)]
);

export const integrationPermissions = pgTable(
  "integration_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => dataResources.id, { onDelete: "cascade" }),
    action: actionEnum("action").notNull(),
    allowed: boolean("allowed").notNull().default(false),
    maxRecordsPerRequest: integer("max_records_per_request").default(1000),
    maxRecordsPerHour: integer("max_records_per_hour").default(10000),
  },
  (table) => [
    index("permissions_integration_idx").on(table.integrationId),
    index("permissions_resource_idx").on(table.resourceId),
  ]
);

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    credentialId: uuid("credential_id").references(
      () => integrationCredentials.id
    ),
    userId: uuid("user_id").notNull().references(() => users.id),
    method: varchar("method", { length: 10 }).notNull(),
    path: varchar("path", { length: 500 }).notNull(),
    resource: varchar("resource", { length: 255 }),
    action: actionEnum("action"),
    dataCategory: varchar("data_category", { length: 255 }),
    recordsAccessed: integer("records_accessed").default(0),
    sourceIp: varchar("source_ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    authenticationMethod: varchar("authentication_method", { length: 50 }),
    responseStatus: integer("response_status"),
    responseTime: integer("response_time"),
    riskScore: integer("risk_score").default(0),
    decision: decisionEnum("decision").default("allow"),
    anomalyDetected: boolean("anomaly_detected").default(false),
    anomalyType: varchar("anomaly_type", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("events_integration_idx").on(table.integrationId),
    index("events_created_idx").on(table.createdAt),
    index("events_risk_idx").on(table.riskScore),
    index("events_decision_idx").on(table.decision),
    index("events_category_idx").on(table.dataCategory),
    index("events_anomaly_idx").on(table.anomalyDetected),
  ]
);

export const integrationBaselines = pgTable(
  "integration_baselines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" })
      .unique(),
    avgRequestsPerMinute: integer("avg_requests_per_minute").default(0),
    avgRequestsPerHour: integer("avg_requests_per_hour").default(0),
    avgRecordsPerRequest: integer("avg_records_per_request").default(0),
    normalEndpoints: jsonb("normal_endpoints").default([]),
    normalDataCategories: jsonb("normal_data_categories").default([]),
    normalHttpMethods: jsonb("normal_http_methods").default([]),
    normalSourceIps: jsonb("normal_source_ips").default([]),
    totalRequests: integer("total_requests").default(0),
    lastCalculatedAt: timestamp("last_calculated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("baselines_integration_idx").on(table.integrationId)]
);

export const securityPolicies = pgTable(
  "security_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    rules: jsonb("rules").notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => integrationEvents.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    severity: alertSeverityEnum("severity").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    riskScore: integer("risk_score"),
    recommendedDecision: decisionEnum("recommended_decision"),
    adminDecision: decisionEnum("admin_decision"),
    adminDecisionBy: uuid("admin_decision_by").references(() => users.id),
    adminDecisionAt: timestamp("admin_decision_at"),
    adminNotes: text("admin_notes"),
    status: alertStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    acknowledgedAt: timestamp("acknowledged_at"),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("alerts_integration_idx").on(table.integrationId),
    index("alerts_status_idx").on(table.status),
    index("alerts_severity_idx").on(table.severity),
    index("alerts_created_idx").on(table.createdAt),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 255 }).notNull(),
    resourceType: varchar("resource_type", { length: 255 }).notNull(),
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_user_idx").on(table.userId),
    index("audit_action_idx").on(table.action),
    index("audit_created_idx").on(table.createdAt),
  ]
);

import * as alertService from "../services/alert.service.js";
import * as auditService from "../services/audit.service.js";
import { getSourceIp } from "../utils/helpers.js";

export async function list(req, res) {
  try {
    const { status, severity, integrationId } = req.query;
    const isAdmin = req.user.role === "admin";
    const userId = isAdmin ? undefined : req.user.id;
    const alerts = await alertService.getAlerts({ status, severity, integrationId, userId });
    res.json({ alerts });
  } catch (error) {
    console.error("[Alert] list error:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
}

export async function getById(req, res) {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json({ alert });
  } catch (error) {
    console.error("[Alert] getById error:", error);
    res.status(500).json({ error: "Failed to fetch alert" });
  }
}

export async function update(req, res) {
  try {
    const alert = await alertService.updateAlert(req.params.id, req.body);
    res.json({ alert });
  } catch (error) {
    res.status(400).json({ error: "Failed to update alert" });
  }
}

export async function acknowledge(req, res) {
  try {
    const alert = await alertService.acknowledgeAlert(req.params.id);
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "alert_acknowledged",
      resourceType: "alert",
      resourceId: req.params.id,
      ipAddress: getSourceIp(req),
    });
    res.json({ alert });
  } catch (error) {
    res.status(400).json({ error: "Failed to acknowledge alert" });
  }
}

export async function resolve(req, res) {
  try {
    const alert = await alertService.resolveAlert(req.params.id);
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "alert_resolved",
      resourceType: "alert",
      resourceId: req.params.id,
      ipAddress: getSourceIp(req),
    });
    res.json({ alert });
  } catch (error) {
    res.status(400).json({ error: "Failed to resolve alert" });
  }
}

export async function review(req, res) {
  try {
    const { adminDecision, adminNotes } = req.body;

    if (!adminDecision) {
      return res.status(400).json({ error: "adminDecision is required" });
    }

    const validDecisions = ["allow", "monitor", "rate_limit", "alert", "block"];
    if (!validDecisions.includes(adminDecision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const alert = await alertService.reviewAlert(req.params.id, {
      adminDecision,
      adminDecisionBy: req.user.id,
      adminNotes,
    });

    await auditService.createAuditLog({
      userId: req.user.id,
      action: "alert_reviewed",
      resourceType: "alert",
      resourceId: req.params.id,
      metadata: { adminDecision, adminNotes },
      ipAddress: getSourceIp(req),
    });

    res.json({ alert });
  } catch (error) {
    res.status(400).json({ error: "Failed to review alert" });
  }
}

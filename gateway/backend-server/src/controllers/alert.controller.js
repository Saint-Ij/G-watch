import * as alertService from "../services/alert.service.js";
import * as auditService from "../services/audit.service.js";
import { getSourceIp } from "../utils/helpers.js";

export async function list(req, res) {
  try {
    const { status, severity, integrationId } = req.query;
    const alerts = await alertService.getAlerts({ status, severity, integrationId });
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getById(req, res) {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json({ alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req, res) {
  try {
    const alert = await alertService.updateAlert(req.params.id, req.body);
    res.json({ alert });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
  }
}

import * as auditService from "../services/audit.service.js";

export async function list(req, res) {
  try {
    const logs = await auditService.getAuditLogs(req.query);
    res.json({ logs });
  } catch (error) {
    console.error("[Audit Error]", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
}

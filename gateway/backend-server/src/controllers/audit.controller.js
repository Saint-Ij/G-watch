import * as auditService from "../services/audit.service.js";

export async function list(req, res) {
  try {
    const { userId, action, resourceType } = req.query;
    const logs = await auditService.getAuditLogs({ userId, action, resourceType });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

import * as integrationService from "../services/integration.service.js";
import * as credentialService from "../services/credential.service.js";
import * as permissionService from "../services/permission.service.js";
import * as resourceService from "../services/resource.service.js";
import * as auditService from "../services/audit.service.js";
import { getSourceIp } from "../utils/helpers.js";

export async function create(req, res) {
  try {
    const integration = await integrationService.createIntegration(req.body);
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "integration_created",
      resourceType: "integration",
      resourceId: integration.id,
      metadata: { name: integration.name },
      ipAddress: getSourceIp(req),
    });
    res.status(201).json({ integration });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function list(req, res) {
  try {
    const integrations = await integrationService.getIntegrations();
    res.json({ integrations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getById(req, res) {
  try {
    const integration = await integrationService.getIntegrationById(req.params.id);
    res.json({ integration });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

export async function update(req, res) {
  try {
    const integration = await integrationService.updateIntegration(req.params.id, req.body);
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "integration_updated",
      resourceType: "integration",
      resourceId: integration.id,
      metadata: req.body,
      ipAddress: getSourceIp(req),
    });
    res.json({ integration });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function remove(req, res) {
  try {
    const integration = await integrationService.deleteIntegration(req.params.id);
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "integration_deleted",
      resourceType: "integration",
      resourceId: integration.id,
      metadata: { name: integration.name },
      ipAddress: getSourceIp(req),
    });
    res.json({ message: "Integration deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Credentials
export async function createCredential(req, res) {
  try {
    const credential = await credentialService.createCredential({
      integrationId: req.params.id,
      ...req.body,
    });
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "credential_created",
      resourceType: "credential",
      resourceId: credential.id,
      metadata: { integrationId: req.params.id, type: req.body.type },
      ipAddress: getSourceIp(req),
    });
    res.status(201).json({ credential });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function listCredentials(req, res) {
  try {
    const credentials = await credentialService.getCredentials(req.params.id);
    res.json({ credentials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCredential(req, res) {
  try {
    const result = await credentialService.deleteCredential(req.params.id, req.params.credentialId);
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "credential_revoked",
      resourceType: "credential",
      resourceId: req.params.credentialId,
      metadata: { integrationId: req.params.id },
      ipAddress: getSourceIp(req),
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Permissions
export async function setPermission(req, res) {
  try {
    const permission = await permissionService.setPermission({
      integrationId: req.params.id,
      ...req.body,
    });
    await auditService.createAuditLog({
      userId: req.user.id,
      action: "permission_changed",
      resourceType: "permission",
      resourceId: permission.id,
      metadata: { integrationId: req.params.id, ...req.body },
      ipAddress: getSourceIp(req),
    });
    res.json({ permission });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function listPermissions(req, res) {
  try {
    const permissions = await permissionService.getPermissions(req.params.id);
    res.json({ permissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deletePermission(req, res) {
  try {
    const result = await permissionService.deletePermission(req.params.permissionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Data Access Map
export async function getDataAccess(req, res) {
  try {
    const integration = await integrationService.getIntegrationById(req.params.id);
    const permissions = await permissionService.getPermissions(req.params.id);

    const dataAccess = permissions.map((p) => ({
      category: p.category,
      resourceName: p.resourceName,
      action: p.action,
      allowed: p.allowed,
      sensitivity: p.sensitivity,
      maxRecordsPerRequest: p.maxRecordsPerRequest,
    }));

    res.json({
      integration: integration.name,
      permissions: dataAccess,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

import * as resourceService from "../services/resource.service.js";

export async function create(req, res) {
  try {
    const resource = await resourceService.createResource(req.body);
    res.status(201).json({ resource });
  } catch (error) {
    res.status(400).json({ error: "Failed to create resource" });
  }
}

export async function list(req, res) {
  try {
    const resources = await resourceService.getResources();
    res.json({ resources });
  } catch (error) {
    console.error("[Resource] list error:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
}

export async function update(req, res) {
  try {
    const resource = await resourceService.updateResource(req.params.id, req.body);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    res.json({ resource });
  } catch (error) {
    res.status(400).json({ error: "Failed to update resource" });
  }
}

export async function remove(req, res) {
  try {
    const deleted = await resourceService.deleteResource(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Resource not found" });
    }
    res.json({ message: "Resource deleted" });
  } catch (error) {
    console.error("[Resource] delete error:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
}

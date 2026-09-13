import * as resourceService from "../services/resource.service.js";

export async function create(req, res) {
  try {
    const resource = await resourceService.createResource(req.body);
    res.status(201).json({ resource });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function list(req, res) {
  try {
    const resources = await resourceService.getResources();
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

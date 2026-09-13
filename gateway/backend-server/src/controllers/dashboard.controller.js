import * as dashboardService from "../services/dashboard.service.js";

export async function overview(req, res) {
  try {
    const data = await dashboardService.getOverview();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function activity(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await dashboardService.getActivity(limit);
    res.json({ activity: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function risk(req, res) {
  try {
    const data = await dashboardService.getRiskStats();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function dataAccess(req, res) {
  try {
    const data = await dashboardService.getDataAccessStats();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function integrationDetail(req, res) {
  try {
    const data = await dashboardService.getIntegrationDashboard(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

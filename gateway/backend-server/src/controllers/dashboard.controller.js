import * as dashboardService from "../services/dashboard.service.js";

export async function overview(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getOverview(req.user.id, isAdmin);
    res.json(data);
  } catch (error) {
    console.error("[Dashboard] overview error:", error);
    res.status(500).json({ error: "Failed to load overview" });
  }
}

export async function activity(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const limit = parseInt(req.query.limit) || 20;
    const data = await dashboardService.getActivity(req.user.id, isAdmin, limit);
    res.json({ activity: data });
  } catch (error) {
    console.error("[Dashboard] activity error:", error);
    res.status(500).json({ error: "Failed to load activity" });
  }
}

export async function risk(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getRiskStats(req.user.id, isAdmin);
    res.json(data);
  } catch (error) {
    console.error("[Dashboard] risk error:", error);
    res.status(500).json({ error: "Failed to load risk stats" });
  }
}

export async function dataAccess(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getDataAccessStats(req.user.id, isAdmin);
    res.json(data);
  } catch (error) {
    console.error("[Dashboard] dataAccess error:", error);
    res.status(500).json({ error: "Failed to load data access stats" });
  }
}

export async function integrationDetail(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getIntegrationDashboard(req.params.id, req.user.id, isAdmin);
    res.json(data);
  } catch (error) {
    console.error("[Dashboard] integrationDetail error:", error);
    res.status(404).json({ error: "Integration not found" });
  }
}

export async function trustScores(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getTrustScores(req.user.id, isAdmin);
    res.json({ integrations: data });
  } catch (error) {
    console.error("[Dashboard] trustScores error:", error);
    res.status(500).json({ error: "Failed to load trust scores" });
  }
}

export async function dataAccessMatrix(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getDataAccessMatrix(req.user.id, isAdmin);
    res.json(data);
  } catch (error) {
    console.error("[Dashboard] dataAccessMatrix error:", error);
    res.status(500).json({ error: "Failed to load data access matrix" });
  }
}

export async function riskTimeline(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const data = await dashboardService.getRiskTimeline(req.user.id, isAdmin);
    res.json(data);
  } catch (error) {
    console.error("[Dashboard] riskTimeline error:", error);
    res.status(500).json({ error: "Failed to load risk timeline" });
  }
}

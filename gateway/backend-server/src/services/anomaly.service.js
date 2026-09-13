import { getBaselineStats } from "./baseline.service.js";

function normalizePath(path) {
  return path
    .toLowerCase()
    .replace(/\/[0-9]+/g, "/:id")
    .replace(/\/[a-f0-9-]{36}/g, "/:id")
    .replace(/\/[a-f0-9]{24}/g, "/:id")
    .replace(/\/$/, "");
}

export function detectAnomalies(event, baseline) {
  const anomalies = [];
  let score = 0;

  // 1. New endpoint
  if (event.path && baseline.normalEndpoints?.length > 0) {
    const normalizedEventPath = normalizePath(event.path);
    const isKnown = baseline.normalEndpoints.some((ep) => {
      const normalizedBase = normalizePath(ep);
      return normalizedEventPath === normalizedBase ||
        normalizedEventPath.startsWith(normalizedBase.replace(/\/:[^/]+/g, "")) ||
        normalizedBase.startsWith(normalizedEventPath.replace(/\/:[^/]+/g, ""));
    });
    if (!isKnown) {
      anomalies.push({ type: "new_endpoint", message: `New endpoint: ${event.path}` });
      score += 20;
    }
  }

  // 2. New data category
  if (event.dataCategory && baseline.normalDataCategories?.length > 0) {
    if (!baseline.normalDataCategories.includes(event.dataCategory)) {
      anomalies.push({
        type: "new_data_category",
        message: `New data category: ${event.dataCategory}`,
      });
      score += 25;
    }
  }

  // 3. Excessive records
  const avgRecords = baseline.avgRecordsPerRequest || 0;
  if (event.recordsAccessed && avgRecords > 0) {
    const ratio = event.recordsAccessed / avgRecords;
    if (ratio > 10) {
      anomalies.push({
        type: "excessive_records",
        message: `${event.recordsAccessed} records requested (normal: ${avgRecords})`,
      });
      score += 25;
    } else if (ratio > 5) {
      anomalies.push({
        type: "high_records",
        message: `${event.recordsAccessed} records requested (normal: ${avgRecords})`,
      });
      score += 15;
    }
  }

  // 4. Excessive request volume
  if (baseline.avgRequestsPerHour > 0) {
    const ratio = (baseline.totalRequests || 0) / Math.max(baseline.avgRequestsPerHour, 1);
    if (ratio > 20) {
      anomalies.push({
        type: "excessive_volume",
        message: `Request volume ${ratio.toFixed(0)}x normal`,
      });
      score += 20;
    }
  }

  // 5. Unknown source IP
  if (event.sourceIp && baseline.normalSourceIps?.length > 0) {
    if (!baseline.normalSourceIps.includes(event.sourceIp)) {
      anomalies.push({
        type: "unknown_ip",
        message: `Request from unknown IP: ${event.sourceIp}`,
      });
      score += 15;
    }
  }

  // 6. Unusual time (between 1 AM and 5 AM)
  const hour = new Date().getHours();
  if (hour >= 1 && hour <= 5) {
    if (baseline.normalHttpMethods?.length > 0) {
      // Only flag if there's other anomaly context
      if (anomalies.length > 0) {
        anomalies.push({
          type: "unusual_time",
          message: `Request at unusual hour: ${hour}:00`,
        });
        score += 10;
      }
    }
  }

  return {
    anomalies,
    score: Math.min(score, 100),
    hasAnomaly: anomalies.length > 0,
  };
}

export function calculateRiskScore(detectionResult, permissionDenied) {
  let score = detectionResult.score;

  if (permissionDenied) {
    score += 50;
    detectionResult.anomalies.push({
      type: "unauthorized_access",
      message: "Access to unauthorized resource",
    });
  }

  // Cap at 100
  score = Math.min(score, 100);

  let level;
  if (score <= 30) level = "low";
  else if (score <= 60) level = "medium";
  else if (score <= 80) level = "high";
  else level = "critical";

  const reasons = detectionResult.anomalies.map((a) => a.message);

  return { score, level, reasons, anomalies: detectionResult.anomalies };
}

export function decideAction(riskLevel) {
  switch (riskLevel) {
    case "low":
      return { decision: "allow", monitor: false, alert: false };
    case "medium":
      return { decision: "monitor", monitor: true, alert: false };
    case "high":
      return { decision: "alert", monitor: true, alert: true };
    case "critical":
      return { decision: "block", monitor: true, alert: true };
    default:
      return { decision: "allow", monitor: false, alert: false };
  }
}

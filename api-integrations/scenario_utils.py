"""Shared formatting helpers for third-party scenario results."""

from typing import Dict, List


def response_entry(method: str, path: str, response: dict) -> dict:
    headers = response.get("headers", {})
    body = response.get("data")
    risk_score = headers.get("x-gwatch-risk-score")
    decision = headers.get("x-gwatch-decision")

    if decision is None and response["status"] == 403:
        decision = "block"
    elif decision is None and response["status"] == 429:
        decision = "rate_limit"

    entry = {
        "method": method,
        "path": path,
        "status": response["status"],
        "gwatchDecision": decision,
        "gwatchRiskLevel": headers.get("x-gwatch-risk-level"),
        "gwatchRiskScore": int(risk_score) if risk_score is not None else None,
    }

    if response["status"] >= 400:
        entry["error"] = body

    return entry


def build_scenario_result(
    service_name: str,
    scenario_name: str,
    results: List[Dict],
) -> dict:
    blocked = sum(
        1
        for result in results
        if result["gwatchDecision"] in {"block", "rate_limit"}
    )

    return {
        "service": service_name,
        "scenario": scenario_name,
        "requests": results,
        "summary": {
            "total": len(results),
            "blocked": blocked,
            "allowed": len(results) - blocked,
        },
    }

from __future__ import annotations

"""Legitimate Payment Analytics third-party service."""

from config import get_service_config
from scenario_utils import build_scenario_result, response_entry
from service_base import create_service_app, run_service


async def payment_analytics_scenario(client) -> dict:
    """Fetch recent payments and correlate them with their orders."""

    results = []

    payments_response = await client.request(
        "GET",
        "/payments",
        params={"page": 1, "limit": 8},
        records_count=8,
    )
    results.append(
        response_entry("GET", "/payments?page=1&limit=8", payments_response)
    )

    payments = payments_response.get("data", {})
    if isinstance(payments, dict):
        payments = payments.get("data", [])

    for payment in payments[:3]:
        order_id = payment.get("order_id")
        if order_id is None:
            continue

        path = f"/orders/{order_id}"
        order_response = await client.request(
            "GET",
            path,
            records_count=1,
        )
        results.append(response_entry("GET", path, order_response))

    return build_scenario_result(
        "payment-analytics-service",
        "legitimate-payment-analytics",
        results,
    )


config = get_service_config(
    service_name="payment-analytics-service",
    default_port=5002,
    api_key_env="PAYMENT_ANALYTICS_X_API_KEY",
)
app = create_service_app(config, scenario=payment_analytics_scenario)


if __name__ == "__main__":
    run_service(config, app)

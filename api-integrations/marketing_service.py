from __future__ import annotations

"""Legitimate Marketing third-party service."""

from config import get_service_config
from scenario_utils import build_scenario_result, response_entry
from service_base import create_service_app, run_service


async def marketing_scenario(client) -> dict:
    """Fetch a small audience segment and inspect selected customer profiles."""

    results = []

    customers_response = await client.request(
        "GET",
        "/customers",
        params={"page": 1, "limit": 20},
        records_count=20,
    )
    results.append(
        response_entry("GET", "/customers?page=1&limit=20", customers_response)
    )

    customers = customers_response.get("data", {})
    if isinstance(customers, dict):
        customers = customers.get("data", [])

    for customer in customers[:5]:
        customer_id = customer.get("id")
        if customer_id is None:
            continue

        path = f"/customers/{customer_id}"
        customer_response = await client.request(
            "GET",
            path,
            records_count=1,
        )
        results.append(response_entry("GET", path, customer_response))

    return build_scenario_result(
        "marketing-service",
        "legitimate-marketing",
        results,
    )


config = get_service_config(
    service_name="marketing-service",
    default_port=5003,
    api_key_env="MARKETING_X_API_KEY",
)
app = create_service_app(config, scenario=marketing_scenario)


if __name__ == "__main__":
    run_service(config, app)

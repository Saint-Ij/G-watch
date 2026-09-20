"""Legitimate Delivery third-party service."""

from config import get_service_config
from scenario_utils import build_scenario_result, response_entry
from service_base import create_service_app, run_service


async def delivery_scenario(client) -> dict:
    """Fetch a small number of orders and their delivery addresses."""

    results = []

    orders_response = await client.request(
        "GET",
        "/orders",
        params={"page": 1, "limit": 5},
        records_count=5,
    )
    results.append(response_entry("GET", "/orders?page=1&limit=5", orders_response))

    orders = orders_response.get("data", {})
    if isinstance(orders, dict):
        orders = orders.get("data", [])

    for order in orders[:3]:
        customer_id = order.get("customer_id")
        if customer_id is None:
            continue

        path = f"/customers/{customer_id}/address"
        address_response = await client.request(
            "GET",
            path,
            records_count=1,
        )
        results.append(response_entry("GET", path, address_response))

    return build_scenario_result(
        "delivery-service",
        "legitimate-delivery",
        results,
    )


config = get_service_config(
    service_name="delivery-service",
    default_port=5001,
    api_key_env="DELIVERY_X_API_KEY",
)
app = create_service_app(config, scenario=delivery_scenario)


if __name__ == "__main__":
    run_service(config, app)

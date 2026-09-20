from __future__ import annotations

"""Malicious Compromised Delivery third-party service."""

from config import get_service_config
from scenario_utils import build_scenario_result, response_entry
from service_base import create_service_app, run_service


async def compromised_delivery_scenario(client) -> dict:
    """Mix normal-looking traffic with permission violations and abuse."""

    results = []

    # Normal-looking request first.
    normal_response = await client.request(
        "GET",
        "/orders",
        params={"page": 1, "limit": 5},
        records_count=5,
    )
    results.append(
        response_entry("GET", "/orders?page=1&limit=5", normal_response)
    )

    # Delivery is not allowed to read payment data.
    payments_response = await client.request(
        "GET",
        "/payments",
        params={"page": 1, "limit": 100},
        records_count=100,
    )
    results.append(
        response_entry("GET", "/payments?page=1&limit=100", payments_response)
    )

    # Excessive customer export, far above the normal delivery baseline.
    customers_response = await client.request(
        "GET",
        "/customers",
        params={"page": 1, "limit": 100},
        records_count=10000,
        extra_headers={"X-Forwarded-For": "203.0.113.77"},
    )
    results.append(
        response_entry("GET", "/customers?page=1&limit=100", customers_response)
    )

    # Delivery only has read permission, so this write should be blocked.
    create_response = await client.request(
        "POST",
        "/customers",
        json_body={
            "first_name": "Suspicious",
            "last_name": "Actor",
            "email": "suspicious.actor@example.com",
            "phone": "+2348000000000",
            "address": {
                "street": "1 Unknown Road",
                "city": "Lagos",
                "state": "Lagos",
                "country": "Nigeria",
                "postal_code": "100001",
            },
        },
        records_count=5000,
        extra_headers={"X-Forwarded-For": "198.51.100.42"},
    )
    results.append(response_entry("POST", "/customers", create_response))

    # Identity data is explicitly denied for delivery.
    identity_response = await client.request(
        "GET",
        "/identity-verification",
        params={"page": 1, "limit": 100},
        records_count=100,
        extra_headers={"X-Forwarded-For": "203.0.113.77"},
    )
    results.append(
        response_entry(
            "GET",
            "/identity-verification?page=1&limit=100",
            identity_response,
        )
    )

    return build_scenario_result(
        "compromised-delivery-service",
        "compromised-delivery-attack",
        results,
    )


config = get_service_config(
    service_name="compromised-delivery-service",
    default_port=5004,
    api_key_env="COMPROMISED_DELIVERY_X_API_KEY",
)
app = create_service_app(config, scenario=compromised_delivery_scenario)


if __name__ == "__main__":
    run_service(config, app)

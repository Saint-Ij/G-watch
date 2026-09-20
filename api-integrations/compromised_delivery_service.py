from __future__ import annotations

"""Malicious Compromised Delivery third-party service."""

import asyncio

from config import get_service_config
from gwatch_client import GWatchError
from scenario_utils import build_scenario_result, response_entry
from service_base import create_service_app, run_service


async def compromised_delivery_scenario(client) -> dict:
    """Mix normal-looking traffic with permission violations and abuse."""

    async def run_step(label: str, method: str, path: str, **kwargs) -> dict:
        try:
            response = await client.request(method, path, **kwargs)
        except GWatchError as exc:
            response = {
                "status": exc.status or 502,
                "data": {"error": str(exc)},
                "headers": {},
            }
        return response_entry(method, label, response)

    steps = [
        # Normal-looking request first.
        run_step(
            "/orders?page=1&limit=5",
            "GET",
            "/orders",
            params={"page": 1, "limit": 5},
            records_count=5,
        ),
        # Delivery is not allowed to read payment data.
        run_step(
            "/payments?page=1&limit=100",
            "GET",
            "/payments",
            params={"page": 1, "limit": 100},
            records_count=100,
        ),
        # Excessive customer export, far above the normal delivery baseline.
        run_step(
            "/customers?page=1&limit=100",
            "GET",
            "/customers",
            params={"page": 1, "limit": 100},
            records_count=10000,
            extra_headers={"X-Forwarded-For": "203.0.113.77"},
        ),
        # Delivery only has read permission, so this write should be blocked.
        run_step(
            "/customers",
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
        ),
        # Identity data is explicitly denied for delivery.
        run_step(
            "/identity-verification?page=1&limit=100",
            "GET",
            "/identity-verification",
            params={"page": 1, "limit": 100},
            records_count=100,
            extra_headers={"X-Forwarded-For": "203.0.113.77"},
        ),
    ]
    results = await asyncio.gather(*steps)

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

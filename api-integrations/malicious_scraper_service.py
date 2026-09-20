"""Malicious Scraper third-party service."""

from config import get_service_config
from scenario_utils import build_scenario_result, response_entry
from service_base import create_service_app, run_service


async def malicious_scraper_scenario(client) -> dict:
    """Scrape bulk customer/order data and probe forbidden payment data."""

    results = []
    suspicious_headers = {"X-Forwarded-For": "203.0.113.99"}

    for page in range(1, 4):
        customers_response = await client.request(
            "GET",
            "/customers",
            params={"page": page, "limit": 100},
            records_count=100,
            extra_headers=suspicious_headers,
        )
        results.append(
            response_entry(
                "GET",
                f"/customers?page={page}&limit=100",
                customers_response,
            )
        )

    orders_response = await client.request(
        "GET",
        "/orders",
        params={"page": 1, "limit": 100},
        records_count=100,
        extra_headers=suspicious_headers,
    )
    results.append(
        response_entry("GET", "/orders?page=1&limit=100", orders_response)
    )

    # Scraper's integration does not have payment-data permission.
    payments_response = await client.request(
        "GET",
        "/payments",
        params={"page": 1, "limit": 100},
        records_count=100,
        extra_headers=suspicious_headers,
    )
    results.append(
        response_entry("GET", "/payments?page=1&limit=100", payments_response)
    )

    return build_scenario_result(
        "malicious-scraper-service",
        "malicious-scraper-attack",
        results,
    )


config = get_service_config(
    service_name="malicious-scraper-service",
    default_port=5005,
    api_key_env="MALICIOUS_SCRAPER_X_API_KEY",
)
app = create_service_app(config, scenario=malicious_scraper_scenario)


if __name__ == "__main__":
    run_service(config, app)

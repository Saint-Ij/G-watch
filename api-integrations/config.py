"""Configuration for the third-party service applications."""

import os

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class ServiceConfig(BaseModel):
    service_name: str
    port: int
    gwatch_url: str = "http://localhost:3000"
    api_key: str = ""
    timeout: float = 10.0
    run_on_start: bool = False


def _as_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def get_service_config(
    *,
    service_name: str,
    default_port: int,
    api_key_env: str,
) -> ServiceConfig:
    """Build a validated service config from environment variables."""

    return ServiceConfig(
        service_name=service_name,
        port=int(os.getenv("PORT", default_port)),
        gwatch_url=os.getenv("GWATCH_URL", "http://localhost:3000").rstrip("/"),
        api_key=os.getenv(api_key_env) or os.getenv("X_API_KEY", ""),
        timeout=float(os.getenv("GWATCH_TIMEOUT", "10")),
        run_on_start=_as_bool(os.getenv("RUN_ON_START"), False),
    )


def redact_api_key(api_key: str) -> str:
    """Return a safe display version of an API key."""

    if not api_key:
        return "<not set>"
    if len(api_key) <= 8:
        return f"{api_key[:2]}***"
    return f"{api_key[:4]}...{api_key[-4:]}"


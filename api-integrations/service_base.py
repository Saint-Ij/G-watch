"""Shared FastAPI application factory and runner."""

import uvicorn
from fastapi import FastAPI, HTTPException

from config import ServiceConfig, redact_api_key
from gwatch_client import GWatchClient, GWatchError


def create_service_app(
    config: ServiceConfig,
    scenario=None,
) -> FastAPI:
    """Create a FastAPI app with health, info, and run endpoints."""

    client = GWatchClient(config)

    async def default_scenario(_client: GWatchClient) -> dict:
        return {
            "service": config.service_name,
            "status": "not_implemented",
            "message": "Scenario logic will be added in a later step.",
        }

    app = FastAPI(
        title=config.service_name,
        version="0.1.0",
    )
    app.state.config = config
    app.state.client = client

    @app.get("/health")
    async def health() -> dict:
        return {
            "status": "ok",
            "service": config.service_name,
        }

    @app.get("/")
    async def root() -> dict:
        return {
            "service": config.service_name,
            "version": app.version,
            "port": config.port,
            "gwatchUrl": config.gwatch_url,
            "apiKey": redact_api_key(config.api_key),
            "endpoints": {
                "health": "GET /health",
                "run": "POST /run",
            },
        }

    @app.post("/run")
    async def run() -> dict:
        handler = scenario or default_scenario
        try:
            return await handler(client)
        except GWatchError as exc:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": str(exc),
                    "status": exc.status,
                },
            ) from exc

    return app


def run_service(config: ServiceConfig, app: FastAPI) -> None:
    """Run a FastAPI service with uvicorn."""

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=config.port,
        log_level="info",
    )


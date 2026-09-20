from __future__ import annotations


"""Async HTTP client for G-Watch."""

import httpx

from config import ServiceConfig


class GWatchError(Exception):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


class GWatchClient:
    def __init__(self, config: ServiceConfig):
        self.config = config

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict | None = None,
        json_body: dict | None = None,
        records_count: int | None = None,
        extra_headers: dict | None = None,
    ) -> dict:
        """Send one request through G-Watch and return a small result dict."""

        if not self.config.api_key:
            raise GWatchError("API key is not configured", status=401)

        headers = {
            "Accept": "application/json",
            "X-Api-Key": self.config.api_key,
            "User-Agent": f"gwatch-third-party/{self.config.service_name}",
        }

        if records_count is not None:
            headers["X-Records-Count"] = str(records_count)

        if extra_headers:
            headers.update(extra_headers)

        try:
            async with httpx.AsyncClient(
                base_url=self.config.gwatch_url,
                timeout=self.config.timeout,
            ) as client:
                kwargs = {
                    "method": method.upper(),
                    "url": path,
                    "params": params,
                    "headers": headers,
                }
                if json_body is not None:
                    kwargs["json"] = json_body

                response = await client.request(**kwargs)
        except httpx.TimeoutException as exc:
            raise GWatchError(
                f"G-Watch request timed out after {self.config.timeout} seconds",
                status=504,
            ) from exc
        except httpx.RequestError as exc:
            raise GWatchError(
                f"Could not reach G-Watch: {exc}",
                status=502,
            ) from exc

        try:
            data = response.json()
        except ValueError:
            data = response.text

        return {
            "status": response.status_code,
            "data": data,
            "headers": dict(response.headers),
        }

from __future__ import annotations


from typing import Any


def paginate(
    records: list[dict[str, Any]],
    page: int,
    limit: int,
) -> dict[str, Any]:
    start = (page - 1) * limit
    end = start + limit

    return {
        "data": records[start:end],
        "total": len(records),
        "page": page,
        "limit": limit,
    }

import json
from pathlib import Path
from typing import Any


BASE_DIRECTORY = Path(__file__).resolve().parent.parent
DATA_DIRECTORY = BASE_DIRECTORY / "data"


def read_records(filename: str) -> list[dict[str, Any]]:
    file_path = DATA_DIRECTORY / filename

    if not file_path.exists():
        return []

    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_records(
    filename: str,
    records: list[dict[str, Any]],
) -> None:
    DATA_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    file_path = DATA_DIRECTORY / filename

    with file_path.open("w", encoding="utf-8") as file:
        json.dump(
            records,
            file,
            indent=2,
            ensure_ascii=False,
        )


def find_by_id(
    records: list[dict[str, Any]],
    record_id: int,
) -> dict[str, Any] | None:
    for record in records:
        if record.get("id") == record_id:
            return record

    return None


def get_next_id(records: list[dict[str, Any]]) -> int:
    if not records:
        return 1

    return max(record["id"] for record in records) + 1


def add_record(
    filename: str,
    record: dict[str, Any],
) -> dict[str, Any]:
    records = read_records(filename)

    record["id"] = get_next_id(records)
    records.append(record)

    write_records(filename, records)

    return record
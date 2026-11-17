from datetime import date, datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import NotFoundError


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def oid(value: Any, label: str = "Registro") -> ObjectId:
    """Converte string em ObjectId; IDs malformados são tratados como 'não encontrado'."""
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError) as exc:
        raise NotFoundError(f"{label} não encontrado.") from exc


def to_datetime(value: date | None) -> datetime | None:
    if value is None:
        return None
    return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)


def with_id(doc: dict) -> dict:
    data = dict(doc)
    data["id"] = data.pop("_id")
    return data


def duplicate_fields(exc: DuplicateKeyError) -> set[str]:
    details = exc.details or {}
    return set((details.get("keyPattern") or {}).keys())

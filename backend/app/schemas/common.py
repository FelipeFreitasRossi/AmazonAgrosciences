"""Tipos e validadores reutilizados por todos os schemas."""

from datetime import date, datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, StringConstraints


def _empty_to_none(value: Any) -> Any:
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _to_str(value: Any) -> Any:
    return str(value) if value is not None else value


def _datetime_to_date(value: Any) -> Any:
    return value.date() if isinstance(value, datetime) else value


class Schema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


# ObjectId do MongoDB exposto como string na API
ObjectIdStr = Annotated[str, BeforeValidator(_to_str)]

# Códigos identificadores (ex.: G01, A, FOL-001): normalizados em maiúsculas
Code = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=30, pattern=r"^[A-Za-z0-9][A-Za-z0-9_.-]*$"),
    AfterValidator(str.upper),
]

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]

ShortText = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] | None,
    BeforeValidator(_empty_to_none),
]

LongText = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None,
    BeforeValidator(_empty_to_none),
]

PerformedBy = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]

HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]

# Datas são gravadas como datetime no MongoDB e devolvidas como date
OutDate = Annotated[date | None, BeforeValidator(_datetime_to_date)]

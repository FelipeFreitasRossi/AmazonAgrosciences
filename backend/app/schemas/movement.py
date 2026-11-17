from datetime import datetime
from typing import Literal

from app.schemas.common import ObjectIdStr, Schema

MovementType = Literal["entrada", "saida", "transferencia", "remocao"]


class MovementOut(Schema):
    id: ObjectIdStr
    type: MovementType
    container_id: ObjectIdStr
    container_code: str
    product_id: ObjectIdStr
    product_code: str
    product_name: str
    volume_l: float
    from_location: str | None = None
    to_location: str | None = None
    performed_by: str
    notes: str | None = None
    created_at: datetime


class MovementPage(Schema):
    items: list[MovementOut]
    total: int

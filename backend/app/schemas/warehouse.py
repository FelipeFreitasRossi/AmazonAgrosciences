from datetime import datetime

from pydantic import Field

from app.schemas.common import Code, LongText, Name, ObjectIdStr, Schema, ShortText


class WarehouseCreate(Schema):
    code: Code = Field(description="Código do galpão, ex.: G01")
    name: Name
    description: LongText = None


class WarehouseUpdate(Schema):
    code: Code | None = None
    name: Name | None = None
    description: LongText = None


class SectorCreate(Schema):
    code: Code = Field(description="Código do setor/área, ex.: A")
    name: ShortText = None
    rows: int = Field(default=4, ge=1, le=26, description="Linhas da grade de posições")
    cols: int = Field(default=8, ge=1, le=40, description="Colunas da grade de posições")


class SectorUpdate(Schema):
    name: ShortText = None
    rows: int | None = Field(default=None, ge=1, le=26)
    cols: int | None = Field(default=None, ge=1, le=40)


class SectorOut(Schema):
    id: ObjectIdStr
    warehouse_id: ObjectIdStr
    code: str
    name: str | None = None
    rows: int
    cols: int
    positions_total: int
    positions_used: int = 0
    created_at: datetime


class WarehouseOut(Schema):
    id: ObjectIdStr
    code: str
    name: str
    description: str | None = None
    sectors: list[SectorOut] = []
    positions_total: int = 0
    positions_used: int = 0
    total_volume_l: float = 0
    created_at: datetime
    updated_at: datetime

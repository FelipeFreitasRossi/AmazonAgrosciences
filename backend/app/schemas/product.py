from datetime import datetime

from pydantic import Field

from app.schemas.common import Code, HexColor, LongText, Name, ObjectIdStr, Schema, ShortText


class ProductCreate(Schema):
    code: Code = Field(description="Código interno, ex.: FOL-001")
    name: Name
    category: Name = Field(description="Ex.: Foliar, NPK, Bioestimulante")
    description: LongText = None
    manufacturer: ShortText = None
    composition: ShortText = Field(default=None, description="Garantias, ex.: N 10% + P 10% + K 10%")
    density_kg_l: float | None = Field(default=None, gt=0, le=5, description="Densidade em kg/L")
    ph: float | None = Field(default=None, ge=0, le=14)
    hazard_class: ShortText = None
    storage_instructions: LongText = None
    min_stock_l: float = Field(default=0, ge=0, le=10_000_000, description="Estoque mínimo em litros")
    color: HexColor | None = Field(default=None, description="Cor usada no mapa")


class ProductUpdate(Schema):
    code: Code | None = None
    name: Name | None = None
    category: Name | None = None
    description: LongText = None
    manufacturer: ShortText = None
    composition: ShortText = None
    density_kg_l: float | None = Field(default=None, gt=0, le=5)
    ph: float | None = Field(default=None, ge=0, le=14)
    hazard_class: ShortText = None
    storage_instructions: LongText = None
    min_stock_l: float | None = Field(default=None, ge=0, le=10_000_000)
    color: HexColor | None = None


class ProductOut(Schema):
    id: ObjectIdStr
    code: str
    name: str
    category: str
    description: str | None = None
    manufacturer: str | None = None
    composition: str | None = None
    density_kg_l: float | None = None
    ph: float | None = None
    hazard_class: str | None = None
    storage_instructions: str | None = None
    min_stock_l: float = 0
    color: str
    active: bool = True
    total_volume_l: float = 0
    containers_count: int = 0
    low_stock: bool = False
    created_at: datetime
    updated_at: datetime


class DeleteResult(Schema):
    result: str = Field(description="deleted ou archived")
    message: str

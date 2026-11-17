from datetime import date, datetime

from pydantic import Field, model_validator

from app.schemas.common import Code, LongText, ObjectIdStr, OutDate, PerformedBy, Schema, ShortText


class ContainerCreate(Schema):
    code: Code | None = Field(default=None, description="Deixe vazio para gerar automaticamente (ex.: IBC-0001)")
    type_id: str
    product_id: str
    sector_id: str
    row: int = Field(ge=1, le=26)
    col: int = Field(ge=1, le=40)
    volume_l: float = Field(ge=0, description="Volume atual em litros")
    capacity_l: float | None = Field(default=None, gt=0, le=100_000, description="Padrão: capacidade do tipo")
    lot: ShortText = None
    manufacture_date: date | None = None
    expiry_date: date | None = None
    notes: LongText = None
    performed_by: PerformedBy

    @model_validator(mode="after")
    def check_dates(self) -> "ContainerCreate":
        if self.manufacture_date and self.expiry_date and self.expiry_date < self.manufacture_date:
            raise ValueError("A data de validade deve ser posterior à data de fabricação.")
        return self


class ContainerUpdate(Schema):
    lot: ShortText = None
    manufacture_date: date | None = None
    expiry_date: date | None = None
    notes: LongText = None


class VolumeOperation(Schema):
    volume_l: float = Field(gt=0, le=100_000)
    performed_by: PerformedBy
    notes: LongText = None


class ContainerMove(Schema):
    sector_id: str
    row: int = Field(ge=1, le=26)
    col: int = Field(ge=1, le=40)
    performed_by: PerformedBy
    notes: LongText = None


class ContainerRemove(Schema):
    performed_by: PerformedBy
    notes: LongText = None


class ContainerOut(Schema):
    id: ObjectIdStr
    code: str
    status: str
    type_id: ObjectIdStr
    type_code: str
    type_name: str
    capacity_l: float
    volume_l: float
    fill_pct: float
    product_id: ObjectIdStr
    product_code: str
    product_name: str
    product_category: str
    product_color: str
    warehouse_id: ObjectIdStr | None = None
    warehouse_code: str
    warehouse_name: str
    sector_id: ObjectIdStr
    sector_code: str
    row: int
    col: int
    position_number: int
    location_code: str
    location_label: str
    lot: str | None = None
    manufacture_date: OutDate = None
    expiry_date: OutDate = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

from pydantic import Field

from app.schemas.common import Code, Name, ObjectIdStr, Schema


class ContainerTypeCreate(Schema):
    code: Code = Field(description="Ex.: IBC, BAR")
    name: Name
    capacity_l: float = Field(gt=0, le=100_000, description="Capacidade padrão em litros")


class ContainerTypeOut(Schema):
    id: ObjectIdStr
    code: str
    name: str
    capacity_l: float

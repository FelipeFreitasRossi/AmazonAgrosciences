from app.schemas.common import Schema
from app.schemas.container import ContainerOut
from app.schemas.warehouse import SectorOut, WarehouseOut


class SectorMap(SectorOut):
    containers: list[ContainerOut] = []


class WarehouseMap(Schema):
    warehouse: WarehouseOut
    sectors: list[SectorMap]

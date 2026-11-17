from datetime import datetime

from app.schemas.common import ObjectIdStr, OutDate, Schema
from app.schemas.movement import MovementOut


class DashboardTotals(Schema):
    products: int
    containers: int
    warehouses: int
    sectors: int
    positions_total: int
    positions_used: int
    occupancy_pct: float
    total_volume_l: float
    total_capacity_l: float
    low_stock_count: int
    expiring_count: int


class LowStockItem(Schema):
    product_id: ObjectIdStr
    code: str
    name: str
    color: str
    total_volume_l: float
    min_stock_l: float


class ProductVolume(Schema):
    product_id: ObjectIdStr
    code: str
    name: str
    color: str
    volume_l: float
    containers: int


class WarehouseOccupancy(Schema):
    warehouse_id: ObjectIdStr
    code: str
    name: str
    positions_total: int
    positions_used: int
    volume_l: float


class ExpiringItem(Schema):
    container_id: ObjectIdStr
    container_code: str
    product_name: str
    location_code: str
    expiry_date: OutDate
    days_left: int


class DashboardOut(Schema):
    totals: DashboardTotals
    low_stock: list[LowStockItem]
    volume_by_product: list[ProductVolume]
    occupancy_by_warehouse: list[WarehouseOccupancy]
    expiring_soon: list[ExpiringItem]
    recent_movements: list[MovementOut]
    generated_at: datetime

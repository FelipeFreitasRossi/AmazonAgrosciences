from collections import defaultdict
from datetime import timedelta

from pymongo.asynchronous.database import AsyncDatabase

from app.database import collections as col
from app.services import movement_service
from app.services.container_service import load_refs, location
from app.services.utils import utcnow

EXPIRY_WINDOW_DAYS = 60


async def get_dashboard(db: AsyncDatabase) -> dict:
    refs = await load_refs(db)
    containers = await db[col.CONTAINERS].find({"status": "active"}).to_list()
    products = [p for p in refs.products.values() if p.get("active", True)]

    stock: dict = defaultdict(lambda: {"volume": 0.0, "count": 0})
    used_by_sector: dict = defaultdict(lambda: {"used": 0, "volume": 0.0})
    for c in containers:
        stock[c["product_id"]]["volume"] += c["volume_l"]
        stock[c["product_id"]]["count"] += 1
        used_by_sector[c["sector_id"]]["used"] += 1
        used_by_sector[c["sector_id"]]["volume"] += c["volume_l"]

    positions_total = sum(s["rows"] * s["cols"] for s in refs.sectors.values())
    total_volume = sum(c["volume_l"] for c in containers)
    total_capacity = sum(c["capacity_l"] for c in containers)

    low_stock = sorted(
        (
            {
                "product_id": p["_id"],
                "code": p["code"],
                "name": p["name"],
                "color": p.get("color", "#64748b"),
                "total_volume_l": round(stock[p["_id"]]["volume"], 2),
                "min_stock_l": p["min_stock_l"],
            }
            for p in products
            if (p.get("min_stock_l") or 0) > 0 and stock[p["_id"]]["volume"] < p["min_stock_l"]
        ),
        key=lambda item: item["total_volume_l"] / item["min_stock_l"],
    )

    volume_by_product = sorted(
        (
            {
                "product_id": p["_id"],
                "code": p["code"],
                "name": p["name"],
                "color": p.get("color", "#64748b"),
                "volume_l": round(stock[p["_id"]]["volume"], 2),
                "containers": stock[p["_id"]]["count"],
            }
            for p in products
            if stock[p["_id"]]["count"] > 0
        ),
        key=lambda item: item["volume_l"],
        reverse=True,
    )[:8]

    occupancy = []
    for warehouse in sorted(refs.warehouses.values(), key=lambda w: w["code"]):
        sectors = [s for s in refs.sectors.values() if s["warehouse_id"] == warehouse["_id"]]
        occupancy.append(
            {
                "warehouse_id": warehouse["_id"],
                "code": warehouse["code"],
                "name": warehouse["name"],
                "positions_total": sum(s["rows"] * s["cols"] for s in sectors),
                "positions_used": sum(used_by_sector[s["_id"]]["used"] for s in sectors),
                "volume_l": round(sum(used_by_sector[s["_id"]]["volume"] for s in sectors), 2),
            }
        )

    today = utcnow().date()
    limit = today + timedelta(days=EXPIRY_WINDOW_DAYS)
    expiring = []
    for c in containers:
        expiry = c.get("expiry_date")
        if expiry and expiry.date() <= limit:
            product = refs.products.get(c["product_id"], {})
            expiring.append(
                {
                    "container_id": c["_id"],
                    "container_code": c["code"],
                    "product_name": product.get("name", "?"),
                    "location_code": location(refs, c["sector_id"], c["row"], c["col"])[0],
                    "expiry_date": expiry,
                    "days_left": (expiry.date() - today).days,
                }
            )
    expiring.sort(key=lambda item: item["days_left"])

    recent = await movement_service.list_movements(db, limit=8)
    positions_used = len(containers)

    return {
        "totals": {
            "products": len(products),
            "containers": positions_used,
            "warehouses": len(refs.warehouses),
            "sectors": len(refs.sectors),
            "positions_total": positions_total,
            "positions_used": positions_used,
            "occupancy_pct": round(positions_used / positions_total * 100, 1) if positions_total else 0,
            "total_volume_l": round(total_volume, 2),
            "total_capacity_l": round(total_capacity, 2),
            "low_stock_count": len(low_stock),
            "expiring_count": len(expiring),
        },
        "low_stock": low_stock[:6],
        "volume_by_product": volume_by_product,
        "occupancy_by_warehouse": occupancy,
        "expiring_soon": expiring[:6],
        "recent_movements": recent["items"],
        "generated_at": utcnow(),
    }

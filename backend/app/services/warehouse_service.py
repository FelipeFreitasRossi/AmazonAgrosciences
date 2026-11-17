"""Galpões e setores. Cada setor é uma grade (linhas × colunas) de posições."""

from collections import defaultdict

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ConflictError, NotFoundError
from app.database import collections as col
from app.schemas.warehouse import SectorCreate, SectorUpdate, WarehouseCreate, WarehouseUpdate
from app.services import container_service
from app.services.utils import oid, utcnow, with_id


async def _sector_usage(db: AsyncDatabase, sector_ids: list[ObjectId]) -> dict[ObjectId, dict]:
    if not sector_ids:
        return {}
    cursor = await db[col.CONTAINERS].aggregate(
        [
            {"$match": {"status": "active", "sector_id": {"$in": sector_ids}}},
            {"$group": {"_id": "$sector_id", "used": {"$sum": 1}, "volume": {"$sum": "$volume_l"}}},
        ]
    )
    return {row["_id"]: row async for row in cursor}


async def _build(db: AsyncDatabase, warehouses: list[dict]) -> list[dict]:
    ids = [w["_id"] for w in warehouses]
    sectors = await db[col.SECTORS].find({"warehouse_id": {"$in": ids}}).sort("code", 1).to_list()
    usage = await _sector_usage(db, [s["_id"] for s in sectors])

    by_warehouse: dict[ObjectId, list[dict]] = defaultdict(list)
    for sector in sectors:
        used = usage.get(sector["_id"], {})
        by_warehouse[sector["warehouse_id"]].append(
            {
                **with_id(sector),
                "positions_total": sector["rows"] * sector["cols"],
                "positions_used": used.get("used", 0),
                "_volume": used.get("volume", 0.0),
            }
        )

    result = []
    for warehouse in warehouses:
        items = by_warehouse.get(warehouse["_id"], [])
        result.append(
            {
                **with_id(warehouse),
                "sectors": items,
                "positions_total": sum(s["positions_total"] for s in items),
                "positions_used": sum(s["positions_used"] for s in items),
                "total_volume_l": round(sum(s["_volume"] for s in items), 2),
            }
        )
    return result


async def list_warehouses(db: AsyncDatabase) -> list[dict]:
    warehouses = await db[col.WAREHOUSES].find().sort("code", 1).to_list()
    return await _build(db, warehouses)


async def get_warehouse(db: AsyncDatabase, warehouse_id: str | ObjectId) -> dict:
    doc = await db[col.WAREHOUSES].find_one({"_id": oid(warehouse_id, "Galpão")})
    if not doc:
        raise NotFoundError("Galpão não encontrado.")
    return (await _build(db, [doc]))[0]


async def create_warehouse(db: AsyncDatabase, data: WarehouseCreate) -> dict:
    now = utcnow()
    try:
        result = await db[col.WAREHOUSES].insert_one({**data.model_dump(), "created_at": now, "updated_at": now})
    except DuplicateKeyError as exc:
        raise ConflictError(f"Já existe um galpão com o código {data.code}.") from exc
    return await get_warehouse(db, result.inserted_id)


async def update_warehouse(db: AsyncDatabase, warehouse_id: str, data: WarehouseUpdate) -> dict:
    _id = oid(warehouse_id, "Galpão")
    changes = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None or k == "description"}
    if changes:
        changes["updated_at"] = utcnow()
        try:
            result = await db[col.WAREHOUSES].update_one({"_id": _id}, {"$set": changes})
        except DuplicateKeyError as exc:
            raise ConflictError(f"Já existe um galpão com o código {data.code}.") from exc
        if result.matched_count == 0:
            raise NotFoundError("Galpão não encontrado.")
    return await get_warehouse(db, _id)


async def delete_warehouse(db: AsyncDatabase, warehouse_id: str) -> None:
    _id = oid(warehouse_id, "Galpão")
    if not await db[col.WAREHOUSES].find_one({"_id": _id}):
        raise NotFoundError("Galpão não encontrado.")
    sector_ids = await db[col.SECTORS].distinct("_id", {"warehouse_id": _id})
    in_use = await db[col.CONTAINERS].count_documents({"status": "active", "sector_id": {"$in": sector_ids}})
    if in_use:
        raise ConflictError(f"O galpão possui {in_use} recipiente(s) armazenado(s). Transfira ou remova-os antes.")
    await db[col.SECTORS].delete_many({"warehouse_id": _id})
    await db[col.WAREHOUSES].delete_one({"_id": _id})


async def create_sector(db: AsyncDatabase, warehouse_id: str, data: SectorCreate) -> dict:
    wid = oid(warehouse_id, "Galpão")
    if not await db[col.WAREHOUSES].find_one({"_id": wid}):
        raise NotFoundError("Galpão não encontrado.")
    now = utcnow()
    try:
        await db[col.SECTORS].insert_one({**data.model_dump(), "warehouse_id": wid, "created_at": now, "updated_at": now})
    except DuplicateKeyError as exc:
        raise ConflictError(f"O setor {data.code} já existe neste galpão.") from exc
    return await get_warehouse(db, wid)


async def update_sector(db: AsyncDatabase, sector_id: str, data: SectorUpdate) -> dict:
    _id = oid(sector_id, "Setor")
    sector = await db[col.SECTORS].find_one({"_id": _id})
    if not sector:
        raise NotFoundError("Setor não encontrado.")

    changes = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None or k == "name"}
    rows = changes.get("rows", sector["rows"])
    cols = changes.get("cols", sector["cols"])
    outside = await db[col.CONTAINERS].count_documents(
        {"sector_id": _id, "status": "active", "$or": [{"row": {"$gt": rows}}, {"col": {"$gt": cols}}]}
    )
    if outside:
        raise ConflictError(f"{outside} recipiente(s) ficariam fora das novas dimensões. Transfira-os antes.")

    if changes:
        changes["updated_at"] = utcnow()
        await db[col.SECTORS].update_one({"_id": _id}, {"$set": changes})
    return await get_warehouse(db, sector["warehouse_id"])


async def delete_sector(db: AsyncDatabase, sector_id: str) -> dict:
    _id = oid(sector_id, "Setor")
    sector = await db[col.SECTORS].find_one({"_id": _id})
    if not sector:
        raise NotFoundError("Setor não encontrado.")
    in_use = await db[col.CONTAINERS].count_documents({"sector_id": _id, "status": "active"})
    if in_use:
        raise ConflictError(f"O setor possui {in_use} recipiente(s) armazenado(s). Transfira ou remova-os antes.")
    await db[col.SECTORS].delete_one({"_id": _id})
    return await get_warehouse(db, sector["warehouse_id"])


async def get_map(db: AsyncDatabase, warehouse_id: str) -> dict:
    warehouse = await get_warehouse(db, warehouse_id)
    containers = await container_service.list_containers(db, warehouse_id=warehouse_id)
    by_sector: dict[ObjectId, list[dict]] = defaultdict(list)
    for container in containers:
        by_sector[container["sector_id"]].append(container)
    sectors = [{**sector, "containers": by_sector.get(sector["id"], [])} for sector in warehouse["sectors"]]
    return {"warehouse": warehouse, "sectors": sectors}

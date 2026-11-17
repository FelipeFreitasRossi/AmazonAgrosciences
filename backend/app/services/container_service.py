"""Recipientes (IBC, barris...) e suas operações: entrada, saída, transferência e remoção.

Cada operação altera o recipiente de forma atômica (um único documento, com condição
no filtro) e grava uma movimentação com o responsável e o horário.
"""

from dataclasses import dataclass
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.database import collections as col
from app.schemas.container import ContainerCreate, ContainerMove, ContainerRemove, ContainerUpdate, VolumeOperation
from app.services.utils import duplicate_fields, oid, to_datetime, utcnow

EPSILON = 1e-6


@dataclass
class Refs:
    """Cadastros auxiliares carregados uma vez por requisição para montar as respostas."""

    types: dict[ObjectId, dict]
    products: dict[ObjectId, dict]
    sectors: dict[ObjectId, dict]
    warehouses: dict[ObjectId, dict]


async def load_refs(db: AsyncDatabase) -> Refs:
    async def as_dict(name: str) -> dict[ObjectId, dict]:
        return {doc["_id"]: doc for doc in await db[name].find().to_list()}

    return Refs(
        types=await as_dict(col.CONTAINER_TYPES),
        products=await as_dict(col.PRODUCTS),
        sectors=await as_dict(col.SECTORS),
        warehouses=await as_dict(col.WAREHOUSES),
    )


def position_number(sector: dict, row: int, column: int) -> int:
    return (row - 1) * sector["cols"] + column


def location(refs: Refs, sector_id: ObjectId, row: int, column: int) -> tuple[str, str]:
    """Retorna (código curto, descrição) da posição, ex.: ('G01-A-07', 'Galpão 01 · Setor A · Posição 07')."""
    sector = refs.sectors.get(sector_id)
    warehouse = refs.warehouses.get(sector["warehouse_id"]) if sector else None
    if not sector or not warehouse:
        return "—", "Localização desconhecida"
    number = position_number(sector, row, column)
    return (
        f"{warehouse['code']}-{sector['code']}-{number:02d}",
        f"{warehouse['name']} · Setor {sector['code']} · Posição {number:02d}",
    )


def to_out(doc: dict, refs: Refs) -> dict[str, Any]:
    ctype = refs.types.get(doc["type_id"], {})
    product = refs.products.get(doc["product_id"], {})
    sector = refs.sectors.get(doc["sector_id"], {})
    warehouse = refs.warehouses.get(sector.get("warehouse_id"), {})
    code, label = location(refs, doc["sector_id"], doc["row"], doc["col"])
    capacity = doc["capacity_l"]
    volume = round(doc["volume_l"], 3)

    return {
        "id": doc["_id"],
        "code": doc["code"],
        "status": doc["status"],
        "type_id": doc["type_id"],
        "type_code": ctype.get("code", "?"),
        "type_name": ctype.get("name", "Desconhecido"),
        "capacity_l": capacity,
        "volume_l": volume,
        "fill_pct": round(min(volume / capacity * 100, 100), 1) if capacity else 0,
        "product_id": doc["product_id"],
        "product_code": product.get("code", "?"),
        "product_name": product.get("name", "Produto removido"),
        "product_category": product.get("category", ""),
        "product_color": product.get("color", "#64748b"),
        "warehouse_id": sector.get("warehouse_id"),
        "warehouse_code": warehouse.get("code", "?"),
        "warehouse_name": warehouse.get("name", "?"),
        "sector_id": doc["sector_id"],
        "sector_code": sector.get("code", "?"),
        "row": doc["row"],
        "col": doc["col"],
        "position_number": position_number(sector, doc["row"], doc["col"]) if sector else 0,
        "location_code": code,
        "location_label": label,
        "lot": doc.get("lot"),
        "manufacture_date": doc.get("manufacture_date"),
        "expiry_date": doc.get("expiry_date"),
        "notes": doc.get("notes"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


def _check_position(refs: Refs, sector_id: ObjectId, row: int, column: int) -> dict:
    sector = refs.sectors.get(sector_id)
    if not sector:
        raise NotFoundError("Setor não encontrado.")
    if row > sector["rows"] or column > sector["cols"]:
        raise BadRequestError(
            f"Posição fora dos limites do setor {sector['code']} ({sector['rows']} linhas × {sector['cols']} colunas)."
        )
    return sector


async def _get_active(db: AsyncDatabase, container_id: ObjectId) -> dict:
    doc = await db[col.CONTAINERS].find_one({"_id": container_id, "status": "active"})
    if not doc:
        raise NotFoundError("Recipiente não encontrado ou já removido.")
    return doc


async def _next_code(db: AsyncDatabase, type_code: str) -> str:
    counter = await db["counters"].find_one_and_update(
        {"_id": f"container:{type_code}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"{type_code}-{counter['seq']:04d}"


async def _record_movement(
    db: AsyncDatabase,
    *,
    movement_type: str,
    container: dict,
    refs: Refs,
    volume_l: float,
    performed_by: str,
    from_location: str | None = None,
    to_location: str | None = None,
    notes: str | None = None,
) -> None:
    product = refs.products.get(container["product_id"], {})
    await db[col.MOVEMENTS].insert_one(
        {
            "type": movement_type,
            "container_id": container["_id"],
            "container_code": container["code"],
            "product_id": container["product_id"],
            "product_code": product.get("code", "?"),
            "product_name": product.get("name", "?"),
            "volume_l": round(volume_l, 3),
            "from_location": from_location,
            "to_location": to_location,
            "performed_by": performed_by,
            "notes": notes,
            "created_at": utcnow(),
        }
    )


# ---------------------------------------------------------------- consultas


async def list_containers(
    db: AsyncDatabase,
    *,
    search: str | None = None,
    product_id: str | None = None,
    warehouse_id: str | None = None,
    sector_id: str | None = None,
    status: str = "active",
) -> list[dict]:
    refs = await load_refs(db)
    query: dict[str, Any] = {}
    if status != "all":
        query["status"] = status
    if product_id:
        query["product_id"] = oid(product_id, "Produto")
    if sector_id:
        query["sector_id"] = oid(sector_id, "Setor")
    elif warehouse_id:
        wid = oid(warehouse_id, "Galpão")
        query["sector_id"] = {"$in": [sid for sid, s in refs.sectors.items() if s["warehouse_id"] == wid]}

    docs = await db[col.CONTAINERS].find(query).sort("code", 1).to_list()
    items = [to_out(doc, refs) for doc in docs]

    if search:
        term = search.strip().lower()
        fields = ("code", "product_name", "product_code", "lot", "location_code", "type_name", "product_category")
        items = [item for item in items if any(term in str(item.get(f) or "").lower() for f in fields)]
    return items


async def get_container(db: AsyncDatabase, container_id: str) -> dict:
    doc = await db[col.CONTAINERS].find_one({"_id": oid(container_id, "Recipiente")})
    if not doc:
        raise NotFoundError("Recipiente não encontrado.")
    return to_out(doc, await load_refs(db))


# ---------------------------------------------------------------- operações


async def create_container(db: AsyncDatabase, data: ContainerCreate) -> dict:
    refs = await load_refs(db)
    type_id = oid(data.type_id, "Tipo de recipiente")
    product_id = oid(data.product_id, "Produto")
    sector_id = oid(data.sector_id, "Setor")

    ctype = refs.types.get(type_id)
    if not ctype:
        raise NotFoundError("Tipo de recipiente não encontrado.")
    product = refs.products.get(product_id)
    if not product or not product.get("active", True):
        raise NotFoundError("Produto não encontrado ou arquivado.")
    _check_position(refs, sector_id, data.row, data.col)

    capacity = data.capacity_l or ctype["capacity_l"]
    if data.volume_l > capacity + EPSILON:
        raise BadRequestError(f"O volume ({data.volume_l:g} L) excede a capacidade do recipiente ({capacity:g} L).")

    now = utcnow()
    base = {
        "type_id": type_id,
        "product_id": product_id,
        "sector_id": sector_id,
        "row": data.row,
        "col": data.col,
        "volume_l": round(data.volume_l, 3),
        "capacity_l": capacity,
        "lot": data.lot,
        "manufacture_date": to_datetime(data.manufacture_date),
        "expiry_date": to_datetime(data.expiry_date),
        "notes": data.notes,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    doc: dict | None = None
    for _ in range(5):
        candidate = {**base, "code": data.code or await _next_code(db, ctype["code"])}
        try:
            result = await db[col.CONTAINERS].insert_one(candidate)
        except DuplicateKeyError as exc:
            fields = duplicate_fields(exc)
            if "sector_id" in fields or "row" in fields:
                raise ConflictError("Esta posição já está ocupada por outro recipiente.") from exc
            if data.code:
                raise ConflictError(f"Já existe um recipiente com o código {data.code}.") from exc
            continue  # código automático já usado manualmente: tenta o próximo
        candidate["_id"] = result.inserted_id
        doc = candidate
        break

    if doc is None:
        raise ConflictError("Não foi possível gerar um código único. Informe o código manualmente.")

    code, _ = location(refs, sector_id, data.row, data.col)
    await _record_movement(
        db,
        movement_type="entrada",
        container=doc,
        refs=refs,
        volume_l=doc["volume_l"],
        performed_by=data.performed_by,
        to_location=code,
        notes=data.notes or "Cadastro do recipiente",
    )
    return to_out(doc, refs)


async def update_container(db: AsyncDatabase, container_id: str, data: ContainerUpdate) -> dict:
    _id = oid(container_id, "Recipiente")
    current = await _get_active(db, _id)
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        return await get_container(db, container_id)

    manufacture = changes.get("manufacture_date", current.get("manufacture_date"))
    expiry = changes.get("expiry_date", current.get("expiry_date"))
    manufacture_d = manufacture.date() if hasattr(manufacture, "hour") else manufacture
    expiry_d = expiry.date() if hasattr(expiry, "hour") else expiry
    if manufacture_d and expiry_d and expiry_d < manufacture_d:
        raise BadRequestError("A data de validade deve ser posterior à data de fabricação.")

    for key in ("manufacture_date", "expiry_date"):
        if key in changes:
            changes[key] = to_datetime(changes[key])
    changes["updated_at"] = utcnow()

    await db[col.CONTAINERS].update_one({"_id": _id}, {"$set": changes})
    return await get_container(db, container_id)


async def add_volume(db: AsyncDatabase, container_id: str, data: VolumeOperation) -> dict:
    _id = oid(container_id, "Recipiente")
    doc = await db[col.CONTAINERS].find_one_and_update(
        {
            "_id": _id,
            "status": "active",
            "$expr": {"$lte": [{"$add": ["$volume_l", data.volume_l]}, {"$add": ["$capacity_l", EPSILON]}]},
        },
        {"$inc": {"volume_l": data.volume_l}, "$set": {"updated_at": utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        current = await _get_active(db, _id)
        free = current["capacity_l"] - current["volume_l"]
        raise BadRequestError(f"Capacidade excedida. Espaço livre no recipiente: {free:.1f} L.")

    refs = await load_refs(db)
    code, _ = location(refs, doc["sector_id"], doc["row"], doc["col"])
    await _record_movement(
        db, movement_type="entrada", container=doc, refs=refs, volume_l=data.volume_l,
        performed_by=data.performed_by, to_location=code, notes=data.notes,
    )
    return to_out(doc, refs)


async def withdraw_volume(db: AsyncDatabase, container_id: str, data: VolumeOperation) -> dict:
    _id = oid(container_id, "Recipiente")
    doc = await db[col.CONTAINERS].find_one_and_update(
        {"_id": _id, "status": "active", "volume_l": {"$gte": data.volume_l - EPSILON}},
        {"$inc": {"volume_l": -data.volume_l}, "$set": {"updated_at": utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        current = await _get_active(db, _id)
        raise BadRequestError(f"Volume insuficiente. Disponível no recipiente: {current['volume_l']:.1f} L.")

    if doc["volume_l"] < EPSILON:  # elimina resíduos de arredondamento
        await db[col.CONTAINERS].update_one({"_id": _id}, {"$set": {"volume_l": 0.0}})
        doc["volume_l"] = 0.0

    refs = await load_refs(db)
    code, _ = location(refs, doc["sector_id"], doc["row"], doc["col"])
    await _record_movement(
        db, movement_type="saida", container=doc, refs=refs, volume_l=data.volume_l,
        performed_by=data.performed_by, from_location=code, notes=data.notes,
    )
    return to_out(doc, refs)


async def move_container(db: AsyncDatabase, container_id: str, data: ContainerMove) -> dict:
    _id = oid(container_id, "Recipiente")
    current = await _get_active(db, _id)
    refs = await load_refs(db)
    target_sector = oid(data.sector_id, "Setor")
    _check_position(refs, target_sector, data.row, data.col)

    if (current["sector_id"], current["row"], current["col"]) == (target_sector, data.row, data.col):
        raise BadRequestError("O recipiente já está nesta posição.")

    from_code, _ = location(refs, current["sector_id"], current["row"], current["col"])
    try:
        await db[col.CONTAINERS].update_one(
            {"_id": _id, "status": "active"},
            {"$set": {"sector_id": target_sector, "row": data.row, "col": data.col, "updated_at": utcnow()}},
        )
    except DuplicateKeyError as exc:
        raise ConflictError("A posição de destino já está ocupada.") from exc

    to_code, _ = location(refs, target_sector, data.row, data.col)
    await _record_movement(
        db, movement_type="transferencia", container=current, refs=refs, volume_l=current["volume_l"],
        performed_by=data.performed_by, from_location=from_code, to_location=to_code, notes=data.notes,
    )
    return await get_container(db, container_id)


async def remove_container(db: AsyncDatabase, container_id: str, data: ContainerRemove) -> dict:
    _id = oid(container_id, "Recipiente")
    current = await _get_active(db, _id)
    refs = await load_refs(db)
    from_code, _ = location(refs, current["sector_id"], current["row"], current["col"])
    now = utcnow()

    await db[col.CONTAINERS].update_one(
        {"_id": _id, "status": "active"},
        {"$set": {"status": "removed", "removed_at": now, "updated_at": now}},
    )
    await _record_movement(
        db, movement_type="remocao", container=current, refs=refs, volume_l=current["volume_l"],
        performed_by=data.performed_by, from_location=from_code, notes=data.notes or "Recipiente retirado do galpão",
    )
    return await get_container(db, container_id)

"""Cadastro de produtos (fertilizantes) com o estoque calculado a partir dos recipientes."""

import re

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ConflictError, NotFoundError
from app.database import collections as col
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.utils import duplicate_fields, oid, utcnow, with_id

# Cores bem distintas entre si para identificar produtos no mapa
PALETTE = [
    "#1a7f5a", "#2563a8", "#c27c0e", "#7c3aed", "#c2410c",
    "#0e7490", "#be185d", "#4d7c0f", "#475569", "#a21caf",
]


async def stock_by_product(db: AsyncDatabase) -> dict[ObjectId, dict]:
    cursor = await db[col.CONTAINERS].aggregate(
        [
            {"$match": {"status": "active"}},
            {"$group": {"_id": "$product_id", "volume": {"$sum": "$volume_l"}, "count": {"$sum": 1}}},
        ]
    )
    return {row["_id"]: row async for row in cursor}


def _to_out(doc: dict, stock: dict[ObjectId, dict]) -> dict:
    entry = stock.get(doc["_id"], {})
    total = round(entry.get("volume", 0.0), 3)
    minimum = doc.get("min_stock_l", 0) or 0
    return {
        **with_id(doc),
        "total_volume_l": total,
        "containers_count": entry.get("count", 0),
        "low_stock": minimum > 0 and total < minimum,
    }


def _conflict(exc: DuplicateKeyError, code: str | None, name: str | None) -> ConflictError:
    if "name" in duplicate_fields(exc):
        return ConflictError(f"Já existe um produto chamado “{name}”.")
    return ConflictError(f"Já existe um produto com o código {code}.")


async def list_products(
    db: AsyncDatabase,
    *,
    search: str | None = None,
    category: str | None = None,
    include_archived: bool = False,
) -> list[dict]:
    query: dict = {} if include_archived else {"active": True}
    if category:
        query["category"] = category
    if search:
        pattern = {"$regex": re.escape(search.strip()), "$options": "i"}
        query["$or"] = [{"code": pattern}, {"name": pattern}, {"manufacturer": pattern}, {"composition": pattern}]

    docs = await db[col.PRODUCTS].find(query).sort("name", 1).to_list()
    stock = await stock_by_product(db)
    return [_to_out(doc, stock) for doc in docs]


async def list_categories(db: AsyncDatabase) -> list[str]:
    categories = await db[col.PRODUCTS].distinct("category", {"active": True})
    return sorted(categories, key=str.lower)


async def get_product(db: AsyncDatabase, product_id: str | ObjectId) -> dict:
    doc = await db[col.PRODUCTS].find_one({"_id": oid(product_id, "Produto")})
    if not doc:
        raise NotFoundError("Produto não encontrado.")
    return _to_out(doc, await stock_by_product(db))


async def create_product(db: AsyncDatabase, data: ProductCreate) -> dict:
    doc = data.model_dump()
    if not doc.get("color"):
        doc["color"] = PALETTE[await db[col.PRODUCTS].count_documents({}) % len(PALETTE)]
    now = utcnow()
    doc.update(active=True, created_at=now, updated_at=now)
    try:
        result = await db[col.PRODUCTS].insert_one(doc)
    except DuplicateKeyError as exc:
        raise _conflict(exc, data.code, data.name) from exc
    return await get_product(db, result.inserted_id)


async def update_product(db: AsyncDatabase, product_id: str, data: ProductUpdate) -> dict:
    _id = oid(product_id, "Produto")
    required = {"code", "name", "category", "min_stock_l", "color"}
    changes = {
        key: value
        for key, value in data.model_dump(exclude_unset=True).items()
        if not (key in required and value is None)
    }
    if changes:
        changes["updated_at"] = utcnow()
        try:
            result = await db[col.PRODUCTS].update_one({"_id": _id}, {"$set": changes})
        except DuplicateKeyError as exc:
            raise _conflict(exc, data.code, data.name) from exc
        if result.matched_count == 0:
            raise NotFoundError("Produto não encontrado.")
    return await get_product(db, _id)


async def delete_product(db: AsyncDatabase, product_id: str) -> dict:
    """Exclui o produto; se ele já tiver histórico, arquiva para preservar as movimentações."""
    _id = oid(product_id, "Produto")
    if not await db[col.PRODUCTS].find_one({"_id": _id}):
        raise NotFoundError("Produto não encontrado.")

    active = await db[col.CONTAINERS].count_documents({"product_id": _id, "status": "active"})
    if active:
        raise ConflictError(f"O produto está em {active} recipiente(s) armazenado(s). Remova-os antes de excluir.")

    has_history = await db[col.CONTAINERS].count_documents({"product_id": _id}, limit=1)
    if has_history:
        await db[col.PRODUCTS].update_one({"_id": _id}, {"$set": {"active": False, "updated_at": utcnow()}})
        return {"result": "archived", "message": "Produto arquivado (possui histórico de movimentações)."}

    await db[col.PRODUCTS].delete_one({"_id": _id})
    return {"result": "deleted", "message": "Produto excluído."}


async def restore_product(db: AsyncDatabase, product_id: str) -> dict:
    _id = oid(product_id, "Produto")
    result = await db[col.PRODUCTS].update_one({"_id": _id}, {"$set": {"active": True, "updated_at": utcnow()}})
    if result.matched_count == 0:
        raise NotFoundError("Produto não encontrado.")
    return await get_product(db, _id)

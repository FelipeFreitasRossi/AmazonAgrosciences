from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from app.database import collections as col
from app.services.utils import oid, with_id


async def list_movements(
    db: AsyncDatabase,
    *,
    movement_type: str | None = None,
    product_id: str | None = None,
    container_id: str | None = None,
    limit: int = 50,
    skip: int = 0,
) -> dict:
    query: dict[str, Any] = {}
    if movement_type:
        query["type"] = movement_type
    if product_id:
        query["product_id"] = oid(product_id, "Produto")
    if container_id:
        query["container_id"] = oid(container_id, "Recipiente")

    total = await db[col.MOVEMENTS].count_documents(query)
    docs = await db[col.MOVEMENTS].find(query).sort("created_at", -1).skip(skip).limit(limit).to_list()
    return {"items": [with_id(doc) for doc in docs], "total": total}

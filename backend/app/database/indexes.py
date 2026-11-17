"""Índices (garantem unicidade e consistência) e dados iniciais obrigatórios."""

import logging
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

from app.database import collections as col

logger = logging.getLogger(__name__)

# Comparação de texto sem diferenciar maiúsculas/minúsculas e acentos
CASE_INSENSITIVE = {"locale": "pt", "strength": 1}

DEFAULT_CONTAINER_TYPES = [
    {"code": "IBC", "name": "Container IBC", "capacity_l": 1000.0},
    {"code": "BAR", "name": "Barril", "capacity_l": 200.0},
    {"code": "BOM", "name": "Bombona", "capacity_l": 50.0},
]


async def ensure_indexes(db: AsyncDatabase) -> None:
    await db[col.WAREHOUSES].create_index("code", unique=True)
    await db[col.SECTORS].create_index([("warehouse_id", ASCENDING), ("code", ASCENDING)], unique=True)
    await db[col.CONTAINER_TYPES].create_index("code", unique=True)

    await db[col.PRODUCTS].create_index("code", unique=True)
    await db[col.PRODUCTS].create_index("name", unique=True, collation=CASE_INSENSITIVE, name="unique_name_ci")
    await db[col.PRODUCTS].create_index("category")

    await db[col.CONTAINERS].create_index("code", unique=True)
    await db[col.CONTAINERS].create_index("product_id")
    # Uma posição só pode ter um recipiente ativo por vez
    await db[col.CONTAINERS].create_index(
        [("sector_id", ASCENDING), ("row", ASCENDING), ("col", ASCENDING)],
        unique=True,
        partialFilterExpression={"status": "active"},
        name="unique_active_position",
    )

    await db[col.MOVEMENTS].create_index([("created_at", DESCENDING)])
    await db[col.MOVEMENTS].create_index("container_id")
    await db[col.MOVEMENTS].create_index("product_id")


async def seed_container_types(db: AsyncDatabase) -> None:
    if await db[col.CONTAINER_TYPES].count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    await db[col.CONTAINER_TYPES].insert_many(
        [{**item, "created_at": now, "updated_at": now} for item in DEFAULT_CONTAINER_TYPES]
    )
    logger.info("Tipos de recipiente padrão cadastrados (IBC, Barril, Bombona).")

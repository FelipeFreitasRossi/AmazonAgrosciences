"""Conexão com o MongoDB usando a API assíncrona oficial do PyMongo (AsyncMongoClient).

O Motor foi descontinuado pelo MongoDB; a API assíncrona do PyMongo é a substituta recomendada.
"""

import logging
import time

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


class MongoDB:
    client: AsyncMongoClient | None = None
    db: AsyncDatabase | None = None
    initialized: bool = False


mongodb = MongoDB()


async def initialize_database() -> None:
    """Cria índices e dados obrigatórios (executa uma vez por inicialização)."""
    from app.database.indexes import ensure_indexes, seed_container_types

    if mongodb.db is None or mongodb.initialized:
        return
    await ensure_indexes(mongodb.db)
    await seed_container_types(mongodb.db)
    mongodb.initialized = True
    logger.info("Índices do MongoDB verificados.")


async def connect_to_mongo() -> None:
    settings = get_settings()
    mongodb.client = AsyncMongoClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
        appname="amazon-agrosciences-api",
        tz_aware=True,
    )
    mongodb.db = mongodb.client[settings.MONGODB_DB_NAME]

    try:
        await mongodb.client.admin.command("ping")
        logger.info("Conectado ao MongoDB (banco: %s).", settings.MONGODB_DB_NAME)
        await initialize_database()
    except PyMongoError as exc:
        # A API continua no ar; a inicialização é refeita na primeira requisição com o banco disponível.
        logger.warning("MongoDB indisponível na inicialização: %s", exc)


async def close_mongo_connection() -> None:
    if mongodb.client is not None:
        await mongodb.client.close()
        mongodb.client = None
        mongodb.db = None
        mongodb.initialized = False
        logger.info("Conexão com o MongoDB encerrada.")


async def get_database() -> AsyncDatabase:
    """Dependência para injetar o banco nas rotas."""
    if mongodb.db is None:
        raise AppException(503, "Banco de dados indisponível.")
    if not mongodb.initialized:
        await initialize_database()
    return mongodb.db


async def ping_database() -> float:
    """Executa um ping no MongoDB e retorna a latência em milissegundos."""
    if mongodb.db is None:
        raise AppException(503, "Banco de dados indisponível.")
    start = time.perf_counter()
    await mongodb.db.command("ping")
    return (time.perf_counter() - start) * 1000

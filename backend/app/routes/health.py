import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.database import ping_database
from app.schemas.health import DatabaseHealth, HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse, summary="Status da API e do banco de dados")
async def health_check() -> HealthResponse:
    settings = get_settings()

    try:
        latency = await ping_database()
        database = DatabaseHealth(status="ok", latency_ms=round(latency, 2))
    except (PyMongoError, AppException) as exc:
        logger.warning("Health check: MongoDB indisponível: %s", exc)
        database = DatabaseHealth(status="error", detail="Não foi possível conectar ao MongoDB.")

    return HealthResponse(
        status="ok" if database.status == "ok" else "degraded",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database=database,
        timestamp=datetime.now(timezone.utc),
    )

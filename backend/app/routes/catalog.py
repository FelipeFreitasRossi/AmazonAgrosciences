"""Tipos de recipiente, movimentações, dashboard e dados de exemplo."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ConflictError
from app.database import collections as col
from app.database import get_database
from app.schemas.container_type import ContainerTypeCreate, ContainerTypeOut
from app.schemas.dashboard import DashboardOut
from app.schemas.movement import MovementPage
from app.services import dashboard_service, demo_service, movement_service
from app.services.utils import utcnow, with_id

container_types_router = APIRouter(prefix="/container-types", tags=["Tipos de recipiente"])
movements_router = APIRouter(prefix="/movements", tags=["Movimentações"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
setup_router = APIRouter(prefix="/setup", tags=["Configuração"])


@container_types_router.get("", response_model=list[ContainerTypeOut])
async def list_container_types(db: AsyncDatabase = Depends(get_database)):
    docs = await db[col.CONTAINER_TYPES].find().sort("capacity_l", -1).to_list()
    return [with_id(doc) for doc in docs]


@container_types_router.post("", response_model=ContainerTypeOut, status_code=status.HTTP_201_CREATED)
async def create_container_type(data: ContainerTypeCreate, db: AsyncDatabase = Depends(get_database)):
    now = utcnow()
    doc = {**data.model_dump(), "created_at": now, "updated_at": now}
    try:
        await db[col.CONTAINER_TYPES].insert_one(doc)
    except DuplicateKeyError as exc:
        raise ConflictError(f"Já existe um tipo de recipiente com o código {data.code}.") from exc
    return with_id(doc)


@movements_router.get("", response_model=MovementPage)
async def list_movements(
    type: Literal["entrada", "saida", "transferencia", "remocao"] | None = None,
    product_id: str | None = None,
    container_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    db: AsyncDatabase = Depends(get_database),
):
    return await movement_service.list_movements(
        db, movement_type=type, product_id=product_id, container_id=container_id, limit=limit, skip=skip
    )


@dashboard_router.get("", response_model=DashboardOut)
async def get_dashboard(db: AsyncDatabase = Depends(get_database)):
    return await dashboard_service.get_dashboard(db)


@setup_router.post("/demo", summary="Gera dados de exemplo (somente com o banco vazio)")
async def create_demo(db: AsyncDatabase = Depends(get_database)) -> dict:
    return await demo_service.create_demo_data(db)

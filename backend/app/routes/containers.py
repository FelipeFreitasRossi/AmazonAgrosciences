from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_database
from app.schemas.container import (
    ContainerCreate,
    ContainerMove,
    ContainerOut,
    ContainerRemove,
    ContainerUpdate,
    VolumeOperation,
)
from app.services import container_service

router = APIRouter(prefix="/containers", tags=["Recipientes"])


@router.get("", response_model=list[ContainerOut], summary="Lista e localiza recipientes")
async def list_containers(
    search: str | None = Query(default=None, max_length=100),
    product_id: str | None = None,
    warehouse_id: str | None = None,
    sector_id: str | None = None,
    status_filter: Literal["active", "removed", "all"] = Query(default="active", alias="status"),
    db: AsyncDatabase = Depends(get_database),
):
    return await container_service.list_containers(
        db, search=search, product_id=product_id, warehouse_id=warehouse_id, sector_id=sector_id, status=status_filter
    )


@router.post("", response_model=ContainerOut, status_code=status.HTTP_201_CREATED, summary="Entrada de recipiente")
async def create_container(data: ContainerCreate, db: AsyncDatabase = Depends(get_database)):
    return await container_service.create_container(db, data)


@router.get("/{container_id}", response_model=ContainerOut)
async def get_container(container_id: str, db: AsyncDatabase = Depends(get_database)):
    return await container_service.get_container(db, container_id)


@router.patch("/{container_id}", response_model=ContainerOut)
async def update_container(container_id: str, data: ContainerUpdate, db: AsyncDatabase = Depends(get_database)):
    return await container_service.update_container(db, container_id, data)


@router.post("/{container_id}/entry", response_model=ContainerOut, summary="Adiciona litros ao recipiente")
async def add_volume(container_id: str, data: VolumeOperation, db: AsyncDatabase = Depends(get_database)):
    return await container_service.add_volume(db, container_id, data)


@router.post("/{container_id}/withdraw", response_model=ContainerOut, summary="Retira litros do recipiente")
async def withdraw_volume(container_id: str, data: VolumeOperation, db: AsyncDatabase = Depends(get_database)):
    return await container_service.withdraw_volume(db, container_id, data)


@router.post("/{container_id}/move", response_model=ContainerOut, summary="Transfere para outra posição/galpão")
async def move_container(container_id: str, data: ContainerMove, db: AsyncDatabase = Depends(get_database)):
    return await container_service.move_container(db, container_id, data)


@router.post("/{container_id}/remove", response_model=ContainerOut, summary="Retira o recipiente do galpão")
async def remove_container(container_id: str, data: ContainerRemove, db: AsyncDatabase = Depends(get_database)):
    return await container_service.remove_container(db, container_id, data)

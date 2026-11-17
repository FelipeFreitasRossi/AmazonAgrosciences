from fastapi import APIRouter, Depends, status
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_database
from app.schemas.map import WarehouseMap
from app.schemas.warehouse import SectorCreate, SectorUpdate, WarehouseCreate, WarehouseOut, WarehouseUpdate
from app.services import warehouse_service

router = APIRouter(prefix="/warehouses", tags=["Galpões"])
sectors_router = APIRouter(prefix="/sectors", tags=["Galpões"])


@router.get("", response_model=list[WarehouseOut], summary="Lista galpões com setores e ocupação")
async def list_warehouses(db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.list_warehouses(db)


@router.post("", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
async def create_warehouse(data: WarehouseCreate, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.create_warehouse(db, data)


@router.get("/{warehouse_id}", response_model=WarehouseOut)
async def get_warehouse(warehouse_id: str, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.get_warehouse(db, warehouse_id)


@router.patch("/{warehouse_id}", response_model=WarehouseOut)
async def update_warehouse(warehouse_id: str, data: WarehouseUpdate, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.update_warehouse(db, warehouse_id, data)


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(warehouse_id: str, db: AsyncDatabase = Depends(get_database)) -> None:
    await warehouse_service.delete_warehouse(db, warehouse_id)


@router.get("/{warehouse_id}/map", response_model=WarehouseMap, summary="Mapa 2D: setores e recipientes")
async def get_map(warehouse_id: str, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.get_map(db, warehouse_id)


@router.post("/{warehouse_id}/sectors", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
async def create_sector(warehouse_id: str, data: SectorCreate, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.create_sector(db, warehouse_id, data)


@sectors_router.patch("/{sector_id}", response_model=WarehouseOut)
async def update_sector(sector_id: str, data: SectorUpdate, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.update_sector(db, sector_id, data)


@sectors_router.delete("/{sector_id}", response_model=WarehouseOut)
async def delete_sector(sector_id: str, db: AsyncDatabase = Depends(get_database)):
    return await warehouse_service.delete_sector(db, sector_id)

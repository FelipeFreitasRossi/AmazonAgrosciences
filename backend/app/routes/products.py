from fastapi import APIRouter, Depends, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_database
from app.schemas.product import DeleteResult, ProductCreate, ProductOut, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Produtos"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    search: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=120),
    include_archived: bool = False,
    db: AsyncDatabase = Depends(get_database),
):
    return await product_service.list_products(db, search=search, category=category, include_archived=include_archived)


@router.get("/categories", response_model=list[str])
async def list_categories(db: AsyncDatabase = Depends(get_database)):
    return await product_service.list_categories(db)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductCreate, db: AsyncDatabase = Depends(get_database)):
    return await product_service.create_product(db, data)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncDatabase = Depends(get_database)):
    return await product_service.get_product(db, product_id)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, data: ProductUpdate, db: AsyncDatabase = Depends(get_database)):
    return await product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", response_model=DeleteResult)
async def delete_product(product_id: str, db: AsyncDatabase = Depends(get_database)):
    return await product_service.delete_product(db, product_id)


@router.post("/{product_id}/restore", response_model=ProductOut)
async def restore_product(product_id: str, db: AsyncDatabase = Depends(get_database)):
    return await product_service.restore_product(db, product_id)

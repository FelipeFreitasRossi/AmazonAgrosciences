"""Agrega todos os routers da API v1. Novos módulos são registrados aqui."""

from fastapi import APIRouter

from app.routes import catalog, containers, health, products, warehouses

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(catalog.dashboard_router)
api_router.include_router(products.router)
api_router.include_router(warehouses.router)
api_router.include_router(warehouses.sectors_router)
api_router.include_router(containers.router)
api_router.include_router(catalog.container_types_router)
api_router.include_router(catalog.movements_router)
api_router.include_router(catalog.setup_router)

# Próximos módulos:
# api_router.include_router(auth.router)
# api_router.include_router(users.router)

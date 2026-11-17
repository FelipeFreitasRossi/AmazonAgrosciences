"""Gera uma estrutura de exemplo (5 galpões, fertilizantes e recipientes) num banco vazio."""

import random
from datetime import timedelta

from pymongo.asynchronous.database import AsyncDatabase

from app.core.exceptions import ConflictError
from app.database import collections as col
from app.schemas.container import ContainerCreate
from app.schemas.product import ProductCreate
from app.schemas.warehouse import SectorCreate, WarehouseCreate
from app.services import container_service, product_service, warehouse_service
from app.services.utils import utcnow

DEMO_PRODUCTS = [
    ("FOL-001", "Foliar Cálcio + Boro", "Foliar", "Ca 10% + B 0,5%", 1.32, 3000),
    ("NPK-010", "NPK Líquido 10-10-10", "NPK", "N 10% + P 10% + K 10%", 1.25, 4000),
    ("BIO-001", "Bioestimulante Algas Marinhas", "Bioestimulante", "Extrato de Ascophyllum nodosum", 1.10, 1500),
    ("MIC-005", "Mix Micronutrientes Zn + Mn", "Micronutrientes", "Zn 5% + Mn 3%", 1.28, 1000),
    ("ORG-002", "Fertilizante Orgânico Fluido", "Orgânico", "Carbono orgânico total 8%", 1.15, 2000),
    ("POT-030", "Potássio Foliar 30", "Foliar", "K₂O 30%", 1.45, 2500),
    ("ADJ-001", "Adjuvante Espalhante Adesivo", "Adjuvante", "Óleo vegetal 72%", 0.93, 600),
]


async def create_demo_data(db: AsyncDatabase) -> dict:
    if await db[col.WAREHOUSES].count_documents({}) or await db[col.PRODUCTS].count_documents({}):
        raise ConflictError("Os dados de exemplo só podem ser gerados com o banco vazio.")

    rng = random.Random(2026)
    types = {t["code"]: t for t in await db[col.CONTAINER_TYPES].find().to_list()}

    products = []
    for code, name, category, composition, density, minimum in DEMO_PRODUCTS:
        products.append(
            await product_service.create_product(
                db,
                ProductCreate(
                    code=code, name=name, category=category, composition=composition,
                    density_kg_l=density, min_stock_l=minimum, manufacturer="Amazon Agrosciences",
                ),
            )
        )

    sectors = []
    for number in range(1, 6):
        warehouse = await warehouse_service.create_warehouse(
            db, WarehouseCreate(code=f"G{number:02d}", name=f"Galpão {number:02d}")
        )
        sector_codes = ["A", "B", "C"] if number == 1 else ["A", "B"]
        for sector_code in sector_codes:
            warehouse = await warehouse_service.create_sector(
                db, warehouse["id"], SectorCreate(code=sector_code, name=f"Área {sector_code}", rows=4, cols=8)
            )
        sectors.extend(warehouse["sectors"])

    today = utcnow().date()
    created = 0
    for sector in sectors:
        for row in range(1, sector["rows"] + 1):
            for column in range(1, sector["cols"] + 1):
                if rng.random() > 0.55:
                    continue
                ctype = types["IBC"] if rng.random() < 0.7 else types["BAR"]
                capacity = ctype["capacity_l"]
                product = rng.choice(products)
                manufacture = today - timedelta(days=rng.randint(10, 300))
                await container_service.create_container(
                    db,
                    ContainerCreate(
                        type_id=str(ctype["_id"]),
                        product_id=str(product["id"]),
                        sector_id=str(sector["id"]),
                        row=row,
                        col=column,
                        volume_l=round(capacity * rng.choice([0.15, 0.4, 0.65, 0.85, 1.0]), 1),
                        lot=f"L{manufacture:%y%m}-{rng.randint(100, 999)}",
                        manufacture_date=manufacture,
                        expiry_date=manufacture + timedelta(days=rng.choice([180, 365, 540])),
                        performed_by="Carga inicial",
                    ),
                )
                created += 1

    return {"warehouses": 5, "sectors": len(sectors), "products": len(products), "containers": created}

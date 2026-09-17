from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from app import models
from app.database import Base, SessionLocal, engine
from app.routers import colors, fabric_types, products, quotes, settings as settings_router

DEFAULT_FABRIC_TYPES = [
    "Malha PV",
    "Malha algodão",
    "Tecido tricoline algodão",
    "Helanquinha",
    "Piquet",
    "Helanca colegial",
    "Brim",
    "Jeans",
    "Dryfit",
    "Malha proteção UV",
]


def seed_defaults(db):
    if db.scalar(select(models.FabricType)) is None:
        for name in DEFAULT_FABRIC_TYPES:
            db.add(models.FabricType(name=name))

    if db.get(models.Settings, 1) is None:
        db.add(models.Settings(id=1))

    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_defaults(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="MaisFarda Uniformes - API",
    description=(
        "API de backend para gestão de produtos, cores, orçamentos e pedidos "
        "da MaisFarda Uniformes. Apenas rotas e lógica de negócio, sem camada visual."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(fabric_types.router)
app.include_router(colors.router)
app.include_router(products.router)
app.include_router(settings_router.router)
app.include_router(quotes.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

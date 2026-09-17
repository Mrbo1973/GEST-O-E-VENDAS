from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.crud_helpers import get_or_404
from app.database import get_db

router = APIRouter(prefix="/fabric-types", tags=["Malhas (tipos de tecido)"])


@router.get("/", response_model=list[schemas.FabricTypeRead])
def list_fabric_types(
    include_inactive: bool = False, db: Session = Depends(get_db)
):
    stmt = select(models.FabricType)
    if not include_inactive:
        stmt = stmt.where(models.FabricType.active.is_(True))
    return db.scalars(stmt.order_by(models.FabricType.name)).all()


@router.post("/", response_model=schemas.FabricTypeRead, status_code=status.HTTP_201_CREATED)
def create_fabric_type(payload: schemas.FabricTypeCreate, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(models.FabricType).where(models.FabricType.name == payload.name)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma malha chamada '{payload.name}'.",
        )
    fabric_type = models.FabricType(**payload.model_dump())
    db.add(fabric_type)
    db.commit()
    db.refresh(fabric_type)
    return fabric_type


@router.put("/{fabric_type_id}", response_model=schemas.FabricTypeRead)
def update_fabric_type(
    fabric_type_id: int,
    payload: schemas.FabricTypeUpdate,
    db: Session = Depends(get_db),
):
    fabric_type = get_or_404(db, models.FabricType, fabric_type_id, "Tipo de malha")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(fabric_type, field, value)
    db.commit()
    db.refresh(fabric_type)
    return fabric_type


@router.delete("/{fabric_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fabric_type(
    fabric_type_id: int, confirm: bool = False, db: Session = Depends(get_db)
):
    fabric_type = get_or_404(db, models.FabricType, fabric_type_id, "Tipo de malha")

    products_using = db.scalar(
        select(models.Product).where(models.Product.fabric_type_id == fabric_type_id)
    )
    if products_using is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Não é possível excluir: existem produtos cadastrados com esta malha. "
                "Marque a malha como inativa em vez de excluí-la."
            ),
        )

    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Confirmação necessária para excluir a malha '{fabric_type.name}'. "
                "Repita a requisição com ?confirm=true."
            ),
        )

    db.delete(fabric_type)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.crud_helpers import get_or_404
from app.database import get_db

router = APIRouter(prefix="/colors", tags=["Cores"])


@router.get("/", response_model=list[schemas.ColorRead])
def list_colors(db: Session = Depends(get_db)):
    return db.scalars(select(models.Color).order_by(models.Color.name)).all()


@router.post("/", response_model=schemas.ColorRead, status_code=status.HTTP_201_CREATED)
def create_color(payload: schemas.ColorCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(models.Color).where(models.Color.name == payload.name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma cor chamada '{payload.name}'.",
        )
    color = models.Color(**payload.model_dump())
    db.add(color)
    db.commit()
    db.refresh(color)
    return color


@router.put("/{color_id}", response_model=schemas.ColorRead)
def update_color(color_id: int, payload: schemas.ColorUpdate, db: Session = Depends(get_db)):
    color = get_or_404(db, models.Color, color_id, "Cor")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(color, field, value)
    db.commit()
    db.refresh(color)
    return color


@router.delete("/{color_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_color(color_id: int, confirm: bool = False, db: Session = Depends(get_db)):
    color = get_or_404(db, models.Color, color_id, "Cor")

    quote_using = db.scalar(select(models.Quote).where(models.Quote.color_id == color_id))
    if quote_using is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir: existem pedidos de orçamento vinculados a esta cor.",
        )

    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Confirmação necessária para excluir a cor '{color.name}'. "
                "Repita a requisição com ?confirm=true."
            ),
        )

    db.delete(color)
    db.commit()

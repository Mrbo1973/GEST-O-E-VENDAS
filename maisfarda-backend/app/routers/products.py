from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.crud_helpers import get_or_404
from app.database import get_db

router = APIRouter(prefix="/products", tags=["Produtos"])


def _available_colors(db: Session, product: models.Product) -> list[models.Color]:
    if product.color_links:
        return [link.color for link in product.color_links]
    return db.scalars(select(models.Color).order_by(models.Color.name)).all()


def _to_read_model(db: Session, product: models.Product) -> schemas.ProductRead:
    data = schemas.ProductRead.model_validate(product)
    data.available_colors = [
        schemas.ColorRead.model_validate(c) for c in _available_colors(db, product)
    ]
    return data


def _set_product_colors(db: Session, product: models.Product, color_ids: list[int] | None):
    if color_ids is None:
        return
    for color_id in color_ids:
        get_or_404(db, models.Color, color_id, "Cor")
    product.color_links.clear()
    db.flush()
    for color_id in color_ids:
        db.add(models.ProductColor(product_id=product.id, color_id=color_id))


@router.get("/", response_model=list[schemas.ProductRead])
def list_products(include_inactive: bool = False, db: Session = Depends(get_db)):
    stmt = select(models.Product)
    if not include_inactive:
        stmt = stmt.where(models.Product.active.is_(True))
    products = db.scalars(stmt.order_by(models.Product.name)).all()
    return [_to_read_model(db, p) for p in products]


@router.get("/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = get_or_404(db, models.Product, product_id, "Produto")
    return _to_read_model(db, product)


@router.post("/", response_model=schemas.ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    get_or_404(db, models.FabricType, payload.fabric_type_id, "Tipo de malha")

    data = payload.model_dump(exclude={"color_ids"})
    product = models.Product(**data)
    db.add(product)
    db.flush()

    _set_product_colors(db, product, payload.color_ids)

    db.commit()
    db.refresh(product)
    return _to_read_model(db, product)


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)
):
    product = get_or_404(db, models.Product, product_id, "Produto")

    updates = payload.model_dump(exclude_unset=True, exclude={"color_ids"})
    if "fabric_type_id" in updates:
        get_or_404(db, models.FabricType, updates["fabric_type_id"], "Tipo de malha")
    for field, value in updates.items():
        setattr(product, field, value)

    if "color_ids" in payload.model_fields_set:
        _set_product_colors(db, product, payload.color_ids)

    db.commit()
    db.refresh(product)
    return _to_read_model(db, product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, confirm: bool = False, db: Session = Depends(get_db)):
    product = get_or_404(db, models.Product, product_id, "Produto")

    quote_using = db.scalar(select(models.Quote).where(models.Quote.product_id == product_id))
    if quote_using is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Não é possível excluir: existem pedidos de orçamento vinculados a este produto. "
                "Marque o produto como inativo em vez de excluí-lo."
            ),
        )

    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Confirmação necessária para excluir o produto '{product.name}'. "
                "Repita a requisição com ?confirm=true."
            ),
        )

    db.delete(product)
    db.commit()

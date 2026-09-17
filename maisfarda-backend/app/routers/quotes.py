from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.crud_helpers import get_or_404, get_settings
from app.database import get_db
from app.services.calculator import calculate_budget
from app.services.notifications import send_quote_notification

router = APIRouter(tags=["Orçamentos e Pedidos"])


def _validate_color_for_product(db: Session, product: models.Product, color_id: int | None):
    if color_id is None:
        return
    color = get_or_404(db, models.Color, color_id, "Cor")
    if product.color_links:
        allowed_ids = {link.color_id for link in product.color_links}
        if color_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A cor '{color.name}' não está disponível para o produto '{product.name}'.",
            )


@router.post("/calculator/budget", response_model=schemas.BudgetResult)
def calculate(payload: schemas.BudgetRequest, db: Session = Depends(get_db)):
    product = get_or_404(db, models.Product, payload.product_id, "Produto")
    _validate_color_for_product(db, product, payload.color_id)
    settings = get_settings(db)

    result = calculate_budget(product, payload.size, payload.quantity, settings)

    return schemas.BudgetResult(
        product_id=product.id,
        product_name=product.name,
        size=payload.size.strip().upper(),
        color_id=payload.color_id,
        quantity=payload.quantity,
        is_special_size=result.is_special_size,
        surcharge_percent_applied=result.surcharge_percent_applied,
        unit_price=result.unit_price,
        total_price=result.total_price,
        deposit_percent_applied=result.deposit_percent_applied,
        deposit_amount=result.deposit_amount,
        remaining_balance=result.remaining_balance,
        minimum_quantity_applied=result.minimum_quantity_applied,
        below_minimum_quantity=result.below_minimum_quantity,
        delivery_business_days=result.delivery_business_days,
    )


@router.post("/quotes/", response_model=schemas.QuoteRead, status_code=status.HTTP_201_CREATED)
async def create_quote(payload: schemas.QuoteCreate, db: Session = Depends(get_db)):
    product = get_or_404(db, models.Product, payload.product_id, "Produto")
    _validate_color_for_product(db, product, payload.color_id)
    settings = get_settings(db)

    result = calculate_budget(product, payload.size, payload.quantity, settings)

    quote = models.Quote(
        product_id=product.id,
        color_id=payload.color_id,
        size=payload.size.strip().upper(),
        quantity=payload.quantity,
        unit_price=result.unit_price,
        total_price=result.total_price,
        deposit_percent_applied=result.deposit_percent_applied,
        deposit_amount=result.deposit_amount,
        remaining_balance=result.remaining_balance,
        delivery_business_days=result.delivery_business_days,
        below_minimum_quantity=result.below_minimum_quantity,
        minimum_quantity_applied=result.minimum_quantity_applied,
        client_name=payload.client_name,
        client_email=payload.client_email,
        client_phone=payload.client_phone,
        notes=payload.notes,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    quote.notification_status = await send_quote_notification(quote, settings)
    db.commit()
    db.refresh(quote)

    return quote


@router.get("/quotes/", response_model=list[schemas.QuoteRead])
def list_quotes(
    status_filter: models.QuoteStatus | None = None, db: Session = Depends(get_db)
):
    stmt = select(models.Quote)
    if status_filter is not None:
        stmt = stmt.where(models.Quote.status == status_filter)
    return db.scalars(stmt.order_by(models.Quote.created_at.desc())).all()


@router.get("/quotes/{quote_id}", response_model=schemas.QuoteRead)
def get_quote(quote_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, models.Quote, quote_id, "Pedido de orçamento")


@router.patch("/quotes/{quote_id}/status", response_model=schemas.QuoteRead)
def update_quote_status(
    quote_id: int, payload: schemas.QuoteStatusUpdate, db: Session = Depends(get_db)
):
    quote = get_or_404(db, models.Quote, quote_id, "Pedido de orçamento")
    quote.status = payload.status
    db.commit()
    db.refresh(quote)
    return quote


@router.delete("/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(quote_id: int, confirm: bool = False, db: Session = Depends(get_db)):
    quote = get_or_404(db, models.Quote, quote_id, "Pedido de orçamento")
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Confirmação necessária para excluir o pedido #{quote.id}. "
                "Repita a requisição com ?confirm=true."
            ),
        )
    db.delete(quote)
    db.commit()

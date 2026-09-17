from dataclasses import dataclass

from fastapi import HTTPException, status

from app.models import Product, Settings


@dataclass
class BudgetCalculation:
    is_special_size: bool
    surcharge_percent_applied: float
    unit_price: float
    total_price: float
    deposit_percent_applied: float
    deposit_amount: float
    remaining_balance: float
    minimum_quantity_applied: int
    below_minimum_quantity: bool
    delivery_business_days: int


def calculate_budget(
    product: Product, size: str, quantity: int, settings: Settings
) -> BudgetCalculation:
    normalized_size = size.strip().upper()
    is_special = normalized_size in product.special_sizes
    is_standard = normalized_size in product.standard_sizes

    if not is_special and not is_standard:
        valid_sizes = ", ".join(product.all_sizes()) or "nenhum tamanho cadastrado"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Tamanho '{size}' inválido para o produto '{product.name}'. "
                f"Tamanhos disponíveis: {valid_sizes}."
            ),
        )

    surcharge_percent = (
        float(product.special_size_surcharge_percent) if is_special else 0.0
    )
    base_price = float(product.price_per_unit)
    unit_price = round(base_price * (1 + surcharge_percent / 100), 2)
    total_price = round(unit_price * quantity, 2)

    deposit_percent = float(settings.deposit_percent_default)
    deposit_amount = round(total_price * deposit_percent / 100, 2)
    remaining_balance = round(total_price - deposit_amount, 2)

    minimum_quantity = (
        product.min_order_quantity
        if product.min_order_quantity is not None
        else settings.min_order_quantity_default
    )
    below_minimum = quantity < minimum_quantity

    return BudgetCalculation(
        is_special_size=is_special,
        surcharge_percent_applied=surcharge_percent,
        unit_price=unit_price,
        total_price=total_price,
        deposit_percent_applied=deposit_percent,
        deposit_amount=deposit_amount,
        remaining_balance=remaining_balance,
        minimum_quantity_applied=minimum_quantity,
        below_minimum_quantity=below_minimum,
        delivery_business_days=settings.delivery_business_days_default,
    )

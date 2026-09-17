from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import LogoApplication, LogoLocation, QuoteStatus, NotificationStatus


# ---------- Fabric type (Malha) ----------


class FabricTypeBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    active: bool = True


class FabricTypeCreate(FabricTypeBase):
    pass


class FabricTypeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    active: Optional[bool] = None


class FabricTypeRead(FabricTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Color ----------


class ColorBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    hex_code: str = Field(min_length=4, max_length=7)

    @field_validator("hex_code")
    @classmethod
    def validate_hex(cls, v: str) -> str:
        v = v if v.startswith("#") else f"#{v}"
        hex_digits = v[1:]
        if len(hex_digits) not in (3, 6) or not all(
            c in "0123456789abcdefABCDEF" for c in hex_digits
        ):
            raise ValueError("hex_code deve ser um código hexadecimal válido, ex: #FFAA00")
        return v.upper()


class ColorCreate(ColorBase):
    pass


class ColorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    hex_code: Optional[str] = Field(default=None, min_length=4, max_length=7)


class ColorRead(ColorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Product ----------


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    fabric_type_id: int
    logo_application: Optional[LogoApplication] = None
    logo_location: Optional[LogoLocation] = None
    price_per_unit: float = Field(gt=0)
    standard_sizes: list[str] = Field(default_factory=list)
    special_sizes: list[str] = Field(default_factory=list)
    special_size_surcharge_percent: float = Field(default=0, ge=0)
    min_order_quantity: Optional[int] = Field(default=None, gt=0)
    active: bool = True

    @field_validator("standard_sizes", "special_sizes")
    @classmethod
    def normalize_sizes(cls, v: list[str]) -> list[str]:
        return [s.strip().upper() for s in v if s.strip()]


class ProductCreate(ProductBase):
    color_ids: Optional[list[int]] = Field(
        default=None,
        description=(
            "Cores disponíveis para este produto. "
            "Se omitido ou vazio, todas as cores cadastradas ficam disponíveis."
        ),
    )


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    fabric_type_id: Optional[int] = None
    logo_application: Optional[LogoApplication] = None
    logo_location: Optional[LogoLocation] = None
    price_per_unit: Optional[float] = Field(default=None, gt=0)
    standard_sizes: Optional[list[str]] = None
    special_sizes: Optional[list[str]] = None
    special_size_surcharge_percent: Optional[float] = Field(default=None, ge=0)
    min_order_quantity: Optional[int] = Field(default=None, gt=0)
    active: Optional[bool] = None
    color_ids: Optional[list[int]] = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    fabric_type: FabricTypeRead
    available_colors: list[ColorRead] = Field(default_factory=list)


# ---------- Settings ----------


class SettingsBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=150)
    min_order_quantity_default: int = Field(gt=0)
    delivery_business_days_default: int = Field(gt=0)
    deposit_percent_default: float = Field(gt=0, le=100)
    founding_year: Optional[int] = None
    notification_webhook_url: Optional[str] = None


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    min_order_quantity_default: Optional[int] = Field(default=None, gt=0)
    delivery_business_days_default: Optional[int] = Field(default=None, gt=0)
    deposit_percent_default: Optional[float] = Field(default=None, gt=0, le=100)
    founding_year: Optional[int] = None
    notification_webhook_url: Optional[str] = None


class SettingsRead(SettingsBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    years_in_market: Optional[int] = None


# ---------- Calculator ----------


class BudgetRequest(BaseModel):
    product_id: int
    size: str
    color_id: Optional[int] = None
    quantity: int = Field(gt=0)


class BudgetResult(BaseModel):
    product_id: int
    product_name: str
    size: str
    color_id: Optional[int] = None
    quantity: int
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


# ---------- Quote (Pedido de orçamento) ----------


class QuoteCreate(BaseModel):
    product_id: int
    size: str
    color_id: Optional[int] = None
    quantity: int = Field(gt=0)
    client_name: str = Field(min_length=1, max_length=150)
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = Field(default=None, max_length=30)
    notes: Optional[str] = None


class QuoteStatusUpdate(BaseModel):
    status: QuoteStatus


class QuoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    color_id: Optional[int]
    size: str
    quantity: int
    unit_price: float
    total_price: float
    deposit_percent_applied: float
    deposit_amount: float
    remaining_balance: float
    delivery_business_days: int
    below_minimum_quantity: bool
    minimum_quantity_applied: int
    client_name: str
    client_email: Optional[str]
    client_phone: Optional[str]
    notes: Optional[str]
    status: QuoteStatus
    notification_status: NotificationStatus
    created_at: datetime
    updated_at: datetime

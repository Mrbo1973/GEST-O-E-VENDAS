import enum
from datetime import datetime, date

from sqlalchemy import (
    ForeignKey,
    Numeric,
    String,
    Text,
    JSON,
    Enum,
    Boolean,
    Integer,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LogoApplication(str, enum.Enum):
    SILK = "silk"
    BORDADO = "bordado"


class LogoLocation(str, enum.Enum):
    PEITO = "peito"
    COSTAS = "costas"
    AMBOS = "ambos"


class QuoteStatus(str, enum.Enum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    EM_PRODUCAO = "em_producao"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class NotificationStatus(str, enum.Enum):
    NAO_CONFIGURADO = "nao_configurado"
    ENVIADO = "enviado"
    FALHOU = "falhou"


class FabricType(Base):
    """Malha / tecido base (ex: Malha PV, Brim, Dryfit...)."""

    __tablename__ = "fabric_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    products: Mapped[list["Product"]] = relationship(back_populates="fabric_type")


class Color(Base):
    __tablename__ = "colors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hex_code: Mapped[str] = mapped_column(String(7))  # ex: #FFFFFF

    product_links: Mapped[list["ProductColor"]] = relationship(
        back_populates="color", cascade="all, delete-orphan"
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    fabric_type_id: Mapped[int] = mapped_column(ForeignKey("fabric_types.id"))
    logo_application: Mapped[LogoApplication | None] = mapped_column(
        Enum(LogoApplication), nullable=True
    )
    logo_location: Mapped[LogoLocation | None] = mapped_column(
        Enum(LogoLocation), nullable=True
    )
    price_per_unit: Mapped[float] = mapped_column(Numeric(10, 2))

    # Faixa de tamanhos padrão, ex: ["PP", "P", "M", "G", "GG"]
    standard_sizes: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Tamanhos especiais, ex: ["XG", "XGG"]
    special_sizes: Mapped[list[str]] = mapped_column(JSON, default=list)
    special_size_surcharge_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), default=0
    )

    # Pedido mínimo específico do modelo; se nulo, usa o padrão das configurações
    min_order_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    fabric_type: Mapped["FabricType"] = relationship(back_populates="products")
    color_links: Mapped[list["ProductColor"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    quotes: Mapped[list["Quote"]] = relationship(back_populates="product")

    def all_sizes(self) -> list[str]:
        return list(self.standard_sizes) + list(self.special_sizes)


class ProductColor(Base):
    """Vínculo opcional entre produto e cores disponíveis para ele.

    Se um produto não possuir nenhum vínculo, todas as cores cadastradas
    globalmente são consideradas disponíveis para ele.
    """

    __tablename__ = "product_colors"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"), primary_key=True
    )
    color_id: Mapped[int] = mapped_column(ForeignKey("colors.id"), primary_key=True)

    product: Mapped["Product"] = relationship(back_populates="color_links")
    color: Mapped["Color"] = relationship(back_populates="product_links")


class Settings(Base):
    """Configurações gerais da fábrica. Linha única (id=1)."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    company_name: Mapped[str] = mapped_column(
        String(150), default="MaisFarda Uniformes"
    )
    min_order_quantity_default: Mapped[int] = mapped_column(Integer, default=20)
    delivery_business_days_default: Mapped[int] = mapped_column(Integer, default=20)
    deposit_percent_default: Mapped[float] = mapped_column(Numeric(5, 2), default=50)
    founding_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notification_webhook_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )


class Quote(Base):
    """Pedido de orçamento registrado pelo cliente."""

    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    color_id: Mapped[int | None] = mapped_column(
        ForeignKey("colors.id"), nullable=True
    )
    size: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[int] = mapped_column(Integer)

    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))
    total_price: Mapped[float] = mapped_column(Numeric(10, 2))
    deposit_percent_applied: Mapped[float] = mapped_column(Numeric(5, 2))
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2))
    remaining_balance: Mapped[float] = mapped_column(Numeric(10, 2))

    delivery_business_days: Mapped[int] = mapped_column(Integer)
    below_minimum_quantity: Mapped[bool] = mapped_column(Boolean, default=False)
    minimum_quantity_applied: Mapped[int] = mapped_column(Integer)

    client_name: Mapped[str] = mapped_column(String(150))
    client_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus), default=QuoteStatus.PENDENTE
    )
    notification_status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus), default=NotificationStatus.NAO_CONFIGURADO
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    product: Mapped["Product"] = relationship(back_populates="quotes")
    color: Mapped["Color | None"] = relationship()

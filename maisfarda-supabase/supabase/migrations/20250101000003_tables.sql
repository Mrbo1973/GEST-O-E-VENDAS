-- Malhas / tipos de tecido (lista pré-definida e editável)
create table fabric_types (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true
);

-- Cores disponíveis
create table colors (
  id bigint generated always as identity primary key,
  name text not null unique,
  hex_code text not null check (hex_code ~* '^#[0-9a-f]{6}$')
);

-- Produtos
create table products (
  id bigint generated always as identity primary key,
  name text not null,
  fabric_type_id bigint not null references fabric_types (id),
  logo_application logo_application,
  logo_location logo_location,
  price_per_unit numeric(10, 2) not null check (price_per_unit > 0),
  -- Faixa de tamanhos padrão, ex: {PP,P,M,G,GG}
  standard_sizes text[] not null default '{}',
  -- Tamanhos especiais, ex: {XG,XGG}
  special_sizes text[] not null default '{}',
  special_size_surcharge_percent numeric(5, 2) not null default 0
    check (special_size_surcharge_percent >= 0),
  -- Pedido mínimo específico do modelo; se nulo, usa settings.min_order_quantity_default
  min_order_quantity integer check (min_order_quantity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_fabric_type on products (fabric_type_id);

-- Vínculo opcional produto <-> cores disponíveis.
-- Se um produto não tiver nenhuma linha aqui, todas as cores cadastradas
-- globalmente são consideradas disponíveis para ele (ver função
-- get_product_available_colors).
create table product_colors (
  product_id bigint not null references products (id) on delete cascade,
  color_id bigint not null references colors (id) on delete cascade,
  primary key (product_id, color_id)
);

-- Configurações gerais da fábrica (linha única, id = 1)
create table settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'MaisFarda Uniformes',
  min_order_quantity_default integer not null default 20
    check (min_order_quantity_default > 0),
  delivery_business_days_default integer not null default 20
    check (delivery_business_days_default > 0),
  deposit_percent_default numeric(5, 2) not null default 50
    check (deposit_percent_default > 0 and deposit_percent_default <= 100),
  founding_year integer,
  notification_webhook_url text
);

-- Pedidos de orçamento registrados pelo cliente
create table quotes (
  id bigint generated always as identity primary key,
  product_id bigint not null references products (id),
  color_id bigint references colors (id),
  size text not null,
  quantity integer not null check (quantity > 0),

  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null,
  deposit_percent_applied numeric(5, 2) not null,
  deposit_amount numeric(10, 2) not null,
  remaining_balance numeric(10, 2) not null,

  delivery_business_days integer not null,
  below_minimum_quantity boolean not null default false,
  minimum_quantity_applied integer not null,

  client_name text not null,
  client_email text,
  client_phone text,
  notes text,

  status quote_status not null default 'pendente',
  notification_status notification_status not null default 'nao_configurado',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_quotes_product on quotes (product_id);
create index idx_quotes_status on quotes (status);

-- Trigger genérico para manter updated_at em dia
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

create trigger trg_quotes_updated_at
before update on quotes
for each row execute function set_updated_at();

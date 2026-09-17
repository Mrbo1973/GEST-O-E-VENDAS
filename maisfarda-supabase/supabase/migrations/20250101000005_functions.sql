-- =========================================================================
-- calculate_budget: calculadora pura (não grava nada), usada para simular
-- um orçamento antes de o cliente confirmar o pedido.
-- Chamada via PostgREST: POST /rest/v1/rpc/calculate_budget
-- =========================================================================
create or replace function calculate_budget(
  p_product_id bigint,
  p_size text,
  p_quantity int
) returns jsonb
language plpgsql
stable
as $$
declare
  v_product products%rowtype;
  v_settings settings%rowtype;
  v_size text := upper(trim(p_size));
  v_is_special boolean;
  v_is_standard boolean;
  v_surcharge numeric(5, 2) := 0;
  v_unit_price numeric(10, 2);
  v_total_price numeric(10, 2);
  v_deposit_amount numeric(10, 2);
  v_remaining numeric(10, 2);
  v_min_qty integer;
  v_below_minimum boolean;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  select * into v_product from products where id = p_product_id;
  if not found then
    raise exception 'Produto com id=% não encontrado.', p_product_id;
  end if;

  select * into v_settings from settings where id = 1;
  if not found then
    raise exception 'Configurações não inicializadas.';
  end if;

  v_is_special := v_size = any (v_product.special_sizes);
  v_is_standard := v_size = any (v_product.standard_sizes);

  if not v_is_special and not v_is_standard then
    raise exception 'Tamanho "%" inválido para o produto "%". Tamanhos disponíveis: %',
      p_size, v_product.name,
      array_to_string(v_product.standard_sizes || v_product.special_sizes, ', ');
  end if;

  if v_is_special then
    v_surcharge := v_product.special_size_surcharge_percent;
  end if;

  v_unit_price := round(v_product.price_per_unit * (1 + v_surcharge / 100), 2);
  v_total_price := round(v_unit_price * p_quantity, 2);
  v_deposit_amount := round(v_total_price * v_settings.deposit_percent_default / 100, 2);
  v_remaining := round(v_total_price - v_deposit_amount, 2);
  v_min_qty := coalesce(v_product.min_order_quantity, v_settings.min_order_quantity_default);
  v_below_minimum := p_quantity < v_min_qty;

  return jsonb_build_object(
    'product_id', v_product.id,
    'product_name', v_product.name,
    'size', v_size,
    'quantity', p_quantity,
    'is_special_size', v_is_special,
    'surcharge_percent_applied', v_surcharge,
    'unit_price', v_unit_price,
    'total_price', v_total_price,
    'deposit_percent_applied', v_settings.deposit_percent_default,
    'deposit_amount', v_deposit_amount,
    'remaining_balance', v_remaining,
    'minimum_quantity_applied', v_min_qty,
    'below_minimum_quantity', v_below_minimum,
    'delivery_business_days', v_settings.delivery_business_days_default
  );
end;
$$;

-- =========================================================================
-- get_product_available_colors: cores disponíveis para um produto.
-- Se o produto não tiver vínculos em product_colors, todas as cores
-- cadastradas globalmente são retornadas.
-- =========================================================================
create or replace function get_product_available_colors(p_product_id bigint)
returns setof colors
language plpgsql
stable
as $$
begin
  if exists (select 1 from product_colors where product_id = p_product_id) then
    return query
      select c.*
      from colors c
      join product_colors pc on pc.color_id = c.id
      where pc.product_id = p_product_id
      order by c.name;
  else
    return query select * from colors order by name;
  end if;
end;
$$;

-- =========================================================================
-- set_product_colors: substitui o conjunto de cores vinculadas a um produto.
-- Passar array vazio ou nulo remove todos os vínculos (volta a liberar todas
-- as cores globais para o produto).
-- =========================================================================
create or replace function set_product_colors(p_product_id bigint, p_color_ids bigint[])
returns setof colors
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from products where id = p_product_id) then
    raise exception 'Produto com id=% não encontrado.', p_product_id;
  end if;

  delete from product_colors where product_id = p_product_id;

  if p_color_ids is not null and array_length(p_color_ids, 1) > 0 then
    if exists (
      select 1 from unnest(p_color_ids) cid
      where not exists (select 1 from colors where id = cid)
    ) then
      raise exception 'Um ou mais color_ids informados não existem.';
    end if;

    insert into product_colors (product_id, color_id)
    select p_product_id, cid from unnest(p_color_ids) cid;
  end if;

  return query select * from get_product_available_colors(p_product_id);
end;
$$;

-- =========================================================================
-- create_quote: valida, calcula (reaproveitando calculate_budget) e grava
-- o pedido de orçamento do cliente. Dispara notificação assíncrona via
-- pg_net para o webhook configurado em settings.notification_webhook_url,
-- se houver.
-- Chamada via PostgREST: POST /rest/v1/rpc/create_quote
-- =========================================================================
create or replace function create_quote(
  p_product_id bigint,
  p_size text,
  p_quantity int,
  p_client_name text,
  p_color_id bigint default null,
  p_client_email text default null,
  p_client_phone text default null,
  p_notes text default null
) returns quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calc jsonb;
  v_settings settings%rowtype;
  v_has_links boolean;
  v_color_allowed boolean;
  v_quote quotes%rowtype;
  v_request_id bigint;
begin
  if p_client_name is null or length(trim(p_client_name)) = 0 then
    raise exception 'client_name é obrigatório.';
  end if;

  if p_color_id is not null then
    if not exists (select 1 from colors where id = p_color_id) then
      raise exception 'Cor com id=% não encontrada.', p_color_id;
    end if;

    select exists (select 1 from product_colors where product_id = p_product_id)
      into v_has_links;

    if v_has_links then
      select exists (
        select 1 from product_colors
        where product_id = p_product_id and color_id = p_color_id
      ) into v_color_allowed;

      if not v_color_allowed then
        raise exception 'A cor selecionada não está disponível para este produto.';
      end if;
    end if;
  end if;

  -- calculate_budget já valida produto/tamanho/quantidade
  v_calc := calculate_budget(p_product_id, p_size, p_quantity);
  select * into v_settings from settings where id = 1;

  insert into quotes (
    product_id, color_id, size, quantity, unit_price, total_price,
    deposit_percent_applied, deposit_amount, remaining_balance,
    delivery_business_days, below_minimum_quantity, minimum_quantity_applied,
    client_name, client_email, client_phone, notes
  ) values (
    p_product_id, p_color_id, v_calc ->> 'size', p_quantity,
    (v_calc ->> 'unit_price')::numeric, (v_calc ->> 'total_price')::numeric,
    (v_calc ->> 'deposit_percent_applied')::numeric, (v_calc ->> 'deposit_amount')::numeric,
    (v_calc ->> 'remaining_balance')::numeric, (v_calc ->> 'delivery_business_days')::int,
    (v_calc ->> 'below_minimum_quantity')::boolean, (v_calc ->> 'minimum_quantity_applied')::int,
    p_client_name, p_client_email, p_client_phone, p_notes
  )
  returning * into v_quote;

  if v_settings.notification_webhook_url is not null then
    -- pg_net é assíncrono (fire-and-forget): a requisição é enfileirada e a
    -- resposta real fica em net._http_response, consultável pelo request id
    -- caso seja necessário auditar entregas depois.
    select net.http_post(
      url := v_settings.notification_webhook_url,
      body := to_jsonb(v_quote),
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) into v_request_id;

    update quotes set notification_status = 'enviado'
    where id = v_quote.id
    returning * into v_quote;
  end if;

  return v_quote;
end;
$$;

-- =========================================================================
-- Exclusões com confirmação explícita (p_confirm) e bloqueio quando há
-- referências, equivalente à "confirmação de exclusão" de uma tela.
-- =========================================================================
create or replace function delete_product(p_product_id bigint, p_confirm boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from products where id = p_product_id;
  if v_name is null then
    raise exception 'Produto com id=% não encontrado.', p_product_id;
  end if;

  if exists (select 1 from quotes where product_id = p_product_id) then
    raise exception
      'Não é possível excluir "%": existem pedidos de orçamento vinculados a este produto. Marque active=false em vez de excluir.',
      v_name;
  end if;

  if not p_confirm then
    raise exception
      'Confirmação necessária para excluir o produto "%". Repita a chamada com p_confirm=true.',
      v_name;
  end if;

  delete from products where id = p_product_id;
end;
$$;

create or replace function delete_color(p_color_id bigint, p_confirm boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from colors where id = p_color_id;
  if v_name is null then
    raise exception 'Cor com id=% não encontrada.', p_color_id;
  end if;

  if exists (select 1 from quotes where color_id = p_color_id) then
    raise exception
      'Não é possível excluir "%": existem pedidos de orçamento vinculados a esta cor.',
      v_name;
  end if;

  if not p_confirm then
    raise exception
      'Confirmação necessária para excluir a cor "%". Repita a chamada com p_confirm=true.',
      v_name;
  end if;

  delete from colors where id = p_color_id;
end;
$$;

create or replace function delete_fabric_type(p_fabric_type_id bigint, p_confirm boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from fabric_types where id = p_fabric_type_id;
  if v_name is null then
    raise exception 'Tipo de malha com id=% não encontrado.', p_fabric_type_id;
  end if;

  if exists (select 1 from products where fabric_type_id = p_fabric_type_id) then
    raise exception
      'Não é possível excluir "%": existem produtos cadastrados com esta malha. Marque active=false na malha em vez de excluí-la.',
      v_name;
  end if;

  if not p_confirm then
    raise exception
      'Confirmação necessária para excluir a malha "%". Repita a chamada com p_confirm=true.',
      v_name;
  end if;

  delete from fabric_types where id = p_fabric_type_id;
end;
$$;

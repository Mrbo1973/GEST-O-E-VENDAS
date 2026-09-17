-- RLS habilitado em todas as tabelas. Como não há autenticação complexa
-- nesta fase, as políticas de select/insert/update são abertas (true).
-- DELETE não tem política em nenhuma tabela: exclusões só acontecem através
-- das funções delete_product / delete_color / delete_fabric_type, que rodam
-- como SECURITY DEFINER e aplicam as regras de confirmação e de bloqueio por
-- referência. Da mesma forma, INSERT em quotes só acontece via create_quote,
-- e o vínculo produto-cor só é alterado via set_product_colors.

alter table fabric_types enable row level security;
alter table colors enable row level security;
alter table products enable row level security;
alter table product_colors enable row level security;
alter table settings enable row level security;
alter table quotes enable row level security;

create policy "fabric_types_select" on fabric_types for select using (true);
create policy "fabric_types_insert" on fabric_types for insert with check (true);
create policy "fabric_types_update" on fabric_types for update using (true) with check (true);

create policy "colors_select" on colors for select using (true);
create policy "colors_insert" on colors for insert with check (true);
create policy "colors_update" on colors for update using (true) with check (true);

create policy "products_select" on products for select using (true);
create policy "products_insert" on products for insert with check (true);
create policy "products_update" on products for update using (true) with check (true);

create policy "product_colors_select" on product_colors for select using (true);

create policy "settings_select" on settings for select using (true);
create policy "settings_update" on settings for update using (true) with check (true);

create policy "quotes_select" on quotes for select using (true);
create policy "quotes_update" on quotes for update using (true) with check (true);

-- Permite que as roles usadas pelo PostgREST (anon/authenticated) executem
-- as funções de negócio expostas como RPC.
grant execute on function calculate_budget(bigint, text, int) to anon, authenticated;
grant execute on function get_product_available_colors(bigint) to anon, authenticated;
grant execute on function set_product_colors(bigint, bigint[]) to anon, authenticated;
grant execute on function create_quote(bigint, text, int, text, bigint, text, text, text) to anon, authenticated;
grant execute on function delete_product(bigint, boolean) to anon, authenticated;
grant execute on function delete_color(bigint, boolean) to anon, authenticated;
grant execute on function delete_fabric_type(bigint, boolean) to anon, authenticated;

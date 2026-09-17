# MaisFarda Uniformes — Backend Supabase

Backend inteiramente no Supabase (Postgres + PostgREST + RPC + pg_net), sem
servidor próprio e sem camada visual. CRUD simples é feito pela API REST
automática do Supabase; a lógica de negócio (cálculo de orçamento, criação de
pedido com notificação, exclusões com confirmação) fica em funções SQL
(`plpgsql`) expostas como RPC.

## Estrutura

```
supabase/
  migrations/
    20250101000001_extensions.sql   -> habilita pg_net (webhook assíncrono)
    20250101000002_enums.sql        -> enums (logo, status do pedido, notificação)
    20250101000003_tables.sql       -> tabelas + triggers de updated_at
    20250101000004_seed.sql         -> malhas padrão + linha única de settings
    20250101000005_functions.sql    -> calculadora, criação de pedido, exclusões
    20250101000006_policies.sql     -> RLS (aberta, sem auth) + grants de RPC
    20250101000007_settings_whatsapp.sql -> settings.whatsapp_number (integração com WhatsApp do catálogo público)
```

## Como aplicar

**Opção A — Dashboard (sem instalar nada):** abra o projeto no
[app.supabase.com](https://app.supabase.com), vá em *SQL Editor* e cole o
conteúdo de cada arquivo em `supabase/migrations/`, **na ordem numérica**,
executando um de cada vez.

**Opção B — Supabase CLI** (se já tiver Node/CLI instalado):

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

## Modelo de dados

- `fabric_types` — malhas/tecidos (lista pré-definida, editável via CRUD).
- `colors` — cores globais (`name`, `hex_code`).
- `products` — nome, malha, `logo_application` (silk/bordado),
  `logo_location` (peito/costas/ambos), preço unitário, `standard_sizes[]`,
  `special_sizes[]`, `special_size_surcharge_percent`, `min_order_quantity`
  próprio (opcional, senão usa o padrão global) e `active`.
- `product_colors` — vínculo opcional produto↔cor. Se um produto não tiver
  nenhuma linha aqui, **todas** as cores cadastradas ficam disponíveis para
  ele (ver função `get_product_available_colors`).
- `settings` — linha única (`id=1`): pedido mínimo padrão, prazo de entrega
  padrão (dias úteis), percentual de sinal padrão, ano de fundação e a URL do
  webhook de notificação.
- `quotes` — pedidos de orçamento registrados, com todos os valores já
  calculados, status e prazo de entrega documentado.

## API (via PostgREST automático)

Todas as tabelas ficam disponíveis em `https://<project>.supabase.co/rest/v1/<tabela>`
com os verbos padrão (`GET`, `POST`, `PATCH`; `DELETE` é bloqueado por RLS —
veja a seção de exclusões). Cabeçalhos necessários em toda chamada:

```
apikey: <anon-key>
Authorization: Bearer <anon-key>
Content-Type: application/json
```

Exemplos:

```bash
# Listar produtos ativos
curl "$SUPABASE_URL/rest/v1/products?active=eq.true&select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

# Criar cor
curl -X POST "$SUPABASE_URL/rest/v1/colors" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Azul Royal", "hex_code": "#1E3A8A"}'

# Criar produto com faixa de tamanhos e acréscimo para especiais
curl -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camisa Polo Corporativa",
    "fabric_type_id": 1,
    "logo_application": "bordado",
    "logo_location": "peito",
    "price_per_unit": 45.90,
    "standard_sizes": ["PP","P","M","G","GG"],
    "special_sizes": ["XG","XGG"],
    "special_size_surcharge_percent": 10
  }'
```

## Calculadora de orçamento (RPC, não grava nada)

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/calculate_budget" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_product_id": 1, "p_size": "XG", "p_quantity": 15}'
```

Retorna `unit_price` (já com acréscimo se for tamanho especial),
`total_price`, `deposit_amount` (sinal), `remaining_balance` (saldo) e
`below_minimum_quantity: true` quando a quantidade pedida for menor que o
pedido mínimo do modelo (ou o padrão global de `settings`).

## Registrar pedido de orçamento (RPC, grava e notifica)

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/create_quote" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_product_id": 1,
    "p_size": "M",
    "p_quantity": 30,
    "p_client_name": "João Silva",
    "p_color_id": 2,
    "p_client_email": "joao@empresa.com",
    "p_client_phone": "11999999999"
  }'
```

A função valida produto/tamanho/cor, calcula os valores (reaproveitando
`calculate_budget`), grava o pedido e, se `settings.notification_webhook_url`
estiver configurado, dispara um `POST` assíncrono (via `pg_net`) para esse
webhook com os dados do pedido — canal de atendimento a ser definido
(webhook genérico hoje; e-mail/WhatsApp podem futuramente escutar o mesmo
webhook ou ser adicionados como outra chamada `net.http_post` dentro de
`create_quote`). Por ser assíncrono, `notification_status = 'enviado'`
significa "enfileirado com sucesso", não confirmação de entrega; para
auditar a resposta real, consulte a tabela interna `net._http_response`
pelo `request_id`.

Atualizar status do pedido:

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/quotes?id=eq.42" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "aprovado"}'
```

## Cores por produto

```bash
# Cores disponíveis para o produto 1 (todas, se não houver vínculo específico)
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_product_available_colors" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_product_id": 1}'

# Restringir o produto 1 às cores 2 e 5 (array vazio [] libera todas de novo)
curl -X POST "$SUPABASE_URL/rest/v1/rpc/set_product_colors" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_product_id": 1, "p_color_ids": [2, 5]}'
```

## Configurações gerais

```bash
curl "$SUPABASE_URL/rest/v1/settings?id=eq.1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

curl -X PATCH "$SUPABASE_URL/rest/v1/settings?id=eq.1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "min_order_quantity_default": 20,
    "delivery_business_days_default": 20,
    "deposit_percent_default": 50,
    "founding_year": 2010,
    "notification_webhook_url": "https://seu-endpoint.com/pedidos"
  }'
```

## Exclusões (com confirmação)

`DELETE` direto nas tabelas é bloqueado pelas policies de RLS. As exclusões
acontecem via RPC, exigindo `p_confirm: true` — equivalente à confirmação que
existiria numa tela — e são recusadas se houver referências (produto/cor
usados em pedidos, malha usada em produtos):

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/delete_product" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_product_id": 3, "p_confirm": true}'
```

O mesmo padrão vale para `delete_color` e `delete_fabric_type`. Quando
bloqueado por referências existentes, a recomendação é marcar `active=false`
em vez de excluir.

## Segurança / autenticação

Nesta fase não há autenticação (conforme solicitado): as políticas de RLS
liberam `select`/`insert`/`update` para qualquer chamada com a `anon key`.
Quando for necessário restringir o acesso, basta trocar as policies em
`20250101000006_policies.sql` para exigir `auth.role() = 'authenticated'` (ou
regras mais específicas), sem alterar o restante do schema.

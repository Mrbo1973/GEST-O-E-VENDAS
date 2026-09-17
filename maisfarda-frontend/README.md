# MaisFarda Uniformes — Frontend

React + TypeScript, consumindo diretamente o backend Supabase do projeto
irmão `maisfarda-supabase` (Postgres + PostgREST + funções RPC). Duas
experiências visuais distintas, ambas derivadas dos mock-ups em
`MAISFARDA UNIFORMES/`:

- **`/` — Catálogo público** (`src/pages/CatalogPage.tsx` + `src/styles/catalog.css`):
  visual azul-marinho/azul-royal da marca (Barlow Condensed + Inter), réplica
  de `Catalogo.dc.html`. Hero, catálogo de produtos, cores disponíveis,
  calculadora de orçamento ao vivo e envio do pedido (grava no banco via
  `create_quote` **e** abre o WhatsApp com a mensagem pronta).
- **`/admin/*` — Painel administrativo** (`src/components/Layout.tsx` +
  páginas em `src/pages/`): design system **Industry** (`src/styles/industry.css`,
  copiado de `_ds/industry-.../styles.css`) — fundo claro, azul-aço, cards e
  botões "blueprint" com cantos quadrados e marcas de registro, Barlow
  Condensed/Barlow. Réplica de `Gestao de Produtos.dc.html`, estendida às
  demais telas (Cores, Malhas, Calculadora, Pedidos, Configurações).

Ícones do painel administrativo usam `lucide-react` (stroke 1.5, conforme o
design system).

## Como rodar

```bash
npm install
cp .env.example .env
# edite .env com a URL e a anon key do seu projeto Supabase
npm run dev
```

Sem um `.env` configurado, a aplicação carrega normalmente (as duas telas)
mas mostra avisos e as chamadas à API falham — não há dados fictícios
embutidos, tudo vem do seu projeto Supabase real, incluindo o seed de malhas
padrão aplicado pelas migrations.

## Telas do admin

- **Produtos** — CRUD completo (nome, malha via seletor de tags com opção de
  criar uma nova inline, aplicação de logo e local via controles segmentados,
  preço, tamanhos padrão/especiais, acréscimo, pedido mínimo, ativo/inativo) +
  vínculo de cores disponíveis por produto.
- **Cores** — CRUD com amostra visual e código hexadecimal.
- **Malhas** — CRUD da lista de tecidos usada pelos produtos.
- **Calculadora** — simula um orçamento (preço unitário, total, sinal, saldo,
  aviso de quantidade abaixo do mínimo) sem gravar nada.
- **Pedidos** — registra pedidos de orçamento dos clientes (usa a mesma
  lógica da calculadora no backend) e permite acompanhar/alterar o status.
- **Configurações** — pedido mínimo padrão, prazo de entrega, percentual de
  sinal, ano de fundação, número de WhatsApp (usado pelo catálogo público) e
  URL do webhook de notificação.

Todas as exclusões (produto, cor, malha) pedem confirmação em um diálogo
antes de chamar a função de exclusão no backend, que também bloqueia a
exclusão caso existam referências (pedidos ou produtos vinculados).

## Nota sobre o schema

O campo `settings.whatsapp_number` foi adicionado depois do schema inicial —
aplique a migration `20250101000007_settings_whatsapp.sql` (em
`maisfarda-supabase/supabase/migrations/`) no seu projeto Supabase antes de
usar o catálogo público.

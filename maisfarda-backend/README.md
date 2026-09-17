# MaisFarda Uniformes — API

Backend (sem camada visual) para gestão de produtos, cores, malhas, orçamentos e
pedidos da MaisFarda Uniformes.

## Stack

- FastAPI + Pydantic v2 (API REST + validação)
- SQLAlchemy 2.0 (ORM)
- SQLite (arquivo `maisfarda.db`, criado automaticamente)

## Como rodar

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Documentação interativa (Swagger) em `http://127.0.0.1:8000/docs`.

## Módulos

- `fabric-types` — CRUD das malhas/tecidos (lista pré-definida editável).
- `colors` — CRUD de cores globais.
- `products` — CRUD de produtos, com vínculo opcional a cores específicas
  (`color_ids`). Se um produto não tiver cores vinculadas, todas as cores
  cadastradas ficam disponíveis para ele.
- `settings` — parâmetros gerais: pedido mínimo padrão, prazo de entrega padrão,
  percentual de sinal padrão, ano de fundação.
- `calculator/budget` — calcula preço unitário (com acréscimo de tamanho
  especial), valor total, sinal e saldo, sem persistir nada. Também retorna
  aviso (`below_minimum_quantity`) quando a quantidade é menor que o pedido
  mínimo do modelo (ou o padrão global).
- `quotes` — registra o pedido de orçamento do cliente (dados + valores
  calculados), com status e prazo de entrega documentado. Ao criar um pedido,
  o sistema tenta notificar o canal de atendimento via webhook (URL definida
  em `settings.notification_webhook_url`); se não houver webhook configurado,
  o pedido é salvo normalmente com `notification_status = nao_configurado`.
  Novos canais (e-mail, WhatsApp) podem ser plugados em
  `app/services/notifications.py`.

## Exclusões

Todas as rotas `DELETE` exigem `?confirm=true` (simulando a confirmação que
seria feita na tela). Exclusões que quebrariam referências existentes
(produto/cor usados em pedidos, malha usada em produtos) são bloqueadas —
recomenda-se usar o campo `active=false` para desativar em vez de excluir.

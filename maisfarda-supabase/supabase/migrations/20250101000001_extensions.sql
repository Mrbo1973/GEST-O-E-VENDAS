-- Extensões necessárias
-- pg_net permite chamadas HTTP assíncronas a partir do Postgres (usado para
-- notificar o canal de atendimento via webhook quando um pedido é criado).
create extension if not exists pg_net;

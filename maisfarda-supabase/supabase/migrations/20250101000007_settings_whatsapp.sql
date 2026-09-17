-- Número de WhatsApp usado pelo catálogo público para enviar o pedido de
-- orçamento (integração com WhatsApp prevista na especificação original).
alter table settings add column whatsapp_number text;

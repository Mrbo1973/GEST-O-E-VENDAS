import httpx

from app.models import NotificationStatus, Quote, Settings


async def send_quote_notification(
    quote: Quote, settings: Settings
) -> NotificationStatus:
    """Envia o pedido de orçamento para o canal de atendimento configurado.

    Hoje a integração é via webhook (URL configurável em Settings). Novos
    canais (e-mail, WhatsApp) podem ser plugados aqui futuramente sem afetar
    o restante do fluxo de criação do pedido.
    """
    if not settings.notification_webhook_url:
        return NotificationStatus.NAO_CONFIGURADO

    payload = {
        "quote_id": quote.id,
        "product_id": quote.product_id,
        "size": quote.size,
        "color_id": quote.color_id,
        "quantity": quote.quantity,
        "unit_price": float(quote.unit_price),
        "total_price": float(quote.total_price),
        "deposit_amount": float(quote.deposit_amount),
        "remaining_balance": float(quote.remaining_balance),
        "delivery_business_days": quote.delivery_business_days,
        "client_name": quote.client_name,
        "client_email": quote.client_email,
        "client_phone": quote.client_phone,
        "notes": quote.notes,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(settings.notification_webhook_url, json=payload)
            response.raise_for_status()
        return NotificationStatus.ENVIADO
    except httpx.HTTPError:
        return NotificationStatus.FALHOU

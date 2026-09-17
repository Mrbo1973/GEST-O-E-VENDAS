import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../api/settings";
import { Corners } from "../components/Corners";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";

interface FormState {
  company_name: string;
  min_order_quantity_default: string;
  delivery_business_days_default: string;
  deposit_percent_default: string;
  founding_year: string;
  notification_webhook_url: string;
  whatsapp_number: string;
}

export default function SettingsPage() {
  const { data, loading, error, refetch } = useFetch(() => getSettings(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      company_name: data.company_name,
      min_order_quantity_default: String(data.min_order_quantity_default),
      delivery_business_days_default: String(data.delivery_business_days_default),
      deposit_percent_default: String(data.deposit_percent_default),
      founding_year: data.founding_year === null ? "" : String(data.founding_year),
      notification_webhook_url: data.notification_webhook_url ?? "",
      whatsapp_number: data.whatsapp_number ?? "",
    });
  }, [data]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await updateSettings({
        company_name: form.company_name.trim(),
        min_order_quantity_default: Number(form.min_order_quantity_default),
        delivery_business_days_default: Number(form.delivery_business_days_default),
        deposit_percent_default: Number(form.deposit_percent_default),
        founding_year: form.founding_year ? Number(form.founding_year) : null,
        notification_webhook_url: form.notification_webhook_url.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
      });
      showToast("Configurações salvas com sucesso.");
      refetch();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const yearsInMarket =
    form?.founding_year && Number(form.founding_year) > 0
      ? new Date().getFullYear() - Number(form.founding_year)
      : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Configurações gerais</h1>
          <p>Parâmetros usados pela calculadora de orçamento, pelos pedidos e pelo catálogo público.</p>
        </div>
      </div>

      {loading && <p className="text-muted">Carregando...</p>}
      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {form && (
        <div className="card blueprint" style={{ maxWidth: 560 }}>
          <Corners />
          <div className="field">
            <label htmlFor="s-empresa">Nome da empresa</label>
            <input
              id="s-empresa"
              className="input"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-minimo">Pedido mínimo padrão (unidades)</label>
              <input
                id="s-minimo"
                className="input"
                type="number"
                min="1"
                value={form.min_order_quantity_default}
                onChange={(e) =>
                  setForm({ ...form, min_order_quantity_default: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="s-prazo">Prazo de entrega (dias úteis)</label>
              <input
                id="s-prazo"
                className="input"
                type="number"
                min="1"
                value={form.delivery_business_days_default}
                onChange={(e) =>
                  setForm({ ...form, delivery_business_days_default: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-sinal">Percentual de sinal (%)</label>
              <input
                id="s-sinal"
                className="input"
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={form.deposit_percent_default}
                onChange={(e) => setForm({ ...form, deposit_percent_default: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="s-ano">Ano de fundação</label>
              <input
                id="s-ano"
                className="input"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={form.founding_year}
                onChange={(e) => setForm({ ...form, founding_year: e.target.value })}
              />
              {yearsInMarket !== null && (
                <p className="card-meta" style={{ marginTop: 4 }}>{yearsInMarket} anos de mercado</p>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="s-whatsapp">WhatsApp (com DDI e DDD, só números)</label>
            <input
              id="s-whatsapp"
              className="input"
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              placeholder="5584999360000"
            />
            <p className="card-meta" style={{ marginTop: 4 }}>
              Usado pelo botão "Enviar pedido de orçamento" do catálogo público.
            </p>
          </div>

          <div className="field">
            <label htmlFor="s-webhook">Webhook de notificação (canal de atendimento)</label>
            <input
              id="s-webhook"
              className="input"
              value={form.notification_webhook_url}
              onChange={(e) => setForm({ ...form, notification_webhook_url: e.target.value })}
              placeholder="https://seu-endpoint.com/pedidos"
            />
            <p className="card-meta" style={{ marginTop: 4 }}>
              Quando definido, cada novo pedido de orçamento é enviado para esta URL.
            </p>
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary blueprint"
              onClick={handleSave}
              disabled={saving}
            >
              <Corners />
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

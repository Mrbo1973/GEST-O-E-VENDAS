import { useEffect, useMemo, useState } from "react";
import { getAvailableColors, listProducts } from "../api/products";
import { createQuote, listQuotes, updateQuoteStatus } from "../api/quotes";
import { Corners } from "../components/Corners";
import { Modal } from "../components/Modal";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import type { Color, Quote, QuoteStatus } from "../types/database";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_producao: "Em produção",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const NOTIFICATION_LABELS: Record<string, string> = {
  nao_configurado: "Webhook não configurado",
  enviado: "Notificação enviada",
  falhou: "Falha ao notificar",
};

function formatBRL(value: number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface FormState {
  product_id: number | "";
  size: string;
  color_id: number | "";
  quantity: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
}

const emptyForm: FormState = {
  product_id: "",
  size: "",
  color_id: "",
  quantity: "20",
  client_name: "",
  client_email: "",
  client_phone: "",
  notes: "",
};

export default function QuotesPage() {
  const { data: quotes, loading, error, refetch } = useFetch(() => listQuotes(), []);
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function handleStatusChange(quote: Quote, status: QuoteStatus) {
    setUpdatingId(quote.id);
    try {
      await updateQuoteStatus(quote.id, status);
      showToast("Status do pedido atualizado.");
      refetch();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Pedidos de orçamento</h1>
          <p>Pedidos registrados pelos clientes, com valores calculados e prazo documentado.</p>
        </div>
        <button type="button" className="btn btn-primary blueprint" onClick={() => setShowForm(true)}>
          <Corners />+ Novo pedido
        </button>
      </div>

      {loading && <p className="text-muted">Carregando...</p>}
      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Tam. / Cor</th>
              <th>Qtd.</th>
              <th>Total</th>
              <th>Sinal / Saldo</th>
              <th>Status</th>
              <th>Notificação</th>
            </tr>
          </thead>
          <tbody>
            {(quotes ?? []).map((quote) => (
              <tr key={quote.id}>
                <td className="text-muted">#{quote.id}</td>
                <td>
                  <div>{quote.client_name}</div>
                  <div className="card-meta">{quote.client_email || quote.client_phone || "—"}</div>
                </td>
                <td className="text-muted">{quote.product?.name ?? `#${quote.product_id}`}</td>
                <td className="text-muted">
                  {quote.size} {quote.color?.name ? `/ ${quote.color.name}` : ""}
                </td>
                <td>
                  {quote.quantity}
                  {quote.below_minimum_quantity && (
                    <span title="Abaixo do pedido mínimo"> ⚠</span>
                  )}
                </td>
                <td className="num-cell">{formatBRL(quote.total_price)}</td>
                <td className="text-muted">
                  {formatBRL(quote.deposit_amount)} / {formatBRL(quote.remaining_balance)}
                </td>
                <td>
                  <select
                    className="seg-opt"
                    style={{ border: "1px solid var(--color-divider)" }}
                    value={quote.status}
                    disabled={updatingId === quote.id}
                    onChange={(e) => handleStatusChange(quote, e.target.value as QuoteStatus)}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="card-meta">{NOTIFICATION_LABELS[quote.notification_status]}</td>
              </tr>
            ))}
            {(quotes ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="empty-note">
                  Nenhum pedido registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {showForm && (
        <NewQuoteModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function NewQuoteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: products } = useFetch(() => listProducts(false), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [colors, setColors] = useState<Color[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () => (products ?? []).find((p) => p.id === form.product_id) ?? null,
    [products, form.product_id],
  );

  const sizeOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return [...selectedProduct.standard_sizes, ...selectedProduct.special_sizes];
  }, [selectedProduct]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, size: "", color_id: "" }));
    if (!form.product_id) {
      setColors([]);
      return;
    }
    getAvailableColors(Number(form.product_id))
      .then(setColors)
      .catch((err) => showToast(errorMessage(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_id]);

  async function handleSubmit() {
    if (!form.product_id || !form.size || !form.quantity || !form.client_name.trim()) {
      showToast("Preencha produto, tamanho, quantidade e nome do cliente.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await createQuote({
        product_id: Number(form.product_id),
        size: form.size,
        quantity: Number(form.quantity),
        client_name: form.client_name.trim(),
        color_id: form.color_id ? Number(form.color_id) : null,
        client_email: form.client_email.trim() || null,
        client_phone: form.client_phone.trim() || null,
        notes: form.notes.trim() || null,
      });
      showToast("Pedido de orçamento registrado com sucesso.");
      onCreated();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Novo pedido de orçamento" onClose={onClose} maxWidth={560}>
      <div className="field">
        <label htmlFor="q-produto">Produto</label>
        <select
          id="q-produto"
          className="input"
          value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value ? Number(e.target.value) : "" })}
        >
          <option value="">Selecione...</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2" style={{ marginTop: "var(--space-3)" }}>
        <div className="field">
          <label htmlFor="q-tamanho">Tamanho</label>
          <select
            id="q-tamanho"
            className="input"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            disabled={!selectedProduct}
          >
            <option value="">Selecione...</option>
            {sizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="q-qtd">Quantidade</label>
          <input
            id="q-qtd"
            type="number"
            min="1"
            className="input"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: "var(--space-3)" }}>
        <label htmlFor="q-cor">Cor (opcional)</label>
        <select
          id="q-cor"
          className="input"
          value={form.color_id}
          onChange={(e) => setForm({ ...form, color_id: e.target.value ? Number(e.target.value) : "" })}
          disabled={!selectedProduct}
        >
          <option value="">Sem preferência</option>
          {colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="hr" />

      <div className="field">
        <label htmlFor="q-nome">Nome do cliente</label>
        <input
          id="q-nome"
          className="input"
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
        />
      </div>

      <div className="grid-2" style={{ marginTop: "var(--space-3)" }}>
        <div className="field">
          <label htmlFor="q-email">E-mail</label>
          <input
            id="q-email"
            type="email"
            className="input"
            value={form.client_email}
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="q-tel">Telefone</label>
          <input
            id="q-tel"
            className="input"
            value={form.client_phone}
            onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: "var(--space-3)" }}>
        <label htmlFor="q-obs">Observações</label>
        <textarea
          id="q-obs"
          className="input"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary blueprint" onClick={onClose}>
          <Corners />
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary blueprint"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Corners />
          {submitting ? "Enviando..." : "Registrar pedido"}
        </button>
      </div>
    </Modal>
  );
}

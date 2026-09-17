import { useEffect, useMemo, useState } from "react";
import { calculateBudget } from "../api/quotes";
import { getAvailableColors, listProducts } from "../api/products";
import { Corners } from "../components/Corners";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import type { BudgetResult, Color } from "../types/database";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CalculatorPage() {
  const { data: products } = useFetch(() => listProducts(false), []);
  const { showToast } = useToast();

  const [productId, setProductId] = useState<number | "">("");
  const [size, setSize] = useState("");
  const [colorId, setColorId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("20");
  const [colors, setColors] = useState<Color[]>([]);
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const selectedProduct = useMemo(
    () => (products ?? []).find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const sizeOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return [
      ...selectedProduct.standard_sizes.map((s) => ({ value: s, special: false })),
      ...selectedProduct.special_sizes.map((s) => ({ value: s, special: true })),
    ];
  }, [selectedProduct]);

  useEffect(() => {
    setSize("");
    setColorId("");
    setResult(null);
    if (!productId) {
      setColors([]);
      return;
    }
    getAvailableColors(Number(productId))
      .then(setColors)
      .catch((err) => showToast(errorMessage(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleCalculate() {
    if (!productId || !size || !quantity) {
      showToast("Selecione produto, tamanho e quantidade.", "error");
      return;
    }
    setCalculating(true);
    setResult(null);
    try {
      const budget = await calculateBudget({
        product_id: Number(productId),
        size,
        quantity: Number(quantity),
      });
      setResult(budget);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Calculadora de orçamento</h1>
          <p>Simule o valor de um pedido sem registrá-lo.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card blueprint">
          <Corners />
          <div className="field">
            <label htmlFor="c-produto">Produto</label>
            <select
              id="c-produto"
              className="input"
              value={productId}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione...</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="c-tamanho">Tamanho</label>
              <select
                id="c-tamanho"
                className="input"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={!selectedProduct}
              >
                <option value="">Selecione...</option>
                {sizeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                    {opt.special ? " (especial)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-qtd">Quantidade</label>
              <input
                id="c-qtd"
                type="number"
                min="1"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="c-cor">Cor (opcional)</label>
            <select
              id="c-cor"
              className="input"
              value={colorId}
              onChange={(e) => setColorId(e.target.value ? Number(e.target.value) : "")}
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

          <div className="dialog-actions">
            <button
              type="button"
              className="btn btn-primary blueprint"
              onClick={handleCalculate}
              disabled={calculating}
            >
              <Corners />
              {calculating ? "Calculando..." : "Calcular"}
            </button>
          </div>
        </div>

        <div>
          {!result ? (
            <div
              className="blueprint"
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                fontSize: 14,
                opacity: 0.5,
              }}
            >
              <Corners />
              Preencha o formulário e clique em Calcular.
            </div>
          ) : (
            <div className="card blueprint elev-sm">
              <Corners />
              <div className="card-kicker">Resultado</div>
              <Row label="Produto" value={result.product_name} />
              <Row
                label="Tamanho"
                value={`${result.size}${result.is_special_size ? " (especial)" : ""}`}
              />
              <Row label="Quantidade" value={String(result.quantity)} />
              {result.is_special_size && (
                <Row
                  label="Acréscimo tamanho especial"
                  value={`+${Number(result.surcharge_percent_applied)}%`}
                />
              )}
              <div className="hr" />
              <Row label="Preço unitário" value={formatBRL(result.unit_price)} />
              <Row label="Valor total" value={formatBRL(result.total_price)} strong />
              <Row
                label={`Sinal (${Number(result.deposit_percent_applied)}%)`}
                value={formatBRL(result.deposit_amount)}
              />
              <Row label="Saldo restante" value={formatBRL(result.remaining_balance)} />
              <Row label="Prazo de entrega" value={`${result.delivery_business_days} dias úteis`} />

              {result.below_minimum_quantity && (
                <div className="tag tag-outline" style={{ marginTop: "var(--space-2)" }}>
                  Abaixo do pedido mínimo ({result.minimum_quantity_applied} un.)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: strong ? 17 : 14 }}>
      <span className="text-muted">{label}</span>
      <span
        style={{
          fontFamily: strong ? "var(--font-heading)" : undefined,
          fontWeight: strong ? "var(--font-heading-weight)" : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

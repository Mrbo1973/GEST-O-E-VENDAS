import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo-maisfarda.jpg";
import { listColors } from "../api/colors";
import { listFabricTypes } from "../api/fabricTypes";
import { getAvailableColors, listProducts } from "../api/products";
import { calculateBudget, createQuote } from "../api/quotes";
import { getSettings } from "../api/settings";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import type { BudgetResult, Color } from "../types/database";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CatalogPage() {
  const { data: products } = useFetch(() => listProducts(false), []);
  const { data: fabricTypes } = useFetch(() => listFabricTypes(true), []);
  const { data: allColors } = useFetch(() => listColors(), []);
  const { data: settings } = useFetch(() => getSettings(), []);
  const { showToast } = useToast();

  const [productId, setProductId] = useState<number | "">("");
  const [size, setSize] = useState("");
  const [colorId, setColorId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("20");
  const [clientName, setClientName] = useState("");
  const [productColors, setProductColors] = useState<Color[]>([]);
  const [budget, setBudget] = useState<BudgetResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fabricTypeName = (id: number) => (fabricTypes ?? []).find((f) => f.id === id)?.name ?? "";

  useEffect(() => {
    if (products && products.length > 0 && productId === "") setProductId(products[0].id);
  }, [products, productId]);

  const selectedProduct = useMemo(() => (products ?? []).find((p) => p.id === productId) ?? null, [products, productId]);
  const sizeOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return [...selectedProduct.standard_sizes, ...selectedProduct.special_sizes];
  }, [selectedProduct]);

  useEffect(() => {
    setSize(""); setColorId("");
    if (!productId) { setProductColors([]); return; }
    getAvailableColors(Number(productId)).then((c) => { setProductColors(c); if (c.length > 0) setColorId(c[0].id); }).catch(() => {});
  }, [productId]);

  useEffect(() => { if (sizeOptions.length > 0 && !size) setSize(sizeOptions[0]); }, [sizeOptions]);

  useEffect(() => {
    if (!productId || !size || !quantity || Number(quantity) <= 0) { setBudget(null); return; }
    let active = true;
    calculateBudget({ product_id: Number(productId), size, quantity: Number(quantity) }).then((r) => active && setBudget(r)).catch(() => active && setBudget(null));
    return () => { active = false; };
  }, [productId, size, quantity]);

  async function handleSubmit() {
    if (!productId || !size || !quantity || !clientName.trim()) { showToast("Preencha produto, tamanho, quantidade e seu nome.", "error"); return; }
    setSubmitting(true);
    try {
      await createQuote({ product_id: Number(productId), size, quantity: Number(quantity), client_name: clientName.trim(), color_id: colorId ? Number(colorId) : null });
      showToast("Pedido de orçamento registrado com sucesso.");
    } catch (err) { showToast(errorMessage(err), "error"); } finally { setSubmitting(false); }
  }

  return (
    <div className="catalog">
      <Link to="/admin/produtos" className="catalog-admin-link">Painel administrativo →</Link>
      <section className="catalog-hero">
        <div className="catalog-logo"><img src={logo} alt="Mais Farda" /></div>
        <h1>Como posso lhe atender?</h1>
        <p>PRODUZIMOS O FARDAMENTO DA SUA EMPRESA COM QUALIDADE, PREÇO JUSTO E PONTUALIDADE.</p>
        {settings && (
          <div className="catalog-stats">
            <div><b>{settings.delivery_business_days_default}</b><span>dias úteis de prazo</span></div>
            <div><b>{settings.min_order_quantity_default} un.</b><span>pedido mínimo por modelo</span></div>
          </div>
        )}
      </section>

      <section className="catalog-section">
        <h2>Catálogo</h2>
        <div className="catalog-grid">
          {(products ?? []).map((p) => (
            <div key={p.id} className="catalog-card">
              <div className="catalog-card-name">{p.name}</div>
              <div className="catalog-card-price">R$ {Number(p.price_per_unit).toFixed(2)} <span>/ unidade</span></div>
              <div className="catalog-card-row"><span>Malha</span><span>{fabricTypeName(p.fabric_type_id)}</span></div>
              <div className="catalog-card-row"><span>Tamanhos</span><span>{p.standard_sizes.join(", ") || "—"}</span></div>
            </div>
          ))}
          {(products ?? []).length === 0 && <p className="muted">Nenhum produto cadastrado ainda.</p>}
        </div>
      </section>

      <section className="catalog-section">
        <h2>Cores disponíveis</h2>
        <div className="catalog-colors">
          {(allColors ?? []).map((c) => (
            <div key={c.id} className="catalog-color-item"><div className="catalog-color-dot" style={{ background: c.hex_code }} /><span>{c.name}</span></div>
          ))}
        </div>
      </section>

      <section className="catalog-section catalog-budget">
        <h2>Monte seu orçamento</h2>
        <div className="catalog-budget-grid">
          <div className="panel">
            <div className="field"><label>Produto</label>
              <select className="input" value={productId} onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}>
                {(products ?? []).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div className="row2">
              <div className="field"><label>Tamanho</label>
                <select className="input" value={size} onChange={(e) => setSize(e.target.value)}>
                  {sizeOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div className="field"><label>Quantidade</label><input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            </div>
            <div className="field"><label>Cor</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {productColors.map((c) => (
                  <button key={c.id} type="button" className="swatch-btn" title={c.name} style={{ background: c.hex_code, outline: c.id === colorId ? "2px solid #0000ff" : "1px solid #cfd1d6" }} onClick={() => setColorId(c.id)} />
                ))}
              </div>
            </div>
            <div className="field"><label>Seu nome</label><input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Como podemos te chamar?" /></div>
          </div>
          <div className="panel summary">
            <div className="row-kv"><span>Produto</span><b>{selectedProduct?.name ?? "—"}</b></div>
            <div className="row-kv"><span>Preço unitário</span><b>{budget ? formatBRL(budget.unit_price) : "—"}</b></div>
            <div className="row-kv"><span>Total</span><b>{budget ? formatBRL(budget.total_price) : "—"}</b></div>
            <div className="row-kv"><span>Sinal</span><b>{budget ? formatBRL(budget.deposit_amount) : "—"}</b></div>
            {budget?.below_minimum_quantity && <p className="muted">Abaixo do pedido mínimo ({budget.minimum_quantity_applied} un.)</p>}
            <button className="btn" style={{ width: "100%", marginTop: 12 }} onClick={handleSubmit} disabled={submitting}>{submitting ? "Enviando..." : "Enviar pedido de orçamento"}</button>
          </div>
        </div>
      </section>

      <footer className="catalog-footer">
        <span>{settings?.company_name ?? "MaisFarda Uniformes"}</span>
        {settings?.whatsapp_number && <span>WhatsApp {settings.whatsapp_number}</span>}
      </footer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import logo from "../assets/logo-maisfarda.jpg";
import { createColor, deleteColor, listColors, updateColor } from "../api/colors";
import { createFabricType, deleteFabricType, listFabricTypes, updateFabricType } from "../api/fabricTypes";
import { calculateBudget } from "../api/quotes";
import { createProduct, deleteProduct, getAvailableColors, listProducts, updateProduct, type ProductInput } from "../api/products";
import { listQuotes, updateQuoteStatus } from "../api/quotes";
import { getSettings, updateSettings } from "../api/settings";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import { supabase } from "../lib/supabaseClient";
import type { BudgetResult, Color, FabricType, Product, Quote, QuoteStatus } from "../types/database";

function formatBRL(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const navItems = [
  { to: "/admin/produtos", label: "Produtos" },
  { to: "/admin/cores", label: "Cores" },
  { to: "/admin/malhas", label: "Malhas" },
  { to: "/admin/calculadora", label: "Calculadora" },
  { to: "/admin/pedidos", label: "Pedidos" },
  { to: "/admin/configuracoes", label: "Configurações" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin">
      <nav className="admin-nav">
        <img src={logo} alt="Mais Farda" className="admin-logo" />
        {navItems.map((i) => (
          <NavLink key={i.to} to={i.to}>{i.label}</NavLink>
        ))}
        <a href="/" style={{ marginLeft: "auto" }}>Ver catálogo público →</a>
        <button className="btn-link" onClick={() => supabase.auth.signOut()}>Sair</button>
      </nav>
      <div className="admin-wrap">{children}</div>
    </div>
  );
}

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="produtos" element={<ProductsSection />} />
        <Route path="cores" element={<ColorsSection />} />
        <Route path="malhas" element={<FabricTypesSection />} />
        <Route path="calculadora" element={<CalculatorSection />} />
        <Route path="pedidos" element={<QuotesSection />} />
        <Route path="configuracoes" element={<SettingsSection />} />
      </Routes>
    </AdminLayout>
  );
}

function ColorsSection() {
  const { data, loading, refetch } = useFetch(() => listColors(), []);
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Color | null>(null);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#5980A6");

  function startNew() { setEditing({ id: 0, name: "", hex_code: "#5980A6" }); setName(""); setHex("#5980A6"); }
  function startEdit(c: Color) { setEditing(c); setName(c.name); setHex(c.hex_code); }

  async function save() {
    if (!name.trim()) { showToast("Informe o nome.", "error"); return; }
    try {
      if (editing && editing.id) await updateColor(editing.id, { name, hex_code: hex });
      else await createColor({ name, hex_code: hex });
      showToast("Salvo com sucesso."); setEditing(null); refetch();
    } catch (err) { showToast(errorMessage(err), "error"); }
  }
  async function remove(id: number) {
    try { await deleteColor(id, true); showToast("Excluída."); refetch(); } catch (err) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div>
      <div className="section-head"><h1>Cores</h1><button className="btn" onClick={startNew}>+ Nova cor</button></div>
      {loading ? <p>Carregando...</p> : (
        <div className="grid-cards">
          {(data ?? []).map((c) => (
            <div key={c.id} className="mini-card">
              <span className="dot" style={{ background: c.hex_code }} />
              <div><div>{c.name}</div><div className="muted">{c.hex_code}</div></div>
              <div className="mini-actions">
                <button className="btn-link" onClick={() => startEdit(c)}>Editar</button>
                <button className="btn-link danger" onClick={() => remove(c.id)}>Excluir</button>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="muted">Nenhuma cor cadastrada.</p>}
        </div>
      )}
      {editing && (
        <div className="panel">
          <div className="field"><label>Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Cor</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="color" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} />
              <input className="input" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="actions"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></div>
        </div>
      )}
    </div>
  );
}

function FabricTypesSection() {
  const { data, loading, refetch } = useFetch(() => listFabricTypes(true), []);
  const { showToast } = useToast();
  const [editing, setEditing] = useState<FabricType | null>(null);
  const [name, setName] = useState("");

  function startNew() { setEditing({ id: 0, name: "", active: true }); setName(""); }
  function startEdit(f: FabricType) { setEditing(f); setName(f.name); }

  async function save() {
    if (!name.trim()) { showToast("Informe o nome.", "error"); return; }
    try {
      if (editing && editing.id) await updateFabricType(editing.id, { name, active: true });
      else await createFabricType({ name, active: true });
      showToast("Salvo com sucesso."); setEditing(null); refetch();
    } catch (err) { showToast(errorMessage(err), "error"); }
  }
  async function remove(id: number) {
    try { await deleteFabricType(id, true); showToast("Excluída."); refetch(); } catch (err) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div>
      <div className="section-head"><h1>Malhas / tecidos</h1><button className="btn" onClick={startNew}>+ Nova malha</button></div>
      {loading ? <p>Carregando...</p> : (
        <table className="table">
          <thead><tr><th>Nome</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.active ? "Ativa" : "Inativa"}</td>
                <td><button className="btn-link" onClick={() => startEdit(f)}>Editar</button> <button className="btn-link danger" onClick={() => remove(f.id)}>Excluir</button></td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (<tr><td colSpan={3} className="muted">Nenhuma malha cadastrada.</td></tr>)}
          </tbody>
        </table>
      )}
      {editing && (
        <div className="panel">
          <div className="field"><label>Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="actions"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></div>
        </div>
      )}
    </div>
  );
}

function ProductsSection() {
  const { data: products, loading, refetch } = useFetch(() => listProducts(true), []);
  const { data: fabricTypes } = useFetch(() => listFabricTypes(false), []);
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", fabric_type_id: "", price_per_unit: "", standard_sizes: "PP, P, M, G, GG", special_sizes: "XG, XGG", surcharge: "20" });

  function startNew() { setEditing({} as Product); setForm({ name: "", fabric_type_id: "", price_per_unit: "", standard_sizes: "PP, P, M, G, GG", special_sizes: "XG, XGG", surcharge: "20" }); }
  function startEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, fabric_type_id: String(p.fabric_type_id), price_per_unit: String(p.price_per_unit), standard_sizes: p.standard_sizes.join(", "), special_sizes: p.special_sizes.join(", "), surcharge: String(p.special_size_surcharge_percent) });
  }

  async function save() {
    if (!form.name.trim() || !form.fabric_type_id || !form.price_per_unit) { showToast("Preencha nome, malha e preço.", "error"); return; }
    const payload: Partial<ProductInput> = {
      name: form.name.trim(), fabric_type_id: Number(form.fabric_type_id), price_per_unit: Number(form.price_per_unit),
      standard_sizes: form.standard_sizes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      special_sizes: form.special_sizes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      special_size_surcharge_percent: Number(form.surcharge || 0), active: true,
      logo_application: "silk", logo_location: "peito",
    };
    try {
      if (editing?.id) await updateProduct(editing.id, payload); else await createProduct(payload);
      showToast("Salvo com sucesso."); setEditing(null); refetch();
    } catch (err) { showToast(errorMessage(err), "error"); }
  }
  async function remove(id: number) {
    try { await deleteProduct(id, true); showToast("Excluído."); refetch(); } catch (err) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div>
      <div className="section-head"><h1>Produtos</h1><button className="btn" onClick={startNew} disabled={(fabricTypes ?? []).length === 0}>+ Novo produto</button></div>
      {loading ? <p>Carregando...</p> : (
        <table className="table">
          <thead><tr><th>Produto</th><th>Preço</th><th>Tamanhos</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>R$ {Number(p.price_per_unit).toFixed(2)}</td>
                <td className="muted">{p.standard_sizes.join(", ")}</td>
                <td>{p.active ? "Ativo" : "Inativo"}</td>
                <td><button className="btn-link" onClick={() => startEdit(p)}>Editar</button> <button className="btn-link danger" onClick={() => remove(p.id)}>Excluir</button></td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (<tr><td colSpan={5} className="muted">Nenhum produto cadastrado ainda.</td></tr>)}
          </tbody>
        </table>
      )}
      {editing && (
        <div className="panel">
          <div className="field"><label>Nome do produto</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="row2">
            <div className="field"><label>Malha</label>
              <select className="input" value={form.fabric_type_id} onChange={(e) => setForm({ ...form, fabric_type_id: e.target.value })}>
                <option value="">Selecione...</option>
                {(fabricTypes ?? []).map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>
            </div>
            <div className="field"><label>Preço por unidade (R$)</label><input className="input" type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} /></div>
          </div>
          <div className="row2">
            <div className="field"><label>Tamanhos padrão</label><input className="input" value={form.standard_sizes} onChange={(e) => setForm({ ...form, standard_sizes: e.target.value })} /></div>
            <div className="field"><label>Tamanhos especiais</label><input className="input" value={form.special_sizes} onChange={(e) => setForm({ ...form, special_sizes: e.target.value })} /></div>
          </div>
          <div className="field" style={{ maxWidth: 200 }}><label>Acréscimo especiais (%)</label><input className="input" type="number" value={form.surcharge} onChange={(e) => setForm({ ...form, surcharge: e.target.value })} /></div>
          <div className="actions"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></div>
        </div>
      )}
    </div>
  );
}

function CalculatorSection() {
  const { data: products } = useFetch(() => listProducts(false), []);
  const { showToast } = useToast();
  const [productId, setProductId] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("20");
  const [colors, setColors] = useState<Color[]>([]);
  const [result, setResult] = useState<BudgetResult | null>(null);

  const product = (products ?? []).find((p) => String(p.id) === productId) ?? null;
  const sizes = product ? [...product.standard_sizes, ...product.special_sizes] : [];

  useEffect(() => {
    setSize(""); setResult(null);
    if (!productId) { setColors([]); return; }
    getAvailableColors(Number(productId)).then(setColors).catch(() => {});
  }, [productId]);

  async function calculate() {
    if (!productId || !size) { showToast("Selecione produto e tamanho.", "error"); return; }
    try { setResult(await calculateBudget({ product_id: Number(productId), size, quantity: Number(quantity) })); }
    catch (err) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div>
      <div className="section-head"><h1>Calculadora de orçamento</h1></div>
      <div className="row2">
        <div className="panel">
          <div className="field"><label>Produto</label>
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Selecione...</option>
              {(products ?? []).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div className="row2">
            <div className="field"><label>Tamanho</label>
              <select className="input" value={size} onChange={(e) => setSize(e.target.value)} disabled={!product}>
                <option value="">Selecione...</option>
                {sizes.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="field"><label>Quantidade</label><input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          </div>
          {colors.length > 0 && <p className="muted">Cores disponíveis: {colors.map((c) => c.name).join(", ")}</p>}
          <div className="actions"><button className="btn" onClick={calculate}>Calcular</button></div>
        </div>
        <div>
          {result ? (
            <div className="panel">
              <div className="row-kv"><span>Preço unitário</span><b>{formatBRL(result.unit_price)}</b></div>
              <div className="row-kv"><span>Valor total</span><b>{formatBRL(result.total_price)}</b></div>
              <div className="row-kv"><span>Sinal ({Number(result.deposit_percent_applied)}%)</span><b>{formatBRL(result.deposit_amount)}</b></div>
              <div className="row-kv"><span>Saldo restante</span><b>{formatBRL(result.remaining_balance)}</b></div>
              <div className="row-kv"><span>Prazo de entrega</span><b>{result.delivery_business_days} dias úteis</b></div>
              {result.below_minimum_quantity && <p className="muted">Abaixo do pedido mínimo ({result.minimum_quantity_applied} un.)</p>}
            </div>
          ) : <p className="muted">Preencha o formulário e clique em Calcular.</p>}
        </div>
      </div>
    </div>
  );
}

function QuotesSection() {
  const { data, loading, refetch } = useFetch(() => listQuotes(), []);
  const { showToast } = useToast();

  async function changeStatus(q: Quote, status: QuoteStatus) {
    try { await updateQuoteStatus(q.id, status); refetch(); } catch (err) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div>
      <div className="section-head"><h1>Pedidos de orçamento</h1></div>
      {loading ? <p>Carregando...</p> : (
        <table className="table">
          <thead><tr><th>#</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {(data ?? []).map((q) => (
              <tr key={q.id}>
                <td className="muted">#{q.id}</td>
                <td>{q.client_name}</td>
                <td className="muted">{q.product?.name ?? `#${q.product_id}`}</td>
                <td>{q.quantity}</td>
                <td>{formatBRL(q.total_price)}</td>
                <td>
                  <select className="input" value={q.status} onChange={(e) => changeStatus(q, e.target.value as QuoteStatus)}>
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="em_producao">Em produção</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (<tr><td colSpan={6} className="muted">Nenhum pedido registrado ainda.</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SettingsSection() {
  const { data, refetch } = useFetch(() => getSettings(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState({ company_name: "", min_order_quantity_default: "20", delivery_business_days_default: "20", deposit_percent_default: "50", founding_year: "", whatsapp_number: "", notification_webhook_url: "" });

  useEffect(() => {
    if (!data) return;
    setForm({
      company_name: data.company_name, min_order_quantity_default: String(data.min_order_quantity_default),
      delivery_business_days_default: String(data.delivery_business_days_default), deposit_percent_default: String(data.deposit_percent_default),
      founding_year: data.founding_year ? String(data.founding_year) : "", whatsapp_number: data.whatsapp_number ?? "", notification_webhook_url: data.notification_webhook_url ?? "",
    });
  }, [data]);

  async function save() {
    try {
      await updateSettings({
        company_name: form.company_name, min_order_quantity_default: Number(form.min_order_quantity_default),
        delivery_business_days_default: Number(form.delivery_business_days_default), deposit_percent_default: Number(form.deposit_percent_default),
        founding_year: form.founding_year ? Number(form.founding_year) : null, whatsapp_number: form.whatsapp_number || null, notification_webhook_url: form.notification_webhook_url || null,
      });
      showToast("Configurações salvas."); refetch();
    } catch (err) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div>
      <div className="section-head"><h1>Configurações gerais</h1></div>
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="field"><label>Nome da empresa</label><input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
        <div className="row2">
          <div className="field"><label>Pedido mínimo padrão</label><input className="input" type="number" value={form.min_order_quantity_default} onChange={(e) => setForm({ ...form, min_order_quantity_default: e.target.value })} /></div>
          <div className="field"><label>Prazo de entrega (dias úteis)</label><input className="input" type="number" value={form.delivery_business_days_default} onChange={(e) => setForm({ ...form, delivery_business_days_default: e.target.value })} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Sinal (%)</label><input className="input" type="number" value={form.deposit_percent_default} onChange={(e) => setForm({ ...form, deposit_percent_default: e.target.value })} /></div>
          <div className="field"><label>Ano de fundação</label><input className="input" type="number" value={form.founding_year} onChange={(e) => setForm({ ...form, founding_year: e.target.value })} /></div>
        </div>
        <div className="field"><label>WhatsApp</label><input className="input" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="5584999360000" /></div>
        <div className="field"><label>Webhook de notificação</label><input className="input" value={form.notification_webhook_url} onChange={(e) => setForm({ ...form, notification_webhook_url: e.target.value })} /></div>
        <div className="actions"><button className="btn" onClick={save}>Salvar configurações</button></div>
      </div>
    </div>
  );
}

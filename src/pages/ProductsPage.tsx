import { Palette, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createFabricType, listFabricTypes } from "../api/fabricTypes";
import { listColors } from "../api/colors";
import {
  createProduct,
  deleteProduct,
  getLinkedColorIds,
  listProducts,
  setProductColors,
  updateProduct,
  type ProductInput,
} from "../api/products";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Corners } from "../components/Corners";
import { Modal } from "../components/Modal";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import type {
  Color,
  FabricType,
  LogoApplication,
  LogoLocation,
  Product,
} from "../types/database";

interface FormState {
  id: number | null;
  name: string;
  fabric_type_id: number | "";
  logo_application: LogoApplication;
  logo_location: LogoLocation;
  price_per_unit: string;
  standard_sizes: string;
  special_sizes: string;
  special_size_surcharge_percent: string;
  min_order_quantity: string;
  active: boolean;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  fabric_type_id: "",
  logo_application: "silk",
  logo_location: "peito",
  price_per_unit: "",
  standard_sizes: "PP, P, M, G, GG",
  special_sizes: "XG, XGG",
  special_size_surcharge_percent: "20",
  min_order_quantity: "",
  active: true,
};

function parseSizes(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function productToForm(product: Product): FormState {
  return {
    id: product.id,
    name: product.name,
    fabric_type_id: product.fabric_type_id,
    logo_application: product.logo_application ?? "silk",
    logo_location: product.logo_location ?? "peito",
    price_per_unit: String(product.price_per_unit),
    standard_sizes: product.standard_sizes.join(", "),
    special_sizes: product.special_sizes.join(", "),
    special_size_surcharge_percent: String(product.special_size_surcharge_percent),
    min_order_quantity:
      product.min_order_quantity === null ? "" : String(product.min_order_quantity),
    active: product.active,
  };
}

export default function ProductsPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const {
    data: products,
    loading,
    error,
    refetch,
  } = useFetch(() => listProducts(includeInactive), [includeInactive]);
  const { data: fabricTypes, refetch: refetchFabricTypes } = useFetch(
    () => listFabricTypes(true),
    [],
  );
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [colorsTarget, setColorsTarget] = useState<Product | null>(null);
  const [addingMalha, setAddingMalha] = useState(false);
  const [newMalhaText, setNewMalhaText] = useState("");

  const fabricTypeName = (id: number) =>
    (fabricTypes ?? []).find((ft) => ft.id === id)?.name ?? `#${id}`;

  async function handleConfirmAddMalha() {
    const value = newMalhaText.trim();
    if (!value) {
      setAddingMalha(false);
      return;
    }
    try {
      const created = await createFabricType({ name: value, active: true });
      refetchFabricTypes();
      setForm((f) => (f ? { ...f, fabric_type_id: created.id } : f));
      setAddingMalha(false);
      setNewMalhaText("");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim() || form.fabric_type_id === "" || !form.price_per_unit) {
      showToast("Preencha nome, malha e preço por unidade.", "error");
      return;
    }
    const standardSizes = parseSizes(form.standard_sizes);
    const specialSizes = parseSizes(form.special_sizes);
    if (standardSizes.length === 0 && specialSizes.length === 0) {
      showToast("Informe ao menos um tamanho (padrão ou especial).", "error");
      return;
    }

    const payload: Partial<ProductInput> = {
      name: form.name.trim(),
      fabric_type_id: Number(form.fabric_type_id),
      logo_application: form.logo_application,
      logo_location: form.logo_location,
      price_per_unit: Number(form.price_per_unit),
      standard_sizes: standardSizes,
      special_sizes: specialSizes,
      special_size_surcharge_percent: Number(form.special_size_surcharge_percent || 0),
      min_order_quantity: form.min_order_quantity ? Number(form.min_order_quantity) : null,
      active: form.active,
    };

    setSaving(true);
    try {
      if (form.id === null) {
        await createProduct(payload);
        showToast("Produto criado com sucesso.");
      } else {
        await updateProduct(form.id, payload);
        showToast("Produto atualizado com sucesso.");
      }
      setForm(null);
      refetch();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id, true);
      showToast("Produto excluído.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(errorMessage(err), "error");
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Gestão de produtos</h1>
          <p>
            Produtos exibidos no catálogo público. Alterações aqui refletem preço, malha,
            aplicação de logo e faixa de tamanhos mostrados aos clientes.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary blueprint"
          onClick={() => setForm(emptyForm)}
          disabled={(fabricTypes ?? []).length === 0}
        >
          <Corners />+ Novo produto
        </button>
      </div>

      <label className="radio" style={{ marginBottom: "var(--space-3)" }}>
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          style={{ position: "static", opacity: 1, width: "auto", height: "auto" }}
        />
        Mostrar inativos
      </label>

      {loading && <p className="text-muted">Carregando...</p>}
      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Malha</th>
              <th>Aplicação de logo</th>
              <th>Preço</th>
              <th>Tamanhos</th>
              <th>Especiais</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td className="text-muted">{fabricTypeName(product.fabric_type_id)}</td>
                <td>
                  <span
                    className={`tag ${product.logo_application === "silk" ? "tag-accent" : "tag-outline"}`}
                  >
                    {product.logo_application ?? "—"}
                  </span>
                </td>
                <td className="num-cell">R$ {Number(product.price_per_unit).toFixed(2)}</td>
                <td className="text-muted">{product.standard_sizes.join(", ") || "—"}</td>
                <td className="text-muted">
                  {product.special_sizes.length > 0
                    ? `${product.special_sizes.join(", ")} (+${Number(product.special_size_surcharge_percent)}%)`
                    : "—"}
                </td>
                <td>
                  <span className={`tag ${product.active ? "tag-accent" : "tag-neutral"}`}>
                    {product.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon blueprint"
                      aria-label="Cores"
                      onClick={() => setColorsTarget(product)}
                    >
                      <Corners />
                      <Palette size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon blueprint"
                      aria-label="Editar"
                      onClick={() => setForm(productToForm(product))}
                    >
                      <Corners />
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      aria-label="Excluir"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="empty-note">
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {form && (
        <Modal
          title={form.id === null ? "Novo produto" : "Editar produto"}
          onClose={() => setForm(null)}
          maxWidth={620}
        >
          <div className="grid-2">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="f-nome">Nome do produto</label>
              <input
                id="f-nome"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Camisa Polo Corporativa"
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: "var(--space-3)" }}>
            <label>Malha</label>
            <div className="malha-picker">
              {(fabricTypes ?? []).map((ft: FabricType) => (
                <button
                  key={ft.id}
                  type="button"
                  className={`tag tag-btn ${form.fabric_type_id === ft.id ? "tag-accent" : "tag-outline"}`}
                  onClick={() => setForm({ ...form, fabric_type_id: ft.id })}
                >
                  {ft.name}
                </button>
              ))}
              {addingMalha ? (
                <>
                  <input
                    className="input"
                    style={{ width: 180, minHeight: "auto", padding: "4px 8px" }}
                    value={newMalhaText}
                    onChange={(e) => setNewMalhaText(e.target.value)}
                    placeholder="Nova malha"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary blueprint"
                    onClick={handleConfirmAddMalha}
                  >
                    <Corners />
                    OK
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="tag tag-btn tag-neutral"
                  onClick={() => {
                    setAddingMalha(true);
                    setNewMalhaText("");
                  }}
                >
                  + Adicionar
                </button>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: "var(--space-3)" }}>
            <div className="field">
              <label id="lbl-logo">Aplicação de logo</label>
              <div className="seg" role="radiogroup" aria-labelledby="lbl-logo">
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="logoAplicacao"
                    checked={form.logo_application === "silk"}
                    onChange={() => setForm({ ...form, logo_application: "silk" })}
                  />
                  Silk
                </label>
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="logoAplicacao"
                    checked={form.logo_application === "bordado"}
                    onChange={() => setForm({ ...form, logo_application: "bordado" })}
                  />
                  Bordado
                </label>
              </div>
            </div>
            <div className="field">
              <label id="lbl-local">Local do logo</label>
              <div className="seg" role="radiogroup" aria-labelledby="lbl-local">
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="logoLocal"
                    checked={form.logo_location === "peito"}
                    onChange={() => setForm({ ...form, logo_location: "peito" })}
                  />
                  Peito
                </label>
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="logoLocal"
                    checked={form.logo_location === "costas"}
                    onChange={() => setForm({ ...form, logo_location: "costas" })}
                  />
                  Costas
                </label>
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="logoLocal"
                    checked={form.logo_location === "ambos"}
                    onChange={() => setForm({ ...form, logo_location: "ambos" })}
                  />
                  Ambos
                </label>
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: "var(--space-3)" }}>
            <div className="field">
              <label htmlFor="f-preco">Preço por unidade (R$)</label>
              <input
                id="f-preco"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.price_per_unit}
                onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="f-minimo">Pedido mínimo (opcional)</label>
              <input
                id="f-minimo"
                className="input"
                type="number"
                min="1"
                value={form.min_order_quantity}
                onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })}
                placeholder="Usa o padrão global se vazio"
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: "var(--space-3)" }}>
            <div className="field">
              <label htmlFor="f-faixa">Tamanhos padrão (separados por vírgula)</label>
              <input
                id="f-faixa"
                className="input"
                value={form.standard_sizes}
                onChange={(e) => setForm({ ...form, standard_sizes: e.target.value })}
                placeholder="PP, P, M, G, GG"
              />
            </div>
            <div className="field">
              <label htmlFor="f-especiais">Tamanhos especiais</label>
              <input
                id="f-especiais"
                className="input"
                value={form.special_sizes}
                onChange={(e) => setForm({ ...form, special_sizes: e.target.value })}
                placeholder="XG, XGG"
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: "var(--space-3)", maxWidth: 220 }}>
            <label htmlFor="f-acrescimo">Acréscimo tamanhos especiais (%)</label>
            <input
              id="f-acrescimo"
              className="input"
              type="number"
              min="0"
              step="1"
              value={form.special_size_surcharge_percent}
              onChange={(e) => setForm({ ...form, special_size_surcharge_percent: e.target.value })}
            />
          </div>

          <label className="radio" style={{ marginTop: "var(--space-4)" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              style={{ position: "static", opacity: 1, width: "auto", height: "auto" }}
            />
            Ativo
          </label>

          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary blueprint" onClick={() => setForm(null)}>
              <Corners />
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary blueprint"
              onClick={handleSave}
              disabled={saving}
            >
              <Corners />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {colorsTarget && (
        <ProductColorsModal product={colorsTarget} onClose={() => setColorsTarget(null)} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir produto"
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Se houver pedidos vinculados, a exclusão será bloqueada — considere desativar em vez de excluir.`}
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function ProductColorsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { showToast } = useToast();
  const [allColors, setAllColors] = useState<Color[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listColors(), getLinkedColorIds(product.id)])
      .then(([colors, linkedIds]) => {
        if (!active) return;
        setAllColors(colors);
        setSelected(new Set(linkedIds));
      })
      .catch((err) => showToast(errorMessage(err), "error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setProductColors(product.id, Array.from(selected));
      showToast("Cores do produto atualizadas.");
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Cores disponíveis — ${product.name}`} onClose={onClose}>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>
        Se nenhuma cor for marcada, todas as cores cadastradas ficam disponíveis para este produto.
      </p>
      {loading ? (
        <p className="text-muted">Carregando...</p>
      ) : (
        <div className="malha-picker">
          {allColors.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`tag tag-btn ${selected.has(color.id) ? "tag-accent" : "tag-outline"}`}
              onClick={() => toggle(color.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: color.hex_code,
                  display: "inline-block",
                }}
              />
              {color.name}
            </button>
          ))}
          {allColors.length === 0 && <p className="text-muted">Nenhuma cor cadastrada.</p>}
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary blueprint" onClick={onClose}>
          <Corners />
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary blueprint"
          onClick={handleSave}
          disabled={saving || loading}
        >
          <Corners />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

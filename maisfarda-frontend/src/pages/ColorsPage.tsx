import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { createColor, deleteColor, listColors, updateColor } from "../api/colors";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Corners } from "../components/Corners";
import { Modal } from "../components/Modal";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import type { Color } from "../types/database";

interface FormState {
  id: number | null;
  name: string;
  hex_code: string;
}

const emptyForm: FormState = { id: null, name: "", hex_code: "#5980A6" };
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export default function ColorsPage() {
  const { data, loading, error, refetch } = useFetch(() => listColors(), []);
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Color | null>(null);

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) {
      showToast("Informe o nome da cor.", "error");
      return;
    }
    if (!HEX_PATTERN.test(form.hex_code)) {
      showToast("Informe um código hexadecimal válido, ex: #1E3A8A.", "error");
      return;
    }
    setSaving(true);
    try {
      if (form.id === null) {
        await createColor({ name: form.name.trim(), hex_code: form.hex_code });
        showToast("Cor criada com sucesso.");
      } else {
        await updateColor(form.id, { name: form.name.trim(), hex_code: form.hex_code });
        showToast("Cor atualizada com sucesso.");
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
      await deleteColor(deleteTarget.id, true);
      showToast("Cor excluída.");
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
          <h1>Cores</h1>
          <p>Cores disponíveis para os produtos do catálogo.</p>
        </div>
        <button type="button" className="btn btn-primary blueprint" onClick={() => setForm(emptyForm)}>
          <Corners />+ Nova cor
        </button>
      </div>

      {loading && <p className="text-muted">Carregando...</p>}
      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {!loading && !error && (
        <div className="swatch-grid">
          {(data ?? []).map((color) => (
            <div key={color.id} className="card blueprint">
              <Corners />
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span className="swatch-dot" style={{ background: color.hex_code }} />
                <div style={{ flex: 1 }}>
                  <div className="card-title">{color.name}</div>
                  <div className="card-meta">{color.hex_code}</div>
                </div>
              </div>
              <div className="actions-cell">
                <button
                  type="button"
                  className="btn btn-secondary btn-icon blueprint"
                  aria-label="Editar"
                  onClick={() => setForm({ id: color.id, name: color.name, hex_code: color.hex_code })}
                >
                  <Corners />
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label="Excluir"
                  onClick={() => setDeleteTarget(color)}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="empty-note">Nenhuma cor cadastrada.</p>}
        </div>
      )}

      {form && (
        <Modal title={form.id === null ? "Nova cor" : "Editar cor"} onClose={() => setForm(null)}>
          <div className="field">
            <label htmlFor="f-nome-cor">Nome</label>
            <input
              id="f-nome-cor"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Azul Royal"
            />
          </div>
          <div className="field" style={{ marginTop: "var(--space-3)" }}>
            <label htmlFor="f-hex">Código hexadecimal</label>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <input
                type="color"
                value={HEX_PATTERN.test(form.hex_code) ? form.hex_code : "#5980A6"}
                onChange={(e) => setForm({ ...form, hex_code: e.target.value.toUpperCase() })}
                style={{ width: 40, height: 36, padding: 0, border: "1px solid var(--color-divider)" }}
              />
              <input
                id="f-hex"
                className="input"
                value={form.hex_code}
                onChange={(e) => setForm({ ...form, hex_code: e.target.value.toUpperCase() })}
                placeholder="#1E3A8A"
              />
            </div>
          </div>
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

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir cor"
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Se houver pedidos usando esta cor, a exclusão será bloqueada.`}
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

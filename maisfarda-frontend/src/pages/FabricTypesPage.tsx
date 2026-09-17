import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createFabricType,
  deleteFabricType,
  listFabricTypes,
  updateFabricType,
} from "../api/fabricTypes";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Corners } from "../components/Corners";
import { Modal } from "../components/Modal";
import { errorMessage, useToast } from "../components/ToastProvider";
import { useFetch } from "../hooks/useFetch";
import type { FabricType } from "../types/database";

interface FormState {
  id: number | null;
  name: string;
  active: boolean;
}

const emptyForm: FormState = { id: null, name: "", active: true };

export default function FabricTypesPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data, loading, error, refetch } = useFetch(
    () => listFabricTypes(includeInactive),
    [includeInactive],
  );
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FabricType | null>(null);

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) {
      showToast("Informe o nome da malha.", "error");
      return;
    }
    setSaving(true);
    try {
      if (form.id === null) {
        await createFabricType({ name: form.name.trim(), active: form.active });
        showToast("Malha criada com sucesso.");
      } else {
        await updateFabricType(form.id, {
          name: form.name.trim(),
          active: form.active,
        });
        showToast("Malha atualizada com sucesso.");
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
      await deleteFabricType(deleteTarget.id, true);
      showToast("Malha excluída.");
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
          <h1>Malhas / tecidos</h1>
          <p>Lista pré-definida e editável usada no cadastro de produtos.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary blueprint"
          onClick={() => setForm(emptyForm)}
        >
          <Corners />+ Nova malha
        </button>
      </div>

      <label className="radio" style={{ marginBottom: "var(--space-3)" }}>
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          style={{ position: "static", opacity: 1, width: "auto", height: "auto" }}
        />
        Mostrar inativas
      </label>

      {loading && <p className="text-muted">Carregando...</p>}
      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((ft) => (
              <tr key={ft.id}>
                <td>{ft.name}</td>
                <td>
                  <span className={`tag ${ft.active ? "tag-accent" : "tag-neutral"}`}>
                    {ft.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon blueprint"
                      aria-label="Editar"
                      onClick={() => setForm({ id: ft.id, name: ft.name, active: ft.active })}
                    >
                      <Corners />
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      aria-label="Excluir"
                      onClick={() => setDeleteTarget(ft)}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="empty-note">
                  Nenhuma malha cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {form && (
        <Modal title={form.id === null ? "Nova malha" : "Editar malha"} onClose={() => setForm(null)}>
          <div className="field">
            <label htmlFor="f-nome">Nome</label>
            <input
              id="f-nome"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Malha PV"
            />
          </div>
          <label className="radio" style={{ marginTop: "var(--space-3)" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              style={{ position: "static", opacity: 1, width: "auto", height: "auto" }}
            />
            Ativa
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

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir malha"
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Se houver produtos usando esta malha, a exclusão será bloqueada.`}
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

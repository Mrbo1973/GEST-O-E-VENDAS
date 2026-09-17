import { Corners } from "./Corners";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} maxWidth={420}>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary blueprint" onClick={onCancel}>
          <Corners />
          Cancelar
        </button>
        <button type="button" className="btn btn-primary blueprint" onClick={onConfirm}>
          <Corners />
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

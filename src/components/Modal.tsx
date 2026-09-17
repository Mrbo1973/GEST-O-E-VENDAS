import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Corners } from "./Corners";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}

export function Modal({ title, onClose, children, maxWidth = 560 }: ModalProps) {
  return (
    <div className="dialog-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div
        className="dialog blueprint"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth, width: "100%" }}
      >
        <Corners />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="dialog-title">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div
          className="dialog-body"
          style={{ maxHeight: "70vh", overflowY: "auto", overflowX: "hidden" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

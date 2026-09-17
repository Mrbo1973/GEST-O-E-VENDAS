import { AlertTriangle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.kind === "error" ? "toast-error" : ""}`}
          >
            {toast.kind === "success" ? (
              <Check size={14} strokeWidth={1.5} />
            ) : (
              <AlertTriangle size={14} strokeWidth={1.5} />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Erro inesperado";
}

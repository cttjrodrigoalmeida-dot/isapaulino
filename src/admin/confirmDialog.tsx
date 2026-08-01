// Modal de confirmação estilizado (substitui o window.confirm nativo, que não é
// estilizável). Uso imperativo: `if (!(await confirmDialog({...}))) return;`
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

type Opts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botão de confirmar em vermelho (ação destrutiva). Padrão: true. */
  danger?: boolean;
};

export function confirmDialog(opts: Opts): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let done = false;
    const close = (v: boolean) => {
      if (done) return;
      done = true;
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(<ConfirmModal opts={opts} onClose={close} />);
  });
}

function ConfirmModal({ opts, onClose }: { opts: Opts; onClose: (v: boolean) => void }) {
  const danger = opts.danger !== false;
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      else if (e.key === "Enter") onClose(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onClose(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              background: danger ? "rgba(240, 80, 110, 0.16)" : "var(--color-surface-3)",
              color: danger ? "#f0506e" : "var(--color-text-primary)",
              fontSize: 18,
            }}
            aria-hidden
          >
            {danger ? "!" : "?"}
          </span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {opts.title ?? (danger ? "Confirmar exclusão" : "Confirmar")}
          </h3>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 13.5, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
          {opts.message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => onClose(false)}
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {opts.cancelLabel ?? "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            style={{
              padding: "9px 18px",
              borderRadius: 9,
              border: "none",
              background: danger ? "#e5484d" : "var(--color-accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {opts.confirmLabel ?? (danger ? "Excluir" : "Confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Notificação rápida estilizada (substitui o alert() nativo). Uso: toast("Salvo!").
// Aparece no rodapé, some sozinha e some ao clicar. Segue o tema do painel
// (é anexada dentro do elemento com data-theme, herdando as CSS vars).
import { useEffect } from "react";
import { createRoot } from "react-dom/client";

type ToastType = "info" | "success" | "error";

export function toast(message: string, opts?: { type?: ToastType; duration?: number }) {
  const mount = (document.querySelector("[data-theme]") as HTMLElement) || document.body;
  const host = document.createElement("div");
  mount.appendChild(host);
  const root = createRoot(host);
  let done = false;
  const close = () => { if (done) return; done = true; root.unmount(); host.remove(); };
  root.render(<Toast message={message} type={opts?.type ?? "info"} duration={opts?.duration ?? 2800} onClose={close} />);
}

function Toast({ message, type, duration, onClose }: { message: string; type: ToastType; duration: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const accent = type === "success" ? "#4ade80" : type === "error" ? "#f0506e" : "var(--color-accent)";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", left: "50%", bottom: 26, transform: "translateX(-50%)", zIndex: 3000,
        maxWidth: "min(440px, calc(100vw - 32px))", display: "flex", alignItems: "center", gap: 11,
        background: "var(--color-surface)", color: "var(--color-text-primary)",
        border: "1px solid var(--color-border)", borderLeft: `3px solid ${accent}`,
        borderRadius: 12, padding: "12px 16px", boxShadow: "0 16px 44px rgba(0,0,0,0.35)",
        fontSize: 13.5, cursor: "pointer", animation: "ipsToastIn .18s ease-out",
      }}
      role="status"
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
      <span style={{ whiteSpace: "pre-line", lineHeight: 1.45 }}>{message}</span>
      <style>{`@keyframes ipsToastIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

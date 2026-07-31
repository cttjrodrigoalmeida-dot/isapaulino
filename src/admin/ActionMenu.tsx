// Menu de ações padronizado (dropdown ⋯) para as listas de documentos.
// Consolida Ver/Editar/Duplicar/Copiar link/Baixar PDF/Cancelar/Excluir etc.
import { useEffect, useRef, useState } from "react";
import styles from "./Admin.module.css";

export type MenuAction = {
  label: string;
  onSelect?: () => void;
  /** Link externo (abre em nova aba) — ex.: Ver / Baixar PDF. */
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Não renderiza o item (ação não se aplica a esta linha). */
  hidden?: boolean;
};

export default function ActionMenu({ actions, label = "Ações" }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯ {label}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 60,
            minWidth: 190,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            boxShadow: "0 12px 34px rgba(0, 0, 0, 0.4)",
            padding: 6,
            display: "grid",
            gap: 2,
          }}
        >
          {visible.map((a, i) =>
            a.href ? (
              <a
                key={i}
                role="menuitem"
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.menuItem} ${a.danger ? styles.menuItemDanger : ""}`}
                onClick={() => setOpen(false)}
              >
                {a.label}
              </a>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                className={`${styles.menuItem} ${a.danger ? styles.menuItemDanger : ""}`}
                onClick={() => { setOpen(false); a.onSelect?.(); }}
              >
                {a.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

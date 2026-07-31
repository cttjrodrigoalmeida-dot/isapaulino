// Menu de ações padronizado (dropdown ⋯) para as listas de documentos.
// Renderizado via PORTAL com position:fixed para não ser cortado pelo overflow
// da tabela (scroll horizontal). Abre para baixo ou para cima conforme o espaço.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type Pos = { top?: number; bottom?: number; right: number };

export default function ActionMenu({ actions, label = "Ações" }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const right = window.innerWidth - r.right;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < 300) setPos({ bottom: window.innerHeight - r.top + 4, right });
    else setPos({ top: r.bottom + 4, right });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.btn}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯ {label}
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            right: pos.right,
            zIndex: 1000,
            minWidth: 190,
            maxHeight: "min(70vh, 420px)",
            overflowY: "auto",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            boxShadow: "0 12px 34px rgba(0, 0, 0, 0.45)",
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
        </div>,
        document.body
      )}
    </>
  );
}

import type { ReactNode } from "react";
import styles from "./Admin.module.css";

// Card do editor com âncora para scroll-spy/navegação (id = sec-card-<id>) e,
// opcionalmente, recolher/expandir. Se `onToggle` não vier, é um card normal
// (sempre aberto), preservando o comportamento antigo dos sub-editores.
export default function EditorSection({
  id, label, collapsed = false, onToggle, right, children,
}: {
  id?: string;
  label: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.card} id={id ? `sec-card-${id}` : undefined}>
      <div className={styles.blockHead} style={{ marginBottom: onToggle && collapsed ? 0 : 14 }}>
        {onToggle ? (
          <button type="button" onClick={onToggle} title={collapsed ? "Expandir" : "Recolher"}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", width: 12, flexShrink: 0 }}>{collapsed ? "▸" : "▾"}</span>
            <span className={styles.cardTitle} style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          </button>
        ) : (
          <div className={styles.cardTitle} style={{ margin: 0 }}>{label}</div>
        )}
        {right && <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{right}</div>}
      </div>
      {!(onToggle && collapsed) && children}
    </div>
  );
}

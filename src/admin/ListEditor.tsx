import { useRef } from "react";
import styles from "./Admin.module.css";

// Editor visual de lista de textos (tags, ambientes…). Cada item é um campo
// editável com botão de remover; Enter cria um novo item (sem o bug de filtrar
// linhas em branco que travava o textarea anterior).
export default function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel = "+ adicionar",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const update = (i: number, value: string) => {
    const next = items.slice();
    next[i] = value;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addAt = (i: number) => {
    const next = items.slice();
    next.splice(i + 1, 0, "");
    onChange(next);
    // foca o novo campo após o React renderizar
    requestAnimationFrame(() => {
      const inputs = wrapRef.current?.querySelectorAll("input");
      inputs?.[i + 1]?.focus();
    });
  };

  return (
    <div ref={wrapRef} className={styles.listEditor}>
      {items.map((item, i) => (
        <div key={i} className={styles.listRow}>
          <input
            className={styles.input}
            value={item}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAt(i);
              }
            }}
          />
          <button type="button" className={styles.iconBtn} onClick={() => remove(i)} aria-label="Remover">
            ×
          </button>
        </div>
      ))}
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => addAt(items.length - 1)}>
        {addLabel}
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import styles from "./Admin.module.css";

// Editor visual de lista de textos (tags, ambientes…). Cada item é um campo
// editável com botão de remover; Enter cria um novo item.
//
// Modo `advanced` (opt-in): adiciona seleção (checkbox + "selecionar todos"),
// arrastar para reordenar (⠿) e ações copiar/colar/substituir/duplicar/excluir
// no padrão do sistema. A área de transferência é o localStorage (compartilhada
// entre janelas), então dá para copiar itens de uma lista e colar em outra.
const LIST_CLIP = "ips_list_clip";
function readListClip(): string[] {
  try {
    const raw = window.localStorage.getItem(LIST_CLIP);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
function writeListClip(items: string[]) {
  try { window.localStorage.setItem(LIST_CLIP, JSON.stringify(items)); } catch { /* ignora */ }
}

export default function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel = "+ adicionar",
  advanced = false,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  /** Liga seleção em massa + arrastar + copiar/colar/substituir/duplicar. */
  advanced?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hasClip, setHasClip] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!advanced) return;
    const check = () => setHasClip(readListClip().length > 0);
    check();
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    return () => { window.removeEventListener("focus", check); window.removeEventListener("storage", check); };
  }, [advanced]);

  const clearSel = () => setSelected(new Set());
  const commit = (next: string[], keepSel = false) => { if (!keepSel) clearSel(); onChange(next); };

  const update = (i: number, value: string) => {
    const next = items.slice();
    next[i] = value;
    commit(next, true); // editar texto não mexe nos índices
  };
  const remove = (i: number) => commit(items.filter((_, idx) => idx !== i));
  const addAt = (i: number) => {
    const next = items.slice();
    next.splice(i + 1, 0, "");
    commit(next);
    requestAnimationFrame(() => {
      const inputs = wrapRef.current?.querySelectorAll("input.listInput");
      (inputs?.[i + 1] as HTMLInputElement | undefined)?.focus();
    });
  };

  // ── Seleção / ações (modo advanced) ──
  const toggleSel = (i: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const selState: "all" | "some" | "none" =
    items.length === 0 ? "none" : selected.size === 0 ? "none" : selected.size === items.length ? "all" : "some";
  const toggleAll = () =>
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((_, i) => i))));
  const selectedIdx = () => [...selected].sort((a, b) => a - b);
  const copySelected = () => { const v = selectedIdx().map((i) => items[i]); if (v.length) { writeListClip(v); setHasClip(true); } };
  const copyOne = (i: number) => { writeListClip([items[i]]); setHasClip(true); };
  const pasteAfter = (i: number) => {
    const clip = readListClip(); if (!clip.length) return;
    const next = [...items.slice(0, i + 1), ...clip, ...items.slice(i + 1)];
    commit(next);
  };
  const duplicateOne = (i: number) => commit([...items.slice(0, i + 1), items[i], ...items.slice(i + 1)]);
  const duplicateSelected = () => {
    const sel = new Set(selected);
    const next: string[] = [];
    items.forEach((it, i) => { next.push(it); if (sel.has(i)) next.push(it); });
    commit(next);
  };
  const deleteSelected = () => commit(items.filter((_, i) => !selected.has(i)));
  const substituteSelected = () => {
    const clip = readListClip(); if (!clip.length) return;
    const sel = selectedIdx(); if (!sel.length) return;
    const first = sel[0];
    const kept = items.filter((_, i) => !selected.has(i));
    // reposiciona a inserção considerando quantos itens antes de `first` sobraram
    const before = items.slice(0, first).filter((_, i) => !selected.has(i)).length;
    commit([...kept.slice(0, before), ...clip, ...kept.slice(before)]);
  };
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = items.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m);
    commit(next);
  };

  return (
    <div ref={wrapRef} className={styles.listEditor}>
      {advanced && selected.size > 0 && (
        <div className={styles.selectionBar} style={{ marginBottom: 8 }}>
          <span className={styles.selectionCount}>{selected.size} selecionado{selected.size === 1 ? "" : "s"}</span>
          <button type="button" className={styles.btn} onClick={copySelected} title="Copiar os itens marcados (para colar aqui ou em outra proposta/janela).">⧉ Copiar</button>
          <button type="button" className={styles.btn} onClick={substituteSelected} disabled={!hasClip} title="Substituir os itens marcados pelos copiados.">⇄ Substituir</button>
          <button type="button" className={styles.btn} onClick={duplicateSelected} title="Duplicar os itens marcados.">⧉ Duplicar</button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={deleteSelected} title="Excluir os itens marcados.">🗑 Excluir</button>
          <button type="button" className={styles.btn} onClick={clearSel} style={{ marginLeft: "auto" }}>Limpar</button>
        </div>
      )}
      {advanced && items.length > 0 && (
        <label className={styles.label} style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
          <input
            type="checkbox"
            className={styles.selectCheckbox}
            ref={(el) => { if (el) el.indeterminate = selState === "some"; }}
            checked={selState === "all"}
            onChange={toggleAll}
          />
          Selecionar todos
        </label>
      )}
      {items.map((item, i) => (
        <div
          key={i}
          className={`${styles.listRow} ${advanced && selected.has(i) ? styles.blockCardSelected : ""}`}
          onDragOver={advanced ? (e) => e.preventDefault() : undefined}
          onDrop={advanced ? (e) => { e.preventDefault(); if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); } : undefined}
        >
          {advanced && (
            <>
              <input type="checkbox" className={styles.selectCheckbox} checked={selected.has(i)} onChange={() => toggleSel(i)} aria-label="Selecionar" />
              <span className={styles.dragHandle} draggable onDragStart={() => setDragIdx(i)} onDragEnd={() => setDragIdx(null)} title="Arraste para reordenar">⠿</span>
            </>
          )}
          <input
            className={`${styles.input} listInput`}
            style={advanced ? { flex: 1 } : undefined}
            value={item}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addAt(i); }
            }}
          />
          {advanced && (
            <>
              <button type="button" className={styles.iconBtn} onClick={() => copyOne(i)} title="Copiar este item">⧉</button>
              <button type="button" className={styles.iconBtn} onClick={() => pasteAfter(i)} disabled={!hasClip} title="Colar o copiado logo abaixo">📋</button>
              <button type="button" className={styles.iconBtn} onClick={() => duplicateOne(i)} title="Duplicar este item">⎘</button>
            </>
          )}
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

import { useState } from "react";
import type { InvestmentBlock } from "../components/proposal/types";
import type { LibraryBlock } from "./api";
import styles from "./Admin.module.css";

// Modal da BIBLIOTECA DE BLOCOS (D1):
//  • salvar o bloco atual (quando aberto pelo botão "☆" de um bloco);
//  • clicar num bloco salvo para inseri-lo na proposta (como um novo bloco);
//  • renomear (✎) / excluir (✕).
function summary(b: InvestmentBlock): string {
  const normais = (b.lines ?? []).filter((l) => !l.brinde).length;
  const brindes = (b.lines ?? []).filter((l) => l.brinde).length;
  const parts = [`${normais} ${normais === 1 ? "item" : "itens"}`];
  if (brindes) parts.push(`${brindes} brinde${brindes === 1 ? "" : "s"}`);
  if (b.subtotal) parts.push(b.subtotal);
  return parts.join(" · ");
}

export default function BlockLibraryPicker({
  items,
  onInsert,
  onSaveNew,
  onRename,
  onDelete,
  onClose,
  pendingSave,
}: {
  items: LibraryBlock[];
  onInsert: (block: InvestmentBlock) => void;
  onSaveNew: (label: string, block: InvestmentBlock) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  /** bloco oferecido para salvar (quando aberto pelo botão ☆ do bloco) */
  pendingSave?: InvestmentBlock | null;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [pendName, setPendName] = useState((pendingSave?.title || "").slice(0, 60));
  const [pendDone, setPendDone] = useState(false);

  const savePending = () => {
    if (!pendingSave || !pendName.trim()) return;
    onSaveNew(pendName.trim(), pendingSave);
    setPendDone(true);
  };
  const startEdit = (it: LibraryBlock) => { setEditId(it.id); setEditLabel(it.label); };
  const commitEdit = () => { if (editId && editLabel.trim()) onRename(editId, editLabel.trim()); setEditId(null); };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "88vh", overflow: "auto", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div className={styles.cardTitle} style={{ margin: 0 }}>Biblioteca de blocos</div>
          <button type="button" className={styles.btn} onClick={onClose}>Fechar</button>
        </div>

        {/* Salvar o bloco atual */}
        {pendingSave && !pendDone && (
          <div style={{ border: "1px solid var(--color-accent)", borderRadius: 8, padding: 12, margin: "10px 0 14px", background: "var(--color-surface-2)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 6 }}>Salvar este bloco na biblioteca</div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              {pendingSave.title || "Bloco"} — {summary(pendingSave)}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className={styles.input} value={pendName} onChange={(e) => setPendName(e.target.value)} placeholder="Nome para reencontrar depois (ex.: Detalhamento completo)"
                onKeyDown={(e) => { if (e.key === "Enter") savePending(); }} />
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={savePending} disabled={!pendName.trim()} style={{ flexShrink: 0 }}>Salvar</button>
            </div>
          </div>
        )}
        {pendingSave && pendDone && (
          <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "10px 0 14px" }}>✓ Bloco salvo na biblioteca.</div>
        )}

        <p className={styles.pageHint} style={{ marginTop: pendingSave ? 0 : 10, marginBottom: 10 }}>
          Clique num bloco para inseri-lo na proposta (como um novo bloco). Renomeie (✎) ou exclua (✕).
        </p>

        {items.length === 0 ? (
          <p className={styles.pageHint} style={{ margin: 0 }}>
            Nenhum bloco salvo ainda. Use <strong>☆ Salvar na biblioteca</strong> num bloco.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: "1px solid var(--color-border)", borderRadius: 8 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: editId !== it.id ? "pointer" : "default" }}
                  onClick={() => { if (editId !== it.id) onInsert(it.block); }}
                  title={editId !== it.id ? "Inserir este bloco na proposta" : undefined}>
                  {editId === it.id ? (
                    <input className={styles.input} autoFocus value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                      onBlur={commitEdit} />
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)", marginBottom: 3 }}>{it.label}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                        {it.block.title ? `${it.block.title} · ` : ""}{summary(it.block)}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onInsert(it.block)}>Inserir</button>
                  <button type="button" className={styles.btn} title="Renomear" onClick={() => (editId === it.id ? commitEdit() : startEdit(it))}>✎</button>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} style={{ minWidth: delId === it.id ? 96 : undefined }}
                    title="Excluir" onClick={() => { if (delId === it.id) { onDelete(it.id); setDelId(null); } else setDelId(it.id); }}
                    onBlur={() => setDelId((d) => (d === it.id ? null : d))}>
                    {delId === it.id ? "Confirmar?" : "✕"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

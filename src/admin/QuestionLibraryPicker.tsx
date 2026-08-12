import { useState } from "react";
import type { BriefingQuestion } from "../components/briefing/types";
import type { LibraryQuestion } from "./api";
import styles from "./Admin.module.css";

// Modal para escolher uma pergunta salva na biblioteca (D1) e inserir na seção.
// Também permite renomear e excluir itens.
const TYPE_LABEL: Record<string, string> = {
  text: "Texto curto", longtext: "Texto longo", radio: "Escolha única",
  checklist: "Lista selecionável", select: "Seleção", maquete: "Maquete",
};

function preview(q: BriefingQuestion): string {
  const parts = [TYPE_LABEL[q.type ?? "longtext"] ?? "Texto longo"];
  if (q.options?.length) parts.push(`${q.options.length} opções`);
  const extras = (q.quickFills ?? []).length;
  if (extras) parts.push(`${extras} botão(ões)`);
  return parts.join(" · ");
}

export default function QuestionLibraryPicker({
  items,
  onInsert,
  onRename,
  onDelete,
  onClose,
}: {
  items: LibraryQuestion[];
  onInsert: (q: BriefingQuestion) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [delId, setDelId] = useState<string | null>(null); // 2 cliques p/ excluir
  const startEdit = (it: LibraryQuestion) => { setEditId(it.id); setEditLabel(it.label); };
  const commitEdit = () => {
    if (editId && editLabel.trim()) onRename(editId, editLabel.trim());
    setEditId(null);
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.5)",
        display: "grid", placeItems: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto",
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 14, padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className={styles.cardTitle} style={{ margin: 0 }}>Biblioteca de perguntas</div>
          <button type="button" className={styles.btn} onClick={onClose}>Fechar</button>
        </div>

        {items.length === 0 ? (
          <p className={styles.pageHint} style={{ margin: 0 }}>
            Nenhuma pergunta salva ainda. Em qualquer pergunta, use <strong>☆ Biblioteca</strong> para salvar e reutilizar aqui.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                border: "1px solid var(--color-border)", borderRadius: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === it.id ? (
                    <input className={styles.input} autoFocus value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                      onBlur={commitEdit} />
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {it.question.text ? `“${it.question.text}” · ` : ""}{preview(it.question)}
                      </div>
                    </>
                  )}
                </div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onInsert(it.question)}>Inserir</button>
                <button type="button" className={styles.btn} title="Renomear" onClick={() => (editId === it.id ? commitEdit() : startEdit(it))}>✎</button>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} style={{ minWidth: delId === it.id ? 96 : undefined }}
                  title="Excluir" onClick={() => { if (delId === it.id) { onDelete(it.id); setDelId(null); } else setDelId(it.id); }}
                  onBlur={() => setDelId((d) => (d === it.id ? null : d))}>
                  {delId === it.id ? "Confirmar?" : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

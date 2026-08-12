import { useState } from "react";
import type { BriefingQuestion } from "../components/briefing/types";
import type { LibraryQuestion } from "./api";
import styles from "./Admin.module.css";

// Modal da biblioteca de perguntas (D1). Clicar numa pergunta a insere no
// destino (a seção que abriu, ou o fim do briefing pelo botão do cabeçalho).
// Também dá para renomear (✎) e excluir (✕).
const TYPE_LABEL: Record<string, string> = {
  text: "Texto curto", longtext: "Texto longo", radio: "Escolha única",
  checklist: "Lista selecionável", select: "Seleção", maquete: "Maquete",
};

function meta(q: BriefingQuestion): string {
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
  destino,
}: {
  items: LibraryQuestion[];
  onInsert: (q: BriefingQuestion) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  /** texto curto do destino da inserção (ex.: "COZINHA" ou "fim do briefing") */
  destino?: string;
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
          width: "100%", maxWidth: 760, maxHeight: "85vh", overflow: "auto",
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div className={styles.cardTitle} style={{ margin: 0 }}>Biblioteca de perguntas</div>
          <button type="button" className={styles.btn} onClick={onClose}>Fechar</button>
        </div>
        <p className={styles.pageHint} style={{ marginTop: 0, marginBottom: 14 }}>
          Clique numa pergunta para inseri-la{destino ? <> em <strong>{destino}</strong></> : " no briefing"}. Renomeie (✎) ou exclua (✕).
        </p>

        {items.length === 0 ? (
          <p className={styles.pageHint} style={{ margin: 0 }}>
            Nenhuma pergunta salva ainda. Em qualquer pergunta, use <strong>☆ Salvar</strong> para guardá-la e reutilizar aqui.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
                border: "1px solid var(--color-border)", borderRadius: 8,
              }}>
                <div
                  style={{ flex: 1, minWidth: 0, cursor: editId !== it.id ? "pointer" : "default" }}
                  onClick={() => { if (editId !== it.id) onInsert(it.question); }}
                  title={editId !== it.id ? "Inserir esta pergunta" : undefined}
                >
                  {editId === it.id ? (
                    <input className={styles.input} autoFocus value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                      onBlur={commitEdit} />
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)", marginBottom: 3 }}>{it.label}</div>
                      {it.question.text && (
                        <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {it.question.text}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3, fontFamily: "var(--font-mono)" }}>{meta(it.question)}</div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onInsert(it.question)}>Inserir</button>
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

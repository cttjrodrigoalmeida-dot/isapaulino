import { useState } from "react";
import type { BriefingQuestion, QuestionType } from "../components/briefing/types";
import type { LibraryQuestion } from "./api";
import ListEditor from "./ListEditor";
import styles from "./Admin.module.css";

// Modal-hub da biblioteca de perguntas (D1):
//  • inserir uma pergunta salva na seção escolhida (clicar na linha ou "Inserir");
//  • salvar a pergunta atual (quando aberto pelo botão "☆ Biblioteca" da pergunta);
//  • criar uma pergunta NOVA do zero ("+ Nova pergunta");
//  • renomear (✎) / excluir (✕).
const TYPE_LABEL: Record<string, string> = {
  text: "Texto curto", longtext: "Texto longo", radio: "Escolha única",
  checklist: "Lista selecionável", select: "Seleção", maquete: "Maquete",
};
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "longtext", label: "Texto longo" },
  { value: "radio", label: "Escolha única (botões)" },
  { value: "checklist", label: "Lista selecionável" },
  { value: "select", label: "Seleção" },
];
const HAS_OPTIONS: QuestionType[] = ["radio", "checklist", "select"];

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
  onSaveNew,
  onRename,
  onDelete,
  onClose,
  sectionOptions,
  defaultTarget,
  pendingSave,
}: {
  items: LibraryQuestion[];
  onInsert: (q: BriefingQuestion, target: number) => void;
  onSaveNew: (label: string, question: BriefingQuestion) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  sectionOptions: string[];
  defaultTarget: number;
  /** pergunta oferecida para salvar (quando aberto pelo botão da pergunta) */
  pendingSave?: BriefingQuestion | null;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [target, setTarget] = useState(defaultTarget);

  // salvar a pergunta atual (pendingSave)
  const [pendName, setPendName] = useState((pendingSave?.text || "").slice(0, 70));
  const [pendDone, setPendDone] = useState(false);
  const savePending = () => {
    if (!pendingSave || !pendName.trim()) return;
    onSaveNew(pendName.trim(), pendingSave);
    setPendDone(true);
  };

  // compor uma pergunta NOVA
  const [composing, setComposing] = useState(false);
  const [cLabel, setCLabel] = useState("");
  const [cText, setCText] = useState("");
  const [cType, setCType] = useState<QuestionType>("longtext");
  const [cOptions, setCOptions] = useState<string[]>([]);
  const [cQuick, setCQuick] = useState<string[]>([]);
  const resetCompose = () => { setComposing(false); setCLabel(""); setCText(""); setCType("longtext"); setCOptions([]); setCQuick([]); };
  const saveNew = () => {
    const label = (cLabel || cText).trim();
    if (!label || !cText.trim()) return;
    const q: BriefingQuestion = { id: "", text: cText.trim(), type: cType };
    if (HAS_OPTIONS.includes(cType) && cOptions.length) q.options = cOptions;
    if (cQuick.length) q.quickFills = cQuick;
    onSaveNew(label, q);
    resetCompose();
  };

  const startEdit = (it: LibraryQuestion) => { setEditId(it.id); setEditLabel(it.label); };
  const commitEdit = () => { if (editId && editLabel.trim()) onRename(editId, editLabel.trim()); setEditId(null); };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 760, maxHeight: "88vh", overflow: "auto", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div className={styles.cardTitle} style={{ margin: 0 }}>Biblioteca de perguntas</div>
          <button type="button" className={styles.btn} onClick={onClose}>Fechar</button>
        </div>

        {/* Salvar a pergunta atual (quando veio do botão da pergunta) */}
        {pendingSave && !pendDone && (
          <div style={{ border: "1px solid var(--color-accent)", borderRadius: 8, padding: 12, margin: "10px 0 14px", background: "var(--color-surface-2)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 6 }}>Salvar esta pergunta na biblioteca</div>
            {pendingSave.text && <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginBottom: 8, whiteSpace: "pre-wrap" }}>{pendingSave.text}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className={styles.input} value={pendName} onChange={(e) => setPendName(e.target.value)} placeholder="Nome para reencontrar depois"
                onKeyDown={(e) => { if (e.key === "Enter") savePending(); }} />
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={savePending} disabled={!pendName.trim()} style={{ flexShrink: 0 }}>Salvar</button>
            </div>
          </div>
        )}
        {pendingSave && pendDone && (
          <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "10px 0 14px" }}>✓ Pergunta salva na biblioteca.</div>
        )}

        <p className={styles.pageHint} style={{ marginTop: pendingSave ? 0 : 10, marginBottom: 10 }}>
          Clique numa pergunta para inseri-la na seção escolhida. Renomeie (✎) ou exclua (✕).
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <label className={styles.label} style={{ margin: 0, whiteSpace: "nowrap" }}>Inserir em:</label>
          <select className={styles.input} value={target} onChange={(e) => setTarget(Number(e.target.value))} style={{ maxWidth: 320 }}>
            {sectionOptions.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          {!composing && (
            <button type="button" className={styles.btn} onClick={() => setComposing(true)}>+ Nova pergunta</button>
          )}
        </div>

        {/* Compor uma pergunta nova do zero */}
        {composing && (
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div className={styles.cardTitle} style={{ margin: "0 0 10px", fontSize: 14 }}>Nova pergunta</div>
            <div className={styles.field}>
              <label className={styles.label}>Nome na biblioteca</label>
              <input className={styles.input} value={cLabel} onChange={(e) => setCLabel(e.target.value)} placeholder="ex.: Observações do ambiente" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Enunciado (a pergunta que o cliente vê)</label>
              <textarea className={styles.textarea} rows={2} value={cText} onChange={(e) => setCText(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tipo de resposta</label>
              <select className={styles.input} value={cType} onChange={(e) => setCType(e.target.value as QuestionType)}>
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {HAS_OPTIONS.includes(cType) && (
              <div className={styles.field}>
                <label className={styles.label}>Opções</label>
                <ListEditor items={cOptions} onChange={setCOptions} placeholder="ex.: Sim" />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Botões de resposta rápida extras (opcional)</label>
              <ListEditor items={cQuick} onChange={setCQuick} placeholder="ex.: IGUAL AO ANTERIOR" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className={styles.btn} onClick={resetCompose}>Cancelar</button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveNew} disabled={!(cLabel || cText).trim() || !cText.trim()}>Salvar na biblioteca</button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className={styles.pageHint} style={{ margin: 0 }}>
            Nenhuma pergunta salva ainda. Use <strong>+ Nova pergunta</strong> acima ou <strong>☆ Biblioteca</strong> numa pergunta.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: "1px solid var(--color-border)", borderRadius: 8 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: editId !== it.id ? "pointer" : "default" }}
                  onClick={() => { if (editId !== it.id) onInsert(it.question, target); }}
                  title={editId !== it.id ? "Inserir esta pergunta" : undefined}>
                  {editId === it.id ? (
                    <input className={styles.input} autoFocus value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                      onBlur={commitEdit} />
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)", marginBottom: 3 }}>{it.label}</div>
                      {it.question.text && (
                        <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{it.question.text}</div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3, fontFamily: "var(--font-mono)" }}>{meta(it.question)}</div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onInsert(it.question, target)}>Inserir</button>
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

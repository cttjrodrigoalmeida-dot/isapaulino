import type { Proposal, ProcessStep } from "../components/proposal/types";
import { DEFAULT_PROCESS_STEPS } from "../components/proposal/proposalDefaults";
import ListEditor from "./ListEditor";
import EditorSection from "./EditorSection";
import styles from "./Admin.module.css";

// Editor da seção "Como funciona" (processo). Materializa os passos padrão
// quando a proposta ainda não os sobrescreve. Numeração (01, 02…) é automática.
export default function ProcessEditor({
  proposal,
  onChange,
  sectionId,
  collapsed,
  onToggle,
}: {
  proposal: Proposal;
  onChange: (next: Proposal) => void;
  sectionId?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const steps: ProcessStep[] = proposal.processSteps ?? structuredClone(DEFAULT_PROCESS_STEPS);
  const show = proposal.show?.process !== false;

  const renumber = (list: ProcessStep[]): ProcessStep[] =>
    list.map((s, i) => ({ ...s, number: String(i + 1).padStart(2, "0") }));

  const apply = (list: ProcessStep[]) => onChange({ ...proposal, processSteps: renumber(list) });

  const setStep = (i: number, patch: Partial<ProcessStep>) =>
    apply(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () =>
    apply([...steps, { number: "", title: "Nova etapa", items: ["Descreva esta etapa…"] }]);
  const removeStep = (i: number) => apply(steps.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const list = steps.slice();
    [list[i], list[j]] = [list[j], list[i]];
    apply(list);
  };

  return (
    <EditorSection id={sectionId} label="Como funciona (processo)" collapsed={collapsed} onToggle={onToggle}>
      <label className={styles.comboToggle} style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => onChange({ ...proposal, show: { ...proposal.show, process: e.target.checked } })}
        />
        <span>Mostrar esta seção na proposta</span>
      </label>

      {steps.map((s, i) => (
        <div key={i} className={styles.blockCard}>
          <div className={styles.blockHead}>
            <span className={styles.blockTag}>Etapa {s.number || String(i + 1).padStart(2, "0")}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={styles.btn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" className={styles.btn} onClick={() => move(i, 1)} disabled={i === steps.length - 1}>↓</button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeStep(i)}>Remover</button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Título</label>
            <input className={styles.input} value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Itens</label>
            <ListEditor items={s.items} onChange={(items) => setStep(i, { items })} placeholder="Item da etapa" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Observação em destaque (opcional)</label>
            <textarea className={styles.textarea} rows={2} value={s.note ?? ""} onChange={(e) => setStep(i, { note: e.target.value })} />
          </div>
        </div>
      ))}

      <button type="button" className={styles.btn} onClick={addStep}>+ adicionar etapa</button>
    </EditorSection>
  );
}

import type { Proposal } from "../components/proposal/types";
import styles from "./Admin.module.css";

// Prazo de entrega + controles de visibilidade das seções fixas.
export default function SectionsEditor({
  proposal,
  onChange,
}: {
  proposal: Proposal;
  onChange: (next: Proposal) => void;
}) {
  const set = <K extends keyof Proposal>(key: K, value: Proposal[K]) =>
    onChange({ ...proposal, [key]: value });
  const setShow = (key: "about" | "process" | "clauses" | "notIncluded", value: boolean) =>
    onChange({ ...proposal, show: { ...proposal.show, [key]: value } });

  const toggle = (
    key: "about" | "process" | "clauses" | "notIncluded",
    label: string
  ) => (
    <label className={styles.comboToggle}>
      <input
        type="checkbox"
        checked={proposal.show?.[key] !== false}
        onChange={(e) => setShow(key, e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Prazo de entrega</div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Prazo de detalhamento</label>
            <input className={styles.input} value={proposal.prazoDetalhamento} onChange={(e) => set("prazoDetalhamento", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Prazo de anteprojeto (opcional)</label>
            <input className={styles.input} value={proposal.prazoAnteprojeto ?? ""} onChange={(e) => set("prazoAnteprojeto", e.target.value)} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Data disponível para iniciar</label>
          <input className={styles.input} value={proposal.availableDate ?? ""} onChange={(e) => set("availableDate", e.target.value)} placeholder="00-00-2026" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Observação do prazo</label>
          <textarea className={styles.textarea} rows={4} value={proposal.prazoNote ?? ""} onChange={(e) => set("prazoNote", e.target.value)} />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Seções visíveis na proposta</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {toggle("about", "Sobre o estúdio")}
          {toggle("process", "Como funciona (processo)")}
          {toggle("clauses", "Condições gerais (cláusulas)")}
          {toggle("notIncluded", "O que não está incluso")}
        </div>
        <p className={styles.pageHint} style={{ marginTop: 12 }}>
          O conteúdo das cláusulas, “não incluso” e “sobre o estúdio” usa o padrão da marca;
          para textos específicos desta proposta, use a aba JSON avançado.
        </p>
      </div>
    </>
  );
}

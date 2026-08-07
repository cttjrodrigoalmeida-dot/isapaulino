import type { Proposal } from "../components/proposal/types";
import { DEFAULT_NOT_INCLUDED } from "../components/proposal/proposalDefaults";
import ListEditor from "./ListEditor";
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
            <label className={styles.label}>{proposal.investmentBlocks?.[0]?.title ? `Prazo — ${proposal.investmentBlocks[0].title}` : "Prazo de detalhamento"}</label>
            <input className={styles.input} value={proposal.prazoDetalhamento} onChange={(e) => set("prazoDetalhamento", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{proposal.investmentBlocks?.[1]?.title ? `Prazo — ${proposal.investmentBlocks[1].title} (opcional)` : "Prazo de anteprojeto (opcional)"}</label>
            <input className={styles.input} value={proposal.prazoAnteprojeto ?? ""} onChange={(e) => set("prazoAnteprojeto", e.target.value)} />
          </div>
        </div>
        <div className={styles.pageHint} style={{ marginTop: -6, marginBottom: 10 }}>
          Os rótulos acima e as legendas no prazo da proposta puxam os <strong>títulos dos blocos do Investimento</strong> (Bloco 1 → detalhamento, Bloco 2 → anteprojeto).
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
          O conteúdo das cláusulas e do “sobre o estúdio” usa o padrão da marca;
          para textos específicos desta proposta, use a aba JSON avançado.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>O que NÃO está incluso</div>
        <p className={styles.pageHint} style={{ marginTop: -4, marginBottom: 12 }}>
          Editável por proposta — o processo é diferente dependendo do projeto. Cada linha é um item da lista.
        </p>
        <ListEditor
          items={proposal.notIncluded ?? DEFAULT_NOT_INCLUDED}
          onChange={(v) => set("notIncluded", v)}
          placeholder="ex.: Plantas Técnicas além das mencionadas na cláusula 02."
        />
      </div>
    </>
  );
}

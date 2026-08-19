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

  // Blocos de prazo adicionais (um por projeto/serviço) — card separado com título + itens.
  type Bloco = { titulo: string; itens: { label: string; value: string }[] };
  const blocos: Bloco[] = proposal.prazoBlocos ?? [];
  const setBlocos = (v: Bloco[]) => set("prazoBlocos", v);
  const addBloco = () => setBlocos([...blocos, { titulo: "", itens: [{ label: "", value: "" }] }]);
  const dupBloco = (i: number) => setBlocos([...blocos.slice(0, i + 1), structuredClone(blocos[i]), ...blocos.slice(i + 1)]);
  const removeBloco = (i: number) => setBlocos(blocos.filter((_, j) => j !== i));
  const setBloco = (i: number, patch: Partial<Bloco>) => setBlocos(blocos.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const addItem = (i: number) => setBloco(i, { itens: [...blocos[i].itens, { label: "", value: "" }] });
  const removeItem = (i: number, k: number) => setBloco(i, { itens: blocos[i].itens.filter((_, j) => j !== k) });
  const setItem = (i: number, k: number, patch: Partial<{ label: string; value: string }>) =>
    setBloco(i, { itens: blocos[i].itens.map((it, j) => (j === k ? { ...it, ...patch } : it)) });
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
        <div className={styles.field}>
          <label className={styles.label}>Nome do projeto no título (opcional)</label>
          <input className={styles.input} value={proposal.prazoTitulo ?? ""} onChange={(e) => set("prazoTitulo", e.target.value)} placeholder="ex.: Projeto Legal — aparece como “Prazo de Entrega: …”" />
        </div>
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
        <div className={styles.cardTitle}>Blocos de prazo adicionais</div>
        <div className={styles.pageHint} style={{ marginBottom: 12 }}>
          Para projetos/serviços com prazos diferentes, adicione um bloco separado — cada um vira um card próprio na proposta, com o título que você quiser (“Prazo de Entrega: …”).
        </div>
        {blocos.map((b, i) => (
          <div key={i} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div className={styles.row2} style={{ alignItems: "end" }}>
              <div className={styles.field} style={{ marginBottom: 6 }}>
                <label className={styles.label}>Título do bloco (nome do projeto)</label>
                <input className={styles.input} value={b.titulo} onChange={(e) => setBloco(i, { titulo: e.target.value })} placeholder="ex.: Modelagem 3D" />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6, justifyContent: "flex-end" }}>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => dupBloco(i)} title="Duplicar bloco">⧉ Duplicar</button>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeBloco(i)}>Excluir</button>
              </div>
            </div>
            {b.itens.map((it, k) => (
              <div key={k} className={styles.row2} style={{ alignItems: "end", marginBottom: 8 }}>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label className={styles.label}>Legenda</label>
                  <input className={styles.input} value={it.label} onChange={(e) => setItem(i, k, { label: e.target.value })} placeholder="ex.: Detalhamento" />
                </div>
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label className={styles.label}>Prazo</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className={styles.input} value={it.value} onChange={(e) => setItem(i, k, { value: e.target.value })} placeholder="ex.: 10 dias úteis" />
                    <button type="button" className={styles.iconBtn} onClick={() => removeItem(i, k)} aria-label="Remover">×</button>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => addItem(i)} style={{ marginTop: 2 }}>+ Adicionar prazo neste bloco</button>
          </div>
        ))}
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={addBloco}>+ Adicionar bloco de prazo</button>
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
          advanced
          items={proposal.notIncluded ?? DEFAULT_NOT_INCLUDED}
          onChange={(v) => set("notIncluded", v)}
          placeholder="ex.: Plantas Técnicas além das mencionadas na cláusula 02."
        />
      </div>
    </>
  );
}

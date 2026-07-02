// Sub-editores estruturados do contrato rico (usados por ContractEditor).
// Cada um recebe uma fatia do ContractDoc + onChange. Reaproveita as classes
// do Admin.module.css e o ListEditor. Qualquer campo não coberto aqui continua
// 100% editável pela aba "JSON avançado".
import type {
  ContractParty,
  ContractClause,
  ClauseBlock,
  InfoCard,
  ContractInstallmentRow,
} from "../components/contract/types";
import ListEditor from "./ListEditor";
import styles from "./Admin.module.css";

// ── Campos primitivos ─────────────────────────────────────────────
export function Txt({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={`${styles.input}${mono ? " " + styles.mono : ""}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Area({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <textarea
        className={styles.textarea}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Lista de textos longos (parágrafos) — cada item é um textarea. */
export function ParagraphList({
  items,
  onChange,
  placeholder,
  rows = 2,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const update = (i: number, v: string) => {
    const next = items.slice();
    next[i] = v;
    onChange(next);
  };
  return (
    <div className={styles.listEditor}>
      {items.map((it, i) => (
        <div key={i} className={styles.listRow}>
          <textarea
            className={styles.textarea}
            rows={rows}
            value={it}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
          />
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Remover"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onChange([...items, ""])}>
        + adicionar
      </button>
    </div>
  );
}

// ── Partes (CONTRATANTE / CONTRATADA) ─────────────────────────────
export function PartyFields({ party, onChange }: { party: ContractParty; onChange: (p: ContractParty) => void }) {
  const set = (k: keyof ContractParty, v: string) => onChange({ ...party, [k]: v });
  return (
    <>
      <div className={styles.row2}>
        <Txt label="Rótulo" value={party.label} onChange={(v) => set("label", v)} />
        <Txt label="Nome" value={party.name} onChange={(v) => set("name", v)} />
      </div>
      <div className={styles.row2}>
        <Txt label="Papel / profissão" value={party.role} onChange={(v) => set("role", v)} />
        <Txt label="Nacionalidade" value={party.nacionalidade} onChange={(v) => set("nacionalidade", v)} />
      </div>
      <div className={styles.row2}>
        <Txt label="Nascimento" value={party.nascimento} onChange={(v) => set("nascimento", v)} />
        <Txt label="CPF / CNPJ" value={party.cpfCnpj} onChange={(v) => set("cpfCnpj", v)} mono />
      </div>
      <div className={styles.row2}>
        <Txt label="Contato" value={party.contato} onChange={(v) => set("contato", v)} />
        <Txt label="E-mail" value={party.email} onChange={(v) => set("email", v)} />
      </div>
      <Txt label="Endereço" value={party.endereco} onChange={(v) => set("endereco", v)} />
    </>
  );
}

// ── Cards de info (Prazo / Arquivos) ──────────────────────────────
export function InfoCardsEditor({
  cards,
  onChange,
  valueLabel,
  labelLabel,
}: {
  cards: InfoCard[];
  onChange: (c: InfoCard[]) => void;
  valueLabel: string;
  labelLabel: string;
}) {
  const set = (i: number, patch: Partial<InfoCard>) => {
    const next = cards.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  return (
    <div className={styles.lineList}>
      {cards.map((c, i) => (
        <div key={i} className={styles.blockCard}>
          <div className={styles.blockHead}>
            <span className={styles.blockTag}>#{i + 1}</span>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onChange(cards.filter((_, idx) => idx !== i))}
              aria-label="Remover"
            >
              ×
            </button>
          </div>
          <div className={styles.row2}>
            <Txt label={valueLabel} value={c.value} onChange={(v) => set(i, { value: v })} />
            <Txt label={labelLabel} value={c.label} onChange={(v) => set(i, { label: v })} />
          </div>
          <Txt label="Sub (opcional)" value={c.sub ?? ""} onChange={(v) => set(i, { sub: v || undefined })} />
        </div>
      ))}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={() => onChange([...cards, { label: "", value: "" }])}
      >
        + adicionar card
      </button>
    </div>
  );
}

// ── Parcelas (Seção 06 · variante pagamento) ──────────────────────
export function ParcelasEditor({
  parcelas,
  onChange,
}: {
  parcelas: ContractInstallmentRow[];
  onChange: (p: ContractInstallmentRow[]) => void;
}) {
  const set = (i: number, patch: Partial<ContractInstallmentRow>) => {
    const next = parcelas.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () =>
    onChange([
      ...parcelas,
      {
        number: String(parcelas.length + 1).padStart(2, "0"),
        label: "",
        valor: "",
        valorExtenso: "",
        vencimento: "",
      },
    ]);
  return (
    <div className={styles.lineList}>
      {parcelas.map((p, i) => (
        <div key={i} className={styles.blockCard}>
          <div className={styles.blockHead}>
            <span className={styles.blockTag}>Parcela {p.number || i + 1}</span>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onChange(parcelas.filter((_, idx) => idx !== i))}
              aria-label="Remover"
            >
              ×
            </button>
          </div>
          <div className={styles.row2}>
            <Txt label="Nº" value={p.number} onChange={(v) => set(i, { number: v })} mono />
            <Txt label="Rótulo" value={p.label} onChange={(v) => set(i, { label: v })} />
          </div>
          <div className={styles.row2}>
            <Txt label="Valor" value={p.valor} onChange={(v) => set(i, { valor: v })} mono />
            <Txt label="Vencimento" value={p.vencimento} onChange={(v) => set(i, { vencimento: v })} />
          </div>
          <Txt label="Valor por extenso (opcional)" value={p.valorExtenso ?? ""} onChange={(v) => set(i, { valorExtenso: v || undefined })} />
        </div>
      ))}
      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={add}>
        + adicionar parcela
      </button>
    </div>
  );
}

// ── Cláusulas jurídicas (01–19) ───────────────────────────────────
export function ClausesEditor({
  clauses,
  onChange,
}: {
  clauses: ContractClause[];
  onChange: (c: ContractClause[]) => void;
}) {
  const setClause = (i: number, patch: Partial<ContractClause>) => {
    const next = clauses.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const setBlock = (ci: number, bi: number, block: ClauseBlock) => {
    const blocks = clauses[ci].blocks.slice();
    blocks[bi] = block;
    setClause(ci, { blocks });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= clauses.length) return;
    const next = clauses.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className={styles.lineList}>
      {clauses.map((cl, ci) => (
        <div key={ci} className={styles.blockCard}>
          <div className={styles.blockHead}>
            <span className={styles.blockTag}>Cláusula {cl.number || ci + 1}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={styles.iconBtn} onClick={() => move(ci, -1)} aria-label="Subir">↑</button>
              <button type="button" className={styles.iconBtn} onClick={() => move(ci, 1)} aria-label="Descer">↓</button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onChange(clauses.filter((_, idx) => idx !== ci))}
                aria-label="Remover"
              >
                ×
              </button>
            </div>
          </div>
          <div className={styles.row2}>
            <Txt label="Número" value={cl.number} onChange={(v) => setClause(ci, { number: v })} mono />
            <Txt label="Rótulo (eyebrow)" value={cl.eyebrow ?? ""} onChange={(v) => setClause(ci, { eyebrow: v || undefined })} />
          </div>
          <Txt label="Título" value={cl.title} onChange={(v) => setClause(ci, { title: v })} />

          {cl.blocks.map((b, bi) => (
            <div key={bi} className={styles.blockCard} style={{ marginTop: 8 }}>
              <div className={styles.blockHead}>
                <span className={styles.blockTag}>{b.type === "p" ? "Parágrafo" : "Lista"}</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setClause(ci, { blocks: cl.blocks.filter((_, idx) => idx !== bi) })}
                  aria-label="Remover bloco"
                >
                  ×
                </button>
              </div>
              {b.type === "p" ? (
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={b.text}
                  onChange={(e) => setBlock(ci, bi, { type: "p", text: e.target.value })}
                />
              ) : (
                <ListEditor
                  items={b.items}
                  onChange={(items) => setBlock(ci, bi, { type: "list", items })}
                  placeholder="item da lista"
                />
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => setClause(ci, { blocks: [...cl.blocks, { type: "p", text: "" }] })}
            >
              + parágrafo
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => setClause(ci, { blocks: [...cl.blocks, { type: "list", items: [""] }] })}
            >
              + lista
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={() => onChange([...clauses, { number: "", title: "", blocks: [{ type: "p", text: "" }] }])}
      >
        + adicionar cláusula
      </button>
    </div>
  );
}

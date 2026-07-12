// Sub-editores estruturados do contrato rico (usados por ContractEditor).
// Cada um recebe uma fatia do ContractDoc + onChange. Reaproveita as classes
// do Admin.module.css e o ListEditor. Qualquer campo não coberto aqui continua
// 100% editável pela aba "JSON avançado".
import { useState, type ReactNode } from "react";
import type {
  ContractParty,
  ContractClause,
  ClauseBlock,
  InfoCard,
  ContractInstallmentRow,
  CostTable,
} from "../components/contract/types";
import ListEditor from "./ListEditor";
import CurrencyInput from "./CurrencyInput";
import { formatBRL, valorPorExtenso, parseBRL as parseBRLNum } from "./proposalCalc";
import styles from "./Admin.module.css";

// Accordion leve do admin: cabeçalho clicável (título + ações à direita) e
// corpo colapsável. Usado p/ deixar as cláusulas em botões expansíveis.
function Accordion({
  title,
  right,
  defaultOpen = false,
  children,
}: {
  title: string;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.blockCard}>
      <div
        className={styles.blockHead}
        style={{ cursor: "pointer", alignItems: "center", marginBottom: open ? undefined : 0 }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className={styles.blockTag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ transition: "transform .2s", transform: open ? "rotate(90deg)" : "none", display: "inline-flex" }}>▸</span>
          {title}
        </span>
        {right && (
          <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            {right}
          </div>
        )}
      </div>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

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
  // Ao editar o valor, o "por extenso" é recalculado automaticamente.
  const setValor = (i: number, n: number | null) =>
    n == null ? set(i, { valor: "", valorExtenso: undefined }) : set(i, { valor: formatBRL(n), valorExtenso: valorPorExtenso(n) });
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
            <div className={styles.field}>
              <label className={styles.label}>Valor (R$)</label>
              <CurrencyInput
                value={p.valor ? parseBRLNum(p.valor) : null}
                onChange={(n) => setValor(i, n)}
                className={`${styles.input} ${styles.mono}`}
              />
            </div>
            <Txt label="Vencimento" value={p.vencimento} onChange={(v) => set(i, { vencimento: v })} placeholder="01/08/2026 a 05/08/2026" />
          </div>
          <Txt label="Valor por extenso (automático — editável)" value={p.valorExtenso ?? ""} onChange={(v) => set(i, { valorExtenso: v || undefined })} />
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
      <div className={styles.placeholderHint} style={{ marginBottom: 4 }}>
        Cada cláusula fica em um botão expansível — clique no título para abrir e editar.
      </div>
      {clauses.map((cl, ci) => (
        <Accordion
          key={ci}
          title={`Cláusula ${cl.number || ci + 1}${cl.title ? " · " + cl.title : ""}`}
          right={
            <>
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
            </>
          }
        >
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
        </Accordion>
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

// ── Tabela de custos (Seção 06 · variante tabela-custos) ──────────
// Editor 100% visual: blocos (ex.: "PLANTAS EXECUTIVAS") + linhas
// (serviço · descrição · valor). Didático para a cliente — sem JSON.
export function TabelaCustosEditor({
  tabelas,
  onChange,
}: {
  tabelas: CostTable[];
  onChange: (t: CostTable[]) => void;
}) {
  const setTable = (i: number, patch: Partial<CostTable>) => {
    const next = tabelas.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const setRow = (ti: number, ri: number, patch: Partial<CostTable["linhas"][number]>) => {
    const linhas = tabelas[ti].linhas.slice();
    linhas[ri] = { ...linhas[ri], ...patch };
    setTable(ti, { linhas });
  };
  const moveTable = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tabelas.length) return;
    const next = tabelas.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className={styles.lineList}>
      {tabelas.map((t, ti) => (
        <div key={ti} className={styles.blockCard}>
          <div className={styles.blockHead}>
            <span className={styles.blockTag}>Bloco {ti + 1}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={styles.iconBtn} onClick={() => moveTable(ti, -1)} aria-label="Subir">↑</button>
              <button type="button" className={styles.iconBtn} onClick={() => moveTable(ti, 1)} aria-label="Descer">↓</button>
              <button type="button" className={styles.iconBtn} onClick={() => onChange(tabelas.filter((_, i) => i !== ti))} aria-label="Remover bloco">×</button>
            </div>
          </div>
          <Txt label="Título do bloco" value={t.titulo} onChange={(v) => setTable(ti, { titulo: v })} placeholder="ex.: • PLANTAS EXECUTIVAS" />
          <Txt label="Nota do bloco (opcional)" value={t.nota ?? ""} onChange={(v) => setTable(ti, { nota: v || undefined })} placeholder="ex.: valor mínimo de R$ 510,00…" />

          <label className={styles.label} style={{ marginTop: 4 }}>Linhas (serviço · descrição · valor)</label>
          {t.linhas.map((r, ri) => (
            <div key={ri} className={styles.blockCard} style={{ marginTop: 8 }}>
              <div className={styles.blockHead}>
                <span className={styles.blockTag}>Linha {ri + 1}</span>
                <button type="button" className={styles.iconBtn} onClick={() => setTable(ti, { linhas: t.linhas.filter((_, i) => i !== ri) })} aria-label="Remover linha">×</button>
              </div>
              <Txt label="Serviço" value={r.servico} onChange={(v) => setRow(ti, ri, { servico: v })} placeholder="ex.: Planta Layout" />
              <Area label="Descrição" value={r.descricao ?? ""} onChange={(v) => setRow(ti, ri, { descricao: v || undefined })} rows={2} placeholder="ex.: Representação técnica da disposição dos ambientes." />
              <Txt label="Valor" value={r.valor} onChange={(v) => setRow(ti, ri, { valor: v })} mono placeholder="ex.: R$ 140,00" />
            </div>
          ))}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setTable(ti, { linhas: [...t.linhas, { servico: "", descricao: "", valor: "" }] })}
          >
            + adicionar linha
          </button>
        </div>
      ))}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={() => onChange([...tabelas, { titulo: "", linhas: [{ servico: "", descricao: "", valor: "" }] }])}
      >
        + adicionar bloco / tabela
      </button>
    </div>
  );
}

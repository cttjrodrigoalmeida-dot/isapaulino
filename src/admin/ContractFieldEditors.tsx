// Sub-editores estruturados do contrato rico (usados por ContractEditor).
// Cada um recebe uma fatia do ContractDoc + onChange. Reaproveita as classes
// do Admin.module.css e o ListEditor. Qualquer campo não coberto aqui continua
// 100% editável pela aba "JSON avançado".
import { useEffect, useRef, useState } from "react";
import type {
  ContractParty,
  ContractClause,
  ClauseBlock,
  InfoCard,
  ContractInstallmentRow,
  CostTable,
  CostRow,
  CostFaixa,
} from "../components/contract/types";
import { clauseRole, normalizeClauses, plainNumber } from "../components/contract/clauseNumbering";
import ListEditor from "./ListEditor";
import CurrencyInput from "./CurrencyInput";
import { formatBRL, valorPorExtenso, parseBRL as parseBRLNum } from "./proposalCalc";
import styles from "./Admin.module.css";

// Prefixo de subcláusula ("7.1.", "18.2") no início do parágrafo — removido só
// para EXIBIR o texto no editor (o prefixo é reescrito automaticamente).
const SUB_PREFIX_RE = /^\s*\d+(?:\.\d+)+\.?\s+/;
const stripSub = (t: string) => t.replace(SUB_PREFIX_RE, "");
const CLAUSE_CLIPBOARD_KEY = "ips_clause_clipboard";

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

// ── Cláusulas jurídicas — editor com arrastar-e-soltar + numeração automática ──
// A numeração NUNCA é digitada: é derivada da posição (cláusula) e reescrita nos
// prefixos das subcláusulas (7.1, 7.2…) a cada mudança, via `normalizeClauses`.
export function ClausesEditor({
  clauses,
  onChange,
  kind = "principal",
}: {
  clauses: ContractClause[];
  onChange: (c: ContractClause[]) => void;
  /** principal | aditivo — muda o offset da numeração (Seção 06). */
  kind?: "principal" | "aditivo";
}) {
  // Sempre trabalha/exibe a lista NORMALIZADA (números + prefixos corretos).
  const norm = normalizeClauses(clauses, kind);
  const commit = (next: ContractClause[]) => onChange(normalizeClauses(next, kind));

  // Normaliza uma vez ao abrir (se o salvo estiver "fora do número").
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (JSON.stringify(norm) !== JSON.stringify(clauses)) onChange(norm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [hasClip, setHasClip] = useState(() => {
    try { return !!localStorage.getItem(CLAUSE_CLIPBOARD_KEY); } catch { return false; }
  });
  // Seleção em massa (por índice). Ações estruturais limpam a seleção (os índices mudam).
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const clearSel = () => setSelected(new Set());
  const toggleSel = (i: number) =>
    setSelected((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const setClause = (i: number, patch: Partial<ContractClause>) =>
    commit(norm.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setBlock = (ci: number, bi: number, block: ClauseBlock) =>
    setClause(ci, { blocks: norm[ci].blocks.map((b, idx) => (idx === bi ? block : b)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= norm.length) return;
    const next = norm.slice();
    [next[i], next[j]] = [next[j], next[i]];
    clearSel();
    commit(next);
  };
  const removeClause = (i: number) => { clearSel(); commit(norm.filter((_, idx) => idx !== i)); };
  const duplicateClause = (i: number) => {
    const next = norm.slice();
    next.splice(i + 1, 0, structuredClone(norm[i]));
    clearSel();
    commit(next);
  };
  // Clipboard guarda SEMPRE uma LISTA (1 ou várias) — copiar/colar de seleção.
  const readClauseClip = (): ContractClause[] => {
    try {
      const raw = localStorage.getItem(CLAUSE_CLIPBOARD_KEY);
      if (!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? (v as ContractClause[]) : [v as ContractClause];
    } catch { return []; }
  };
  const writeClauseClip = (items: ContractClause[]) => {
    try { localStorage.setItem(CLAUSE_CLIPBOARD_KEY, JSON.stringify(items)); setHasClip(items.length > 0); } catch { /* ignore */ }
  };
  const copyClause = (i: number) => writeClauseClip([norm[i]]);
  // Copia TODAS as cláusulas marcadas (em ordem).
  const copySelected = () => {
    if (!selected.size) return;
    writeClauseClip(norm.filter((_, i) => selected.has(i)));
  };
  const pasteAfter = (i: number) => {
    const items = readClauseClip();
    if (!items.length) return;
    const next = norm.slice();
    next.splice(i + 1, 0, ...items.map((c) => structuredClone(c)));
    clearSel();
    commit(next);
  };
  // Substitui a cláusula `i` pela(s) copiada(s) — ocupa o lugar dela.
  const replaceClause = (i: number) => {
    const items = readClauseClip();
    if (!items.length) return;
    const next = norm.slice();
    next.splice(i, 1, ...items.map((c) => structuredClone(c)));
    clearSel();
    commit(next);
  };
  const addClause = () => { clearSel(); commit([...norm, { number: "", title: "Nova cláusula", blocks: [{ type: "p", text: "" }] }]); };

  // Ações em massa (sobre as cláusulas marcadas).
  const deleteSelected = () => {
    if (!selected.size) return;
    clearSel();
    commit(norm.filter((_, i) => !selected.has(i)));
  };
  const duplicateSelected = () => {
    if (!selected.size) return;
    const next: ContractClause[] = [];
    norm.forEach((c, i) => { next.push(c); if (selected.has(i)) next.push(structuredClone(c)); });
    clearSel();
    commit(next);
  };

  // Arrastar-e-soltar: reordena cláusulas.
  const onDrop = (to: number) => {
    const from = dragIdx.current;
    dragIdx.current = null;
    setDropIdx(null);
    if (from == null || from === to) return;
    const next = norm.slice();
    const [moved] = next.splice(from, 1);
    next.splice(from < to ? to - 1 : to, 0, moved);
    clearSel();
    commit(next);
  };

  const allOpen = collapsed.size === 0;
  const toggle = (i: number) =>
    setCollapsed((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const paraCountBefore = (blocks: ClauseBlock[], bi: number) =>
    blocks.slice(0, bi).filter((b) => b.type === "p").length;

  return (
    <div className={styles.lineList}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span className={styles.placeholderHint} style={{ margin: 0, flex: 1, minWidth: 180 }}>
          Arraste (⠿) para reordenar. A numeração é 100% automática — cláusulas e subcláusulas (7.1, 7.2…) se ajustam sozinhas.
        </span>
        <button type="button" className={styles.btn} onClick={() => setCollapsed(allOpen ? new Set(norm.map((_, i) => i)) : new Set())}>
          {allOpen ? "▸ Recolher tudo" : "▾ Expandir tudo"}
        </button>
      </div>

      {/* Barra de seleção em massa (aparece quando há cláusulas marcadas). */}
      {selected.size > 0 && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionCount}>{selected.size} selecionada{selected.size === 1 ? "" : "s"}</span>
          <button type="button" className={styles.btn} onClick={copySelected} title="Copiar as cláusulas marcadas — depois use “⤵ Colar” em qualquer cláusula (inclusive em outro contrato).">⧉ Copiar selecionadas</button>
          <button type="button" className={styles.btn} onClick={duplicateSelected} title="Duplicar as cláusulas marcadas">⧉ Duplicar selecionadas</button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={deleteSelected} title="Excluir as cláusulas marcadas">🗑 Excluir selecionadas</button>
          <button type="button" className={styles.btn} onClick={clearSel} style={{ marginLeft: "auto" }}>Limpar seleção</button>
        </div>
      )}

      {norm.map((cl, ci) => {
        const isCollapsed = collapsed.has(ci);
        const isEscopo = clauseRole(cl, kind) === "escopo";
        const base = plainNumber(cl.number);
        const isSel = selected.has(ci);
        return (
          <div
            key={ci}
            className={`${styles.blockCard} ${isSel ? styles.blockCardSelected : ""}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropIdx(ci); }}
            onDrop={(e) => { e.preventDefault(); onDrop(ci); }}
            style={dropIdx === ci ? { boxShadow: "inset 0 3px 0 0 var(--color-accent)" } : undefined}
          >
            <div className={styles.blockHead} style={{ alignItems: "center", marginBottom: isCollapsed ? 0 : 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <input
                  type="checkbox"
                  className={styles.selectCheckbox}
                  checked={isSel}
                  onChange={() => toggleSel(ci)}
                  title="Selecionar esta cláusula (para excluir/duplicar em massa)"
                />
                <span
                  draggable
                  onDragStart={() => { dragIdx.current = ci; }}
                  title="Arraste para reordenar"
                  style={{ cursor: "grab", userSelect: "none", fontSize: 16, lineHeight: 1, color: "var(--color-text-muted)" }}
                >
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => toggle(ci)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", textAlign: "left", minWidth: 0 }}
                >
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", width: 12 }}>{isCollapsed ? "▸" : "▾"}</span>
                  <span className={styles.blockTag} style={{ fontVariantNumeric: "tabular-nums" }}>Cláusula {cl.number}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>· {cl.title || "sem título"}</span>
                </button>
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className={styles.iconBtn} onClick={() => move(ci, -1)} disabled={ci === 0} aria-label="Subir">↑</button>
                <button type="button" className={styles.iconBtn} onClick={() => move(ci, 1)} disabled={ci === norm.length - 1} aria-label="Descer">↓</button>
                <button type="button" className={styles.btn} onClick={() => copyClause(ci)} title="Copiar cláusula">⧉ Copiar</button>
                {hasClip && <button type="button" className={styles.btn} onClick={() => pasteAfter(ci)} title="Colar a cláusula copiada aqui">⤵ Colar</button>}
                {hasClip && <button type="button" className={styles.btn} onClick={() => replaceClause(ci)} title="Substituir ESTA cláusula pela copiada (ocupa o lugar dela).">⇄ Substituir</button>}
                <button type="button" className={styles.btn} onClick={() => duplicateClause(ci)} title="Duplicar cláusula">⧉ Duplicar</button>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeClause(ci)}>Excluir</button>
              </div>
            </div>

            {!isCollapsed && (
              <>
                <div className={styles.row2}>
                  <Txt label="Título" value={cl.title} onChange={(v) => setClause(ci, { title: v })} />
                  <Txt label="Rótulo (aba)" value={cl.eyebrow ?? ""} onChange={(v) => setClause(ci, { eyebrow: v || undefined })} />
                </div>

                {cl.blocks.map((b, bi) => {
                  const subNo = `${base}.${paraCountBefore(cl.blocks, bi) + 1}`;
                  return (
                    <div key={bi} className={styles.blockCard} style={{ marginTop: 8 }}>
                      <div className={styles.blockHead}>
                        <span className={styles.blockTag} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {b.type === "p" ? (isEscopo ? "Subcláusula" : `Subcláusula ${subNo}`) : "Lista"}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className={styles.iconBtn} onClick={() => {
                            if (bi === 0) return;
                            const blocks = cl.blocks.slice(); [blocks[bi - 1], blocks[bi]] = [blocks[bi], blocks[bi - 1]]; setClause(ci, { blocks });
                          }} disabled={bi === 0} aria-label="Subir">↑</button>
                          <button type="button" className={styles.iconBtn} onClick={() => {
                            if (bi === cl.blocks.length - 1) return;
                            const blocks = cl.blocks.slice(); [blocks[bi + 1], blocks[bi]] = [blocks[bi], blocks[bi + 1]]; setClause(ci, { blocks });
                          }} disabled={bi === cl.blocks.length - 1} aria-label="Descer">↓</button>
                          <button type="button" className={styles.iconBtn} onClick={() => setClause(ci, { blocks: cl.blocks.filter((_, idx) => idx !== bi) })} aria-label="Remover">×</button>
                        </div>
                      </div>
                      {b.type === "p" ? (
                        <textarea
                          className={styles.textarea}
                          rows={3}
                          value={isEscopo ? b.text : stripSub(b.text)}
                          placeholder={isEscopo ? "texto da subcláusula" : `${subNo}. …`}
                          onChange={(e) => setBlock(ci, bi, { type: "p", text: e.target.value })}
                        />
                      ) : (
                        <ListEditor items={b.items} onChange={(items) => setBlock(ci, bi, { type: "list", items })} placeholder="item da lista" />
                      )}
                    </div>
                  );
                })}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setClause(ci, { blocks: [...cl.blocks, { type: "p", text: "" }] })}>
                    + subcláusula
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setClause(ci, { blocks: [...cl.blocks, { type: "list", items: [""] }] })}>
                    + lista
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* zona de drop no fim */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDropIdx(norm.length); }}
        onDrop={(e) => { e.preventDefault(); onDrop(norm.length); }}
        style={{ padding: "6px 0", borderTop: dropIdx === norm.length ? "2px dashed var(--color-accent)" : "2px dashed transparent" }}
      >
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={addClause}>+ adicionar cláusula ao final</button>
      </div>
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
  // Faixas de quantidade × valor. Materializa o valor único (legado) numa faixa.
  const rowFaixas = (r: CostRow) =>
    r.faixas && r.faixas.length
      ? r.faixas
      : r.valor
        ? [{ quantidade: "", valor: r.valor, valorExtenso: r.valorExtenso }]
        : [{ quantidade: "", valor: "", valorExtenso: "" }];
  const setFaixa = (ti: number, ri: number, fi: number, patch: Partial<CostFaixa>) => {
    const cur = rowFaixas(tabelas[ti].linhas[ri]).slice();
    cur[fi] = { ...cur[fi], ...patch };
    setRow(ti, ri, { faixas: cur, valor: undefined, valorExtenso: undefined });
  };
  const addFaixa = (ti: number, ri: number) => {
    const cur = [...rowFaixas(tabelas[ti].linhas[ri]), { quantidade: "", valor: "", valorExtenso: "" }];
    setRow(ti, ri, { faixas: cur, valor: undefined, valorExtenso: undefined });
  };
  const removeFaixa = (ti: number, ri: number, fi: number) => {
    const cur = rowFaixas(tabelas[ti].linhas[ri]).filter((_, i) => i !== fi);
    setRow(ti, ri, { faixas: cur, valor: undefined, valorExtenso: undefined });
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

          <label className={styles.label} style={{ marginTop: 4 }}>Serviços (cada um com descrição e faixas de quantidade × valor)</label>
          {t.linhas.map((r, ri) => (
            <div key={ri} className={styles.blockCard} style={{ marginTop: 8 }}>
              <div className={styles.blockHead}>
                <span className={styles.blockTag}>Linha {ri + 1}</span>
                <button type="button" className={styles.iconBtn} onClick={() => setTable(ti, { linhas: t.linhas.filter((_, i) => i !== ri) })} aria-label="Remover linha">×</button>
              </div>
              <Txt label="Serviço" value={r.servico} onChange={(v) => setRow(ti, ri, { servico: v })} placeholder="ex.: Renderização Imagem interna" />
              <Txt label="Legenda (opcional)" value={r.subtitulo ?? ""} onChange={(v) => setRow(ti, ri, { subtitulo: v || undefined })} placeholder="ex.: (ambientes internos)" />
              <Area label="Descrição" value={r.descricao ?? ""} onChange={(v) => setRow(ti, ri, { descricao: v || undefined })} rows={2} placeholder="ex.: Renderização realista a partir do modelo 3D." />
              <label className={styles.label} style={{ marginTop: 4 }}>Faixas (quantidade × valor)</label>
              {rowFaixas(r).map((f, fi) => (
                <div key={fi} className={styles.blockCard} style={{ marginTop: 6 }}>
                  <div className={styles.blockHead}>
                    <span className={styles.blockTag}>Faixa {fi + 1}</span>
                    <button type="button" className={styles.iconBtn} onClick={() => removeFaixa(ti, ri, fi)} aria-label="Remover faixa">×</button>
                  </div>
                  <div className={styles.row2}>
                    <Txt label="Quantidade" value={f.quantidade} onChange={(v) => setFaixa(ti, ri, fi, { quantidade: v })} placeholder="ex.: 1ª a 5ª imagem" />
                    <Txt label="Valor" value={f.valor} onChange={(v) => setFaixa(ti, ri, fi, { valor: v })} mono placeholder="ex.: R$ 140,00" />
                  </div>
                  <Txt label="Valor por extenso (opcional)" value={f.valorExtenso ?? ""} onChange={(v) => setFaixa(ti, ri, fi, { valorExtenso: v || undefined })} placeholder="ex.: (cento e quarenta reais)" />
                </div>
              ))}
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ marginTop: 6 }} onClick={() => addFaixa(ti, ri)}>+ adicionar faixa</button>
            </div>
          ))}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setTable(ti, { linhas: [...t.linhas, { servico: "", descricao: "", faixas: [{ quantidade: "", valor: "", valorExtenso: "" }] }] })}
          >
            + adicionar serviço
          </button>
        </div>
      ))}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={() => onChange([...tabelas, { titulo: "", linhas: [{ servico: "", descricao: "", faixas: [{ quantidade: "", valor: "", valorExtenso: "" }] }] }])}
      >
        + adicionar bloco / tabela
      </button>
    </div>
  );
}

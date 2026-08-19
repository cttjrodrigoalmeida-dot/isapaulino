import type { Proposal, InvestmentBlock, PriceLine } from "../components/proposal/types";
import { parseBRL, formatBRL } from "./proposalCalc";
import styles from "./Admin.module.css";

export default function InvestmentEditor({
  proposal,
  comboEnabled,
  comboPercent,
  onChange,
  onComboChange,
}: {
  proposal: Proposal;
  comboEnabled: boolean;
  comboPercent: number;
  // recebe a proposta com os blocos "crus"; o pai recalcula tudo.
  onChange: (next: Proposal) => void;
  onComboChange: (enabled: boolean, percent: number) => void;
}) {
  const blocks = proposal.investmentBlocks ?? [];

  const apply = (nextBlocks: InvestmentBlock[]) => {
    onChange({ ...proposal, investmentBlocks: nextBlocks });
  };

  const setBlock = (i: number, patch: Partial<InvestmentBlock>) => {
    const next = blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    apply(next);
  };
  const setLine = (bi: number, li: number, patch: Partial<PriceLine>) => {
    const next = blocks.map((b, idx) =>
      idx === bi ? { ...b, lines: b.lines.map((l, j) => (j === li ? { ...l, ...patch } : l)) } : b
    );
    apply(next);
  };
  const addLine = (bi: number) =>
    apply(blocks.map((b, idx) => (idx === bi ? { ...b, lines: [...b.lines, { label: "", value: "R$ 0,00" }] } : b)));
  const addBrinde = (bi: number) =>
    apply(blocks.map((b, idx) => (idx === bi ? { ...b, lines: [...b.lines, { label: "", value: "R$ 0,00", brinde: true }] } : b)));
  const removeLine = (bi: number, li: number) =>
    apply(blocks.map((b, idx) => (idx === bi ? { ...b, lines: b.lines.filter((_, j) => j !== li) } : b)));
  const addBlock = () =>
    apply([
      ...blocks,
      { title: "NOVO BLOCO", subtitle: "", lines: [{ label: "", value: "R$ 0,00" }], subtotal: "R$ 0,00" },
    ]);
  const removeBlock = (bi: number) => apply(blocks.filter((_, idx) => idx !== bi));

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Investimento</div>

      <div className={styles.field}>
        <label className={styles.label}>Texto de introdução</label>
        <input
          className={styles.input}
          value={proposal.investimentoIntro ?? ""}
          onChange={(e) => onChange({ ...proposal, investimentoIntro: e.target.value })}
        />
      </div>

      {blocks.map((b, bi) => (
        <div key={bi} className={styles.blockCard}>
          <div className={styles.blockHead}>
            <span className={styles.blockTag}>Bloco {bi + 1}</span>
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeBlock(bi)}>
              Remover bloco
            </button>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Título</label>
              <input className={styles.input} value={b.title} onChange={(e) => setBlock(bi, { title: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Subtítulo</label>
              <input className={styles.input} value={b.subtitle ?? ""} onChange={(e) => setBlock(bi, { subtitle: e.target.value })} />
            </div>
          </div>

          {/* Itens NORMAIS (entram no subtotal) */}
          <label className={styles.label}>Itens (descrição + valor)</label>
          <div className={styles.lineList}>
            {b.lines.map((l, li) => (l.brinde ? null : (
              <div key={li} className={styles.lineRow}>
                <input
                  className={styles.input}
                  placeholder="Descrição"
                  value={l.label}
                  onChange={(e) => setLine(bi, li, { label: e.target.value })}
                />
                <input
                  className={`${styles.input} ${styles.mono} ${styles.moneyInput}`}
                  placeholder="R$ 0,00"
                  value={l.value}
                  onChange={(e) => setLine(bi, li, { value: e.target.value })}
                  onBlur={(e) => setLine(bi, li, { value: formatBRL(parseBRL(e.target.value)) })}
                />
                <button type="button" className={styles.iconBtn} onClick={() => removeLine(bi, li)} aria-label="Remover item">
                  ×
                </button>
              </div>
            )))}
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => addLine(bi)}>
              + adicionar item
            </button>
          </div>

          {/* BRINDES (cortesia): não entram no subtotal; o "valor" é só o preço
              original que aparece riscado na proposta. */}
          <div className={styles.brindeBox}>
            <label className={styles.label} style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              🎁 Brindes (cortesia) — não entram no subtotal
            </label>
            <div className={styles.lineList}>
              {b.lines.map((l, li) => (l.brinde ? (
                <div key={li} className={styles.lineRow}>
                  <input
                    className={styles.input}
                    placeholder="Descrição do brinde (ex.: Planta Baixa)"
                    value={l.label}
                    onChange={(e) => setLine(bi, li, { label: e.target.value })}
                  />
                  <input
                    className={`${styles.input} ${styles.mono} ${styles.moneyInput}`}
                    placeholder="Valor original"
                    title="Valor original (aparece riscado na proposta). Deixe R$ 0,00 se não quiser mostrar."
                    value={l.value}
                    onChange={(e) => setLine(bi, li, { value: e.target.value })}
                    onBlur={(e) => setLine(bi, li, { value: formatBRL(parseBRL(e.target.value)) })}
                  />
                  <button type="button" className={styles.iconBtn} onClick={() => removeLine(bi, li)} aria-label="Remover brinde">
                    ×
                  </button>
                </div>
              ) : null))}
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => addBrinde(bi)}>
                + adicionar brinde
              </button>
            </div>
          </div>

          <div className={styles.subtotalRow}>
            <span className={styles.label} style={{ margin: 0 }}>Subtotal · itens normais (automático)</span>
            <span className={`${styles.mono} ${styles.subtotalValue}`}>{b.subtotal}</span>
          </div>

          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.label}>Observação de desconto/parcelamento (opcional)</label>
            <input className={styles.input} value={b.discountNote ?? ""} onChange={(e) => setBlock(bi, { discountNote: e.target.value })} />
          </div>
        </div>
      ))}

      <button type="button" className={styles.btn} onClick={addBlock} style={{ marginTop: 6 }}>
        + adicionar bloco
      </button>

      {/* Combo / Total */}
      <div className={styles.totalBox}>
        {blocks.length >= 2 && (
          <>
            <label className={styles.comboToggle}>
              <input
                type="checkbox"
                checked={comboEnabled}
                onChange={(e) => onComboChange(e.target.checked, comboPercent)}
              />
              <span>Aplicar desconto combinado (fechar todos os blocos juntos)</span>
              <input
                type="number"
                min={0}
                max={100}
                className={`${styles.input} ${styles.percentInput}`}
                value={comboPercent}
                disabled={!comboEnabled}
                onChange={(e) =>
                  onComboChange(comboEnabled, Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
              />
              <span>%</span>
            </label>
            <p className={styles.comboHint}>
              {comboEnabled
                ? "O selo de desconto combinado aparece na proposta e o total já vem com o desconto."
                : "Desmarcado: sem selo de combo na proposta — o total é a soma simples dos blocos."}
            </p>
          </>
        )}
        <div className={styles.totalRow}>
          <span className={styles.label} style={{ margin: 0 }}>Investimento total (automático)</span>
          <span className={`${styles.mono} ${styles.totalValue}`}>{proposal.total}</span>
        </div>
        <div className={styles.extenso}>{proposal.totalExtenso}</div>
      </div>
    </div>
  );
}

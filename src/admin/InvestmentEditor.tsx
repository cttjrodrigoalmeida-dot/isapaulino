import { useEffect, useState } from "react";
import type { Proposal, InvestmentBlock, PriceLine } from "../components/proposal/types";
import { parseBRL, formatBRL } from "./proposalCalc";
import styles from "./Admin.module.css";

// Área de transferência de BLOCO no localStorage — compartilhada entre as abas/
// janelas de propostas (mesma origem), para copiar um bloco de uma proposta e
// colar em outra sem preencher item por item.
const BLOCK_CLIP = "ips_block_clip";
function readBlockClip(): InvestmentBlock | null {
  try {
    const raw = window.localStorage.getItem(BLOCK_CLIP);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v === "object" && Array.isArray(v.lines) ? (v as InvestmentBlock) : null;
  } catch {
    return null;
  }
}
function writeBlockClip(b: InvestmentBlock) {
  try {
    window.localStorage.setItem(BLOCK_CLIP, JSON.stringify(b));
  } catch { /* quota/indisponível — ignora */ }
}

// Área de transferência de ITENS (linhas) — array de PriceLine, também
// compartilhada entre janelas. Permite copiar 1 ou vários itens e colar noutra.
const ITEM_CLIP = "ips_item_clip";
function readItemClip(): PriceLine[] {
  try {
    const raw = window.localStorage.getItem(ITEM_CLIP);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : v && typeof v === "object" ? [v] : [];
  } catch {
    return [];
  }
}
function writeItemClip(items: PriceLine[]) {
  try {
    window.localStorage.setItem(ITEM_CLIP, JSON.stringify(items));
  } catch { /* ignora */ }
}

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

  // "Tem bloco copiado?" — reavalia ao focar a janela e quando outra aba grava
  // (evento storage), para o "Colar/Substituir" ligar mesmo vindo de outra janela.
  const [hasBlockClip, setHasBlockClip] = useState(false);
  const [hasItemClip, setHasItemClip] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  // Seleção de itens (por "bi:li", li = índice absoluto na linha do bloco).
  // É transitória — qualquer operação estrutural limpa a seleção (índices mudam).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    const check = () => { setHasBlockClip(!!readBlockClip()); setHasItemClip(readItemClip().length > 0); };
    check();
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    return () => { window.removeEventListener("focus", check); window.removeEventListener("storage", check); };
  }, []);
  const clearSel = () => setSelected(new Set());

  const apply = (nextBlocks: InvestmentBlock[]) => {
    onChange({ ...proposal, investmentBlocks: nextBlocks });
  };

  const copyBlock = (bi: number) => {
    writeBlockClip(blocks[bi]);
    setHasBlockClip(true);
    setCopiedBlock(bi);
    window.setTimeout(() => setCopiedBlock((c) => (c === bi ? null : c)), 1600);
  };
  const pasteBlock = () => {
    const b = readBlockClip();
    if (b) { clearSel(); apply([...blocks, structuredClone(b)]); }
  };
  const substituteBlock = (bi: number) => {
    const b = readBlockClip();
    if (b) { clearSel(); apply(blocks.map((x, idx) => (idx === bi ? structuredClone(b) : x))); }
  };
  const duplicateBlock = (bi: number) => {
    clearSel();
    apply([...blocks.slice(0, bi + 1), structuredClone(blocks[bi]), ...blocks.slice(bi + 1)]);
  };

  // ── Seleção / ações de ITENS (linhas normais) ──
  const key = (bi: number, li: number) => `${bi}:${li}`;
  const toggleSel = (bi: number, li: number) =>
    setSelected((prev) => { const n = new Set(prev); const k = key(bi, li); n.has(k) ? n.delete(k) : n.add(k); return n; });
  // Índices (absolutos) das linhas NORMAIS de um bloco.
  const normalIdx = (bi: number) => blocks[bi].lines.map((l, li) => ({ l, li })).filter((x) => !x.l.brinde).map((x) => x.li);
  const blockSelState = (bi: number): "all" | "some" | "none" => {
    const idx = normalIdx(bi); if (!idx.length) return "none";
    const sel = idx.filter((li) => selected.has(key(bi, li))).length;
    return sel === 0 ? "none" : sel === idx.length ? "all" : "some";
  };
  const toggleBlockSel = (bi: number) =>
    setSelected((prev) => {
      const n = new Set(prev); const idx = normalIdx(bi);
      const allSel = idx.every((li) => n.has(key(bi, li)));
      idx.forEach((li) => (allSel ? n.delete(key(bi, li)) : n.add(key(bi, li))));
      return n;
    });
  // Itens selecionados, agrupados por bloco (em ordem).
  const selByBlock = (): Map<number, number[]> => {
    const map = new Map<number, number[]>();
    [...selected].map((k) => k.split(":").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .forEach(([bi, li]) => { const arr = map.get(bi) ?? []; arr.push(li); map.set(bi, arr); });
    return map;
  };
  const copyItem = (bi: number, li: number) => { writeItemClip([blocks[bi].lines[li]]); setHasItemClip(true); };
  const copySelected = () => {
    const lines: PriceLine[] = [];
    selByBlock().forEach((lis, bi) => lis.forEach((li) => lines.push(blocks[bi].lines[li])));
    if (lines.length) { writeItemClip(lines); setHasItemClip(true); }
  };
  const pasteAfter = (bi: number, li: number) => {
    const clip = readItemClip(); if (!clip.length) return;
    const next = blocks.map((b, idx) => idx === bi
      ? { ...b, lines: [...b.lines.slice(0, li + 1), ...clip.map((l) => ({ ...l })), ...b.lines.slice(li + 1)] } : b);
    clearSel(); apply(next);
  };
  const duplicateItem = (bi: number, li: number) => {
    const next = blocks.map((b, idx) => idx === bi
      ? { ...b, lines: [...b.lines.slice(0, li + 1), { ...b.lines[li] }, ...b.lines.slice(li + 1)] } : b);
    clearSel(); apply(next);
  };
  const duplicateSelected = () => {
    const map = selByBlock();
    const next = blocks.map((b, bi) => {
      const lis = map.get(bi); if (!lis) return b;
      const lines: PriceLine[] = [];
      b.lines.forEach((l, li) => { lines.push(l); if (lis.includes(li)) lines.push({ ...l }); });
      return { ...b, lines };
    });
    clearSel(); apply(next);
  };
  const deleteSelected = () => {
    const map = selByBlock();
    const next = blocks.map((b, bi) => {
      const lis = map.get(bi); if (!lis) return b;
      return { ...b, lines: b.lines.filter((_, li) => !lis.includes(li)) };
    });
    clearSel(); apply(next);
  };
  const substituteSelected = () => {
    const clip = readItemClip(); if (!clip.length) return;
    const map = selByBlock();
    const next = blocks.map((b, bi) => {
      const lis = map.get(bi); if (!lis) return b;
      const first = Math.min(...lis);
      const kept = b.lines.filter((_, li) => !lis.includes(li));
      return { ...b, lines: [...kept.slice(0, first), ...clip.map((l) => ({ ...l })), ...kept.slice(first)] };
    });
    clearSel(); apply(next);
  };
  // Reordena por arrastar dentro do bloco (índices absolutos).
  const reorderLine = (bi: number, from: number, to: number) => {
    if (from === to) return;
    const next = blocks.map((b, idx) => {
      if (idx !== bi) return b;
      const lines = b.lines.slice(); const [m] = lines.splice(from, 1); lines.splice(to, 0, m);
      return { ...b, lines };
    });
    clearSel(); apply(next);
  };
  const [dragItem, setDragItem] = useState<{ bi: number; li: number } | null>(null);

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
  const removeLine = (bi: number, li: number) => {
    clearSel();
    apply(blocks.map((b, idx) => (idx === bi ? { ...b, lines: b.lines.filter((_, j) => j !== li) } : b)));
  };
  const addBlock = () =>
    apply([
      ...blocks,
      { title: "NOVO BLOCO", subtitle: "", lines: [{ label: "", value: "R$ 0,00" }], subtotal: "R$ 0,00" },
    ]);
  const removeBlock = (bi: number) => { clearSel(); apply(blocks.filter((_, idx) => idx !== bi)); };

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Investimento</div>
      {/* Barra de seleção de itens — some quando nada está marcado. */}
      {selected.size > 0 && (
        <div className={styles.selectionBar} style={{ position: "sticky", top: 176, zIndex: 7, marginBottom: 12 }}>
          <span className={styles.selectionCount}>{selected.size} item{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}</span>
          <button type="button" className={styles.btn} onClick={copySelected} title="Copiar os itens marcados — depois “Colar item” em qualquer bloco/proposta (mesmo em outra janela).">⧉ Copiar</button>
          <button type="button" className={styles.btn} onClick={substituteSelected} disabled={!hasItemClip} title="Substituir os itens marcados pelos itens copiados.">⇄ Substituir</button>
          <button type="button" className={styles.btn} onClick={duplicateSelected} title="Duplicar os itens marcados (cada um logo abaixo dele).">⧉ Duplicar</button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={deleteSelected} title="Excluir os itens marcados.">🗑 Excluir</button>
          <button type="button" className={styles.btn} onClick={clearSel} style={{ marginLeft: "auto" }}>Limpar seleção</button>
        </div>
      )}

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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
              <button type="button" className={styles.btn} onClick={() => copyBlock(bi)} title="Copiar este bloco inteiro — depois use “Colar bloco” em qualquer proposta (inclusive em outra janela).">
                {copiedBlock === bi ? "✓ Copiado" : "⧉ Copiar"}
              </button>
              <button type="button" className={styles.btn} onClick={() => duplicateBlock(bi)} title="Duplicar este bloco aqui mesmo (uma cópia logo abaixo).">
                ⧉ Duplicar
              </button>
              <button type="button" className={styles.btn} onClick={() => substituteBlock(bi)} disabled={!hasBlockClip} title="Substituir este bloco pelo bloco que está copiado.">
                ⇄ Substituir
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeBlock(bi)}>
                Remover
              </button>
            </div>
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

          {/* Itens NORMAIS (entram no subtotal) — com seleção, arrastar e ações */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 2px" }}>
            {normalIdx(bi).length > 0 && (
              <input
                type="checkbox"
                className={styles.selectCheckbox}
                title="Selecionar todos os itens deste bloco"
                ref={(el) => { if (el) el.indeterminate = blockSelState(bi) === "some"; }}
                checked={blockSelState(bi) === "all"}
                onChange={() => toggleBlockSel(bi)}
              />
            )}
            <label className={styles.label} style={{ margin: 0 }}>Itens (descrição + valor)</label>
          </div>
          <div className={styles.lineList}>
            {b.lines.map((l, li) => (l.brinde ? null : (
              <div
                key={li}
                className={`${styles.lineRow} ${selected.has(key(bi, li)) ? styles.blockCardSelected : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragItem && dragItem.bi === bi) reorderLine(bi, dragItem.li, li); setDragItem(null); }}
              >
                <input
                  type="checkbox"
                  className={styles.selectCheckbox}
                  checked={selected.has(key(bi, li))}
                  onChange={() => toggleSel(bi, li)}
                  aria-label="Selecionar item"
                />
                <span
                  className={styles.dragHandle}
                  draggable
                  onDragStart={() => setDragItem({ bi, li })}
                  onDragEnd={() => setDragItem(null)}
                  title="Arraste para reordenar"
                >⠿</span>
                <input
                  className={styles.input}
                  style={{ flex: 1 }}
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
                <button type="button" className={styles.iconBtn} onClick={() => copyItem(bi, li)} title="Copiar este item">⧉</button>
                <button type="button" className={styles.iconBtn} onClick={() => pasteAfter(bi, li)} disabled={!hasItemClip} title="Colar o item copiado logo abaixo">📋</button>
                <button type="button" className={styles.iconBtn} onClick={() => duplicateItem(bi, li)} title="Duplicar este item">⎘</button>
                <button type="button" className={styles.iconBtn} onClick={() => removeLine(bi, li)} aria-label="Remover item">×</button>
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

      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <button type="button" className={styles.btn} onClick={addBlock}>
          + adicionar bloco
        </button>
        <button type="button" className={styles.btn} onClick={pasteBlock} disabled={!hasBlockClip} title="Colar o bloco copiado (de qualquer proposta) como um novo bloco aqui.">
          📋 Colar bloco{hasBlockClip ? " copiado" : ""}
        </button>
      </div>

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

// Recálculo automático das partes financeiras da proposta.
//  - Investimento: subtotal de cada bloco, total, valor por extenso, combo.
//  - Pagamento: card PIX à vista (% sobre o total) e parcelamento (total ÷ n).
import type { Proposal, PriceLine } from "../components/proposal/types";
import { parseBRL, formatBRL, sumBRL, valorPorExtenso } from "./proposalCalc";

function titleCase(s: string): string {
  return s
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\S/g, (m) => m.toLocaleUpperCase("pt-BR"));
}

export function recomputeInvestment(
  p: Proposal,
  comboEnabled: boolean,
  comboPercent: number
): Proposal {
  const blocks = (p.investmentBlocks ?? []).map((b) => ({
    ...b,
    // Brindes (cortesia) não entram no subtotal do bloco.
    subtotal: formatBRL(sumBRL(b.lines.filter((l) => !l.brinde).map((l) => l.value))),
  }));
  const sum = blocks.reduce((acc, b) => acc + parseBRL(b.subtotal), 0);
  const applyCombo = comboEnabled && blocks.length >= 2;
  const total = applyCombo ? sum * (1 - comboPercent / 100) : sum;
  const titles = blocks.map((b) => titleCase(b.title)).join(" e ");
  return {
    ...p,
    investmentBlocks: blocks,
    total: formatBRL(total),
    totalExtenso: valorPorExtenso(total),
    comboNote: applyCombo
      ? `${comboPercent}% de desconto caso fechar ${titles} juntos.`
      : undefined,
  };
}

export function recomputePayment(
  p: Proposal,
  pixDiscount: number,
  maxInstallments: number
): Proposal {
  const base = parseBRL(p.total);
  const payValue = base * (1 - pixDiscount / 100);
  const save = base * (pixDiscount / 100);

  const pixPlan = {
    discountLabel: `${pixDiscount}% OFF`,
    saveAmount: formatBRL(save),
    fromValue: formatBRL(base),
    payValue: formatBRL(payValue),
    footnote: p.pixPlan?.footnote ?? "Pagamento após assinatura do contrato",
  };

  const rows: PriceLine[] = [{ label: "À vista", value: formatBRL(payValue) }];
  for (let n = 2; n <= maxInstallments; n++) {
    rows.push({ label: `${n}x`, value: formatBRL(base / n) });
  }
  const installmentPlan = {
    headline: `Até ${maxInstallments}x sem juros`,
    rows,
    notes: p.installmentPlan?.notes ?? [
      `Pagamento em ${maxInstallments}x sem juros`,
      "Vencimentos definidos previamente",
    ],
  };

  return { ...p, pixPlan, installmentPlan };
}

// ── Leitura das configurações a partir da proposta salva ──
export function readComboFromNote(note?: string): { enabled: boolean; percent: number } {
  if (!note) return { enabled: false, percent: 10 };
  const m = note.match(/(\d+)\s*%/);
  return { enabled: true, percent: m ? parseInt(m[1], 10) : 10 };
}
export function readPixDiscount(label?: string): number {
  const m = label?.match(/(\d+)\s*%/);
  return m ? parseInt(m[1], 10) : 5;
}
export function readMaxInstallments(rows?: PriceLine[]): number {
  // rows = ["À vista", "2x", "3x", ...] → maior n
  const ns = (rows ?? [])
    .map((r) => parseInt(r.label, 10))
    .filter((n) => Number.isFinite(n));
  return ns.length ? Math.max(...ns) : 4;
}

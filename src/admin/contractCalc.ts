// Cálculo automático do pagamento do contrato (Seção 06 · variante "pagamento").
// Espelha a proposta: valor por extenso automático e parcelas geradas a partir
// do valor total ÷ nº de parcelas, com janela de vencimento entre os dias 01–05.
import { formatBRL, valorPorExtenso, parseBRL } from "./proposalCalc";
import type { ContractInstallmentRow } from "../components/contract/types";

// "DD/MM/AAAA" → Date (meio-dia p/ evitar fuso). null se não parsear.
function parseBRDate(s: string): Date | null {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Janela de vencimento "01/MM/AAAA a 05/MM/AAAA" para um deslocamento de meses.
function vencimentoJanela(base: Date, monthOffset: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1, 12, 0, 0);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `01/${mm}/${d.getFullYear()} a 05/${mm}/${d.getFullYear()}`;
}

const ORDINAIS = [
  "PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA",
  "SÉTIMA", "OITAVA", "NONA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA SEGUNDA",
];

/**
 * Gera N parcelas a partir do valor total: valor = total÷N (resto de centavos
 * na última), valor por extenso automático e vencimento em meses consecutivos
 * (dias 01–05), a partir do mês seguinte à data-base (data do contrato ou hoje).
 */
export function buildParcelas(valorTotal: string, n: number, baseDate?: string): ContractInstallmentRow[] {
  const count = Math.max(1, Math.min(24, Math.floor(n) || 1));
  const cents = Math.round(parseBRL(valorTotal) * 100);
  const baseCent = Math.floor(cents / count);
  const base = (baseDate && parseBRDate(baseDate)) || new Date();
  const rows: ContractInstallmentRow[] = [];
  for (let i = 0; i < count; i++) {
    const c = i === count - 1 ? cents - baseCent * (count - 1) : baseCent;
    const valor = c / 100;
    rows.push({
      number: String(i + 1).padStart(2, "0"),
      label: `${ORDINAIS[i] ?? `${i + 1}ª`} PARCELA`,
      valor: formatBRL(valor),
      valorExtenso: valorPorExtenso(valor),
      vencimento: vencimentoJanela(base, i + 1),
    });
  }
  return rows;
}

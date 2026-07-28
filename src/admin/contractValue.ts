// Cálculo do valor total do contrato a partir da Cláusula 6 (Preço/Pagamento),
// independente da variante: soma da TABELA DE CUSTOS ou o valor do PAGAMENTO
// direto (valorTotal → senão soma das parcelas → senão entrada).
// Mantido em sincronia com functions/api/_lib/contractValue.ts (mesma lógica no
// servidor, para preencher o valor da listagem/gráficos sem depender do save).
import type { ContractDoc } from "../components/contract/types";

/** Converte um valor monetário digitado em número. Aceita "R$ 1.500,00",
 *  "150,00", "150.00" e ignora sufixos ("/m²"). Retorna 0 se não houver número. */
export function parseValorBR(s?: string | null): number {
  if (!s) return 0;
  const m = String(s).match(/-?\d[\d.,]*/);
  if (!m) return 0;
  let t = m[0];
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  if (hasComma && hasDot) {
    // padrão BR: ponto = milhar, vírgula = decimal → "1.500,00"
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    t = t.replace(",", "."); // "150,00"
  } else if (hasDot) {
    // só ponto: 1 ponto com até 2 casas depois → decimal ("150.00"); senão milhar
    const parts = t.split(".");
    if (!(parts.length === 2 && parts[1].length <= 2)) t = t.replace(/\./g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** Valor total do contrato (Cláusula 6), ou null quando não há valor informado. */
export function contractValue(doc?: ContractDoc | null): number | null {
  if (!doc) return null;
  if (doc.sixVariant === "tabela-custos") {
    const tabelas = doc.sixTabelaCustos?.tabelas;
    if (!tabelas?.length) return null;
    let sum = 0;
    for (const t of tabelas) for (const l of t.linhas || []) sum += parseValorBR(l.valor);
    return sum > 0 ? sum : null;
  }
  const sp = doc.sixPagamento;
  if (!sp) return null;
  const total = parseValorBR(sp.valorTotal);
  if (total > 0) return total;
  const parc = (sp.parcelas || []).reduce((s, p) => s + parseValorBR(p.valor), 0);
  if (parc > 0) return parc;
  const entrada = sp.entrada ? parseValorBR(sp.entrada.valor) : 0;
  return entrada > 0 ? entrada : null;
}

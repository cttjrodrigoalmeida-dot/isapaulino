// Valor total do contrato a partir da Cláusula 6 (Preço/Pagamento), calculado no
// servidor para preencher a listagem/gráficos mesmo em contratos legados que não
// têm a coluna `value` populada. Espelha src/admin/contractValue.ts.

/** "R$ 1.500,00" | "150,00" | "150.00" → número. 0 se não houver número. */
export function parseValorBR(s?: string | null): number {
  if (!s) return 0;
  const m = String(s).match(/-?\d[\d.,]*/);
  if (!m) return 0;
  let t = m[0];
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  if (hasComma && hasDot) t = t.replace(/\./g, "").replace(",", ".");
  else if (hasComma) t = t.replace(",", ".");
  else if (hasDot) {
    const parts = t.split(".");
    if (!(parts.length === 2 && parts[1].length <= 2)) t = t.replace(/\./g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

interface Linha { valor?: string }
interface Tabela { linhas?: Linha[] }
interface Doc {
  sixVariant?: string;
  sixTabelaCustos?: { tabelas?: Tabela[] };
  sixPagamento?: { valorTotal?: string; parcelas?: { valor?: string }[]; entrada?: { valor?: string } };
}

/** Calcula o valor total a partir do JSON do ContractDoc; null se ausente/vazio. */
export function contractValueFromData(dataJson?: string | null): number | null {
  if (!dataJson) return null;
  let doc: Doc;
  try {
    doc = JSON.parse(dataJson) as Doc;
  } catch {
    return null;
  }
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

// ============================================================
// Numeração automática das cláusulas do contrato.
// O número NUNCA é digitado — é sempre CALCULADO pela posição/estrutura:
//   - Cláusula de topo → "01", "02", … (2 dígitos, padrão do documento).
//   - Subcláusula      → "7.1", "7.2", … (pai + posição).
//   - A Seção 06 (pagamento) ocupa um número logo depois da cláusula "prazo",
//     por isso as de baixo pulam um (ex.: prazo=05 → pagamento=06 → próxima=07).
// O `role` (papel) é o que comanda o layout — resolvido aqui (explícito ou
// inferido do número legado) e "carimbado" ANTES de renumerar, pra sobreviver à
// mudança de número.
// ============================================================
import type { ContractClause, ContractDoc, ClauseRole } from "./types";

const pad2 = (n: number) => String(n).padStart(2, "0");

// Papel da cláusula: usa `role` se definido; senão INFERE do número (contratos
// legados salvos antes do campo `role`). Mantém o layout idêntico.
export function clauseRole(clause: ContractClause, kind: ContractDoc["kind"]): ClauseRole | undefined {
  if (clause.role) return clause.role;
  const n = clause.number;
  if (kind === "aditivo") {
    if (n === "02") return "escopo";
    if (n === "03") return "aditivo-pagamento";
    return undefined;
  }
  switch (n) {
    case "02": return "escopo";
    case "05": return "prazo";
    case "07": return "pagamento";
    case "11": return "arquivos";
    case "12":
    case "15": return "alerta";
    case "17": return "incapacidade";
    case "18": return "validade";
    case "19": return "foro";
    default: return undefined;
  }
}

function numberChildren(children: ContractClause[] | undefined, parentPlain: string): ContractClause[] | undefined {
  if (!children || children.length === 0) return children;
  return children.map((sc, j) => {
    const num = `${parentPlain}.${j + 1}`;
    return { ...sc, number: num, children: numberChildren(sc.children, num) };
  });
}

/** Índice da cláusula "prazo" (depois dela entra a Seção 06). -1 se não houver. */
export function prazoIndex(clauses: ContractClause[], kind: ContractDoc["kind"]): number {
  if (kind === "aditivo") return -1;
  return clauses.findIndex((c) => clauseRole(c, kind) === "prazo");
}

/** Número (derivado) da Seção 06. "06" como fallback se não houver "prazo". */
export function paymentNumber(clauses: ContractClause[], kind: ContractDoc["kind"]): string {
  const p = prazoIndex(clauses, kind);
  return p >= 0 ? pad2(p + 2) : "06";
}

/**
 * Recalcula `number` de TODAS as cláusulas/subcláusulas pela posição e carimba o
 * `role` resolvido (pra não depender mais do número). Retorna uma NOVA lista.
 */
export function renumberClauses(clauses: ContractClause[], kind: ContractDoc["kind"]): ContractClause[] {
  const p = prazoIndex(clauses, kind);
  return clauses.map((c, i) => {
    const role = clauseRole(c, kind);
    const n = i + 1 + (p >= 0 && i > p ? 1 : 0);
    const plain = String(n);
    return { ...c, role, number: pad2(n), children: numberChildren(c.children, plain) };
  });
}

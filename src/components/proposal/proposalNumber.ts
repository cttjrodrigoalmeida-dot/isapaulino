// ============================================================
// Numeração de propostas — esquema AANN
//   "2624" = ano 2026 (26) + nº sequencial da proposta (24)
// O sequencial é por ano; ao virar o ano, reinicia (ex.: 2701).
// Usado pelo CMS para gerar o número da próxima proposta a partir
// do índice de propostas já existentes (sem banco de dados).
// ============================================================

export function yearPrefix(date: Date = new Date()): string {
  return String(date.getFullYear()).slice(-2);
}

/** Monta o número a partir do sequencial (mín. 2 dígitos). Ex.: (24) -> "2624" */
export function buildProposalNumber(seq: number, date: Date = new Date()): string {
  return `${yearPrefix(date)}${String(seq).padStart(2, "0")}`;
}

/** Próximo número com base nos já existentes (maior sequencial do ano + 1). */
export function nextProposalNumber(
  existing: string[],
  date: Date = new Date()
): string {
  const yy = yearPrefix(date);
  const seqs = existing
    .filter((n) => n.startsWith(yy))
    .map((n) => parseInt(n.slice(2), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return buildProposalNumber(next, date);
}

/**
 * Número para uma cópia, no estilo "2624-1" (como o Windows faz "arquivo (1)").
 * Evita colidir com os já existentes e mantém a URL limpa (hífen é seguro em link).
 * Ex.: base "2624" (ou "2624-1") + existentes → "2624-1", "2624-2"…
 */
export function duplicateNumber(base: string, existing: string[]): string {
  const root = (base || "").replace(/-\d+$/, ""); // "2624-1" → "2624"
  const taken = new Set(existing);
  let n = 1;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

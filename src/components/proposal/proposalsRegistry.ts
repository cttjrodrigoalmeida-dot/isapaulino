import type { Proposal } from "./types";
import { SAMPLE_PROPOSAL } from "./sampleProposal";

// Registro de propostas conhecidas, indexável por número.
// Por ora contém apenas a proposta de exemplo. Quando o admin/CMS existir,
// esta lista vira a fonte real (ou um fetch por número). É o ponto único
// usado para LINKAR um briefing a uma proposta (puxar nº, cliente, projeto).
export const PROPOSALS: Proposal[] = [SAMPLE_PROPOSAL];

/** Resolve uma proposta pelo seu número. Retorna undefined se não existir. */
export function getProposalByNumber(number: string): Proposal | undefined {
  return PROPOSALS.find((p) => p.number === number);
}

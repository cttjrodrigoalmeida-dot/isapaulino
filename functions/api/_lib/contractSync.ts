// Sincronizações disparadas por mudança de status do contrato.
import type { Env } from "./types";

/** Contrato ASSINADO → marca a proposta vinculada (pelo nº) como APROVADA.
 *  Idempotente (só atualiza se ainda não estiver 'aprovada'). */
export async function approveProposalForSignedContract(env: Env, contractId: string): Promise<void> {
  const row = await env.DB.prepare("SELECT data FROM contracts WHERE id = ?")
    .bind(contractId)
    .first<{ data: string | null }>();
  if (!row?.data) return;
  let proposalNumber: string | null = null;
  try {
    proposalNumber = (JSON.parse(row.data) as { proposalNumber?: string })?.proposalNumber || null;
  } catch {
    return;
  }
  if (!proposalNumber) return;
  await env.DB.prepare(
    "UPDATE proposals SET outcome = 'aprovada', updated_at = datetime('now') WHERE number = ? AND outcome != 'aprovada'"
  ).bind(proposalNumber).run();
}

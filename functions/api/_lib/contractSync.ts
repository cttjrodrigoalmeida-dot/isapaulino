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

/** Contrato CANCELADO → cancela o briefing e a proposta vinculados (pelo nº). */
export async function cancelLinkedForContract(env: Env, contractId: string): Promise<void> {
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
    "UPDATE briefings SET status = 'cancelled', updated_at = datetime('now') WHERE proposal_number = ? AND status != 'cancelled'"
  ).bind(proposalNumber).run();
  await env.DB.prepare(
    "UPDATE proposals SET status = 'cancelled', updated_at = datetime('now') WHERE number = ? AND status != 'cancelled'"
  ).bind(proposalNumber).run();
}

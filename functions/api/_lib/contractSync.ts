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

/** Cancela TODOS os documentos do projeto (mesma numeração), pelo nº da proposta:
 *  a proposta, os briefings e os contratos (principal + aditivos) vinculados.
 *  O elo é sempre o nº da proposta (proposals.number, briefings.proposal_number,
 *  contracts.data.proposalNumber). Idempotente e não mexe na Lixeira. */
export async function cancelProject(env: Env, proposalNumber: string): Promise<void> {
  const n = (proposalNumber || "").trim();
  if (!n) return;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE proposals SET status = 'cancelled', updated_at = datetime('now') WHERE number = ? AND status != 'cancelled' AND deleted_at IS NULL"
    ).bind(n),
    env.DB.prepare(
      "UPDATE briefings SET status = 'cancelled', updated_at = datetime('now') WHERE proposal_number = ? AND status != 'cancelled' AND deleted_at IS NULL"
    ).bind(n),
    env.DB.prepare(
      "UPDATE contracts SET status = 'cancelled', updated_at = datetime('now') WHERE json_extract(data, '$.proposalNumber') = ? AND status != 'cancelled' AND deleted_at IS NULL"
    ).bind(n),
  ]);
}

/** Nº da proposta vinculada a um contrato (do JSON `data`), ou null. Usa o
 *  `proposalNumber`; se faltar, cai no `contractNumber` como âncora do projeto. */
export async function proposalNumberOfContract(env: Env, contractId: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT data FROM contracts WHERE id = ?")
    .bind(contractId)
    .first<{ data: string | null }>();
  if (!row?.data) return null;
  try {
    const doc = JSON.parse(row.data) as { proposalNumber?: string; contractNumber?: string };
    return (doc.proposalNumber || doc.contractNumber || "").trim() || null;
  } catch {
    return null;
  }
}

/** Contrato CANCELADO → cancela em cascata todos os documentos do projeto. */
export async function cancelLinkedForContract(env: Env, contractId: string): Promise<void> {
  const proposalNumber = await proposalNumberOfContract(env, contractId);
  if (proposalNumber) await cancelProject(env, proposalNumber);
}

// /api/contracts/:id
//   GET    → obtém o contrato (admin), com nome do cliente.
//   PUT    → atualiza (admin). Permite mudar status (signed/cancelled) e demais campos.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { approveProposalForSignedContract } from "../_lib/contractSync";
import { type ContractInput, optContractData } from "./index";

const COLS = `c.id, c.client_id AS clientId, cl.name AS clientName, c.title, c.content, c.data,
  c.value, c.deadline, c.status, c.slug, c.autentique_url AS autentiqueUrl,
  c.autentique_document_id AS autentiqueDocumentId, c.signed_at AS signedAt,
  c.created_at AS createdAt, c.updated_at AS updatedAt, c.published_at AS publishedAt`;

const STATUSES = ["draft", "published", "signed", "cancelled"];

function opt(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const contract = await env.DB.prepare(
      `SELECT ${COLS} FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(id).first();
    if (!contract) return error(404, "Contrato não encontrado.");
    return json({ contract });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<ContractInput>(request);

    const existing = await env.DB.prepare("SELECT status FROM contracts WHERE id = ?")
      .bind(id)
      .first<{ status: string }>();
    if (!existing) return error(404, "Contrato não encontrado.");

    const clientId = (body.client_id ?? "").trim();
    const title = (body.title ?? "").trim();
    if (!clientId) return error(400, "Selecione o cliente do contrato.");
    if (!title) return error(400, "Informe o título do contrato.");

    const status = body.status && STATUSES.includes(body.status) ? body.status : existing.status;
    const value = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null;
    const data = optContractData(body.data);

    await env.DB.prepare(
      `UPDATE contracts
       SET client_id = ?, title = ?, content = ?, data = ?, value = ?, deadline = ?, autentique_url = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(clientId, title, opt(body.content) ?? "", data, value, opt(body.deadline), opt(body.autentique_url), status, id)
      .run();

    // Sincronização de status pelo nº da proposta vinculada:
    //  • contrato CANCELADO → cancela o briefing e a proposta vinculados;
    //  • contrato ASSINADO  → marca a proposta vinculada como APROVADA (outcome).
    const becameCancelled = status === "cancelled" && existing.status !== "cancelled";
    const becameSigned = status === "signed" && existing.status !== "signed";
    if (becameCancelled || becameSigned) {
      // nº da proposta vinculada (do JSON enviado ou do que está salvo).
      let proposalNumber: string | null = null;
      let src = data;
      if (!src) {
        const c = await env.DB.prepare("SELECT data FROM contracts WHERE id = ?").bind(id).first<{ data: string | null }>();
        src = c?.data ?? null;
      }
      if (src) {
        try { proposalNumber = JSON.parse(src)?.proposalNumber || null; } catch { /* ignora */ }
      }
      if (proposalNumber) {
        if (becameCancelled) {
          // Cancela o briefing e a proposta vinculados.
          await env.DB.prepare(
            "UPDATE briefings SET status = 'cancelled', updated_at = datetime('now') WHERE proposal_number = ? AND status != 'cancelled'"
          ).bind(proposalNumber).run();
          await env.DB.prepare(
            "UPDATE proposals SET status = 'cancelled', updated_at = datetime('now') WHERE number = ? AND status != 'cancelled'"
          ).bind(proposalNumber).run();
        } else if (becameSigned) {
          // Contrato assinado → proposta aprovada.
          await approveProposalForSignedContract(env, id);
        }
      }
    }

    return json({ ok: true, id, status });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    // Soft-delete: vai para a lixeira (recuperável).
    const res = await env.DB.prepare(
      "UPDATE contracts SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL"
    ).bind(id).run();
    if (!res.meta.changes) return error(404, "Contrato não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

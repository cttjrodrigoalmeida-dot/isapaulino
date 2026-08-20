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
  c.value, c.deadline, c.status, c.slug, c.access_password AS accessPassword, c.autentique_url AS autentiqueUrl,
  c.autentique_document_id AS autentiqueDocumentId, c.signed_at AS signedAt,
  c.editor_notes AS editorNotes, c.editor_done AS editorDone,
  c.created_at AS createdAt, c.updated_at AS updatedAt, c.published_at AS publishedAt`;

const STATUSES = ["draft", "published", "signed", "cancelled"];

function opt(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function safeParseArr(s: unknown): string[] {
  if (typeof s !== "string" || !s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const contract = await env.DB.prepare(
      `SELECT ${COLS} FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(id).first<Record<string, unknown>>();
    if (!contract) return error(404, "Contrato não encontrado.");
    // O apoio pessoal (notas/checklist) é só do admin — este GET já exige auth.
    contract.editorNotes = contract.editorNotes ?? "";
    contract.editorDone = safeParseArr(contract.editorDone);
    return json({ contract });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<ContractInput & { editorNotes?: string; editorDone?: string[] }>(request);

    const existing = await env.DB.prepare("SELECT status, slug, access_password, editor_notes, editor_done FROM contracts WHERE id = ?")
      .bind(id)
      .first<{ status: string; slug: string | null; access_password: string | null; editor_notes: string | null; editor_done: string | null }>();
    if (!existing) return error(404, "Contrato não encontrado.");

    const clientId = (body.client_id ?? "").trim();
    const title = (body.title ?? "").trim();
    if (!clientId) return error(400, "Selecione o cliente do contrato.");
    if (!title) return error(400, "Informe o título do contrato.");

    const status = body.status && STATUSES.includes(body.status) ? body.status : existing.status;
    const value = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null;
    const data = optContractData(body.data);
    // Apoio pessoal do admin: se veio no corpo, atualiza; senão mantém o atual.
    const editorNotes = "editorNotes" in body ? String(body.editorNotes ?? "") : existing.editor_notes;
    const editorDone = "editorDone" in body ? JSON.stringify(body.editorDone ?? []) : existing.editor_done;

    // Link público (slug) definível no editor: número base + complemento opcional.
    // Só troca quando vem um valor válido no corpo; vazio/ausente mantém o atual.
    const b = body as { slug?: unknown; accessPassword?: unknown };
    let slug = existing.slug;
    if (typeof b.slug === "string") {
      const s = b.slug.trim();
      if (s) {
        if (!/^[A-Za-z0-9_-]+$/.test(s)) return error(400, "Link do contrato inválido: use apenas letras, números, hífen e underscore.");
        if (s !== existing.slug) {
          const clash = await env.DB.prepare("SELECT id FROM contracts WHERE slug = ? AND id != ?").bind(s, id).first<{ id: string }>();
          if (clash) return error(409, `O link "${s}" já está em uso por outro contrato. Escolha outro número/complemento.`);
        }
        slug = s;
      }
    }
    // Senha de acesso: se veio no corpo, atualiza (vazio = remove/torna público); senão mantém.
    const accessPassword = "accessPassword" in b ? opt(b.accessPassword) : existing.access_password;

    await env.DB.prepare(
      `UPDATE contracts
       SET client_id = ?, title = ?, content = ?, data = ?, value = ?, deadline = ?, autentique_url = ?, status = ?, slug = ?, access_password = ?, editor_notes = ?, editor_done = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(clientId, title, opt(body.content) ?? "", data, value, opt(body.deadline), opt(body.autentique_url), status, slug, accessPassword, editorNotes, editorDone, id)
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

// POST /api/contracts/:id/refresh-signature  (admin)
// Reconsulta a Autentique NA HORA (mesma lógica do webhook, sem depender da
// entrega dele): devolve o status por signatário e, se todos assinaram, marca
// o contrato como 'signed'. Também captura o link de assinatura pendente para
// preencher autentique_url quando estiver vazio. Idempotente.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { autentiqueConfigured, getDocument, isFullySigned } from "../../_lib/autentique";
import { createNotification } from "../../_lib/notifications";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    if (!autentiqueConfigured(env)) {
      return error(400, "Integração Autentique não configurada (defina AUTENTIQUE_TOKEN).");
    }
    const contractId = String(params.id);

    const row = await env.DB.prepare(
      `SELECT c.autentique_document_id AS docId, c.status AS status, c.autentique_url AS url,
              c.title AS title, cl.name AS clientName
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(contractId).first<{ docId: string | null; status: string; url: string | null; title: string | null; clientName: string | null }>();
    if (!row) return error(404, "Contrato não encontrado.");
    if (!row.docId) return error(400, "Este contrato ainda não foi enviado para assinatura.");

    const doc = await getDocument(env, row.docId);

    const signers = doc.signatures.map((s) => ({
      name: s.name,
      email: s.email,
      signed: !!s.signed,
      signedAt: s.signed?.created_at ?? null,
      rejected: !!s.rejected,
      link: s.link?.short_link ?? null,
    }));
    const fullySigned = isFullySigned(doc);

    // Link de assinatura de quem ainda não assinou (para o botão "Assinar").
    const pendingLink = signers.find((s) => !s.signed && s.link)?.link ?? signers.find((s) => s.link)?.link ?? "";

    let status = row.status;
    if (fullySigned && row.status !== "signed") {
      const signedAt =
        signers.map((s) => s.signedAt).filter(Boolean).sort().pop() || new Date().toISOString();
      await env.DB.prepare(
        "UPDATE contracts SET status = 'signed', signed_at = ?, autentique_url = COALESCE(NULLIF(?, ''), autentique_url), updated_at = datetime('now') WHERE id = ?"
      ).bind(signedAt, pendingLink, contractId).run();
      await createNotification(env, {
        type: "signature",
        title: "Contrato assinado por todas as partes",
        body: `${row.clientName ?? "Cliente"} — ${row.title ?? "contrato"}`,
        link: "#contratos",
        dedupKey: `signed:${contractId}`,
      });
      status = "signed";
    } else if (!row.url && pendingLink) {
      // Ainda não fechou, mas aproveitamos para preencher o link de assinatura.
      await env.DB.prepare(
        "UPDATE contracts SET autentique_url = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(pendingLink, contractId).run();
    }

    return json({ ok: true, fullySigned, status, signers, autentiqueUrl: row.url || pendingLink || null });
  } catch (e) {
    return toErrorResponse(e);
  }
};

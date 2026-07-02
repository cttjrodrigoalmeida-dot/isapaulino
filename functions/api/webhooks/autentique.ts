// POST /api/webhooks/autentique?secret=...  (público, validado por segredo)
// Recebe eventos da Autentique. Como os nomes de evento variam, a decisão é
// tomada RECONSULTANDO o documento (getDocument): se todas as assinaturas foram
// concluídas, marca o contrato como 'signed' + signed_at. Idempotente.
// Requer AUTENTIQUE_WEBHOOK_SECRET (validação) e AUTENTIQUE_TOKEN (reconsulta).
import type { Env } from "../_lib/types";
import { json, error, toErrorResponse } from "../_lib/http";
import { autentiqueConfigured, getDocument, isFullySigned } from "../_lib/autentique";
import { createNotification } from "../_lib/notifications";

// Procura recursivamente por um id de documento no payload (JSON aninhado ou
// chaves "document[id]" de formulário achatado).
function findDocumentId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  // formato achatado: document[id] / document.id
  for (const k of ["document[id]", "document.id"]) {
    if (typeof obj[k] === "string") return obj[k] as string;
  }
  // formato aninhado: { document: { id } }
  const doc = obj.document;
  if (doc && typeof doc === "object" && typeof (doc as Record<string, unknown>).id === "string") {
    return (doc as Record<string, unknown>).id as string;
  }
  return null;
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // form-urlencoded: achata em pares chave→valor.
    const out: Record<string, unknown> = {};
    for (const [k, v] of new URLSearchParams(text)) out[k] = v;
    return out;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Sem segredo configurado não há webhook válido a aceitar.
    if (!env.AUTENTIQUE_WEBHOOK_SECRET) return error(401, "Webhook não configurado.");
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== env.AUTENTIQUE_WEBHOOK_SECRET) {
      return error(401, "Segredo de webhook inválido.");
    }

    const payload = await parseBody(request);
    const documentId = findDocumentId(payload);
    if (!documentId) return json({ ok: true, ignored: "sem document id" });

    const contract = await env.DB.prepare(
      `SELECT c.id AS id, c.status AS status, c.title AS title, cl.name AS clientName
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE c.autentique_document_id = ?`
    ).bind(documentId).first<{ id: string; status: string; title: string | null; clientName: string | null }>();
    if (!contract) return json({ ok: true, ignored: "documento não vinculado" });

    // Reconsulta o documento para decidir com segurança (não confia no nome do evento).
    if (!autentiqueConfigured(env)) return json({ ok: true, ignored: "sem AUTENTIQUE_TOKEN para reconsultar" });
    const doc = await getDocument(env, documentId);

    if (isFullySigned(doc) && contract.status !== "signed") {
      const signedAt =
        doc.signatures.map((s) => s.signed?.created_at).filter(Boolean).sort().pop() ||
        new Date().toISOString();
      await env.DB.prepare(
        "UPDATE contracts SET status = 'signed', signed_at = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(signedAt, contract.id).run();
      await createNotification(env, {
        type: "signature",
        title: "Contrato assinado por todas as partes",
        body: `${contract.clientName ?? "Cliente"} — ${contract.title ?? "contrato"}`,
        link: "#contratos",
        dedupKey: `signed:${contract.id}`,
      });
      return json({ ok: true, signed: true });
    }

    return json({ ok: true, signed: false });
  } catch (e) {
    return toErrorResponse(e);
  }
};

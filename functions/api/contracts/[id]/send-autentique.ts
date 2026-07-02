// POST /api/contracts/:id/send-autentique  (admin, multipart)
// Envia o contrato para assinatura na Autentique: monta os signatários a partir
// das partes do documento (CONTRATANTE + CONTRATADA) e faz upload do PDF (campo
// `file`). Requer AUTENTIQUE_TOKEN — sem ele retorna 400 amigável (inativo).
// Guarda autentique_document_id e o link de assinatura em autentique_url.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import {
  autentiqueConfigured,
  createSignatureDocument,
  type AutentiqueSigner,
} from "../../_lib/autentique";

interface Row {
  title: string;
  data: string | null;
  clientName: string | null;
  clientEmail: string | null;
}

// Lê { name, email } de uma parte do ContractDoc (defensivo).
function party(data: unknown, key: "contratante" | "contratada"): { name?: string; email?: string } {
  if (data && typeof data === "object") {
    const p = (data as Record<string, unknown>)[key];
    if (p && typeof p === "object") {
      const rec = p as Record<string, unknown>;
      return {
        name: typeof rec.name === "string" ? rec.name : undefined,
        email: typeof rec.email === "string" ? rec.email : undefined,
      };
    }
  }
  return {};
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    if (!autentiqueConfigured(env)) {
      return error(400, "Integração Autentique não configurada. Defina AUTENTIQUE_TOKEN para enviar para assinatura.");
    }
    const contractId = String(params.id);

    const row = await env.DB.prepare(
      `SELECT c.title AS title, c.data AS data, cl.name AS clientName, cl.email AS clientEmail
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(contractId).first<Row>();
    if (!row) return error(404, "Contrato não encontrado.");

    // PDF do contrato (gerado no navegador / futuro render automático).
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return error(400, "Envie o PDF do contrato no campo 'file' para assinatura.");
    }

    // Signatários a partir das partes do documento (fallback: cliente).
    let doc: unknown = null;
    if (row.data) {
      try {
        doc = JSON.parse(row.data);
      } catch {
        /* ignora — usa fallback do cliente */
      }
    }
    const contratante = party(doc, "contratante");
    const contratada = party(doc, "contratada");

    const signers: AutentiqueSigner[] = [];
    const contratanteEmail = contratante.email || row.clientEmail || "";
    if (contratanteEmail) signers.push({ email: contratanteEmail, name: contratante.name || row.clientName || undefined, action: "SIGN" });
    if (contratada.email) signers.push({ email: contratada.email, name: contratada.name, action: "SIGN" });

    if (signers.length === 0) {
      return error(400, "Nenhum e-mail de signatário encontrado. Preencha o e-mail da CONTRATANTE (ou do cliente).");
    }

    const document = await createSignatureDocument(env, {
      name: row.title || `Contrato ${contractId}`,
      signers,
      file,
      fileName: `${(row.title || "contrato").replace(/[^\w.-]+/g, "_")}.pdf`,
    });

    // Link de assinatura do primeiro signatário (CONTRATANTE) para colar/enviar.
    const link = document.signatures.find((s) => s.link?.short_link)?.link?.short_link ?? "";

    await env.DB.prepare(
      `UPDATE contracts
       SET autentique_document_id = ?, autentique_url = COALESCE(NULLIF(?, ''), autentique_url), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(document.id, link, contractId).run();

    return json({ ok: true, documentId: document.id, url: link, signatures: document.signatures });
  } catch (e) {
    return toErrorResponse(e);
  }
};

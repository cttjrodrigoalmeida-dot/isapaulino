// POST /api/contracts/:id/send-autentique  (admin, multipart)
// Envia o contrato para assinatura na Autentique e faz upload do PDF (campo
// `file`). Requer AUTENTIQUE_TOKEN — sem ele retorna 400 amigável (inativo).
// Guarda autentique_document_id e o link de assinatura em autentique_url.
//
// SIGNATÁRIOS ("os dois assinam"): CONTRATANTE (cliente) + CONTRATADA (Isabela).
// A Isabela é a DONA da conta Autentique, então ela aparece tanto como "Criador"
// (registro SEM ação de assinar — que ignoramos, via `action`) quanto como
// SIGNATÁRIA de verdade. Ela assina no painel da Autentique dela; o cliente
// assina pelo link exclusivo. O "Criador" não conta para o status "assinado".
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import {
  autentiqueConfigured,
  createSignatureDocument,
  createSignatureLink,
  type AutentiqueSigner,
} from "../../_lib/autentique";
import { renderContractPdf, browserRenderingAvailable } from "../../_lib/contract-pdf";

interface Row {
  title: string;
  data: string | null;
  slug: string | null;
  status: string;
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
      `SELECT c.title AS title, c.data AS data, c.slug AS slug, c.status AS status, cl.name AS clientName, cl.email AS clientEmail
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(contractId).first<Row>();
    if (!row) return error(404, "Contrato não encontrado.");

    // PDF do contrato: usa o upload (campo 'file') se enviado; senão, gera
    // automaticamente via Browser Rendering a partir da página pública.
    const form = await request.formData().catch(() => null);
    const uploaded = form?.get("file");
    let file: Blob;
    if (uploaded instanceof Blob && uploaded.size > 0) {
      file = uploaded;
    } else if (browserRenderingAvailable(env)) {
      if (!row.slug) return error(400, "Publique o contrato antes de gerar o PDF automaticamente (ou envie o PDF manualmente).");
      const origin = new URL(request.url).origin;
      file = await renderContractPdf(env, origin, row.slug);
    } else {
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

    const contratanteEmail = contratante.email || row.clientEmail || "";
    if (!contratanteEmail) {
      return error(400, "O contrato precisa do e-mail da CONTRATANTE (ou do cliente) para enviar para assinatura.");
    }

    // Os dois assinam: CONTRATANTE (cliente) + CONTRATADA (Isabela) — ver topo.
    const signers: AutentiqueSigner[] = [
      { email: contratanteEmail, name: contratante.name || row.clientName || undefined, action: "SIGN" },
    ];
    if (contratada.email) {
      signers.push({ email: contratada.email, name: contratada.name || undefined, action: "SIGN" });
    }

    const document = await createSignatureDocument(env, {
      name: row.title || `Contrato ${contractId}`,
      signers,
      file,
      fileName: `${(row.title || "contrato").replace(/[^\w.-]+/g, "_")}.pdf`,
    });

    // Link de assinatura do CONTRATANTE (o cliente), para o botão "Assinar" na
    // página do contrato / Área do Cliente. Como o signatário é por E-MAIL, a
    // Autentique NÃO devolve short_link automaticamente — geramos o link
    // exclusivo dele com createLinkToSignature (usando o public_id).
    // IMPORTANTE: a CONTRATADA (Isabela) é a Criadora e NÃO tem ação de assinar
    // ("without_action_in_document"); miramos o e-mail do CONTRATANTE primeiro e,
    // se falhar, tentamos os demais — pulando quem não tiver link.
    const emailLower = contratanteEmail.toLowerCase();
    const ordered = [
      ...document.signatures.filter((s) => emailLower && (s.email || "").toLowerCase() === emailLower),
      ...document.signatures.filter((s) => !emailLower || (s.email || "").toLowerCase() !== emailLower),
    ];
    let link = "";
    for (const s of ordered) {
      if (!s.public_id) continue;
      const l = await createSignatureLink(env, s.public_id);
      if (l) { link = l; break; }
    }
    // Fallback: se algum signatário já veio com short_link (adicionado por nome).
    if (!link) link = ordered.find((s) => s.link?.short_link)?.link?.short_link || "";

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

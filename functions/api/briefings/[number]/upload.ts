// POST /api/briefings/:number/upload  (multipart: campo "file")
//   PÚBLICO, mas só aceita anexo se o briefing está publicado (limita abuso) e
//   NÃO está bloqueado. Usado pelo cliente para enviar imagens/PDFs de referência.
//   Os arquivos vão para o gerenciador de Arquivos (prefixo docs/), numa pasta
//   com o NOME DO CLIENTE (via proposta vinculada) — assim a Isabela controla,
//   edita e exclui por lá. Devolve { url, key }; a URL é servida por /api/files/<key>.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { getSession } from "../../_lib/auth";

const MAX_BYTES = 60 * 1024 * 1024; // 60 MB (permite vídeos curtos de referência)
// Tipos que podem ser servidos inline com segurança (SVG fica de fora — risco de XSS).
// Imagens (miniatura), vídeos e áudios (player inline no briefing).
const INLINE_IMAGES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "oga",
  "audio/wav": "wav",
};

// Nome de pasta seguro (mesma regra do gerenciador de documentos).
function safeFolder(input: unknown): string {
  const s = (typeof input === "string" ? input : "").trim().toLowerCase();
  const clean = s.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return clean;
}
// Extensão a partir do nome original (sanitizada) p/ anexos não-imagem (pdf, dwg, zip…).
function extFromName(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name ?? "");
  return m ? m[1].toLowerCase() : "bin";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);

    // O admin autenticado anexa a qualquer momento (edita as respostas por aqui);
    // o cliente só quando o briefing está publicado e NÃO bloqueado.
    const isAdmin = !!(await getSession(request, env));
    const b = await env.DB.prepare("SELECT status, locked_at, proposal_number FROM briefings WHERE number = ? AND deleted_at IS NULL")
      .bind(number)
      .first<{ status: string; locked_at: string | null; proposal_number: string | null }>();
    if (!b) return error(404, "Briefing não encontrado.");
    if (!isAdmin) {
      if (b.status !== "published") return error(404, "Briefing não encontrado.");
      if (b.locked_at) return error(423, "Briefing bloqueado para edição.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return error(400, "Envie um arquivo no campo 'file'.");
    if (file.size > MAX_BYTES) return error(413, "Arquivo muito grande (máx. 60 MB).");

    // Nome do cliente vem da proposta vinculada → vira a pasta em Arquivos.
    let clientName = "";
    if (b.proposal_number) {
      const p = await env.DB.prepare("SELECT client FROM proposals WHERE number = ?")
        .bind(b.proposal_number)
        .first<{ client: string | null }>();
      clientName = (p?.client ?? "").trim();
    }
    const folder = safeFolder(clientName) || `briefing-${safeFolder(number) || "sem-numero"}`;

    const inlineExt = INLINE_IMAGES[file.type];
    const ext = inlineExt ?? extFromName(file.name);
    const key = `docs/${folder}/${crypto.randomUUID()}.${ext}`;
    const name = (file.name || "anexo").slice(0, 160);

    // Metadados p/ o gerenciador de Arquivos: nome, pasta e badge do cliente.
    // NÃO gravamos clientId — assim o anexo NÃO aparece na Área do Cliente
    // (ele já vê a imagem dentro do próprio briefing); é só controle interno.
    const meta: Record<string, string> = { name, folder, source: "briefing", briefingNumber: number };
    if (clientName) meta.clientName = clientName;

    // Imagens conhecidas: servidas inline (o briefing mostra a miniatura).
    // Demais (PDF etc.): octet-stream + download (evita XSS armazenado).
    const httpMetadata: R2HTTPMetadata = inlineExt
      ? { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }
      : {
          contentType: "application/octet-stream",
          contentDisposition: `attachment; filename="${name.replace(/"/g, "")}"`,
          cacheControl: "public, max-age=31536000, immutable",
        };

    await env.R2.put(key, file.stream(), { httpMetadata, customMetadata: meta });

    return json({ ok: true, url: `/api/files/${key}`, key }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

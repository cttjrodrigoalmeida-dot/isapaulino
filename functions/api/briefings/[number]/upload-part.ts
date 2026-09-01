// /api/briefings/:number/upload-part  — envio de arquivos GRANDES em pedaços.
//
// Por que existe: o limite de corpo de requisição da Cloudflare (100 MB) impede
// mandar uma maquete de centenas de MB num POST só. Aqui o arquivo é cortado no
// navegador e cada pedaço vira uma "parte" de um multipart upload do R2.
//
//   POST ?action=create    { name, size, type }        → { key, uploadId, partSize }
//   POST ?action=part&key=&uploadId=&part=N  (bytes)   → { partNumber, etag }
//   POST ?action=complete  { key, uploadId, parts }    → { url, key }
//   POST ?action=abort     { key, uploadId }           → { ok }
//
// PÚBLICO como o /upload: só aceita se o briefing está publicado e não bloqueado
// (admin logado pode sempre). Os arquivos caem na MESMA pasta do gerenciador de
// Arquivos (docs/<cliente>/), então a Isabela apaga por lá quando o projeto acabar.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { getSession } from "../../_lib/auth";

/** Tamanho de cada pedaço (o R2 exige ≥ 5 MB, menos o último). */
const PART_SIZE = 20 * 1024 * 1024; // 20 MB
/** Cota total por briefing — soma de tudo que o cliente já mandou. */
const QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB
/** Teto por arquivo (mesma cota: não adianta um só arquivo maior que o total). */
const MAX_FILE_BYTES = QUOTA_BYTES;

// Tipos servidos inline com segurança (SVG fora — risco de XSS). Igual ao /upload.
const INLINE_IMAGES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
  "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv",
  "video/quicktime": "mov", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "oga",
  "audio/wav": "wav",
};

function safeFolder(input: unknown): string {
  const s = (typeof input === "string" ? input : "").trim().toLowerCase();
  return s.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
function extFromName(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name ?? "");
  return m ? m[1].toLowerCase() : "bin";
}

/** Valida o acesso ao briefing e devolve a pasta de destino (nome do cliente). */
async function resolveTarget(request: Request, env: Env, number: string) {
  const isAdmin = !!(await getSession(request, env));
  const b = await env.DB.prepare(
    "SELECT status, locked_at, proposal_number FROM briefings WHERE number = ? AND deleted_at IS NULL"
  )
    .bind(number)
    .first<{ status: string; locked_at: string | null; proposal_number: string | null }>();
  if (!b) throw { status: 404, message: "Briefing não encontrado." };
  if (!isAdmin) {
    if (b.status !== "published") throw { status: 404, message: "Briefing não encontrado." };
    if (b.locked_at) throw { status: 423, message: "Briefing bloqueado para edição." };
  }
  let clientName = "";
  if (b.proposal_number) {
    const p = await env.DB.prepare("SELECT client FROM proposals WHERE number = ?")
      .bind(b.proposal_number)
      .first<{ client: string | null }>();
    clientName = (p?.client ?? "").trim();
  }
  const folder = safeFolder(clientName) || `briefing-${safeFolder(number) || "sem-numero"}`;
  return { folder, clientName };
}

/** Quanto este briefing já ocupa no R2 (só o que veio pelo próprio briefing). */
async function usedBytes(env: Env, folder: string, number: string): Promise<number> {
  let total = 0;
  let cursor: string | undefined;
  // Pastas de projeto são pequenas; ainda assim paginamos por segurança.
  for (let page = 0; page < 20; page++) {
    // `include` existe em runtime (traz o customMetadata) mas falta na tipagem.
    const opts = { prefix: `docs/${folder}/`, cursor, limit: 1000, include: ["customMetadata"] } as unknown as R2ListOptions;
    const res = await env.R2.list(opts);
    for (const o of res.objects) {
      if (o.customMetadata?.briefingNumber === number) total += o.size;
    }
    if (!res.truncated) break;
    cursor = res.cursor;
  }
  return total;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number || "");
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";

    if (action === "create") {
      const { folder, clientName } = await resolveTarget(request, env, number);
      const body = await readJson<{ name?: string; size?: number; type?: string }>(request);
      const size = Number(body.size) || 0;
      const name = (body.name || "arquivo").slice(0, 160);
      const type = (body.type || "").trim();
      if (size <= 0) return error(400, "Tamanho do arquivo inválido.");
      if (size > MAX_FILE_BYTES) return error(413, "Arquivo maior que o limite de 1 GB.");
      const used = await usedBytes(env, folder, number);
      if (used + size > QUOTA_BYTES) {
        const restante = Math.max(0, QUOTA_BYTES - used);
        return error(
          413,
          `Espaço insuficiente: este briefing já usa ${(used / 1024 / 1024).toFixed(0)} MB de 1 GB (restam ${(restante / 1024 / 1024).toFixed(0)} MB). Envie pelo WhatsApp/e-mail ou peça para liberar espaço.`
        );
      }

      const inlineExt = INLINE_IMAGES[type];
      const ext = inlineExt ?? extFromName(name);
      const key = `docs/${folder}/${crypto.randomUUID()}.${ext}`;
      const meta: Record<string, string> = { name, folder, source: "briefing", briefingNumber: number };
      if (clientName) meta.clientName = clientName;
      const httpMetadata: R2HTTPMetadata = inlineExt
        ? { contentType: type, cacheControl: "public, max-age=31536000, immutable" }
        : {
            contentType: "application/octet-stream",
            contentDisposition: `attachment; filename="${name.replace(/"/g, "")}"`,
            cacheControl: "public, max-age=31536000, immutable",
          };

      const mpu = await env.R2.createMultipartUpload(key, { httpMetadata, customMetadata: meta });
      return json({ ok: true, key, uploadId: mpu.uploadId, partSize: PART_SIZE }, { status: 201 });
    }

    if (action === "part") {
      const { folder } = await resolveTarget(request, env, number);
      const key = url.searchParams.get("key") || "";
      const uploadId = url.searchParams.get("uploadId") || "";
      const partNumber = Number(url.searchParams.get("part") || 0);
      // A chave TEM de ser da pasta deste briefing (ninguém escreve fora dela).
      if (!key.startsWith(`docs/${folder}/`) || key.includes("..")) return error(400, "Destino inválido.");
      if (!uploadId || !partNumber || partNumber < 1) return error(400, "Parte inválida.");
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength) return error(400, "Pedaço vazio.");
      const mpu = env.R2.resumeMultipartUpload(key, uploadId);
      const uploaded = await mpu.uploadPart(partNumber, bytes);
      return json({ ok: true, partNumber: uploaded.partNumber, etag: uploaded.etag });
    }

    if (action === "complete") {
      const { folder } = await resolveTarget(request, env, number);
      const body = await readJson<{ key?: string; uploadId?: string; parts?: { partNumber: number; etag: string }[] }>(request);
      const key = body.key || "";
      const uploadId = body.uploadId || "";
      const parts = Array.isArray(body.parts) ? body.parts : [];
      if (!key.startsWith(`docs/${folder}/`) || key.includes("..")) return error(400, "Destino inválido.");
      if (!uploadId || !parts.length) return error(400, "Envio incompleto.");
      const mpu = env.R2.resumeMultipartUpload(key, uploadId);
      await mpu.complete(parts.map((p) => ({ partNumber: Number(p.partNumber), etag: String(p.etag) })));
      return json({ ok: true, url: `/api/files/${key}`, key }, { status: 201 });
    }

    if (action === "abort") {
      const { folder } = await resolveTarget(request, env, number);
      const body = await readJson<{ key?: string; uploadId?: string }>(request);
      const key = body.key || "";
      const uploadId = body.uploadId || "";
      if (!key.startsWith(`docs/${folder}/`) || !uploadId) return error(400, "Envio inválido.");
      await env.R2.resumeMultipartUpload(key, uploadId).abort();
      return json({ ok: true });
    }

    return error(400, "Ação inválida.");
  } catch (e) {
    // resolveTarget lança { status, message } — converte para resposta HTTP.
    if (e && typeof e === "object" && "status" in e && "message" in e) {
      return error(Number((e as { status: number }).status), String((e as { message: string }).message));
    }
    return toErrorResponse(e);
  }
};

// GET → quanto já foi usado (o cliente mostra "restam X MB").
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number || "");
    const { folder } = await resolveTarget(request, env, number);
    const used = await usedBytes(env, folder, number);
    return json({ used, quota: QUOTA_BYTES, remaining: Math.max(0, QUOTA_BYTES - used) });
  } catch (e) {
    if (e && typeof e === "object" && "status" in e && "message" in e) {
      return error(Number((e as { status: number }).status), String((e as { message: string }).message));
    }
    return toErrorResponse(e);
  }
};

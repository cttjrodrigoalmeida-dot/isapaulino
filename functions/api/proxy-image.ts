// GET /api/proxy-image?url=<url>  (admin)
// Busca uma imagem de FORA e devolve pelo nosso domínio.
//
// Por que existe: quando o cliente cola um link de referência (Pinterest, loja,
// Drive), o navegador não consegue desenhar essa imagem no PDF — o site de
// origem não manda o cabeçalho CORS, então a imagem entra "vazia" no papel.
// Passando por aqui ela vira mesma-origem e o PDF sai com a referência.
// Só admin autenticado (é ele quem gera o PDF).
import type { Env } from "./_lib/types";
import { error, toErrorResponse } from "./_lib/http";
import { requireAuth } from "./_lib/auth";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — referência de imagem, não arquivo

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const raw = new URL(request.url).searchParams.get("url") || "";
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return error(400, "Endereço inválido.");
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return error(400, "Só http(s).");
    }

    const res = await fetch(target.toString(), {
      // Sem referer/cookies: é só a imagem pública que o cliente indicou.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IsaPaulinoStudio/1.0)", Accept: "image/*,*/*;q=0.8" },
      redirect: "follow",
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return error(502, `A origem respondeu ${res.status}.`);

    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!type.startsWith("image/")) return error(415, "O endereço não é uma imagem.");
    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) return error(413, "Imagem muito grande.");

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return error(413, "Imagem muito grande.");

    return new Response(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};

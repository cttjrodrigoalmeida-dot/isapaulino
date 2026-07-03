// Gera o PDF do contrato no servidor via API REST do Cloudflare Browser
// Rendering, renderizando a página pública em modo ?pdf=1 (tudo visível, sem
// diálogo). Sem token/conta configurados (ex.: local sem .dev.vars), lança
// HttpError amigável — o chamador cai no upload manual.
import type { Env } from "./types";
import { HttpError } from "./http";

export function browserRenderingAvailable(env: Env): boolean {
  return !!(env.BROWSER_RENDER_TOKEN && env.CF_ACCOUNT_ID);
}

/** Renderiza `${origin}/contrato/${slug}?pdf=1` em PDF (Blob). */
export async function renderContractPdf(env: Env, origin: string, slug: string): Promise<Blob> {
  if (!browserRenderingAvailable(env)) {
    throw new HttpError(400, "Geração automática de PDF indisponível (defina BROWSER_RENDER_TOKEN). Envie o PDF manualmente.");
  }
  const url = `${origin.replace(/\/+$/, "")}/contrato/${encodeURIComponent(slug)}?pdf=1`;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/pdf`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.BROWSER_RENDER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
      // Espera o sinal de "pronto" (fontes carregadas + conteúdo revelado).
      waitForSelector: { selector: "[data-pdf-ready]", timeout: 15000 },
      pdfOptions: {
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" },
      },
    }),
  });

  if (!res.ok) {
    // A API devolve JSON de erro quando falha; sucesso vem como binário (PDF).
    const text = await res.text().catch(() => "");
    let msg = `Browser Rendering ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j?.errors?.[0]?.message || j?.messages?.[0]?.message || msg;
    } catch {
      /* mantém msg padrão */
    }
    throw new HttpError(502, `Erro ao gerar o PDF: ${msg}`);
  }

  const buf = await res.arrayBuffer();
  return new Blob([buf], { type: "application/pdf" });
}

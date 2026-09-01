// Envio de arquivos GRANDES do briefing (maquetes, .skp/.rvt/.zip de centenas de MB).
//
// A Cloudflare corta requisições acima de 100 MB, então acima de um certo
// tamanho o arquivo é cortado aqui no navegador e cada pedaço vai como uma
// "parte" de um multipart upload do R2 (ver functions/api/briefings/[number]/upload-part.ts).
// Arquivos pequenos continuam indo pelo caminho simples de sempre.

export interface UploadResult {
  url: string;
  name: string;
}

/** Até este tamanho vai de uma vez só (um POST). */
const SIMPLE_MAX = 20 * 1024 * 1024; // 20 MB

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Sobe um arquivo do briefing e devolve a URL já salva no R2.
 * @param onProgress recebe 0–1 conforme os pedaços vão subindo.
 */
export async function uploadBriefingFile(
  briefingNumber: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<UploadResult> {
  const base = `/api/briefings/${encodeURIComponent(briefingNumber)}`;

  // ── Caminho simples (arquivo pequeno) ──
  if (file.size <= SIMPLE_MAX) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${base}/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(await readError(res, "Não consegui enviar o arquivo."));
    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error("Não consegui enviar o arquivo.");
    onProgress?.(1);
    return { url: data.url, name: file.name };
  }

  // ── Caminho em pedaços ──
  const createRes = await fetch(`${base}/upload-part?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
  });
  if (!createRes.ok) throw new Error(await readError(createRes, "Não consegui iniciar o envio."));
  const { key, uploadId, partSize } = (await createRes.json()) as {
    key: string;
    uploadId: string;
    partSize: number;
  };

  const size = partSize || SIMPLE_MAX;
  const total = Math.ceil(file.size / size);
  const parts: { partNumber: number; etag: string }[] = [];
  try {
    for (let i = 0; i < total; i++) {
      const chunk = file.slice(i * size, Math.min((i + 1) * size, file.size));
      const res = await fetch(
        `${base}/upload-part?action=part&key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&part=${i + 1}`,
        { method: "POST", body: chunk }
      );
      if (!res.ok) throw new Error(await readError(res, `Falhou no pedaço ${i + 1} de ${total}.`));
      const p = (await res.json()) as { partNumber: number; etag: string };
      parts.push({ partNumber: p.partNumber, etag: p.etag });
      onProgress?.((i + 1) / total);
    }
    const done = await fetch(`${base}/upload-part?action=complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId, parts }),
    });
    if (!done.ok) throw new Error(await readError(done, "Não consegui finalizar o envio."));
    const data = (await done.json()) as { url?: string };
    if (!data.url) throw new Error("Não consegui finalizar o envio.");
    return { url: data.url, name: file.name };
  } catch (err) {
    // Não deixa lixo no R2 se o envio morrer no meio.
    void fetch(`${base}/upload-part?action=abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => {});
    throw err;
  }
}

/** Espaço já usado / restante deste briefing (para mostrar ao cliente). */
export async function briefingQuota(
  briefingNumber: string
): Promise<{ used: number; quota: number; remaining: number } | null> {
  try {
    const res = await fetch(`/api/briefings/${encodeURIComponent(briefingNumber)}/upload-part`);
    if (!res.ok) return null;
    return (await res.json()) as { used: number; quota: number; remaining: number };
  } catch {
    return null;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

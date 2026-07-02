// Helpers de resposta HTTP (JSON) para as Pages Functions.

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

/** Resposta JSON de sucesso. */
export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

/** Resposta JSON de erro (status >= 400). */
export function error(status: number, message: string, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify({ error: message }), {
    ...init,
    status,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

/** Lê o corpo JSON do request; lança 400 amigável se inválido. */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Corpo da requisição inválido (esperado JSON).");
  }
}

/** Erro com status HTTP, capturado pelos handlers e convertido em resposta. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Converte uma exceção em resposta JSON (HttpError vira o status certo). */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof HttpError) return error(e.status, e.message);
  const message = e instanceof Error ? e.message : "Erro interno";
  return error(500, message);
}

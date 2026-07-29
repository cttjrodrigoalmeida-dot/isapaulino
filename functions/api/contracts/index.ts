// /api/contracts
//   GET  ?status=...  → lista (admin), com nome do cliente (JOIN).
//   POST              → cria contrato (admin). client_id + title obrigatórios.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse, HttpError } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { contractValueFromData } from "../_lib/contractValue";

export interface ContractInput {
  client_id?: string;
  title?: string;
  content?: string;
  /** JSON do ContractDoc (documento rico). */
  data?: string | null;
  value?: number | null;
  deadline?: string | null;
  autentique_url?: string | null;
  status?: string;
}

const STATUSES = ["draft", "published", "signed", "cancelled"];

// Colunas de listagem + nome do cliente + nº do contrato (extraído do JSON).
const LIST_COLS = `c.id, c.client_id AS clientId, cl.name AS clientName, c.title,
  c.value, c.status, c.slug, c.updated_at AS updatedAt, c.published_at AS publishedAt,
  c.signed_at AS signedAt, json_extract(c.data, '$.vigenciaMeses') AS vigenciaMeses,
  json_extract(c.data, '$.kind') AS kind,
  c.autentique_document_id AS autentiqueDocumentId, c.data AS _data,
  COALESCE(json_extract(c.data, '$.contractNumber'), '') AS contractNumber,
  COALESCE(
    (SELECT p.service_title FROM proposals p WHERE p.number = json_extract(c.data, '$.proposalNumber')),
    (SELECT p2.service_title FROM proposals p2 WHERE p2.client = cl.name ORDER BY p2.updated_at DESC LIMIT 1)
  ) AS proposalTitle`;

function opt(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

// Valida o JSON do ContractDoc: devolve a string se parsear, null se vazia,
// e lança 400 se vier preenchida mas malformada (para não perder o documento).
export function optContractData(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    JSON.parse(v);
    return v;
  } catch {
    throw new HttpError(400, "Documento do contrato (data) inválido: JSON malformado.");
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = `SELECT ${LIST_COLS} FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.deleted_at IS NULL`;
    const binds: string[] = [];
    if (status && STATUSES.includes(status)) {
      query += " AND c.status = ?";
      binds.push(status);
    }
    query += " ORDER BY c.updated_at DESC";

    const { results } = await env.DB.prepare(query).bind(...binds).all();
    // Valor autoritativo a partir da Cláusula 6 (tabela ou pagamento); mantém o
    // c.value armazenado como fallback. Remove o `_data` (grande) da resposta.
    const contracts = (results ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const cv = contractValueFromData(row._data as string | null);
      if (cv != null) row.value = cv;
      delete row._data;
      return row;
    });
    return json({ contracts });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<ContractInput>(request);

    const clientId = (body.client_id ?? "").trim();
    const title = (body.title ?? "").trim();
    if (!clientId) return error(400, "Selecione o cliente do contrato.");
    if (!title) return error(400, "Informe o título do contrato.");

    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(clientId).first();
    if (!client) return error(400, "Cliente não encontrado.");

    const value = typeof body.value === "number" && Number.isFinite(body.value) ? body.value : null;
    const data = optContractData(body.data);
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO contracts (id, client_id, title, content, data, value, deadline, autentique_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    )
      .bind(id, clientId, title, opt(body.content) ?? "", data, value, opt(body.deadline), opt(body.autentique_url))
      .run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

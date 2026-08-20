// /api/proposals
//   GET  → lista (admin)        — resumo de cada proposta para a listagem.
//   POST → cria (admin)         — corpo = objeto Proposal completo.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

// Espelha o tipo Proposal do front (campos usados aqui). O objeto inteiro
// é guardado em `data`; só extraímos alguns campos para indexar/listar.
interface ProposalLike {
  number?: string;
  client?: string;
  serviceTitle?: string;
  date?: string;
  [k: string]: unknown;
}

// "R$ 10.000,00" → 10000. Remove milhar (.) e troca decimal (,) por ponto.
function parseBRL(v: string): number {
  const cleaned = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      `SELECT number, client, service_title AS serviceTitle, date, status, outcome, data, updated_at AS updatedAt
       FROM proposals WHERE deleted_at IS NULL ORDER BY updated_at DESC`
    ).all<{ data: string; [k: string]: unknown }>();
    // Anexa o valor (R$) de cada proposta parseado do JSON, sem devolver o data inteiro.
    const proposals = (results ?? []).map((r) => {
      let value = 0;
      try {
        value = parseBRL(String((JSON.parse(r.data) as { total?: string }).total ?? ""));
      } catch { /* sem valor */ }
      const { data: _data, ...rest } = r;
      return { ...rest, value };
    });
    return json({ proposals });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ proposal?: ProposalLike; status?: string; accessPassword?: string | null }>(request);
    const proposal = body.proposal;
    if (!proposal || typeof proposal.number !== "string" || !proposal.number.trim()) {
      return error(400, "Proposta inválida: 'number' é obrigatório.");
    }
    const status = body.status === "published" ? "published" : "draft";
    const accessPassword = (body.accessPassword ?? "").toString().trim() || null;

    const exists = await env.DB.prepare("SELECT number FROM proposals WHERE number = ?")
      .bind(proposal.number)
      .first();
    if (exists) return error(409, `Já existe uma proposta com o número ${proposal.number}.`);

    await env.DB.prepare(
      `INSERT INTO proposals (number, client, service_title, date, status, access_password, data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        proposal.number,
        proposal.client ?? null,
        proposal.serviceTitle ?? null,
        proposal.date ?? null,
        status,
        accessPassword,
        JSON.stringify(proposal)
      )
      .run();

    return json({ ok: true, number: proposal.number, status }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

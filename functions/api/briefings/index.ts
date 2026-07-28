// /api/briefings
//   GET  → lista (admin)   — resumo de cada briefing.
//   POST → cria (admin)    — corpo = { briefing, status? }.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface BriefingLike {
  number?: string;
  proposalNumber?: string;
  title?: string;
  [k: string]: unknown;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      `SELECT b.number, b.proposal_number AS proposalNumber, b.title, b.status,
              b.updated_at AS updatedAt,
              (SELECT p.service_title FROM proposals p WHERE p.number = b.proposal_number) AS proposalTitle,
              (SELECT COUNT(*) FROM briefing_responses r WHERE r.briefing_number = b.number) AS responseCount,
              (SELECT MAX(r.submitted_at) FROM briefing_responses r WHERE r.briefing_number = b.number) AS lastResponseAt
       FROM briefings b ORDER BY b.updated_at DESC`
    ).all();
    return json({ briefings: results ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ briefing?: BriefingLike; status?: string }>(request);
    const briefing = body.briefing;
    if (!briefing || typeof briefing.number !== "string" || !briefing.number.trim()) {
      return error(400, "Briefing inválido: 'number' é obrigatório.");
    }
    const status = body.status === "published" ? "published" : "draft";

    const exists = await env.DB.prepare("SELECT number FROM briefings WHERE number = ?")
      .bind(briefing.number)
      .first();
    if (exists) return error(409, `Já existe um briefing com o número ${briefing.number}.`);

    await env.DB.prepare(
      `INSERT INTO briefings (number, proposal_number, title, status, data)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        briefing.number,
        briefing.proposalNumber ?? null,
        briefing.title ?? null,
        status,
        JSON.stringify(briefing)
      )
      .run();

    return json({ ok: true, number: briefing.number, status }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

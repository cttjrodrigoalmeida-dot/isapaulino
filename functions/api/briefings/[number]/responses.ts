// /api/briefings/:number/responses
//   POST → cliente envia as respostas (PÚBLICO; só se o briefing está publicado).
//   GET  → lista as respostas recebidas (admin).
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

const MAX_ANSWERS_BYTES = 256 * 1024; // 256 KB

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const body = await readJson<{
      answers?: Record<string, string>;
      client?: string;
      refImages?: Record<string, string>;
    }>(request);
    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return error(400, "Respostas inválidas.");
    }
    const answersStr = JSON.stringify(answers);
    if (answersStr.length > MAX_ANSWERS_BYTES) return error(413, "Respostas muito grandes.");

    // anexos: mapa { questionId: url } — só guarda URLs internas (/api/files/…)
    const refs = body.refImages;
    const refImages =
      refs && typeof refs === "object" && !Array.isArray(refs)
        ? Object.fromEntries(
            Object.entries(refs).filter(
              ([, url]) => typeof url === "string" && url.startsWith("/api/files/")
            )
          )
        : {};
    const refImagesStr = Object.keys(refImages).length ? JSON.stringify(refImages) : null;

    // só aceita envio para briefing publicado
    const b = await env.DB.prepare("SELECT status FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ status: string }>();
    if (!b || b.status !== "published") return error(404, "Briefing não encontrado.");

    const res = await env.DB.prepare(
      "INSERT INTO briefing_responses (briefing_number, client, answers, ref_images) VALUES (?, ?, ?, ?)"
    )
      .bind(number, body.client ?? null, answersStr, refImagesStr)
      .run();

    return json({ ok: true, id: res.meta.last_row_id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const { results } = await env.DB.prepare(
      `SELECT id, client, answers, ref_images AS refImages, submitted_at AS submittedAt
       FROM briefing_responses WHERE briefing_number = ? ORDER BY submitted_at DESC`
    )
      .bind(number)
      .all<{
        id: number;
        client: string | null;
        answers: string;
        refImages: string | null;
        submittedAt: string;
      }>();
    const responses = (results ?? []).map((r) => ({
      id: r.id,
      client: r.client,
      submittedAt: r.submittedAt,
      answers: JSON.parse(r.answers) as Record<string, string>,
      refImages: (r.refImages ? JSON.parse(r.refImages) : {}) as Record<string, string>,
    }));
    return json({ responses });
  } catch (e) {
    return toErrorResponse(e);
  }
};

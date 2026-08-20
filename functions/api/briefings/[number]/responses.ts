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
      refImages?: Record<string, string | string[]>;
    }>(request);
    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return error(400, "Respostas inválidas.");
    }
    const answersStr = JSON.stringify(answers);
    if (answersStr.length > MAX_ANSWERS_BYTES) return error(413, "Respostas muito grandes.");

    // anexos: mapa { questionId: url[] } — cada pergunta pode ter VÁRIOS anexos
    // (imagens/PDFs). Só guarda URLs internas (/api/files/…); links externos e
    // valores inválidos são descartados. Aceita também o formato legado (string).
    const rawRefs = body.refImages;
    const refImages: Record<string, string[]> = {};
    if (rawRefs && typeof rawRefs === "object" && !Array.isArray(rawRefs)) {
      for (const [qid, v] of Object.entries(rawRefs)) {
        const list = (Array.isArray(v) ? v : [v]).filter(
          (u): u is string => typeof u === "string" && u.startsWith("/api/files/")
        );
        if (list.length) refImages[qid] = list;
      }
    }
    const refImagesStr = Object.keys(refImages).length ? JSON.stringify(refImages) : null;

    // só aceita envio para briefing publicado
    const b = await env.DB.prepare("SELECT status FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ status: string }>();
    if (!b || b.status !== "published") return error(404, "Briefing não encontrado.");

    const client = body.client ?? null;

    // Reenvio do MESMO briefing pelo MESMO cliente ATUALIZA a resposta existente
    // (em vez de acumular "Resposta 1, 2, 3…"). Chave: (briefing_number, client).
    // Se já houver MAIS de uma (duplicatas antigas, de antes desta regra), a mais
    // recente é atualizada e as demais são apagadas — colapsa tudo em uma só.
    const { results: prev } = await env.DB.prepare(
      `SELECT id, ref_images AS refImages FROM briefing_responses
       WHERE briefing_number = ? AND ((client = ?) OR (client IS NULL AND ? IS NULL))
       ORDER BY submitted_at DESC`
    )
      .bind(number, client, client)
      .all<{ id: number; refImages: string | null }>();

    if (prev && prev.length > 0) {
      const keepId = prev[0].id;
      const removeIds = prev.slice(1).map((r) => r.id);

      const stmts = [
        env.DB.prepare(
          "UPDATE briefing_responses SET answers = ?, ref_images = ?, submitted_at = datetime('now') WHERE id = ?"
        ).bind(answersStr, refImagesStr, keepId),
      ];
      if (removeIds.length > 0) {
        stmts.push(
          env.DB.prepare(
            `DELETE FROM briefing_responses WHERE id IN (${removeIds.map(() => "?").join(",")})`
          ).bind(...removeIds)
        );
      }
      await env.DB.batch(stmts);

      // Limpa do R2 os anexos antigos (de qualquer versão anterior) que não estão
      // mais na resposta atual — evita lixo ocupando espaço.
      try {
        const flat = (m: Record<string, string | string[]>): string[] =>
          Object.values(m).flatMap((v) => (Array.isArray(v) ? v : [v]));
        const keep = new Set(flat(refImages));
        const oldUrls = new Set<string>();
        for (const p of prev) {
          const map = p.refImages ? (JSON.parse(p.refImages) as Record<string, string | string[]>) : {};
          for (const u of flat(map)) oldUrls.add(u);
        }
        for (const url of oldUrls) {
          if (keep.has(url)) continue;
          const key = url.replace(/^\/api\/files\//, "");
          if (key.startsWith("briefing-refs/")) await env.R2.delete(key);
        }
      } catch {
        /* limpeza é best-effort */
      }

      return json({ ok: true, id: keepId, updated: true, merged: removeIds.length });
    }

    const res = await env.DB.prepare(
      "INSERT INTO briefing_responses (briefing_number, client, answers, ref_images) VALUES (?, ?, ?, ?)"
    )
      .bind(number, client, answersStr, refImagesStr)
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
      refImages: (r.refImages ? JSON.parse(r.refImages) : {}) as Record<string, string | string[]>,
    }));
    return json({ responses });
  } catch (e) {
    return toErrorResponse(e);
  }
};

// PUT → admin edita as answers de uma resposta específica (por id). Sobrescreve.
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const body = await readJson<{ id?: number; answers?: Record<string, string> }>(request);
    const id = Number(body.id);
    if (!Number.isFinite(id)) return error(400, "Id da resposta inválido.");
    if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
      return error(400, "Respostas inválidas.");
    }
    const answersStr = JSON.stringify(body.answers);
    if (answersStr.length > MAX_ANSWERS_BYTES) return error(413, "Respostas muito grandes.");
    const res = await env.DB.prepare(
      "UPDATE briefing_responses SET answers = ? WHERE id = ? AND briefing_number = ?"
    ).bind(answersStr, id, number).run();
    if (!res.meta.changes) return error(404, "Resposta não encontrada.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

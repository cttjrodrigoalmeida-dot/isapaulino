// /api/calendar/:id
//   PUT    { title?, notes?, time?, kind?, done? }  → atualiza campos enviados
//   DELETE → remove o evento
//   Autenticado (painel admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface UpdateBody {
  title?: string;
  notes?: string | null;
  time?: string | null;
  kind?: string;
  done?: boolean;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<UpdateBody>(request);

    const sets: string[] = [];
    const binds: (string | number | null)[] = [];

    if (body.title !== undefined) {
      const t = body.title.trim();
      if (!t) return error(400, "Título não pode ficar vazio.");
      sets.push("title = ?");
      binds.push(t.slice(0, 200));
    }
    if (body.notes !== undefined) {
      sets.push("notes = ?");
      binds.push(body.notes ? String(body.notes).slice(0, 2000) : null);
    }
    if (body.time !== undefined) {
      sets.push("time = ?");
      binds.push(body.time && /^\d{2}:\d{2}$/.test(body.time) ? body.time : null);
    }
    if (body.kind !== undefined) {
      sets.push("kind = ?");
      binds.push(body.kind === "compromisso" ? "compromisso" : "tarefa");
    }
    if (body.done !== undefined) {
      sets.push("done = ?");
      binds.push(body.done ? 1 : 0);
    }

    if (sets.length === 0) return error(400, "Nada para atualizar.");

    binds.push(id);
    const res = await env.DB.prepare(
      `UPDATE calendar_events SET ${sets.join(", ")} WHERE id = ?`
    )
      .bind(...binds)
      .run();

    if (!res.meta.changes) return error(404, "Evento não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM calendar_events WHERE id = ?")
      .bind(id)
      .run();
    if (!res.meta.changes) return error(404, "Evento não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

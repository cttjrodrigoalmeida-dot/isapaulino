// /api/tasks/:id
//   PUT    { title?, notes?, priority?, status?, dueDate?, contractId?, clientId? }
//   DELETE → remove a tarefa
//   Autenticado (painel admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface UpdateBody {
  title?: string;
  notes?: string | null;
  priority?: string;
  status?: string;
  dueDate?: string | null;
  contractId?: string | null;
  clientId?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITIES = new Set(["baixa", "normal", "alta"]);
const STATUSES = new Set(["aberta", "fazendo", "concluida"]);

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
    if (body.priority !== undefined) {
      sets.push("priority = ?");
      binds.push(PRIORITIES.has(body.priority) ? body.priority : "normal");
    }
    if (body.status !== undefined) {
      const st = STATUSES.has(body.status) ? body.status : "aberta";
      sets.push("status = ?");
      binds.push(st);
      // done_at acompanha o status.
      sets.push("done_at = ?");
      binds.push(st === "concluida" ? new Date().toISOString() : null);
    }
    if (body.dueDate !== undefined) {
      sets.push("due_date = ?");
      binds.push(body.dueDate && DATE_RE.test(body.dueDate) ? body.dueDate : null);
    }
    if (body.contractId !== undefined) {
      sets.push("contract_id = ?");
      binds.push(body.contractId ? String(body.contractId) : null);
    }
    if (body.clientId !== undefined) {
      sets.push("client_id = ?");
      binds.push(body.clientId ? String(body.clientId) : null);
    }

    if (sets.length === 0) return error(400, "Nada para atualizar.");
    sets.push("updated_at = datetime('now')");

    binds.push(id);
    const res = await env.DB.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...binds)
      .run();

    if (!res.meta.changes) return error(404, "Tarefa não encontrada.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return error(404, "Tarefa não encontrada.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

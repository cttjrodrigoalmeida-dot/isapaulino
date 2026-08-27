// /api/tasks
//   GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD&status=  → tarefas (filtros opcionais)
//        from/to filtram por due_date (usado para casar com o Calendário).
//   POST { title, notes?, priority?, status?, dueDate?, contractId?, clientId? }
//   Autenticado (painel admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  priority: "baixa" | "normal" | "alta";
  status: "aberta" | "fazendo" | "concluida";
  dueDate: string | null;
  contractId: string | null;
  clientId: string | null;
  doneAt: string | null;
  createdAt: string;
}

interface CreateBody {
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

interface Row {
  id: string; title: string; notes: string | null; priority: string; status: string;
  due_date: string | null; contract_id: string | null; client_id: string | null;
  done_at: string | null; created_at: string;
}
const mapRow = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  priority: PRIORITIES.has(r.priority) ? (r.priority as Task["priority"]) : "normal",
  status: STATUSES.has(r.status) ? (r.status as Task["status"]) : "aberta",
  dueDate: r.due_date,
  contractId: r.contract_id,
  clientId: r.client_id,
  doneAt: r.done_at,
  createdAt: r.created_at,
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status");

    let query =
      "SELECT id, title, notes, priority, status, due_date, contract_id, client_id, done_at, created_at FROM tasks";
    const where: string[] = [];
    const binds: string[] = [];
    if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
      where.push("due_date >= ? AND due_date <= ?");
      binds.push(from, to);
    }
    if (status && STATUSES.has(status)) {
      where.push("status = ?");
      binds.push(status);
    }
    if (where.length) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY (due_date IS NULL) ASC, due_date ASC, position ASC, created_at ASC";

    const { results } = await env.DB.prepare(query).bind(...binds).all<Row>();
    return json({ tasks: (results ?? []).map(mapRow) });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<CreateBody>(request);

    const title = (body.title ?? "").trim();
    if (!title) return error(400, "Informe um título.");

    const priority = PRIORITIES.has(body.priority ?? "") ? body.priority! : "normal";
    const status = STATUSES.has(body.status ?? "") ? body.status! : "aberta";
    const dueDate = body.dueDate && DATE_RE.test(body.dueDate) ? body.dueDate : null;
    const notes = body.notes ? String(body.notes).slice(0, 2000) : null;
    const contractId = body.contractId ? String(body.contractId) : null;
    const clientId = body.clientId ? String(body.clientId) : null;
    const doneAt = status === "concluida" ? new Date().toISOString() : null;
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO tasks (id, title, notes, priority, status, due_date, contract_id, client_id, done_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, title.slice(0, 200), notes, priority, status, dueDate, contractId, clientId, doneAt)
      .run();

    const { results } = await env.DB.prepare(
      "SELECT id, title, notes, priority, status, due_date, contract_id, client_id, done_at, created_at FROM tasks WHERE id = ?"
    ).bind(id).all<Row>();

    return json({ ok: true, task: mapRow(results![0]) }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

// /api/calendar
//   GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD  → eventos no intervalo (default: tudo)
//   POST { date, title, time?, notes?, kind? }  → cria evento
//   Autenticado (painel admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export interface CalendarEvent {
  id: string;
  date: string;
  time: string | null;
  title: string;
  notes: string | null;
  kind: "tarefa" | "compromisso";
  done: boolean;
}

interface CreateBody {
  date?: string;
  time?: string | null;
  title?: string;
  notes?: string | null;
  kind?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let query = "SELECT id, date, time, title, notes, kind, done FROM calendar_events";
    const binds: string[] = [];
    if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
      query += " WHERE date >= ? AND date <= ?";
      binds.push(from, to);
    }
    query += " ORDER BY date ASC, time ASC, created_at ASC";

    const { results } = await env.DB.prepare(query)
      .bind(...binds)
      .all<{
        id: string;
        date: string;
        time: string | null;
        title: string;
        notes: string | null;
        kind: string;
        done: number;
      }>();

    const events: CalendarEvent[] = (results ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      title: r.title,
      notes: r.notes,
      kind: r.kind === "compromisso" ? "compromisso" : "tarefa",
      done: !!r.done,
    }));

    return json({ events });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<CreateBody>(request);

    const date = (body.date ?? "").trim();
    const title = (body.title ?? "").trim();
    if (!DATE_RE.test(date)) return error(400, "Data inválida (use YYYY-MM-DD).");
    if (!title) return error(400, "Informe um título.");

    const kind = body.kind === "compromisso" ? "compromisso" : "tarefa";
    const time = body.time && /^\d{2}:\d{2}$/.test(body.time) ? body.time : null;
    const notes = body.notes ? String(body.notes).slice(0, 2000) : null;
    const id = crypto.randomUUID();

    await env.DB.prepare(
      "INSERT INTO calendar_events (id, date, time, title, notes, kind, done) VALUES (?, ?, ?, ?, ?, ?, 0)"
    )
      .bind(id, date, time, title.slice(0, 200), notes, kind)
      .run();

    return json(
      { ok: true, event: { id, date, time, title, notes, kind, done: false } },
      { status: 201 }
    );
  } catch (e) {
    return toErrorResponse(e);
  }
};

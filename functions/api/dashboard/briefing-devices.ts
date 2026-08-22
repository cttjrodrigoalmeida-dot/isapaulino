// GET /api/dashboard/briefing-devices?year=YYYY  (admin)
// Distribuição das respostas da pergunta "QUAL DISPOSITIVO VOCÊ ESTÁ UTILIZANDO…"
// entre TODOS os briefings (a pergunta muda de id por briefing, então é casada
// pelo TEXTO). Conta a resposta mais recente de cada briefing. Alimenta o anel
// no dashboard de briefings.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

const DIACRITICS = /[̀-ͯ]/g; // marcas de acento após NFD
const norm = (s: unknown) =>
  (typeof s === "string" ? s : "").normalize("NFD").replace(DIACRITICS, "").toUpperCase().trim();

interface Q { id: string; options: string[]; text: string }

// Acha a pergunta do dispositivo dentro do documento do briefing (por texto).
function findDeviceQuestion(data: string | null): Q | null {
  if (!data) return null;
  let doc: unknown;
  try { doc = JSON.parse(data); } catch { return null; }
  const sections = (doc as { sections?: unknown })?.sections;
  if (!Array.isArray(sections)) return null;
  for (const sec of sections) {
    const qs = (sec as { questions?: unknown })?.questions;
    if (!Array.isArray(qs)) continue;
    for (const q of qs) {
      const qq = q as { id?: unknown; text?: unknown; options?: unknown };
      if (typeof qq.id === "string" && norm(qq.text).includes("DISPOSITIVO")) {
        return {
          id: qq.id,
          options: Array.isArray(qq.options) ? qq.options.map(String) : [],
          text: typeof qq.text === "string" ? qq.text : "",
        };
      }
    }
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const year = (url.searchParams.get("year") || "").trim();
    const prefix = /^\d{4}$/.test(year) ? year.slice(2) : null; // "2026" → "26" (nº AANN)

    let sql =
      `SELECT b.number AS number, b.data AS data,
        (SELECT r.answers FROM briefing_responses r WHERE r.briefing_number = b.number ORDER BY r.submitted_at DESC LIMIT 1) AS answers
       FROM briefings b WHERE b.deleted_at IS NULL`;
    const binds: string[] = [];
    if (prefix) { sql += " AND b.number LIKE ?"; binds.push(prefix + "%"); }

    const { results } = await env.DB.prepare(sql).bind(...binds).all<{ number: string; data: string | null; answers: string | null }>();

    const counts = new Map<string, number>();
    const ordered: string[] = []; // ordem das opções (do documento) + "Outros" no fim
    let answered = 0, briefings = 0, questionText = "";

    for (const row of results ?? []) {
      const dq = findDeviceQuestion(row.data);
      if (!dq) continue;
      briefings++;
      if (!questionText) questionText = dq.text;
      for (const o of dq.options) if (!ordered.includes(o)) ordered.push(o);
      if (!row.answers) continue;
      let ans: Record<string, unknown>;
      try { ans = JSON.parse(row.answers) as Record<string, unknown>; } catch { continue; }
      const raw = ans[dq.id];
      const val = typeof raw === "string" ? raw.trim() : "";
      if (!val) continue;
      answered++;
      const match = dq.options.find((o) => norm(o) === norm(val));
      const key = match ?? "Outros";
      if (key === "Outros" && !ordered.includes("Outros")) ordered.push("Outros");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // Mantém todas as opções do documento (mesmo com 0), oculta "Outros" se vazio.
    const devices = ordered
      .filter((name) => name !== "Outros" || (counts.get("Outros") ?? 0) > 0)
      .map((name) => ({ name, count: counts.get(name) ?? 0 }));

    return json({ questionText, devices, answered, briefings });
  } catch (e) {
    return toErrorResponse(e);
  }
};

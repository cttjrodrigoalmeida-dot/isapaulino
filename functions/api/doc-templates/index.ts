// /api/doc-templates  (admin)
//   GET                     → { templates: { proposal: {...}|null, briefing: {...}|null } }
//   PUT  { kind, doc }      → grava/atualiza o MODELO daquele tipo de documento
//   DELETE ?kind=proposal   → apaga o modelo (volta a copiar o documento mais recente)
//
// O "modelo" é o documento padrão configurado na Biblioteca: todo NOVO documento
// (proposta/briefing) nasce a partir dele, em vez de clonar o mais recente — que
// era o que fazia portfólio/valores virem "aleatórios" numa proposta nova.
// Guardado no app_settings (chave→valor) como JSON, sem tabela nova.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

// Contrato de propósito: NÃO tem modelo (a Isabela só usa proposta e briefing).
const KINDS = ["proposal", "briefing"] as const;
type Kind = (typeof KINDS)[number];
const keyOf = (kind: Kind) => `doc_template_${kind}`;
const isKind = (v: unknown): v is Kind => typeof v === "string" && (KINDS as readonly string[]).includes(v);

export interface DocTemplate {
  /** JSON completo do documento que serve de base (Proposal | Briefing). */
  doc: unknown;
  updatedAt: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      `SELECT key, value, updated_at FROM app_settings WHERE key IN (?, ?)`
    )
      .bind(keyOf("proposal"), keyOf("briefing"))
      .all<{ key: string; value: string | null; updated_at: string }>();

    const templates: Record<Kind, DocTemplate | null> = { proposal: null, briefing: null };
    for (const r of results ?? []) {
      const kind = r.key.replace("doc_template_", "");
      if (!isKind(kind) || !r.value) continue;
      try {
        templates[kind] = { doc: JSON.parse(r.value), updatedAt: r.updated_at };
      } catch {
        // JSON corrompido → trata como "sem modelo" (não derruba a tela).
        templates[kind] = null;
      }
    }
    return json({ templates });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ kind?: string; doc?: unknown }>(request);
    if (!isKind(body.kind)) return error(400, "Tipo de modelo inválido (use proposal ou briefing).");
    if (!body.doc || typeof body.doc !== "object") return error(400, "Envie o documento do modelo.");
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
      .bind(keyOf(body.kind), JSON.stringify(body.doc))
      .run();
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const kind = new URL(request.url).searchParams.get("kind");
    if (!isKind(kind)) return error(400, "Tipo de modelo inválido (use proposal ou briefing).");
    await env.DB.prepare(`DELETE FROM app_settings WHERE key = ?`).bind(keyOf(kind)).run();
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

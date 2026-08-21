// GET /api/documents/numbers  (admin)
// Todos os números de projeto já em uso no sistema — proposta, contrato e
// briefing — com o cliente dono de cada um. Alimenta o aviso ao vivo nos
// editores (o número é a identidade do projeto: não pode ser de outro cliente).
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export interface NumberUse {
  number: string;
  client: string | null;
  kind: "proposta" | "briefing" | "contrato";
  /** true para termos aditivos (repetem de propósito o nº do contrato original). */
  aditivo?: boolean;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const uses: NumberUse[] = [];

    {
      const { results } = await env.DB.prepare(
        "SELECT number, client FROM proposals WHERE deleted_at IS NULL AND number IS NOT NULL AND number != ''"
      ).all<{ number: string; client: string | null }>();
      for (const r of results ?? []) uses.push({ number: r.number, client: r.client, kind: "proposta" });
    }
    {
      const { results } = await env.DB.prepare(
        `SELECT b.number,
                (SELECT p.client FROM proposals p WHERE p.number = b.proposal_number AND p.deleted_at IS NULL) AS client
           FROM briefings b WHERE b.deleted_at IS NULL AND b.number IS NOT NULL AND b.number != ''`
      ).all<{ number: string; client: string | null }>();
      for (const r of results ?? []) uses.push({ number: r.number, client: r.client, kind: "briefing" });
    }
    {
      const { results } = await env.DB.prepare(
        `SELECT json_extract(c.data, '$.contractNumber') AS number,
                cl.name AS client,
                json_extract(c.data, '$.kind') AS kind
           FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id
          WHERE c.deleted_at IS NULL AND json_extract(c.data, '$.contractNumber') IS NOT NULL
                AND json_extract(c.data, '$.contractNumber') != ''`
      ).all<{ number: string; client: string | null; kind: string | null }>();
      for (const r of results ?? []) uses.push({ number: r.number, client: r.client, kind: "contrato", aditivo: r.kind === "aditivo" });
    }

    return json({ numbers: uses });
  } catch (e) {
    return toErrorResponse(e);
  }
};

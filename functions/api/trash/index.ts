// /api/trash  (admin) — lixeira de clientes, contratos, propostas e briefings (soft-delete).
//   GET  → { clients, contracts, proposals, briefings } excluídos (recuperáveis).
//   POST { entity, id, action } — entity: 'client'|'contract'|'proposal'|'briefing';
//         action: 'restore' (volta, deleted_at = NULL) | 'purge' (apaga de vez, cascata).
//   Obs.: cliente/contrato usam `id` (uuid); proposta/briefing usam o `number` no campo `id`.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const [clients, contracts, proposals, briefings] = await Promise.all([
      env.DB.prepare(
        "SELECT id, name, cpf_cnpj AS cpfCnpj, email, deleted_at AS deletedAt FROM clients WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
      ).all(),
      env.DB.prepare(
        `SELECT c.id, c.title, c.status, cl.name AS clientName, c.deleted_at AS deletedAt
         FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id
         WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC`
      ).all(),
      env.DB.prepare(
        "SELECT number, client, service_title AS serviceTitle, status, deleted_at AS deletedAt FROM proposals WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
      ).all(),
      env.DB.prepare(
        "SELECT number, title, proposal_number AS proposalNumber, status, deleted_at AS deletedAt FROM briefings WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
      ).all(),
    ]);
    return json({
      clients: clients.results ?? [],
      contracts: contracts.results ?? [],
      proposals: proposals.results ?? [],
      briefings: briefings.results ?? [],
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { entity, id, action } = await readJson<{ entity?: string; id?: string; action?: string }>(request);
    const ENTITIES = ["client", "contract", "proposal", "briefing"];
    if (!id || !ENTITIES.includes(entity ?? "") || (action !== "restore" && action !== "purge")) {
      return error(400, "Parâmetros inválidos.");
    }

    // Tabela + coluna-chave por tipo (cliente/contrato = id; proposta/briefing = number).
    const cfg = {
      client: { table: "clients", key: "id" },
      contract: { table: "contracts", key: "id" },
      proposal: { table: "proposals", key: "number" },
      briefing: { table: "briefings", key: "number" },
    }[entity as "client" | "contract" | "proposal" | "briefing"];

    if (action === "restore") {
      await env.DB.prepare(
        `UPDATE ${cfg.table} SET deleted_at = NULL, updated_at = datetime('now') WHERE ${cfg.key} = ?`
      ).bind(id).run();
      return json({ ok: true });
    }

    // ── purge (apaga de vez) ──
    if (entity === "contract") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM installments WHERE contract_id = ?").bind(id),
        env.DB.prepare("DELETE FROM contract_payments WHERE contract_id = ?").bind(id),
        env.DB.prepare("UPDATE client_history SET contract_id = NULL WHERE contract_id = ?").bind(id),
        env.DB.prepare("DELETE FROM contracts WHERE id = ?").bind(id),
      ]);
      return json({ ok: true });
    }

    if (entity === "proposal") {
      await env.DB.prepare("DELETE FROM proposals WHERE number = ?").bind(id).run();
      return json({ ok: true });
    }

    if (entity === "briefing") {
      // Apaga também as respostas recebidas do briefing.
      await env.DB.batch([
        env.DB.prepare("DELETE FROM briefing_responses WHERE briefing_number = ?").bind(id),
        env.DB.prepare("DELETE FROM briefings WHERE number = ?").bind(id),
      ]);
      return json({ ok: true });
    }

    // client: não deixa apagar se ainda houver contratos (ativos ou na lixeira).
    const hasContracts = await env.DB.prepare("SELECT COUNT(*) AS n FROM contracts WHERE client_id = ?").bind(id).first<{ n: number }>();
    if ((hasContracts?.n ?? 0) > 0) {
      return error(409, "Este cliente ainda tem contratos. Apague os contratos definitivamente primeiro.");
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM client_history WHERE client_id = ?").bind(id),
      env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id),
    ]);
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

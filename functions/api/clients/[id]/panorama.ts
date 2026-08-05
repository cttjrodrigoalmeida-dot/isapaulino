// GET /api/clients/:id/panorama  (admin)
// Panorama do cliente: dados básicos + projetos (contratos) com situação e valor
// + resumo do Histórico Financeiro (HF). Base da "Central do Cliente".
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { contractValueFromData } from "../../_lib/contractValue";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");

    const client = await env.DB.prepare(
      `SELECT id, name, cpf_cnpj AS cpfCnpj, email, phone, address, city, state,
              photo_url AS photoUrl, avatar, gender, role, access_enabled AS accessEnabled, created_at AS createdAt
         FROM clients WHERE id = ? AND deleted_at IS NULL`
    ).bind(id).first();
    if (!client) return error(404, "Cliente não encontrado.");

    const { results } = await env.DB.prepare(
      `SELECT c.id, c.title, c.value, c.status, c.slug, c.signed_at AS signedAt,
              c.data AS _data,
              json_extract(c.data, '$.contractNumber') AS number,
              json_extract(c.data, '$.vigenciaMeses') AS vigenciaMeses,
              json_extract(c.data, '$.kind') AS kind,
              json_extract(c.data, '$.projectName') AS projectName,
              json_extract(c.data, '$.proposalNumber') AS proposalNumber
         FROM contracts c
        WHERE c.client_id = ? AND c.deleted_at IS NULL
        ORDER BY c.updated_at DESC`
    ).bind(id).all<Record<string, unknown>>();

    // Valor de cada projeto: recalculado do documento (igual à listagem/dashboard).
    const projects = (results ?? []).map((r) => {
      const { _data, ...rest } = r;
      const value = contractValueFromData(_data as string | null) ?? (rest.value as number | null);
      return { ...rest, value };
    });

    // Resumo do Histórico Financeiro (cobranças/parcelas avulsas).
    const hf = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS pago,
              COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0) AS pendente,
              COUNT(*) AS n
         FROM client_history WHERE client_id = ?`
    ).bind(id).first();

    // Parcelas do cliente (recebido / a receber / em atraso).
    const parcelas = await env.DB.prepare(
      `SELECT COALESCE(SUM(CASE WHEN i.status IN ('received','confirmed') THEN i.amount ELSE 0 END), 0) AS recebido,
              COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.amount ELSE 0 END), 0) AS atraso,
              COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.amount ELSE 0 END), 0) AS aReceber,
              COUNT(*) AS n
         FROM installments i JOIN contracts c ON c.id = i.contract_id
        WHERE c.client_id = ? AND i.status != 'deleted'`
    ).bind(id).first();

    // Atividades recentes = eventos do histórico do projeto (timeline).
    const { results: atividades } = await env.DB.prepare(
      `SELECT ph.date, ph.type, ph.description, ph.phase, c.title AS contractTitle
         FROM project_history ph JOIN contracts c ON c.id = ph.contract_id
        WHERE c.client_id = ? AND c.deleted_at IS NULL
        ORDER BY ph.date DESC, ph.created_at DESC LIMIT 8`
    ).bind(id).all();

    return json({ client, projects, hf, parcelas, atividades: atividades ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};

// /api/clients/:id
//   GET    → obtém o cliente (admin).
//   PUT    → atualiza (admin). Corpo = campos do cliente.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { isValidEmail, isValidCpfCnpj } from "../_lib/validation";
import type { ClientInput } from "./index";

const COLS = "id, name, cpf_cnpj, email, phone, address, city, state, role, nacionalidade, birth_date, created_at AS createdAt, updated_at AS updatedAt";

function opt(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const client = await env.DB.prepare(`SELECT ${COLS} FROM clients WHERE id = ?`).bind(id).first();
    if (!client) return error(404, "Cliente não encontrado.");
    return json({ client });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<ClientInput>(request);

    const exists = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(id).first();
    if (!exists) return error(404, "Cliente não encontrado.");

    const name = (body.name ?? "").trim();
    if (!name) return error(400, "Informe o nome do cliente.");

    const cpf_cnpj = opt(body.cpf_cnpj);
    const email = opt(body.email);
    if (cpf_cnpj && !isValidCpfCnpj(cpf_cnpj)) return error(400, "CPF/CNPJ inválido.");
    if (email && !isValidEmail(email)) return error(400, "E-mail inválido.");

    await env.DB.prepare(
      `UPDATE clients
       SET name = ?, cpf_cnpj = ?, email = ?, phone = ?, address = ?, city = ?, state = ?,
           role = ?, nacionalidade = ?, birth_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(name, cpf_cnpj, email, opt(body.phone), opt(body.address), opt(body.city), opt(body.state),
        opt(body.role), opt(body.nacionalidade), opt(body.birth_date), id)
      .run();

    return json({ ok: true, id });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return error(404, "Cliente não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

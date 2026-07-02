// /api/clients
//   GET  ?q=...  → lista clientes (admin). `q` filtra por nome/email/cpf.
//   POST         → cria cliente (admin). Corpo = campos do cliente.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { isValidEmail, isValidCpfCnpj } from "../_lib/validation";

export interface ClientInput {
  name?: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

const COLS = "id, name, cpf_cnpj, email, phone, address, city, state, created_at AS createdAt, updated_at AS updatedAt";

// Normaliza um campo opcional: trim + vazio vira null.
function opt(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();

    let query = `SELECT ${COLS} FROM clients`;
    const binds: string[] = [];
    if (q) {
      query += " WHERE name LIKE ? OR email LIKE ? OR cpf_cnpj LIKE ?";
      const like = `%${q}%`;
      binds.push(like, like, like);
    }
    query += " ORDER BY name COLLATE NOCASE ASC";

    const { results } = await env.DB.prepare(query).bind(...binds).all();
    return json({ clients: results ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<ClientInput>(request);

    const name = (body.name ?? "").trim();
    if (!name) return error(400, "Informe o nome do cliente.");

    const cpf_cnpj = opt(body.cpf_cnpj);
    const email = opt(body.email);
    if (cpf_cnpj && !isValidCpfCnpj(cpf_cnpj)) return error(400, "CPF/CNPJ inválido.");
    if (email && !isValidEmail(email)) return error(400, "E-mail inválido.");

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO clients (id, name, cpf_cnpj, email, phone, address, city, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, name, cpf_cnpj, email, opt(body.phone), opt(body.address), opt(body.city), opt(body.state))
      .run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

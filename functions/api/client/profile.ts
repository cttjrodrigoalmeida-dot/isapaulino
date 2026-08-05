// PUT /api/client/profile  (cliente autenticado)
// O cliente edita os PRÓPRIOS dados cadastrais (nome, e-mail, telefone, CPF/CNPJ,
// endereço). Atualiza o mesmo registro do painel (sincroniza). Não toca em projetos.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireVerifiedClient } from "../_lib/client-auth";
import { isValidEmail, isValidCpfCnpj } from "../_lib/validation";

const opt = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireVerifiedClient(request, env);
    const body = await readJson<{
      name?: string; email?: string; phone?: string; cpf_cnpj?: string;
      address?: string; city?: string; state?: string;
    }>(request);

    const name = (body.name || "").trim();
    if (!name) return error(400, "Informe seu nome.");
    const email = opt(body.email);
    const cpf = opt(body.cpf_cnpj);
    if (email && !isValidEmail(email)) return error(400, "E-mail inválido.");
    if (cpf && !isValidCpfCnpj(cpf)) return error(400, "CPF/CNPJ inválido.");

    await env.DB.prepare(
      `UPDATE clients SET name = ?, email = ?, phone = ?, cpf_cnpj = ?,
              address = ?, city = ?, state = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      name, email, opt(body.phone), cpf,
      opt(body.address), opt(body.city), (opt(body.state) || "").slice(0, 2).toUpperCase() || null,
      clientId,
    ).run();

    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

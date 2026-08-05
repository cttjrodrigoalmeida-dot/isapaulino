// POST /api/clients/:id/credentials  (admin)
// Define o USUÁRIO e a SENHA de acesso do cliente à Área do Cliente.
// Só o admin cria/altera (o cliente não troca a própria senha). Um usuário por
// cliente. Ao definir, o acesso é liberado (access_enabled=1).
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { hashPassword } from "../../_lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ username?: string; password?: string }>(request);
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";

    if (!username) return error(400, "Informe o nome de usuário.");
    if (!/^[a-z0-9._@-]{3,}$/.test(username)) {
      return error(400, "Usuário: use ao menos 3 caracteres (letras, números, . _ - @).");
    }

    const c = await env.DB.prepare("SELECT id, password_hash AS hash FROM clients WHERE id = ? AND deleted_at IS NULL")
      .bind(id).first<{ id: string; hash: string | null }>();
    if (!c) return error(404, "Cliente não encontrado.");

    // Usuário único entre clientes.
    const clash = await env.DB.prepare("SELECT id FROM clients WHERE username = ? AND id != ?")
      .bind(username, id).first();
    if (clash) return error(409, "Esse usuário já está em uso por outro cliente.");

    // Senha obrigatória no 1º cadastro; depois é opcional (só troca se enviar).
    if (password) {
      if (password.length < 6) return error(400, "A senha deve ter ao menos 6 caracteres.");
      const hash = await hashPassword(password);
      await env.DB.prepare(
        "UPDATE clients SET username = ?, password_hash = ?, access_enabled = 1, updated_at = datetime('now') WHERE id = ?"
      ).bind(username, hash, id).run();
    } else {
      if (!c.hash) return error(400, "Defina uma senha para o primeiro acesso.");
      await env.DB.prepare(
        "UPDATE clients SET username = ?, access_enabled = 1, updated_at = datetime('now') WHERE id = ?"
      ).bind(username, id).run();
    }

    return json({ ok: true, username });
  } catch (e) {
    return toErrorResponse(e);
  }
};

// /api/auth/profile
//   GET → { username, name } do usuário logado.
//   PUT → atualiza nome de exibição, login (username) e/ou senha.
//         Body: { name?, username?, currentPassword?, newPassword? }
//         Senha só muda se newPassword vier + currentPassword conferir.
//         Se o username mudar, reemite o cookie de sessão para não deslogar.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import {
  requireAuth,
  verifyPassword,
  hashPassword,
  createSessionToken,
  sessionCookie,
} from "../_lib/auth";

interface Body {
  name?: string;
  username?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const session = await requireAuth(request, env);
    const row = await env.DB.prepare("SELECT username, name FROM admin_users WHERE username = ?")
      .bind(session.sub)
      .first<{ username: string; name: string | null }>();
    if (!row) return error(404, "Usuário não encontrado.");
    return json({ username: row.username, name: row.name ?? "" });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const session = await requireAuth(request, env);
    const body = await readJson<Body>(request);

    const row = await env.DB.prepare("SELECT username, name, password_hash FROM admin_users WHERE username = ?")
      .bind(session.sub)
      .first<{ username: string; name: string | null; password_hash: string }>();
    if (!row) return error(404, "Usuário não encontrado.");

    const newName = typeof body.name === "string" ? body.name.trim() : undefined;
    const newUsername = typeof body.username === "string" ? body.username.trim() : undefined;

    if (newUsername !== undefined && !newUsername) {
      return error(400, "O usuário (login) não pode ficar vazio.");
    }
    if (newUsername && newUsername !== row.username) {
      const taken = await env.DB.prepare("SELECT 1 FROM admin_users WHERE username = ?").bind(newUsername).first();
      if (taken) return error(409, "Esse nome de usuário já está em uso.");
    }

    // Troca de senha (opcional).
    let newHash: string | null = null;
    if (body.newPassword) {
      if (!body.currentPassword || !(await verifyPassword(body.currentPassword, row.password_hash))) {
        return error(401, "Senha atual incorreta.");
      }
      if (body.newPassword.length < 6) {
        return error(400, "A nova senha precisa ter ao menos 6 caracteres.");
      }
      newHash = await hashPassword(body.newPassword);
    }

    const finalUsername = newUsername || row.username;
    const finalName = newName !== undefined ? newName || null : row.name;

    if (newHash) {
      await env.DB.prepare("UPDATE admin_users SET username = ?, name = ?, password_hash = ? WHERE username = ?")
        .bind(finalUsername, finalName, newHash, row.username)
        .run();
    } else {
      await env.DB.prepare("UPDATE admin_users SET username = ?, name = ? WHERE username = ?")
        .bind(finalUsername, finalName, row.username)
        .run();
    }

    // Se o login mudou, reemite o cookie de sessão (senão a sessão fica órfã).
    const headers: Record<string, string> = {};
    if (finalUsername !== session.sub) {
      const token = await createSessionToken(finalUsername, env.SESSION_SECRET);
      headers["Set-Cookie"] = sessionCookie(token);
    }
    return json({ ok: true, username: finalUsername, name: finalName ?? "" }, { headers });
  } catch (e) {
    return toErrorResponse(e);
  }
};

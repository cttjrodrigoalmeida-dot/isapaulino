// POST /api/auth/change-password  { currentPassword, newPassword }
//   Autenticado. Valida a senha atual e grava o novo hash PBKDF2.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth, verifyPassword, hashPassword } from "../_lib/auth";

interface Body {
  currentPassword?: string;
  newPassword?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const session = await requireAuth(request, env);
    const { currentPassword, newPassword } = await readJson<Body>(request);

    if (!currentPassword || !newPassword) {
      return error(400, "Informe a senha atual e a nova senha.");
    }
    if (newPassword.length < 6) {
      return error(400, "A nova senha precisa ter ao menos 6 caracteres.");
    }

    const row = await env.DB.prepare(
      "SELECT password_hash FROM admin_users WHERE username = ?"
    )
      .bind(session.sub)
      .first<{ password_hash: string }>();

    if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
      return error(401, "Senha atual incorreta.");
    }

    const newHash = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE admin_users SET password_hash = ? WHERE username = ?")
      .bind(newHash, session.sub)
      .run();

    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

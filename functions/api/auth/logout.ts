// POST /api/auth/logout → limpa o cookie de sessão.
import type { Env } from "../_lib/types";
import { json } from "../_lib/http";
import { clearSessionCookie } from "../_lib/auth";

export const onRequestPost: PagesFunction<Env> = async () => {
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
};

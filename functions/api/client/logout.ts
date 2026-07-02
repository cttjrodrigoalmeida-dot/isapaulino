// POST /api/client/logout → limpa o cookie de sessão do cliente.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { clearClientCookie } from "../_lib/client-auth";

export const onRequestPost: PagesFunction<Env> = async () => {
  try {
    return json({ ok: true }, { headers: { "Set-Cookie": clearClientCookie() } });
  } catch (e) {
    return toErrorResponse(e);
  }
};

// Helper de notificações do painel (sininho). Cria uma notificação de forma
// idempotente via dedup_key (o mesmo evento — ex. "pagamento X recebido" — não
// gera duplicata mesmo se o webhook reenviar). Nunca lança: falha de
// notificação jamais deve quebrar o fluxo principal (webhook/pagamento).
import type { Env } from "./types";

export interface NotificationInput {
  type: "payment" | "signature" | "info";
  title: string;
  body?: string | null;
  link?: string | null;
  dedupKey?: string | null;
}

export async function createNotification(env: Env, n: NotificationInput): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO notifications (id, type, title, body, link, dedup_key)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(dedup_key) DO NOTHING`
    )
      .bind(crypto.randomUUID(), n.type, n.title, n.body ?? null, n.link ?? null, n.dedupKey ?? null)
      .run();
  } catch {
    // silencioso de propósito — não deixa a notificação derrubar o fluxo.
  }
}

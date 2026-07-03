// Middleware de todas as rotas /api/*. Registra em audit_logs as ações que
// alteram dados (POST/PUT/DELETE) feitas por um admin logado. Nunca bloqueia
// nem quebra a resposta — o log é "best effort" e roda após a resposta pronta.
import type { Env } from "./_lib/types";
import { getSession } from "./_lib/auth";

// Caminhos que NÃO viram log (ruído / não são ação de admin).
const SKIP = [/^\/api\/webhooks\//, /^\/api\/client\//, /^\/api\/notifications$/];

// Rótulo legível a partir de método + caminho.
function describe(method: string, path: string): string {
  const rules: [RegExp, string][] = [
    [/^\/api\/contracts\/[^/]+\/publish$/, "Publicou contrato"],
    [/^\/api\/contracts\/[^/]+\/send-autentique$/, "Enviou contrato para assinatura"],
    [/^\/api\/contracts\/[^/]+\/refresh-signature$/, "Atualizou status da assinatura"],
    [/^\/api\/contracts\/[^/]+\/generate-asaas$/, "Gerou cobranças no ASAAS"],
    [/^\/api\/contracts\/[^/]+\/sync-payments$/, "Sincronizou pagamentos com o ASAAS"],
    [/^\/api\/contracts\/[^/]+\/payments$/, "Definiu plano de pagamento"],
    [/^\/api\/contracts(\/[^/]+)?$/, method === "DELETE" ? "Excluiu contrato" : method === "POST" ? "Criou contrato" : "Editou contrato"],
    [/^\/api\/clients\/[^/]+\/history/, "Lançamento no Histórico Financeiro"],
    [/^\/api\/clients\/[^/]+\/access$/, "Alterou acesso do cliente"],
    [/^\/api\/clients(\/[^/]+)?$/, method === "DELETE" ? "Excluiu cliente" : method === "POST" ? "Criou cliente" : "Editou cliente"],
    [/^\/api\/proposals(\/[^/]+)?$/, method === "DELETE" ? "Excluiu proposta" : method === "POST" ? "Criou proposta" : "Editou proposta"],
    [/^\/api\/briefings(\/[^/]+)?$/, method === "DELETE" ? "Excluiu briefing" : "Editou briefing"],
    [/^\/api\/documents$/, method === "DELETE" ? "Excluiu arquivo" : "Enviou arquivo"],
    [/^\/api\/upload$/, "Enviou imagem"],
    [/^\/api\/settings$/, "Alterou configuração"],
    [/^\/api\/auth\/login$/, "Fez login"],
    [/^\/api\/auth\/logout$/, "Fez logout"],
    [/^\/api\/auth\/profile$/, "Alterou a própria conta"],
    [/^\/api\/calendar/, "Alterou a agenda"],
  ];
  for (const [re, label] of rules) if (re.test(path)) return label;
  return `${method} ${path}`;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const res = await ctx.next();
  try {
    const { request, env } = ctx;
    const method = request.method.toUpperCase();
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      const path = new URL(request.url).pathname;
      if (!SKIP.some((re) => re.test(path))) {
        const session = await getSession(request, env).catch(() => null);
        // registra assíncrono, sem segurar a resposta
        ctx.waitUntil(
          env.DB.prepare(
            "INSERT INTO audit_logs (id, user, action, method, path, status) VALUES (?, ?, ?, ?, ?, ?)"
          )
            .bind(crypto.randomUUID(), session?.sub ?? null, describe(method, path), method, path, res.status)
            .run()
            .catch(() => {})
        );
      }
    }
  } catch {
    /* nunca deixa o log quebrar a requisição */
  }
  return res;
};

// Middleware da RAIZ (roda antes de tudo, inclusive dos arquivos estáticos).
//
// Consolida o domínio: quem chega pelo antigo `isabelapaulino.com.br` é levado
// com **301** para `isabelapaulino.com`, mantendo caminho e query. É o 301 que
// diz ao Google "o endereço definitivo é o .com" e junta a força dos dois
// domínios num só — os links já enviados aos clientes continuam funcionando.
//
// DUAS EXCEÇÕES, de propósito:
//  1. Só redireciona GET/HEAD. Um POST que recebe 301 pode chegar ao destino
//     como GET (ou nem chegar), então nada que ESCREVE é redirecionado.
//  2. `/api/webhooks/` nunca é redirecionado: ASAAS e Autentique estão
//     cadastrados apontando para o .com.br e precisam continuar caindo aqui.
import type { Env } from "./api/_lib/types";

const DOMINIO_ANTIGO = "isabelapaulino.com.br";
const DOMINIO_NOVO = "https://isabelapaulino.com";

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request } = ctx;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  const ehDominioAntigo = host === DOMINIO_ANTIGO || host.endsWith(`.${DOMINIO_ANTIGO}`);
  const metodoSeguro = request.method === "GET" || request.method === "HEAD";
  const ehWebhook = url.pathname.startsWith("/api/webhooks/");

  if (ehDominioAntigo && metodoSeguro && !ehWebhook) {
    return Response.redirect(`${DOMINIO_NOVO}${url.pathname}${url.search}`, 301);
  }

  return ctx.next();
};

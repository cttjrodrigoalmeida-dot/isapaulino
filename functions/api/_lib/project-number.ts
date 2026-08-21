// Unicidade do NÚMERO DE PROJETO no sistema.
//
// O número (ex.: "2624") é a identidade do PROJETO e o elo entre os documentos:
// a mesma proposta, contrato e briefing de um projeto usam o MESMO número — e é
// assim que se vinculam (e que o calendário puxa as informações). Por isso um
// número pode se repetir entre os documentos do MESMO cliente, mas NUNCA pode
// pertencer a dois projetos/clientes diferentes (senão confunde a Área do Cliente).
//
// Exceção do usuário: um termo ADITIVO usa o mesmo número do contrato original —
// mas isso já é o MESMO cliente, então cai naturalmente na regra do "mesmo cliente".
import type { Env } from "./types";

/** Normaliza o nome do cliente para comparar (mesma regra do vínculo por nome). */
function norm(s: unknown): string {
  return (typeof s === "string" ? s : "").trim().toLowerCase();
}

export interface NumberOwner {
  /** Nome do cliente dono do documento (pode ser null quando indeterminado). */
  client: string | null;
  /** Tipo do documento que usa o número. */
  kind: "proposta" | "briefing" | "contrato";
}

/**
 * Todos os documentos (proposta, briefing, contrato) que já usam este número,
 * com o nome do cliente dono de cada um. Ignora documentos na lixeira e permite
 * excluir o próprio documento (para updates) via `exclude`.
 */
export async function ownersOfNumber(
  env: Env,
  number: string,
  exclude: { proposalNumber?: string; briefingNumber?: string; contractId?: string } = {}
): Promise<NumberOwner[]> {
  const n = number.trim();
  const owners: (NumberOwner & { key: string })[] = [];
  if (!n) return owners;

  // Propostas: o cliente é a coluna `client` (nome).
  {
    const { results } = await env.DB.prepare(
      "SELECT number AS key, client AS name FROM proposals WHERE number = ? AND deleted_at IS NULL"
    ).bind(n).all<{ key: string; name: string | null }>();
    for (const r of results ?? []) {
      if (exclude.proposalNumber && r.key === exclude.proposalNumber) continue;
      owners.push({ key: r.key, client: r.name, kind: "proposta" });
    }
  }

  // Briefings: o cliente vem da proposta vinculada (proposal_number).
  {
    const { results } = await env.DB.prepare(
      `SELECT b.number AS key,
              (SELECT p.client FROM proposals p WHERE p.number = b.proposal_number AND p.deleted_at IS NULL) AS name
         FROM briefings b WHERE b.number = ? AND b.deleted_at IS NULL`
    ).bind(n).all<{ key: string; name: string | null }>();
    for (const r of results ?? []) {
      if (exclude.briefingNumber && r.key === exclude.briefingNumber) continue;
      owners.push({ key: r.key, client: r.name, kind: "briefing" });
    }
  }

  // Contratos: o número fica no JSON (`contractNumber`); o cliente vem do client_id.
  {
    const { results } = await env.DB.prepare(
      `SELECT c.id AS key, cl.name AS name
         FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.deleted_at IS NULL AND json_extract(c.data, '$.contractNumber') = ?`
    ).bind(n).all<{ key: string; name: string | null }>();
    for (const r of results ?? []) {
      if (exclude.contractId && r.key === exclude.contractId) continue;
      owners.push({ key: r.key, client: r.name, kind: "contrato" });
    }
  }

  return owners.map(({ key: _key, ...o }) => o);
}

/**
 * Se o número já pertence a OUTRO cliente, devolve o nome desse cliente (para a
 * mensagem de erro); caso contrário, `null` (livre ou mesmo cliente = mesmo
 * projeto). Só bloqueia quando há um dono com nome CONHECIDO e diferente — dono
 * indeterminado nunca bloqueia, para não travar salvamentos legítimos.
 */
export async function conflictingClientForNumber(
  env: Env,
  number: string,
  ownerName: string,
  exclude: { proposalNumber?: string; briefingNumber?: string; contractId?: string } = {}
): Promise<string | null> {
  const me = norm(ownerName);
  const owners = await ownersOfNumber(env, number, exclude);
  for (const o of owners) {
    const on = norm(o.client);
    if (on && me && on !== me) return o.client;
  }
  return null;
}

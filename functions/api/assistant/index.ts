// POST /api/assistant
//   { messages: [{ role: "user"|"assistant", content }] }  → { answer }
//   Assistente de IA do painel (Workers AI). Monta um retrato compacto dos dados
//   reais do estúdio (D1) e pede ao modelo que responda só com base nisso.
//   Autenticado (admin). Sem chave externa — usa o binding `env.AI`.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

interface ChatMsg { role: "user" | "assistant" | "system"; content: string }
interface Body { messages?: ChatMsg[] }

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

// "R$ 1.900,00" → 1900 (mesma regra do dashboard). Não parseável → 0.
function parseBRL(v: unknown): number {
  if (typeof v !== "string") return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
function fmtDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

// Monta um "retrato" textual dos números do estúdio para alimentar o modelo.
async function buildSnapshot(env: Env, today: string): Promise<string> {
  const [
    propsRes, contractsRes, briefRes, respRes, clientsRes,
    instRes, hfRes, cpRes, overdueRes, tasksRes,
  ] = await Promise.all([
    env.DB.prepare("SELECT status, outcome, data FROM proposals WHERE deleted_at IS NULL").all<{ status: string; outcome: string; data: string }>(),
    env.DB.prepare("SELECT status, COUNT(*) c FROM contracts WHERE deleted_at IS NULL GROUP BY status").all<{ status: string; c: number }>(),
    env.DB.prepare("SELECT number, status FROM briefings WHERE deleted_at IS NULL").all<{ number: string; status: string }>(),
    env.DB.prepare("SELECT briefing_number, COUNT(*) c FROM briefing_responses GROUP BY briefing_number").all<{ briefing_number: string; c: number }>(),
    env.DB.prepare("SELECT COUNT(*) c FROM clients WHERE deleted_at IS NULL").first<{ c: number }>(),
    env.DB.prepare("SELECT status, COALESCE(SUM(amount),0) amt, COUNT(*) cnt FROM installments GROUP BY status").all<{ status: string; amt: number; cnt: number }>(),
    env.DB.prepare("SELECT status, COALESCE(SUM(amount),0) amt FROM client_history GROUP BY status").all<{ status: string; amt: number }>(),
    env.DB.prepare("SELECT COALESCE(SUM(total_value),0) faturado FROM contract_payments").first<{ faturado: number }>(),
    env.DB.prepare(
      `SELECT i.due_date due, i.amount amount, c.title title, cl.name client
       FROM installments i
       JOIN contracts c ON c.id = i.contract_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE i.status = 'overdue' ORDER BY i.due_date ASC LIMIT 15`
    ).all<{ due: string; amount: number; title: string | null; client: string | null }>(),
    env.DB.prepare("SELECT title, priority, status, due_date due FROM tasks WHERE status != 'concluida' ORDER BY (due_date IS NULL), due_date ASC LIMIT 20").all<{ title: string; priority: string; status: string; due: string | null }>(),
  ]);

  // Propostas
  const props = propsRes.results ?? [];
  let pDraft = 0, pPub = 0, aprCount = 0, aprValue = 0, lostCount = 0;
  for (const p of props) {
    if (p.status === "published") pPub++; else pDraft++;
    let v = 0; try { v = parseBRL((JSON.parse(p.data) as { total?: string }).total); } catch { /* ignore */ }
    const approved = p.outcome === "aprovada" && p.status !== "cancelled";
    if (approved) { aprCount++; aprValue += v; } else lostCount++;
  }

  // Contratos
  const cByStatus = new Map((contractsRes.results ?? []).map((r) => [r.status, r.c]));
  const contractsTotal = (contractsRes.results ?? []).reduce((s, r) => s + r.c, 0);

  // Briefings
  const briefs = briefRes.results ?? [];
  const respCounts = new Map((respRes.results ?? []).map((r) => [r.briefing_number, r.c]));
  const withoutResp = briefs.filter((b) => (respCounts.get(b.number) ?? 0) === 0).length;

  // Financeiro
  const inst = new Map((instRes.results ?? []).map((r) => [r.status, { amt: r.amt, cnt: r.cnt }]));
  const hf = new Map((hfRes.results ?? []).map((r) => [r.status, r.amt]));
  const hfPaid = hf.get("paid") ?? 0, hfCharged = hf.get("charged") ?? 0;
  const faturado = (cpRes?.faturado ?? 0) + hfPaid + hfCharged;
  const recebido = (inst.get("received")?.amt ?? 0) + hfPaid;
  const aReceber = (inst.get("pending")?.amt ?? 0) + (inst.get("confirmed")?.amt ?? 0) + (inst.get("overdue")?.amt ?? 0) + hfCharged;
  const atrasadosCnt = inst.get("overdue")?.cnt ?? 0;

  const overdue = overdueRes.results ?? [];
  const tasks = tasksRes.results ?? [];
  const overdueTasks = tasks.filter((t) => t.due && t.due < today).length;

  const L: string[] = [];
  L.push(`Data de hoje: ${fmtDateBR(today)}.`);
  L.push("");
  L.push("FINANCEIRO:");
  L.push(`- Faturado (contratos + serviços): ${BRL(faturado)}`);
  L.push(`- Já recebido: ${BRL(recebido)}`);
  L.push(`- A receber (em aberto): ${BRL(aReceber)}`);
  L.push(`- Parcelas atrasadas: ${atrasadosCnt}`);
  if (overdue.length) {
    L.push("- Lista de parcelas atrasadas (cliente | projeto | vencimento | valor):");
    for (const o of overdue) L.push(`   • ${o.client ?? "—"} | ${o.title ?? "—"} | ${fmtDateBR(o.due)} | ${BRL(o.amount)}`);
  }
  L.push("");
  L.push("PROPOSTAS:");
  L.push(`- Total: ${props.length} (rascunho: ${pDraft}, publicadas: ${pPub})`);
  L.push(`- Aprovadas: ${aprCount} somando ${BRL(aprValue)} | não aprovadas/perdidas: ${lostCount}`);
  L.push("");
  L.push("CONTRATOS:");
  L.push(`- Total: ${contractsTotal} (rascunho: ${cByStatus.get("draft") ?? 0}, publicados: ${cByStatus.get("published") ?? 0}, assinados: ${cByStatus.get("signed") ?? 0})`);
  L.push("");
  L.push("BRIEFINGS:");
  L.push(`- Total: ${briefs.length} | sem resposta ainda: ${withoutResp}`);
  L.push("");
  L.push(`CLIENTES: ${clientsRes?.c ?? 0} cadastrados.`);
  L.push("");
  L.push("TAREFAS (abertas):");
  L.push(`- Total abertas: ${tasks.length} | atrasadas: ${overdueTasks}`);
  if (tasks.length) {
    for (const t of tasks.slice(0, 12)) L.push(`   • ${t.title} (prioridade ${t.priority}${t.due ? `, vence ${fmtDateBR(t.due)}` : ", sem data"})`);
  }
  return L.join("\n");
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    if (!env.AI) return error(501, "A IA ainda não está configurada neste ambiente.");

    const body = await readJson<Body>(request);
    const history = Array.isArray(body.messages) ? body.messages : [];
    if (history.length === 0) return error(400, "Envie uma pergunta.");

    const today = new Date().toISOString().slice(0, 10);
    const snapshot = await buildSnapshot(env, today);

    const system =
      "Você é o assistente de IA do painel do Isabela Paulino Studio (estúdio de arquitetura/design de interiores). " +
      "Responda em português do Brasil, de forma clara, direta e amigável. " +
      "Baseie-se EXCLUSIVAMENTE nos dados do painel fornecidos abaixo — não invente números nem clientes. " +
      "Se a informação pedida não estiver nos dados, diga com franqueza que ainda não tem esse dado no painel. " +
      "Valores em reais no formato R$. Seja conciso; use listas curtas quando ajudar.\n\n" +
      "=== DADOS ATUAIS DO PAINEL ===\n" + snapshot;

    // Limita o histórico (últimas 10 mensagens) e o tamanho de cada uma.
    const trimmed = history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 2000),
    }));

    const result = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: system }, ...trimmed],
      max_tokens: 800,
    }) as { response?: string };

    const answer = (result?.response ?? "").trim() || "Desculpe, não consegui gerar uma resposta agora. Tente reformular.";
    return json({ answer });
  } catch (e) {
    return toErrorResponse(e);
  }
};

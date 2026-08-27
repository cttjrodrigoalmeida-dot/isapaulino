// POST /api/client/assistant  (cliente autenticado)
//   { messages: [{ role, content }] }  → { answer }
//   Assistente de IA da Área do Cliente (Workers AI). Monta um retrato SÓ dos
//   dados do próprio cliente e responde com base nisso. Sem chave externa.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireVerifiedClient } from "../../_lib/client-auth";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

interface ChatMsg { role: "user" | "assistant" | "system"; content: string }
interface Body { messages?: ChatMsg[] }

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
function fmtDateBR(iso: string | null): string {
  if (!iso) return "—";
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const [y, m, d] = s.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
  return s;
}

const PAID = new Set(["received", "confirmed"]);

async function buildClientSnapshot(env: Env, clientId: string): Promise<{ name: string; text: string }> {
  const client = await env.DB.prepare("SELECT name FROM clients WHERE id = ?").bind(clientId).first<{ name: string }>();
  const name = client?.name?.split(" ")[0] ?? "cliente";

  const [contractsRes, instRes, phRes, filesCount] = await Promise.all([
    env.DB.prepare("SELECT title, status, signed_at signedAt FROM contracts WHERE client_id = ? AND deleted_at IS NULL AND status IN ('published','signed') ORDER BY updated_at DESC").bind(clientId).all<{ title: string; status: string; signedAt: string | null }>(),
    env.DB.prepare("SELECT i.installment_number num, i.due_date due, i.amount amount, i.status status FROM installments i JOIN contracts c ON c.id = i.contract_id WHERE c.client_id = ? AND i.status != 'deleted' ORDER BY i.due_date ASC").bind(clientId).all<{ num: number; due: string; amount: number; status: string }>(),
    env.DB.prepare("SELECT ph.date, ph.type, ph.description, ph.phase FROM project_history ph JOIN contracts c ON c.id = ph.contract_id WHERE c.client_id = ? AND c.status = 'signed' AND c.deleted_at IS NULL ORDER BY ph.date DESC, ph.created_at DESC LIMIT 8").bind(clientId).all<{ date: string; type: string; description: string; phase: string | null }>(),
    env.DB.prepare("SELECT COUNT(*) c FROM client_history WHERE client_id = ? AND status != 'cancelled'").bind(clientId).first<{ c: number }>(),
  ]);

  const contracts = contractsRes.results ?? [];
  const inst = instRes.results ?? [];
  const ph = phRes.results ?? [];

  const paid = inst.filter((i) => PAID.has(i.status));
  const open = inst.filter((i) => !PAID.has(i.status));
  const paidTotal = paid.reduce((s, i) => s + (i.amount || 0), 0);
  const openTotal = open.reduce((s, i) => s + (i.amount || 0), 0);
  const next = [...open].sort((a, b) => (a.due || "").localeCompare(b.due || ""))[0] || null;

  const L: string[] = [];
  L.push(`Cliente: ${client?.name ?? "—"}.`);
  L.push("");
  L.push("CONTRATO:");
  if (contracts.length === 0) L.push("- Nenhum contrato disponível ainda.");
  for (const c of contracts) {
    L.push(`- ${c.title}: ${c.status === "signed" ? `assinado${c.signedAt ? ` em ${fmtDateBR(c.signedAt)}` : ""}` : "aguardando assinatura"}.`);
  }
  L.push("");
  L.push("PAGAMENTOS:");
  L.push(`- Total já pago: ${BRL(paidTotal)} | em aberto: ${BRL(openTotal)}.`);
  if (next) L.push(`- Próximo pagamento: ${next.num === 0 ? "entrada" : `${next.num}ª parcela`} de ${BRL(next.amount)}, vence ${fmtDateBR(next.due)}.`);
  else L.push("- Não há parcelas em aberto no momento.");
  if (open.length) {
    L.push("- Parcelas em aberto (parcela | vencimento | valor):");
    for (const i of open.slice(0, 12)) L.push(`   • ${i.num === 0 ? "entrada" : `${i.num}ª`} | ${fmtDateBR(i.due)} | ${BRL(i.amount)}`);
  }
  L.push("");
  L.push("ANDAMENTO DO PROJETO (etapas mais recentes):");
  if (ph.length === 0) L.push("- Ainda não há etapas registradas (aparecem após a assinatura).");
  for (const e of ph) L.push(`- ${fmtDateBR(e.date)} — ${e.type}${e.phase ? ` (${e.phase})` : ""}: ${e.description}`);
  L.push("");
  L.push(`OUTROS: os documentos compartilhados ficam na aba Arquivos; o histórico financeiro tem ${filesCount?.c ?? 0} lançamento(s). Briefings ficam na aba Briefings.`);
  return { name, text: L.join("\n") };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireVerifiedClient(request, env);
    if (!env.AI) return error(501, "O assistente ainda não está disponível.");

    const body = await readJson<Body>(request);
    const history = Array.isArray(body.messages) ? body.messages : [];
    if (history.length === 0) return error(400, "Envie uma pergunta.");

    const { name, text } = await buildClientSnapshot(env, clientId);

    const system =
      `Você é o assistente virtual da Área do Cliente do Isabela Paulino Studio (arquitetura e design de interiores), conversando com ${name}. ` +
      "Fale em português do Brasil, com tom acolhedor, gentil e claro — você representa o estúdio. " +
      "Responda EXCLUSIVAMENTE com base nos dados do cliente fornecidos abaixo; nunca invente valores, datas ou etapas. " +
      "Se perguntarem algo que não está nos dados (ou assuntos fora do projeto dele), diga com gentileza que não tem essa informação aqui e sugira falar com o estúdio. " +
      "Quando fizer sentido, oriente em qual aba encontrar o que precisa (Contrato, Pagamentos, Andamento, Arquivos). " +
      "Valores em R$. Seja conciso e caloroso.\n\n" +
      "=== DADOS DO CLIENTE ===\n" + text;

    const trimmed = history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 1500),
    }));

    const result = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: system }, ...trimmed],
      max_tokens: 700,
    }) as { response?: string };

    const answer = (result?.response ?? "").trim() || "Desculpe, não consegui responder agora. Pode tentar de novo?";
    return json({ answer });
  } catch (e) {
    return toErrorResponse(e);
  }
};

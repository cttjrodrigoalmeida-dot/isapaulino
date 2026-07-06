// GET /api/dashboard/overview
//   Métricas agregadas do painel, calculadas no servidor a partir dos dados
//   reais existentes (propostas, briefings, respostas). Autenticado.
//   Módulos ainda não construídos (financeiro/ASAAS, contratos, clientes,
//   projetos) retornam zerados — o front exibe estado vazio/placeholder.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

// "R$ 1.900,00" → 1900. Não parseável (ex.: "a combinar") → 0.
function parseBRL(v: unknown): number {
  if (typeof v !== "string") return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// "18/05/2026" → { y: 2026, m: 5 }  (m = 1..12). Inválido → null.
function parseDateBR(v: unknown): { y: number; m: number } | null {
  if (typeof v !== "string") return null;
  const mm = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!mm) return null;
  const m = parseInt(mm[2], 10);
  const y = parseInt(mm[3], 10);
  if (m < 1 || m > 12) return null;
  return { y, m };
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Extrai dia/mês de um nascimento em texto livre ("21/08/1995", "21/08",
// "1995-08-21"). Retorna null se não reconhecer números de data.
function parseBirthday(v: unknown): { day: number; month: number } | null {
  if (typeof v !== "string") return null;
  let day: number;
  let month: number;
  const iso = v.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    month = parseInt(iso[2], 10);
    day = parseInt(iso[3], 10);
  } else {
    const br = v.match(/(\d{1,2})[/.\-](\d{1,2})/);
    if (!br) return null;
    day = parseInt(br[1], 10);
    month = parseInt(br[2], 10);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month };
}

interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  photo_url: string | null;
}
interface CalendarRow {
  id: string;
  date: string;
  time: string | null;
  title: string;
  kind: string;
}

interface ProposalRow {
  number: string;
  client: string | null;
  date: string | null;
  status: string;
  data: string;
  updated_at: string;
}
interface BriefingRow {
  number: string;
  title: string | null;
  status: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);

    // "Hoje" vem do cliente (fuso do navegador) para casar com o Calendário;
    // se ausente/inválido, usa a data do servidor (UTC).
    const todayParam = new URL(request.url).searchParams.get("today");
    const todayStr = todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : new Date().toISOString().slice(0, 10);

    const [propsRes, briefsRes, respCountRes, recentRespRes, faturadoRes, instByStatusRes, recvByMonthRes, contractsCountRes, hfByStatusRes, hfRecvByMonthRes, annualGoalRes, calendarRes, clientsRes] = await Promise.all([
      env.DB.prepare(
        "SELECT number, client, date, status, data, updated_at FROM proposals"
      ).all<ProposalRow>(),
      env.DB.prepare(
        "SELECT number, title, status, updated_at FROM briefings"
      ).all<BriefingRow>(),
      env.DB.prepare(
        "SELECT briefing_number, COUNT(*) AS c FROM briefing_responses GROUP BY briefing_number"
      ).all<{ briefing_number: string; c: number }>(),
      env.DB.prepare(
        "SELECT briefing_number, client, submitted_at FROM briefing_responses ORDER BY submitted_at DESC LIMIT 8"
      ).all<{ briefing_number: string; client: string | null; submitted_at: string }>(),
      env.DB.prepare("SELECT COALESCE(SUM(total_value), 0) AS faturado FROM contract_payments").first<{ faturado: number }>(),
      env.DB.prepare("SELECT status, COALESCE(SUM(amount), 0) AS amt, COUNT(*) AS cnt FROM installments GROUP BY status").all<{ status: string; amt: number; cnt: number }>(),
      env.DB.prepare("SELECT substr(payment_date, 1, 7) AS ym, COALESCE(SUM(amount), 0) AS amt FROM installments WHERE status = 'received' AND payment_date IS NOT NULL GROUP BY ym").all<{ ym: string; amt: number }>(),
      env.DB.prepare("SELECT status, COUNT(*) AS c FROM contracts WHERE deleted_at IS NULL GROUP BY status").all<{ status: string; c: number }>(),
      // Histórico Financeiro (serviços adicionais): também são receita.
      env.DB.prepare("SELECT status, COALESCE(SUM(amount), 0) AS amt, COUNT(*) AS cnt FROM client_history GROUP BY status").all<{ status: string; amt: number; cnt: number }>(),
      env.DB.prepare("SELECT substr(paid_at, 1, 7) AS ym, COALESCE(SUM(amount), 0) AS amt FROM client_history WHERE status = 'paid' AND paid_at IS NOT NULL GROUP BY ym").all<{ ym: string; amt: number }>(),
      env.DB.prepare("SELECT value FROM app_settings WHERE key = 'annual_goal'").first<{ value: string | null }>(),
      // Agenda: itens de hoje + atrasados não concluídos (alimentam "Atenção hoje").
      env.DB.prepare(
        "SELECT id, date, time, title, kind FROM calendar_events WHERE done = 0 AND date <= ? ORDER BY date ASC, time ASC LIMIT 12"
      ).bind(todayStr).all<CalendarRow>(),
      // Clientes (para aniversariantes e fotos no ranking).
      env.DB.prepare(
        "SELECT id, name, phone, birth_date, photo_url FROM clients WHERE deleted_at IS NULL"
      ).all<ClientRow>(),
    ]);

    const proposals = propsRes.results ?? [];
    const briefings = briefsRes.results ?? [];
    const respCounts = new Map<string, number>(
      (respCountRes.results ?? []).map((r) => [r.briefing_number, r.c])
    );
    const responsesTotal = (respCountRes.results ?? []).reduce((s, r) => s + r.c, 0);

    // Clientes → mapa nome (minúsculo) para anexar foto/telefone ao ranking
    // (o ranking é agrupado por NOME da proposta, não por client_id).
    const allClients = clientsRes.results ?? [];
    const clientByName = new Map<string, { id: string; phone: string | null; photo: string | null }>();
    for (const c of allClients) {
      const key = (c.name ?? "").trim().toLowerCase();
      if (key && !clientByName.has(key)) clientByName.set(key, { id: c.id, phone: c.phone, photo: c.photo_url });
    }

    // ── Propostas: status, valores, ranking, faturamento por mês ──
    let pDraft = 0;
    let pPublished = 0;
    let totalValue = 0;
    const byClient = new Map<string, { total: number; count: number }>();

    // 12 baldes mensais terminando no mês atual
    const now = new Date();
    const buckets: { key: string; label: string; value: number }[] = [];
    const bucketIndex = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      bucketIndex.set(key, buckets.length);
      buckets.push({ key, label: MONTHS_PT[d.getMonth()], value: 0 });
    }

    for (const p of proposals) {
      if (p.status === "published") pPublished++;
      else pDraft++;

      let value = 0;
      try {
        const parsed = JSON.parse(p.data) as { total?: string };
        value = parseBRL(parsed.total);
      } catch {
        /* JSON inválido — ignora valor */
      }
      totalValue += value;

      const clientName = (p.client ?? "Sem cliente").trim() || "Sem cliente";
      const agg = byClient.get(clientName) ?? { total: 0, count: 0 };
      agg.total += value;
      agg.count += 1;
      byClient.set(clientName, agg);

      const dt = parseDateBR(p.date);
      if (dt) {
        const key = `${dt.y}-${String(dt.m).padStart(2, "0")}`;
        const idx = bucketIndex.get(key);
        if (idx !== undefined) buckets[idx].value += value;
      }
    }

    const proposalsTotal = proposals.length;
    const avgTicket = proposalsTotal > 0 ? totalValue / proposalsTotal : 0;

    const clientRanking = [...byClient.entries()]
      .map(([client, v]) => {
        const meta = clientByName.get(client.trim().toLowerCase());
        return { client, total: v.total, count: v.count, photo: meta?.photo ?? null, clientId: meta?.id ?? null };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // ── Briefings ──
    let bDraft = 0;
    let bPublished = 0;
    let withoutResponse = 0;
    for (const b of briefings) {
      if (b.status === "published") bPublished++;
      else bDraft++;
      if ((respCounts.get(b.number) ?? 0) === 0) withoutResponse++;
    }

    // ── Atividades recentes (propostas + briefings + respostas) ──
    type Activity = { at: string; type: string; title: string; sub: string };
    const activity: Activity[] = [];
    for (const p of proposals) {
      activity.push({
        at: p.updated_at,
        type: "proposta",
        title: `Proposta #${p.number}`,
        sub: p.client ?? "—",
      });
    }
    for (const b of briefings) {
      activity.push({
        at: b.updated_at,
        type: "briefing",
        title: `Briefing #${b.number}`,
        sub: b.title ?? "—",
      });
    }
    for (const r of recentRespRes.results ?? []) {
      activity.push({
        at: r.submitted_at,
        type: "resposta",
        title: `Briefing #${r.briefing_number} respondido`,
        sub: r.client ?? "Cliente",
      });
    }
    activity.sort((a, b) => (a.at < b.at ? 1 : -1));
    const recentActivity = activity.slice(0, 8);

    // ── Atenção hoje (pendências reais) ──
    const pendencias: { kind: string; count: number; label: string }[] = [];
    if (withoutResponse > 0)
      pendencias.push({
        kind: "briefing",
        count: withoutResponse,
        label: withoutResponse === 1 ? "Briefing aguardando resposta" : "Briefings aguardando resposta",
      });
    if (pDraft > 0)
      pendencias.push({
        kind: "proposta",
        count: pDraft,
        label: pDraft === 1 ? "Proposta em rascunho" : "Propostas em rascunho",
      });

    // ── Atenção hoje (agenda): itens de hoje + atrasados não concluídos ──
    const agendaHoje = (calendarRes.results ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      time: e.time,
      kind: e.kind === "compromisso" ? "compromisso" : "tarefa",
      date: e.date,
      overdue: e.date < todayStr,
    }));

    // ── Aniversariantes: hoje + próximos 30 dias ──
    const [ty, tm, td] = todayStr.split("-").map(Number);
    const todayMs = Date.UTC(ty, tm - 1, td);
    const aniversariantes = allClients
      .map((c) => {
        const b = parseBirthday(c.birth_date);
        if (!b) return null;
        let next = Date.UTC(ty, b.month - 1, b.day);
        if (next < todayMs) next = Date.UTC(ty + 1, b.month - 1, b.day);
        const days = Math.round((next - todayMs) / 86400000);
        if (days > 30) return null;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          photo: c.photo_url,
          date: `${String(b.day).padStart(2, "0")}/${String(b.month).padStart(2, "0")}`,
          days,
          today: days === 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.days - b.days)
      .slice(0, 8);

    // ── Financeiro (parcelas/contratos + Histórico Financeiro) ──
    const byStatus = new Map<string, { amt: number; cnt: number }>(
      (instByStatusRes.results ?? []).map((r) => [r.status, { amt: r.amt, cnt: r.cnt }])
    );
    // HF: 'paid' entra no recebido; 'charged' (cobrado, aguardando) entra no a receber.
    const hfByStatus = new Map<string, { amt: number; cnt: number }>(
      (hfByStatusRes.results ?? []).map((r) => [r.status, { amt: r.amt, cnt: r.cnt }])
    );
    const hfPaid = hfByStatus.get("paid")?.amt ?? 0;
    const hfCharged = hfByStatus.get("charged")?.amt ?? 0;

    // Faturado = valor dos contratos + serviços adicionais já cobrados/pagos.
    const faturado = (faturadoRes?.faturado ?? 0) + hfCharged + hfPaid;
    const recebido = (byStatus.get("received")?.amt ?? 0) + hfPaid;
    const aReceber =
      (byStatus.get("pending")?.amt ?? 0) +
      (byStatus.get("confirmed")?.amt ?? 0) +
      (byStatus.get("overdue")?.amt ?? 0) +
      hfCharged;
    const atrasados = byStatus.get("overdue")?.cnt ?? 0;

    // Recebido por mês — reusa os 12 baldes mensais já montados (parcelas + HF).
    const recvIndex = new Map(buckets.map((b, i) => [b.key, i]));
    const receivedByMonth = buckets.map((b) => ({ key: b.key, label: b.label, value: 0 }));
    for (const r of recvByMonthRes.results ?? []) {
      const idx = recvIndex.get(r.ym);
      if (idx !== undefined) receivedByMonth[idx].value += r.amt;
    }
    for (const r of hfRecvByMonthRes.results ?? []) {
      const idx = recvIndex.get(r.ym);
      if (idx !== undefined) receivedByMonth[idx].value += r.amt;
    }

    const contractsByStatus = new Map<string, number>(
      (contractsCountRes.results ?? []).map((r) => [r.status, r.c])
    );
    const contratosTotal = (contractsCountRes.results ?? []).reduce((sum, r) => sum + r.c, 0);
    const contractsSummary = {
      total: contratosTotal,
      draft: contractsByStatus.get("draft") ?? 0,
      published: contractsByStatus.get("published") ?? 0,
      signed: contractsByStatus.get("signed") ?? 0,
    };

    return json({
      generatedAt: new Date().toISOString(),
      finance: {
        faturado,
        recebido,
        aReceber,
        atrasados,
        receivedByMonth,
        annualGoal: annualGoalRes?.value ? Number(annualGoalRes.value) || 0 : 0,
      },
      proposals: {
        total: proposalsTotal,
        draft: pDraft,
        published: pPublished,
        totalValue,
        avgTicket,
      },
      briefings: {
        total: briefings.length,
        draft: bDraft,
        published: bPublished,
        responsesTotal,
        withoutResponse,
      },
      contracts: contractsSummary,
      // funil: só Propostas e Briefings têm dado real; o resto depende de
      // módulos futuros (leads/contratos/projetos/entregas).
      funnel: {
        leads: 0,
        propostas: proposalsTotal,
        contratos: contratosTotal,
        briefings: briefings.length,
        projetos: 0,
        entregues: 0,
      },
      revenueByMonth: buckets,
      clientRanking,
      recentActivity,
      pendencias,
      agendaHoje,
      aniversariantes,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};

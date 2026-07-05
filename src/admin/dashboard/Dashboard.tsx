import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { api, type DashboardOverview } from "../api";
import s from "./Dashboard.module.css";
import { formatBRL, formatBRLShort, timeAgo, saudacao } from "./format";
import {
  IcRevenue, IcReceived, IcToReceive, IcOverdue, IcTicket, IcGrowth,
  IcArrowRight, IcCalendario,
} from "./icons";

function Card({ title, sub, link, onLink, children }: {
  title: string; sub?: string; link?: string; onLink?: () => void; children: ReactNode;
}) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <div className={s.cardTitleX}>{title}</div>
          {sub && <div className={s.cardSub}>{sub}</div>}
        </div>
      </div>
      {children}
      {link && (
        <button className={s.cardLink} onClick={onLink}>
          {link} <IcArrowRight />
        </button>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, note, soon, badge }: {
  icon: ReactNode; label: string; value: string; note?: string; soon?: boolean; badge?: string;
}) {
  return (
    <div className={`${s.card} ${s.kpi}`}>
      <div className={s.kpiTop}>
        <span className={s.kpiIcon}>{icon}</span>
        {badge && <span className={`${s.kpiBadge} ${s.kpiUp}`}>{badge}</span>}
        {soon && <span className={s.kpiSoon}>requer financeiro</span>}
      </div>
      <span className={s.kpiLabel}>{label}</span>
      <span className={s.kpiValue}>{value}</span>
      {note && <span className={s.kpiNote}>{note}</span>}
    </div>
  );
}

const DASH = "—";

const initials = (name: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

// Link de WhatsApp com parabéns já escritos. Prefixa 55 (Brasil) se faltar DDI.
function waBirthdayLink(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.length <= 11 ? `55${digits}` : digits;
  const first = (name || "").trim().split(/\s+/)[0] || name;
  const msg = `🎉 Feliz aniversário, ${first}! Toda a equipe do Isabela Paulino Studio deseja um dia especial e cheio de realizações. 💛`;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(msg)}`;
}

function IcWhats() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.7-.84-2-.94-.26-.1-.46-.15-.65.15-.19.3-.74.94-.9 1.13-.17.19-.33.22-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.34.44-.52.15-.17.2-.3.3-.5.1-.19.05-.37-.02-.52-.08-.15-.65-1.57-.9-2.15-.24-.57-.48-.49-.65-.5h-.56c-.19 0-.5.07-.77.37-.26.3-1 .98-1 2.4 0 1.4 1.02 2.76 1.17 2.95.14.19 2.02 3.08 4.9 4.32.68.3 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.56-.34zM12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2z" />
    </svg>
  );
}

export default function Dashboard({ username, onGoComercial, onGoContratos, onGoProjetos, onGoAgenda, onGoClientes }: {
  username: string; onGoComercial: () => void; onGoContratos?: () => void; onGoProjetos?: () => void; onGoAgenda?: () => void; onGoClientes?: () => void;
}) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.dashboardOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveGoal = async () => {
    const value = Math.max(0, Math.round(Number(goalInput.replace(/[^\d]/g, "")) || 0));
    setSavingGoal(true);
    try {
      await api.setSetting("annual_goal", String(value));
      setGoalEditing(false);
      await load();
    } catch {
      /* silencioso */
    } finally {
      setSavingGoal(false);
    }
  };

  const today = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  if (error) return <div className={s.emptyMini}>Não foi possível carregar o painel: {error}</div>;
  if (!data) return <div className={s.emptyMini}>Carregando painel…</div>;

  const { proposals, briefings, contracts, funnel, revenueByMonth, clientRanking, recentActivity, pendencias, finance, agendaHoje, aniversariantes } = data;
  const maxRevenue = Math.max(1, ...revenueByMonth.map((m) => m.value));

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>{saudacao()}, {username.split(" ")[0]}! 👋</h1>
          <p className={s.greetSub}>Aqui está o panorama do seu estúdio hoje, {today}.</p>
        </div>
        <span className={s.datePill}><IcCalendario /> {today}</span>
      </div>

      {/* KPIs */}
      <div className={`${s.grid} ${s.kpiRow}`}>
        <Kpi icon={<IcRevenue />} label="Em propostas" value={formatBRLShort(proposals.totalValue)} note={`${proposals.total} propostas`} />
        <Kpi icon={<IcReceived />} label="Recebido" value={formatBRLShort(finance.recebido)} note="Parcelas recebidas" />
        <Kpi icon={<IcToReceive />} label="A receber" value={formatBRLShort(finance.aReceber)} note="Parcelas em aberto" />
        <Kpi icon={<IcOverdue />} label="Em atraso" value={String(finance.atrasados)} note={finance.atrasados === 1 ? "parcela vencida" : "parcelas vencidas"} />
        <Kpi icon={<IcTicket />} label="Ticket médio" value={formatBRLShort(proposals.avgTicket)} note="Por proposta" />
        <Kpi icon={<IcGrowth />} label="Crescimento" value={DASH} soon />
      </div>

      {/* Funil + Receitas 12m + Atenção hoje */}
      <div className={`${s.grid} ${s.cols3}`}>
        <Card title="Funil comercial" sub="Conversão de oportunidades">
          <div className={s.list}>
            {([
              ["Leads", funnel.leads],
              ["Briefings", funnel.briefings],
              ["Propostas", funnel.propostas],
              ["Contratos", funnel.contratos],
              ["Projetos", funnel.projetos],
              ["Entregues", funnel.entregues],
            ] as [string, number][]).map(([label, v]) => (
              <div key={label} className={s.funnelRow}>
                <span className={s.funnelLabel}>{label}</span>
                <span className={s.funnelValue}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Faturamento (propostas)" sub="Últimos 12 meses">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip
                  cursor={{ fill: "rgba(127, 127, 127, 0.12)" }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [formatBRL(Number(v)), "Faturamento"]}
                />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {revenueByMonth.map((m, i) => (
                    <Cell key={i} fill={m.value >= maxRevenue ? "#b2956a" : "rgba(178, 149, 106, 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Atenção hoje" sub="Agenda do dia e pendências" link={onGoAgenda ? "Abrir agenda" : undefined} onLink={onGoAgenda}>
          {agendaHoje.length === 0 && pendencias.length === 0 ? (
            <div className={s.emptyMini}>Tudo em dia. Nenhuma pendência. ✓</div>
          ) : (
            <div className={s.list}>
              {agendaHoje.map((a) => (
                <div key={a.id} className={s.listItem}>
                  <span className={`${s.pendIcon} ${a.overdue ? s.pendIconOverdue : ""}`}>
                    {a.overdue ? "!" : a.kind === "compromisso" ? "📌" : "◷"}
                  </span>
                  <span className={s.listMain}>
                    <span className={s.listTitle}>{a.title}</span>
                    <span className={`${s.listMeta} ${a.overdue ? s.metaOverdue : ""}`}>
                      {a.overdue ? "Atrasado" : "Hoje"}{a.time ? ` · ${a.time}` : ""} · {a.kind}
                    </span>
                  </span>
                </div>
              ))}
              {pendencias.map((p, i) => (
                <div key={`p${i}`} className={s.listItem}>
                  <span className={s.pendIcon}>{p.count}</span>
                  <span className={s.listMain}><span className={s.listTitle}>{p.label}</span></span>
                  <IcArrowRight />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Projetos ativos + Ranking + Aniversariantes + Últimas atividades */}
      <div className={`${s.grid} ${s.cols4}`}>
        <Card title="Projetos ativos" sub="Status dos projetos" link={onGoProjetos ? "Ver projetos" : undefined} onLink={onGoProjetos}>
          {contracts.published + contracts.signed === 0 ? (
            <div className={s.emptyMini}>Nenhum projeto ativo. Publique um contrato para iniciar.</div>
          ) : (
            <div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{contracts.published}</span><span className={s.summaryLabel}>Em andamento</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{contracts.signed}</span><span className={s.summaryLabel}>Contratos assinados</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{contracts.published + contracts.signed}</span><span className={s.summaryLabel}>Total ativos</span></div>
            </div>
          )}
        </Card>

        <Card title="Ranking de clientes" sub="Por valor em propostas" link={clientRanking.length ? "Ver clientes" : undefined} onLink={onGoComercial}>
          {clientRanking.length === 0 ? (
            <div className={s.emptyMini}>Sem propostas para ranquear.</div>
          ) : (
            <div className={s.list}>
              {clientRanking.map((c, i) => (
                <div key={c.client} className={s.listItem}>
                  <span className={s.listRank}>{i + 1}</span>
                  <span className={s.dashAvatar} style={{ width: 30, height: 30, fontSize: 11 }}>
                    {c.photo ? <img src={c.photo} alt={c.client} /> : initials(c.client)}
                  </span>
                  <span className={s.listMain}>
                    <span className={s.listTitle}>{c.client}</span>
                    <span className={s.listMeta}>{c.count} proposta{c.count !== 1 ? "s" : ""}</span>
                  </span>
                  <span className={s.listValue}>{formatBRLShort(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Aniversariantes" sub="Hoje e próximos 30 dias" link={aniversariantes.length && onGoClientes ? "Ver clientes" : undefined} onLink={onGoClientes}>
          {aniversariantes.length === 0 ? (
            <div className={s.emptyMini}>Nenhum aniversário nos próximos 30 dias.</div>
          ) : (
            <div className={s.list}>
              {aniversariantes.map((b) => (
                <div key={b.id} className={s.listItem}>
                  <span className={s.dashAvatar}>
                    {b.photo ? <img src={b.photo} alt={b.name} /> : initials(b.name)}
                  </span>
                  <span className={s.listMain}>
                    <span className={s.listTitle}>{b.name}{b.today ? " 🎉" : ""}</span>
                    <span className={s.listMeta}>
                      {b.today ? "Hoje!" : b.days === 1 ? "Amanhã" : `Em ${b.days} dias`} · {b.date}
                    </span>
                  </span>
                  {b.phone ? (
                    <a
                      className={s.waBtn}
                      href={waBirthdayLink(b.phone, b.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Enviar parabéns para ${b.name} no WhatsApp`}
                      title={`Enviar parabéns para ${b.name} no WhatsApp`}
                    >
                      <IcWhats />
                    </a>
                  ) : (
                    <span className={s.listMeta} title="Cliente sem telefone">sem tel.</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Últimas atividades" sub="Timeline do sistema">
          {recentActivity.length === 0 ? (
            <div className={s.emptyMini}>Sem atividades recentes.</div>
          ) : (
            <div className={s.list}>
              {recentActivity.map((a, i) => (
                <div key={i} className={s.listItem}>
                  <span className={s.listMain}>
                    <span className={s.listTitle}>{a.title}</span>
                    <span className={s.listMeta}>{a.sub}</span>
                  </span>
                  <span className={s.listMeta}>{timeAgo(a.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Resumos + Meta do ano + Armazenamento */}
      <div className={`${s.grid} ${s.cols4}`}>
        <Card title="Propostas" sub="Resumo geral" link="Ver propostas" onLink={onGoComercial}>
          <div>
            <div className={s.summaryRow}><span className={s.summaryNum}>{proposals.draft}</span><span className={s.summaryLabel}>Em rascunho</span></div>
            <div className={s.summaryRow}><span className={s.summaryNum}>{proposals.published}</span><span className={s.summaryLabel}>Publicadas</span></div>
            <div className={s.summaryRow}><span className={s.summaryNum}>{proposals.total}</span><span className={s.summaryLabel}>Total</span></div>
          </div>
        </Card>

        <Card title="Briefings" sub="Resumo geral" link="Ver briefings" onLink={onGoComercial}>
          <div>
            <div className={s.summaryRow}><span className={s.summaryNum}>{briefings.published}</span><span className={s.summaryLabel}>Publicados</span></div>
            <div className={s.summaryRow}><span className={s.summaryNum}>{briefings.responsesTotal}</span><span className={s.summaryLabel}>Respostas recebidas</span></div>
            <div className={s.summaryRow}><span className={s.summaryNum}>{briefings.withoutResponse}</span><span className={s.summaryLabel}>Aguardando resposta</span></div>
          </div>
        </Card>

        <Card title="Contratos" sub="Resumo geral" link={onGoContratos ? "Ver contratos" : undefined} onLink={onGoContratos}>
          {contracts.total === 0 ? (
            <div className={s.emptyMini}>Nenhum contrato ainda.</div>
          ) : (
            <div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{contracts.published}</span><span className={s.summaryLabel}>Publicados</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{contracts.signed}</span><span className={s.summaryLabel}>Assinados</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{contracts.total}</span><span className={s.summaryLabel}>Total</span></div>
            </div>
          )}
        </Card>

        <div className={s.goalCard}>
          <span className={s.goalLabel}>Meta do ano · Receita</span>
          {goalEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <input
                autoFocus
                inputMode="numeric"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Ex: 120000"
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", color: "inherit", fontFamily: "var(--font-mono)" }}
                onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className={s.cardLink} onClick={saveGoal} disabled={savingGoal}>{savingGoal ? "Salvando…" : "Salvar"}</button>
                <button className={s.cardLink} onClick={() => setGoalEditing(false)} style={{ opacity: 0.6 }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div className={s.goalValue}>{formatBRLShort(finance.recebido)}</div>
              {finance.annualGoal > 0 && (
                <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", margin: "10px 0 12px" }}>
                  <div style={{ width: `${Math.min(100, Math.round((finance.recebido / finance.annualGoal) * 100))}%`, height: "100%", background: "var(--color-accent)", borderRadius: 4 }} />
                </div>
              )}
              <div className={s.goalRow}>
                <span>Meta anual</span>
                <span>{finance.annualGoal > 0 ? formatBRLShort(finance.annualGoal) : "a definir"}</span>
              </div>
              {finance.annualGoal > 0 && (
                <div className={s.goalRow}>
                  <span>Progresso</span>
                  <span>{Math.round((finance.recebido / finance.annualGoal) * 100)}%</span>
                </div>
              )}
              <div className={s.goalRow}><span>A receber</span><span>{formatBRLShort(finance.aReceber)}</span></div>
              <button
                className={s.cardLink}
                style={{ marginTop: 6 }}
                onClick={() => { setGoalInput(finance.annualGoal ? String(finance.annualGoal) : ""); setGoalEditing(true); }}
              >
                {finance.annualGoal > 0 ? "Editar meta" : "Definir meta"} <IcArrowRight />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

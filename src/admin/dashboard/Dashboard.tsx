import { useEffect, useState, type ReactNode } from "react";
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

export default function Dashboard({ username, onGoComercial, onGoContratos, onGoProjetos }: {
  username: string; onGoComercial: () => void; onGoContratos?: () => void; onGoProjetos?: () => void;
}) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.dashboardOverview()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.message ?? "Erro ao carregar."));
    return () => { alive = false; };
  }, []);

  const today = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  if (error) return <div className={s.emptyMini}>Não foi possível carregar o painel: {error}</div>;
  if (!data) return <div className={s.emptyMini}>Carregando painel…</div>;

  const { proposals, briefings, contracts, funnel, revenueByMonth, clientRanking, recentActivity, pendencias, finance } = data;
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

        <Card title="Atenção hoje" sub="O que precisa da sua atenção" link={pendencias.length ? "Ver no comercial" : undefined} onLink={onGoComercial}>
          {pendencias.length === 0 ? (
            <div className={s.emptyMini}>Tudo em dia. Nenhuma pendência. ✓</div>
          ) : (
            <div className={s.list}>
              {pendencias.map((p, i) => (
                <div key={i} className={s.listItem}>
                  <span className={s.pendIcon}>{p.count}</span>
                  <span className={s.listMain}><span className={s.listTitle}>{p.label}</span></span>
                  <IcArrowRight />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Projetos ativos (placeholder) + Ranking + Últimas atividades */}
      <div className={`${s.grid} ${s.cols3}`}>
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
          <span className={s.goalLabel}>Recebido no período</span>
          <div className={s.goalValue}>{formatBRLShort(finance.recebido)}</div>
          <div className={s.goalRow}><span>A receber</span><span>{formatBRLShort(finance.aReceber)}</span></div>
          <div className={s.goalRow}><span>Meta anual</span><span>a definir</span></div>
        </div>
      </div>
    </>
  );
}

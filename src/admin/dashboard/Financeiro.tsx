import { useEffect, useState, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { api, ApiError, type Installment, type InstallmentStatus, type DashboardOverview, type Client } from "../api";
import { formatBRL, formatBRLShort } from "./format";
import CurrencyInput from "../CurrencyInput";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

const PAY_METHODS = ["PIX", "Dinheiro", "Transferência", "Boleto", "Cartão", "Outro"];
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const INST_STATUS: Record<InstallmentStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "badgeDraft" },
  confirmed: { label: "Confirmado", cls: "badgeSigned" },
  received: { label: "Recebido", cls: "badgePublished" },
  overdue: { label: "Atrasado", cls: "badgeCancelled" },
  deleted: { label: "Cancelado", cls: "badgeCancelled" },
};

const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "received", label: "Recebidas" },
  { id: "overdue", label: "Atrasadas" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default function Financeiro() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recebimento manual (modal)
  const [payOpen, setPayOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [pay, setPay] = useState({ clientId: "", amount: null as number | null, date: todayISO(), method: "PIX", description: "" });
  const [paySaving, setPaySaving] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);

  const openPay = async () => {
    setPayErr(null);
    setPay({ clientId: "", amount: null, date: todayISO(), method: "PIX", description: "" });
    setPayOpen(true);
    if (clients.length === 0) {
      try {
        const { clients } = await api.listClients();
        setClients(clients);
      } catch { /* segue sem lista */ }
    }
  };
  const confirmPay = async () => {
    if (!pay.clientId) { setPayErr("Selecione o cliente."); return; }
    if (!pay.amount || pay.amount <= 0) { setPayErr("Informe o valor recebido."); return; }
    setPaySaving(true);
    setPayErr(null);
    try {
      await api.registerManualPayment({
        client_id: pay.clientId,
        amount: pay.amount,
        date: pay.date,
        method: pay.method,
        description: pay.description.trim() || undefined,
      });
      setPayOpen(false);
      await load();
    } catch (err) {
      setPayErr(err instanceof ApiError ? err.message : "Erro ao registrar.");
    } finally {
      setPaySaving(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, { installments }] = await Promise.all([
        api.dashboardOverview(),
        api.listInstallments(filter ? { status: filter } : undefined),
      ]);
      setOverview(ov);
      setInstallments(installments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const fin = overview?.finance;
  const maxRecv = Math.max(1, ...(fin?.receivedByMonth.map((m) => m.value) ?? [0]));

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Financeiro</h1>
          <p className={s.greetSub}>Parcelas, recebimentos e a receber. Cobranças via ASAAS quando configurado.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>
            Atualizar
          </button>
          <button className={`${admin.btn} ${admin.btnPrimary}`} onClick={openPay}>
            ＋ Registrar recebimento manual
          </button>
        </div>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      {/* KPIs */}
      <div className={`${s.grid} ${s.cols4}`}>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Faturado</span>
          <span className={s.kpiValue}>{formatBRLShort(fin?.faturado ?? 0)}</span>
          <span className={s.kpiNote}>Soma dos contratos</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Recebido</span>
          <span className={s.kpiValue}>{formatBRLShort(fin?.recebido ?? 0)}</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>A receber</span>
          <span className={s.kpiValue}>{formatBRLShort(fin?.aReceber ?? 0)}</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Em atraso</span>
          <span className={s.kpiValue}>{fin?.atrasados ?? 0}</span>
          <span className={s.kpiNote}>parcelas vencidas</span>
        </div>
      </div>

      {/* Gráfico recebido/mês */}
      <div className={`${s.grid} ${s.cols3}`}>
        <div className={s.card} style={{ gridColumn: "span 3" }}>
          <div className={s.cardHead}>
            <div>
              <div className={s.cardTitleX}>Recebido por mês</div>
              <div className={s.cardSub}>Últimos 12 meses</div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fin?.receivedByMonth ?? []} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip
                  cursor={{ fill: "rgba(127, 127, 127, 0.12)" }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [formatBRL(Number(v)), "Recebido"]}
                />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {(fin?.receivedByMonth ?? []).map((m, i) => (
                    // Série temporal neutra → cinza (verde fica reservado a positivo/negativo).
                    <Cell key={i} fill={m.value >= maxRecv ? "#7c8698" : "rgba(124, 134, 152, 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de parcelas */}
      <div className={admin.tabs}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`${admin.tab} ${filter === f.id ? admin.tabActive : ""}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : installments.length === 0 ? (
        <div className={admin.empty}>Nenhuma parcela {filter ? "neste filtro" : "cadastrada"}. Configure pagamentos em um contrato.</div>
      ) : (
        <table className={admin.table}>
          <thead>
            <tr>
              <th>Contrato / cliente</th>
              <th>Parcela</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Pago em</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => {
              const meta = INST_STATUS[inst.status];
              return (
                <tr key={inst.id}>
                  <td>
                    {inst.contractTitle || "—"}
                    {inst.clientName ? <span className={s.listMeta}> · {inst.clientName}</span> : null}
                  </td>
                  <td>{inst.kind === "hf" ? "Adicional" : inst.installmentNumber === 0 ? "Entrada" : `${inst.installmentNumber}ª`}</td>
                  <td>{fmtDate(inst.dueDate)}</td>
                  <td className={admin.mono}>{formatBRL(inst.amount)}</td>
                  <td><span className={`${admin.badge} ${admin[meta.cls]}`}>{meta.label}</span></td>
                  <td>{fmtDate(inst.paymentDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Modal: registrar recebimento manual (fora do ASAAS) */}
      {payOpen && (
        <div className={s.modalOverlay} onClick={() => setPayOpen(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={s.modalTitle}>Registrar recebimento manual</h2>
            <p className={s.modalSub}>
              Para pagamentos recebidos fora do ASAAS (ex.: PIX da proposta). Entra em “Recebido” e na área do cliente.
            </p>
            {payErr && <div className={admin.error}>{payErr}</div>}
            <div className={admin.field}>
              <label className={admin.label}>Cliente *</label>
              <select className={admin.input} value={pay.clientId} onChange={(e) => setPay((p) => ({ ...p, clientId: e.target.value }))}>
                <option value="">— Selecione o cliente —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={admin.row2}>
              <div className={admin.field}>
                <label className={admin.label}>Valor recebido *</label>
                <CurrencyInput className={admin.input} value={pay.amount} onChange={(v) => setPay((p) => ({ ...p, amount: v }))} />
              </div>
              <div className={admin.field}>
                <label className={admin.label}>Data</label>
                <input className={admin.input} type="date" value={pay.date} onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className={admin.row2}>
              <div className={admin.field}>
                <label className={admin.label}>Forma</label>
                <select className={admin.input} value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                  {PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={admin.field}>
                <label className={admin.label}>Descrição (opcional)</label>
                <input className={admin.input} value={pay.description} onChange={(e) => setPay((p) => ({ ...p, description: e.target.value }))} placeholder="ex.: Entrada do projeto" />
              </div>
            </div>
            <div className={s.modalActions}>
              <button className={`${admin.btn} ${admin.btnGhost}`} onClick={() => setPayOpen(false)} disabled={paySaving}>Cancelar</button>
              <button className={`${admin.btn} ${admin.btnPrimary}`} onClick={confirmPay} disabled={paySaving}>
                {paySaving ? "Salvando…" : "Registrar recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

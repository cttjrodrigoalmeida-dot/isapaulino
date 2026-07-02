import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type Installment, type InstallmentStatus } from "./api";
import { formatBRL } from "./dashboard/format";
import CurrencyInput from "./CurrencyInput";
import styles from "./Admin.module.css";
import dash from "./dashboard/Dashboard.module.css";

const INST_STATUS: Record<InstallmentStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "badgeDraft" },
  confirmed: { label: "Confirmado", cls: "badgeSigned" },
  received: { label: "Recebido", cls: "badgePublished" },
  overdue: { label: "Atrasado", cls: "badgeCancelled" },
  deleted: { label: "Cancelado", cls: "badgeCancelled" },
};

const PAYMENT_METHODS = ["PIX", "Boleto", "Cartão", "Dinheiro", "Transferência"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(d || 1, lastDay);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

interface PreviewRow {
  number: number;
  due: string;
  amount: number;
}

// Espelha o cálculo do servidor (functions/api/contracts/[id]/payments.ts).
function computePreview(total: number, down: number, count: number, firstDue: string): PreviewRow[] {
  const list: PreviewRow[] = [];
  if (down > 0) list.push({ number: 0, due: firstDue, amount: down });
  const remainderCents = Math.round((total - down) * 100);
  const baseCents = Math.floor(remainderCents / count);
  for (let i = 1; i <= count; i++) {
    const cents = i === count ? remainderCents - baseCents * (count - 1) : baseCents;
    const due = down > 0 ? addMonths(firstDue, i) : addMonths(firstDue, i - 1);
    list.push({ number: i, due, amount: cents / 100 });
  }
  return list;
}

export default function ContractPayments({
  contractId,
  contractTitle,
  onBack,
}: {
  contractId: string;
  contractTitle: string;
  onBack: () => void;
}) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // form
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [downPayment, setDownPayment] = useState<number | null>(null);
  const [countStr, setCountStr] = useState("1");
  const [firstDue, setFirstDue] = useState(addMonths(todayISO(), 1));
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);

  // modal marcar pago
  const [payModal, setPayModal] = useState<Installment | null>(null);
  const [payDate, setPayDate] = useState(todayISO());
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [payNotes, setPayNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { config, installments } = await api.getContractPayments(contractId);
      setInstallments(installments);
      if (config) {
        setTotalValue(config.totalValue);
        setDownPayment(config.downPayment || null);
        setCountStr(String(config.installmentsCount));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    load();
  }, [load]);

  const locked = installments.some((i) => i.status !== "pending" || i.asaasPaymentId);

  const onCalcular = () => {
    setError(null);
    const total = totalValue ?? 0;
    const down = downPayment ?? 0;
    const count = Math.trunc(Number(countStr));
    if (total <= 0) return setError("Informe um valor total válido.");
    if (down < 0 || down > total) return setError("Entrada inválida.");
    if (!Number.isFinite(count) || count < 1) return setError("Número de parcelas inválido.");
    setPreview(computePreview(total, down, count, firstDue));
  };

  const onSalvar = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.saveContractPayments(contractId, {
        total_value: totalValue ?? 0,
        down_payment: downPayment ?? 0,
        installments_count: Math.trunc(Number(countStr)),
        first_due_date: firstDue,
      });
      setPreview(null);
      setNotice("Parcelas salvas.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar parcelas.");
    } finally {
      setBusy(false);
    }
  };

  const onGerarAsaas = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { created, message } = await api.generateAsaas(contractId);
      setNotice(message || `${created} cobrança(s) criada(s) no ASAAS.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao gerar cobranças.");
    } finally {
      setBusy(false);
    }
  };

  const openPay = (inst: Installment) => {
    setPayModal(inst);
    setPayDate(todayISO());
    setPayMethod(PAYMENT_METHODS[0]);
    setPayNotes("");
  };
  const confirmPay = async () => {
    if (!payModal) return;
    setBusy(true);
    setError(null);
    try {
      await api.markInstallmentPaid(payModal.id, {
        payment_date: payDate,
        payment_method: payMethod,
        notes: payNotes,
      });
      setPayModal(null);
      setNotice("Parcela marcada como recebida.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao marcar pagamento.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando pagamentos…</div>;

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Pagamentos · {contractTitle}</div>
          <div className={styles.pageHint}>Defina entrada e parcelas; gere cobranças no ASAAS ou registre pagamentos manualmente.</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {/* Configuração */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Configurar parcelas</div>
        {locked && (
          <div className={styles.pageHint} style={{ marginBottom: 12 }}>
            Já há parcelas pagas ou enviadas ao ASAAS — a reconfiguração está bloqueada.
          </div>
        )}
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Valor total (R$)</label>
            <CurrencyInput className={`${styles.input} ${styles.mono}`} value={totalValue} onChange={setTotalValue} disabled={locked} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Entrada (R$)</label>
            <CurrencyInput className={`${styles.input} ${styles.mono}`} value={downPayment} onChange={setDownPayment} disabled={locked} />
          </div>
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Nº de parcelas</label>
            <input className={`${styles.input} ${styles.mono}`} type="number" step="1" min="1" max="60" value={countStr} onChange={(e) => setCountStr(e.target.value)} disabled={locked} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>1º vencimento</label>
            <input className={styles.input} type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} disabled={locked} />
          </div>
        </div>
        {!locked && (
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className={styles.btn} onClick={onCalcular} disabled={busy}>Calcular</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSalvar} disabled={busy}>
              {busy ? "Salvando…" : "Salvar parcelas"}
            </button>
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 16 }}>
            <div className={styles.cardTitle}>Pré-visualização</div>
            <table className={styles.table}>
              <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.number}>
                    <td>{p.number === 0 ? "Entrada" : `${p.number}ª`}</td>
                    <td>{fmtDate(p.due)}</td>
                    <td className={styles.mono}>{formatBRL(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Parcelas salvas */}
      {installments.length > 0 && (
        <div className={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className={styles.cardTitle} style={{ margin: 0 }}>Parcelas</div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onGerarAsaas} disabled={busy}>
              Criar cobranças no ASAAS
            </button>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pago em</th><th>Forma</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => {
                const meta = INST_STATUS[inst.status];
                return (
                  <tr key={inst.id}>
                    <td>{inst.installmentNumber === 0 ? "Entrada" : `${inst.installmentNumber}ª`}</td>
                    <td>{fmtDate(inst.dueDate)}</td>
                    <td className={styles.mono}>{formatBRL(inst.amount)}</td>
                    <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                    <td>{fmtDate(inst.paymentDate)}</td>
                    <td>{inst.paymentMethod || "—"}</td>
                    <td>
                      <div className={styles.rowActions}>
                        {inst.status !== "received" && inst.status !== "deleted" && (
                          <button className={styles.btn} onClick={() => openPay(inst)} disabled={busy}>Marcar como pago</button>
                        )}
                        {inst.asaasPaymentId && (
                          <a className={`${styles.btn} ${styles.btnGhost}`} href={`https://www.asaas.com/i/${inst.asaasPaymentId}`} target="_blank" rel="noopener noreferrer">Ver no ASAAS</a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal marcar pago */}
      {payModal && (
        <div className={dash.modalOverlay} onClick={() => setPayModal(null)}>
          <div className={dash.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={dash.modalTitle}>Registrar pagamento</h2>
            <p className={dash.modalSub}>
              {payModal.installmentNumber === 0 ? "Entrada" : `Parcela ${payModal.installmentNumber}ª`} · {formatBRL(payModal.amount)}
            </p>
            <div className={styles.field}>
              <label className={styles.label}>Data do pagamento</label>
              <input className={styles.input} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Forma de pagamento</label>
              <select className={styles.input} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Observação</label>
              <input className={styles.input} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="opcional" />
            </div>
            <div className={dash.modalActions}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setPayModal(null)} disabled={busy}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={confirmPay} disabled={busy}>
                {busy ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

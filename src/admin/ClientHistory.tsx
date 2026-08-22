import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type HistoryItem, type HistoryKind, type HistoryStatus } from "./api";
import { toast } from "./toast";
import { formatBRL } from "./dashboard/format";
import CurrencyInput from "./CurrencyInput";
import styles from "./Admin.module.css";

const KIND_LABEL: Record<HistoryKind, string> = {
  adicional: "Adicional",
  retrabalho: "Retrabalho",
  "hora-tecnica": "Hora técnica",
  pagamento: "Pagamento",
  outro: "Outro",
};
const STATUS_META: Record<HistoryStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "badgeDraft" },
  charged: { label: "Cobrado", cls: "badgeSigned" },
  paid: { label: "Pago", cls: "badgePublished" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

function fmtDate(iso: string): string {
  const [y, m, d] = (iso || "").slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default function ClientHistory({
  clientId,
  clientName,
  clientPhone,
  onBack,
}: {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  onBack: () => void;
}) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [totals, setTotals] = useState({ pending: 0, charged: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [kind, setKind] = useState<HistoryKind>("adicional");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items, totals } = await api.listClientHistory(clientId);
      setItems(items);
      setTotals(totals);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!desc.trim()) return setError("Informe a descrição do lançamento.");
    setError(null);
    setNotice(null);
    setBusy("add");
    try {
      await api.createClientHistory(clientId, { description: desc.trim(), amount: amount ?? 0, kind });
      setDesc("");
      setAmount(null);
      setKind("adicional");
      setNotice("Lançamento adicionado.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (it: HistoryItem) => {
    if (!confirm(`Excluir o lançamento "${it.description}"?`)) return;
    setBusy(it.id);
    try {
      await api.deleteClientHistory(clientId, it.id);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };

  const gerarAsaas = async (it: HistoryItem) => {
    setError(null);
    setNotice(null);
    setBusy(it.id);
    try {
      const r = await api.generateHistoryAsaas(clientId, it.id);
      setNotice(r.message || "Cobrança criada no ASAAS.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao gerar cobrança.");
    } finally {
      setBusy(null);
    }
  };

  const marcarPago = async (it: HistoryItem) => {
    setBusy(it.id);
    try {
      await api.updateClientHistory(clientId, it.id, { status: "paid" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao marcar como pago.");
    } finally {
      setBusy(null);
    }
  };

  const waLink = (it: HistoryItem): string => {
    const digits = (clientPhone ?? "").replace(/\D+/g, "");
    const num = digits.length > 0 && digits.length <= 11 ? `55${digits}` : digits;
    const invoice = it.invoiceUrl ?? "";
    const msg = [
      `Olá${clientName ? " " + clientName.split(" ")[0] : ""}! Tudo bem? 🙂`,
      ``,
      `Sobre o serviço adicional "${it.description}" no valor de ${formatBRL(it.amount)}:`,
      invoice ? `\nVocê pode pagar (PIX, boleto ou cartão) por aqui:\n${invoice}` : "",
      `\nQualquer dúvida, estou à disposição!`,
    ].filter(Boolean).join("\n");
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return <div className={styles.loading}>Carregando histórico…</div>;

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Histórico Financeiro · {clientName}</div>
          <div className={styles.pageHint}>Serviços e alterações fora do contrato — some, cobre no ASAAS e acompanhe.</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {/* Novo lançamento */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Novo lançamento</div>
        <div className={styles.field}>
          <label className={styles.label}>Descrição</label>
          <input className={styles.input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Alteração de layout do quarto 02 (fora do escopo)" />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Valor (R$)</label>
            <CurrencyInput className={`${styles.input} ${styles.mono}`} value={amount} onChange={setAmount} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Tipo</label>
            <select className={styles.input} value={kind} onChange={(e) => setKind(e.target.value as HistoryKind)}>
              {(Object.keys(KIND_LABEL) as HistoryKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={add} disabled={busy === "add"}>
            {busy === "add" ? "Adicionando…" : "+ Adicionar lançamento"}
          </button>
        </div>
      </div>

      {/* Resumo / somatório */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Resumo</div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <div>
            <div className={styles.label}>A cobrar (pendente)</div>
            <div className={styles.mono} style={{ fontSize: 22, fontWeight: 700 }}>{formatBRL(totals.pending)}</div>
          </div>
          <div>
            <div className={styles.label}>Cobrado (aguardando)</div>
            <div className={styles.mono} style={{ fontSize: 22 }}>{formatBRL(totals.charged)}</div>
          </div>
          <div>
            <div className={styles.label}>Pago</div>
            <div className={styles.mono} style={{ fontSize: 22 }}>{formatBRL(totals.paid)}</div>
          </div>
        </div>
      </div>

      {/* Lançamentos */}
      {items.length === 0 ? (
        <div className={styles.empty}>Nenhum lançamento ainda. Adicione o primeiro acima.</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Lançamentos</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const meta = STATUS_META[it.status];
                return (
                  <tr key={it.id}>
                    <td>{fmtDate(it.date)}</td>
                    <td>{it.description}</td>
                    <td>{KIND_LABEL[it.kind]}</td>
                    <td className={styles.mono}>{formatBRL(it.amount)}</td>
                    <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                    <td>
                      <div className={styles.rowActions}>
                        {it.status === "pending" && (
                          <button className={styles.btn} onClick={() => gerarAsaas(it)} disabled={busy === it.id}>Cobrar no ASAAS</button>
                        )}
                        {(it.status === "pending" || it.status === "charged") && clientPhone && (
                          <a className={`${styles.btn} ${styles.btnGhost}`} href={waLink(it)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        )}
                        {it.invoiceUrl && (
                          <a className={`${styles.btn} ${styles.btnGhost}`} href={it.invoiceUrl} target="_blank" rel="noopener noreferrer">Ver no ASAAS</a>
                        )}
                        {it.status !== "paid" && it.status !== "cancelled" && (
                          <button className={styles.btn} onClick={() => marcarPago(it)} disabled={busy === it.id}>Marcar pago</button>
                        )}
                        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(it)} disabled={busy === it.id}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

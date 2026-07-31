import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type ContractSummary, type ContractStatus } from "./api";
import { formatBRL, formatDate } from "./dashboard/format";
import ContractsAnalytics from "./ContractsAnalytics";
import styles from "./Admin.module.css";

// Vencimento = assinatura + vigência (padrão 3 meses); null se não assinado.
function vencimentoDate(c: ContractSummary): Date | null {
  if (c.status !== "signed" || !c.signedAt) return null;
  const d = new Date(c.signedAt);
  d.setMonth(d.getMonth() + (c.vigenciaMeses ?? 3));
  return d;
}

const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "badgeSlate" },
  published: { label: "Aguardando assinatura", cls: "badgeAmber" },
  signed: { label: "Assinado", cls: "badgeGreen" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

// Ano derivado do número (AANN): "2622" → "2026".
const yearOf = (number: string | null) =>
  number && /^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros";

type StatusFilter = "todas" | "draft" | "published" | "signed" | "cancelled";
const PAGE_SIZE = 8;

export default function ContractsList({
  onNew,
  onNewAditivo,
  onEdit,
  onPayments,
}: {
  onNew: () => void;
  onNewAditivo: () => void;
  onEdit: (id: string) => void;
  onPayments: (id: string, title: string) => void;
}) {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<StatusFilter>("todas");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { contracts } = await api.listContracts();
      setItems(contracts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Anos disponíveis + seleciona o mais recente por padrão.
  const years = useMemo(() => {
    const set = new Set(items.map((c) => yearOf(c.contractNumber)));
    return [...set].sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : b.localeCompare(a)));
  }, [items]);
  useEffect(() => {
    if (years.length && !years.includes(year)) setYear(years[0]);
  }, [years, year]);
  useEffect(() => { setPage(1); }, [tab, year]);

  // Filtros
  const yearItems = useMemo(() => items.filter((c) => yearOf(c.contractNumber) === year), [items, year]);
  const filtered = useMemo(
    () => (tab === "todas" ? yearItems : yearItems.filter((c) => c.status === tab)),
    [yearItems, tab]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Contagens e valores
  const counts = useMemo(() => {
    const m: Record<StatusFilter, number> = { todas: yearItems.length, draft: 0, published: 0, signed: 0, cancelled: 0 };
    for (const c of yearItems) m[c.status] = (m[c.status] || 0) + 1;
    return m;
  }, [yearItems]);

  const remove = async (c: ContractSummary) => {
    if (!confirm(`Excluir o contrato "${c.title}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(c.id);
    try {
      await api.deleteContract(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally { setBusy(null); }
  };

  const checkSignature = async (c: ContractSummary) => {
    setBusy(c.id);
    try {
      const r = await api.refreshSignature(c.id);
      if (r.status === "signed") {
        setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "signed" } : x)));
        alert("Contrato assinado por todas as partes! ✅");
      } else {
        const pend = r.signers.filter((s) => !s.signed).length;
        const done = r.signers.filter((s) => s.signed).map((s) => s.name || s.email).join(", ");
        alert(`Ainda faltam ${pend} assinatura(s) para concluir.` + (done ? `\nJá assinaram: ${done}` : ""));
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao consultar a Autentique.");
    } finally { setBusy(null); }
  };

  const duplicate = async (c: ContractSummary) => {
    setBusy(c.id);
    try {
      const { contract } = await api.getContract(c.id);
      await api.createContract({
        client_id: contract.clientId, title: `${contract.title} (cópia)`, content: contract.content,
        data: contract.data, value: contract.value, deadline: contract.deadline, autentique_url: null,
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao duplicar.");
    } finally { setBusy(null); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Contratos</div>
          <div className={styles.pageHint}>Crie, edite e publique contratos vinculados aos clientes.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {years.length > 0 && (
            <select className={styles.input} style={{ width: "auto", minWidth: 110 }} value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
          <button className={styles.btn} onClick={onNewAditivo} title="Cria um Termo Aditivo (altera/inclui itens no contrato principal)">+ Termo aditivo</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>+ Novo contrato</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Abas */}
      {!loading && items.length > 0 && (
        <div className={styles.tabs}>
          {([
            ["todas", "Todos"],
            ["published", "Aguardando assinatura"],
            ["draft", "Rascunhos"],
            ["signed", "Assinados"],
            ["cancelled", "Cancelados"],
          ] as [StatusFilter, string][]).map(([id, label]) => (
            <button key={id} className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`} onClick={() => setTab(id)}>
              {label} <span style={{ opacity: 0.6 }}>· {counts[id]}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum contrato ainda. Clique em <strong>"+ Novo contrato"</strong> para começar.
        </div>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Assinado em</th>
                  <th>Vence em</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const meta = STATUS_META[c.status];
                  const isPublic = (c.status === "published" || c.status === "signed") && c.slug;
                  return (
                    <tr key={c.id}>
                      <td className={styles.rowNumber}>{c.contractNumber || "—"}</td>
                      <td>{c.projectName || c.proposalTitle || c.title}</td>
                      <td>{c.clientName || "—"}</td>
                      <td className={styles.mono}>{c.value != null ? formatBRL(c.value) : "—"}</td>
                      <td className={styles.mono}>{c.signedAt ? formatDate(c.signedAt) : "—"}</td>
                      <td className={styles.mono}>{(() => { const d = vencimentoDate(c); return d ? d.toLocaleDateString("pt-BR") : "—"; })()}</td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td>
                        <div className={styles.rowActions}>
                          {isPublic && (
                            <a className={`${styles.btn} ${styles.btnGhost}`} href={`/contrato/${c.slug}`} target="_blank" rel="noopener noreferrer">Ver</a>
                          )}
                          <button className={styles.btn} onClick={() => onEdit(c.id)}>Editar</button>
                          <button className={styles.btn} onClick={() => onPayments(c.id, c.title)}>Pagamentos</button>
                          {c.autentiqueDocumentId && c.status !== "signed" && c.status !== "cancelled" && (
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => checkSignature(c)} disabled={busy === c.id}>Verificar assinatura</button>
                          )}
                          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => duplicate(c)} disabled={busy === c.id}>Duplicar</button>
                          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(c)} disabled={busy === c.id}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>Nenhum contrato neste filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} contrato{filtered.length === 1 ? "" : "s"}
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={styles.btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button key={n} className={`${styles.btn} ${n === page ? styles.btnPrimary : ""}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button className={styles.btn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              )}
            </div>
          )}

          {/* ── Dashboard analítico do ano selecionado ── */}
          <ContractsAnalytics items={yearItems} year={year} />
        </>
      )}
    </div>
  );
}

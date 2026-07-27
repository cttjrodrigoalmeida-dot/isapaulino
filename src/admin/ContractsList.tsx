import { useEffect, useMemo, useState, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import { api, ApiError, type ContractSummary, type ContractStatus } from "./api";
import { formatBRL, formatBRLShort } from "./dashboard/format";
import styles from "./Admin.module.css";

const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "badgeDraft" },
  published: { label: "Aguardando assinatura", cls: "badgePublished" },
  signed: { label: "Assinado", cls: "badgeSigned" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

// Ano derivado do número (AANN): "2622" → "2026".
const yearOf = (number: string | null) =>
  number && /^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros";

type StatusFilter = "todas" | "draft" | "published" | "signed" | "cancelled";
const PAGE_SIZE = 8;

// ── Cores ──
const GREEN = "#2f9e44";
const AMBER = "#b07a16";
const RED = "#dd5c4e";

const IcCheck = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1a2e05" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
const IcClock = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a3610" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
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
  const signedValue = yearItems.filter((c) => c.status === "signed").reduce((s, c) => s + (c.value || 0), 0);
  const awaitingValue = yearItems.filter((c) => c.status === "published").reduce((s, c) => s + (c.value || 0), 0);
  const cancelledValue = yearItems.filter((c) => c.status === "cancelled").reduce((s, c) => s + (c.value || 0), 0);
  const totalValue = signedValue + awaitingValue + cancelledValue;

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

  // Dados do gráfico de resumo
  const barData = [
    { name: "Assinados", value: signedValue, color: GREEN },
    { name: "Aguardando", value: awaitingValue, color: AMBER },
    { name: "Cancelados", value: cancelledValue, color: RED },
  ].filter((d) => d.value > 0);

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
                      <td>{c.title}</td>
                      <td>{c.clientName || "—"}</td>
                      <td className={styles.mono}>{c.value != null ? formatBRL(c.value) : "—"}</td>
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
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>Nenhum contrato neste filtro.</td></tr>
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

          {/* ── Resumo (rodapé) ── */}
          {yearItems.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(300px, 1.6fr) minmax(280px, 1.1fr)", gap: 16 }}>
                  {/* Valor total */}
                  <div style={cardStyle}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                      VALOR TOTAL DOS CONTRATOS
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 14 }}>{formatBRL(totalValue)}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>{counts.todas} contrato{counts.todas === 1 ? "" : "s"} em {year}</div>
                  </div>

                  {/* Gráfico */}
                  <div style={cardStyle}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Resumo por valor</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, marginBottom: 8 }}>Comparativo do valor financeiro por status.</div>
                    {barData.length > 0 ? (
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} margin={{ top: 22, right: 8, bottom: 0, left: 6 }} barCategoryGap="30%">
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
                            <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={64} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
                              {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                              <LabelList dataKey="value" position="top" formatter={(v) => formatBRL(Number(v))} style={{ fontSize: 12, fontWeight: 700, fill: "var(--color-text-primary)" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ height: 200, display: "grid", placeItems: "center", color: "var(--color-text-muted)", fontSize: 13 }}>Nenhum valor no período.</div>
                    )}
                    <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 4 }}>
                      <Legend color={GREEN} label="Assinados" />
                      <Legend color={AMBER} label="Aguardando" />
                      <Legend color={RED} label="Cancelados" />
                    </div>
                  </div>

                  {/* Cards de status */}
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ ...cardStyle, background: "rgba(47, 158, 68, 0.10)", border: "1px solid rgba(47, 158, 68, 0.35)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={iconBox(GREEN)}><IcCheck /></span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>CONTRATOS ASSINADOS</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{formatBRL(signedValue)}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>{counts.signed} contrato{counts.signed === 1 ? "" : "s"} assinado{counts.signed === 1 ? "" : "s"}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ ...cardStyle, background: "rgba(176, 122, 22, 0.10)", border: "1px solid rgba(176, 122, 22, 0.35)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={iconBox(AMBER)}><IcClock /></span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>AGUARDANDO ASSINATURA</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{formatBRL(awaitingValue)}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>{counts.published} contrato{counts.published === 1 ? "" : "s"} aguardando</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 18,
};
const iconBox = (bg: string): React.CSSProperties => ({
  width: 44, height: 44, borderRadius: 12, background: bg, display: "grid", placeItems: "center", flexShrink: 0,
});

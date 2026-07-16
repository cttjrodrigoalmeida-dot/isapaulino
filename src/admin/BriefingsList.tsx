import { useEffect, useMemo, useState, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import { api, ApiError, type BriefingSummary } from "./api";
import { formatBRLShort } from "./dashboard/format";
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import styles from "./Admin.module.css";

// Ano derivado do número (AANN): "2624" → "2026".
const yearOf = (number: string) => (/^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros");

type StatusFilter = "todas" | "responded" | "awaiting" | "cancelled";
const PAGE_SIZE = 8;

const GREEN = "#2f9e44";
const CREAM = "#d4b065";
const RED = "#dd5c4e";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Aguardando respostas", cls: "badgeDraft" },
  published: { label: "Aguardando respostas", cls: "badgeDraft" },
  responded: { label: "Respondido", cls: "badgeSigned" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

function getStatus(b: BriefingSummary): "responded" | "awaiting" | "cancelled" {
  if (b.status === "cancelled") return "cancelled";
  if (b.responseCount > 0) return "responded";
  return "awaiting";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso.slice(0, 10); }
}

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
const IcX = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a121f" strokeWidth="3" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export default function BriefingsList({
  onNew, onEdit, onResponses,
}: {
  onNew: () => void; onEdit: (number: string) => void; onResponses: (number: string) => void;
}) {
  const [items, setItems] = useState<BriefingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<StatusFilter>("todas");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const { briefings } = await api.listBriefings(); setItems(briefings); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Erro ao carregar."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Anos
  const years = useMemo(() => {
    const set = new Set(items.map((b) => yearOf(b.number)));
    return [...set].sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : b.localeCompare(a)));
  }, [items]);
  useEffect(() => { if (years.length && !years.includes(year)) setYear(years[0]); }, [years, year]);
  useEffect(() => { setPage(1); }, [tab, year]);

  // Filtros
  const yearItems = useMemo(() => items.filter((b) => yearOf(b.number) === year), [items, year]);
  const filtered = useMemo(() => {
    if (tab === "todas") return yearItems;
    return yearItems.filter((b) => getStatus(b) === tab);
  }, [yearItems, tab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Contagens
  const counts = useMemo(() => {
    let responded = 0, awaiting = 0, cancelled = 0;
    for (const b of yearItems) {
      const s = getStatus(b);
      if (s === "responded") responded++;
      else if (s === "cancelled") cancelled++;
      else awaiting++;
    }
    return { todas: yearItems.length, responded, awaiting, cancelled };
  }, [yearItems]);

  const barData = [
    { name: "Respondidos", value: counts.responded, color: GREEN },
    { name: "Aguardando", value: counts.awaiting, color: CREAM },
    { name: "Cancelados", value: counts.cancelled, color: RED },
  ].filter((d) => d.value > 0);

  const remove = async (number: string) => {
    if (!confirm(`Excluir o briefing Nº ${number}?`)) return;
    setBusy(number);
    try { await api.deleteBriefing(number); setItems((prev) => prev.filter((b) => b.number !== number)); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Erro ao excluir."); }
    finally { setBusy(null); }
  };

  const duplicate = async (number: string) => {
    setBusy(number);
    try {
      const { briefing } = await api.getBriefing(number);
      const clone = structuredClone(briefing);
      clone.number = nextProposalNumber(items.map((b) => b.number));
      await api.createBriefing(clone, "draft");
      await load();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Erro ao duplicar."); }
    finally { setBusy(null); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Briefings</div>
          <div className={styles.pageHint}>Cada briefing é vinculado a uma proposta (mesmo número).</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {years.length > 0 && (
            <select className={styles.input} style={{ width: "auto", minWidth: 110 }} value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>+ Novo briefing</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Abas */}
      {!loading && items.length > 0 && (
        <div className={styles.tabs}>
          {([
            ["todas", "Todos"],
            ["responded", "Respondidos"],
            ["awaiting", "Aguardando respostas"],
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
          Nenhum briefing ainda. Clique em <strong>"+ Novo briefing"</strong> para começar.
        </div>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Última resposta</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((b) => {
                  const s = getStatus(b);
                  const meta = STATUS_META[s];
                  return (
                    <tr key={b.number}>
                      <td className={styles.rowNumber}>{b.number}</td>
                      <td>{b.title || "—"}</td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {s === "responded" && b.lastResponseAt ? fmtDate(b.lastResponseAt) : "—"}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          {b.status === "published" && (
                            <a className={`${styles.btn} ${styles.btnGhost}`} href={`/briefing/${b.number}`} target="_blank" rel="noopener noreferrer">Ver</a>
                          )}
                          <button className={styles.btn} onClick={() => onEdit(b.number)}>Editar</button>
                          <button className={styles.btn} onClick={() => onResponses(b.number)}>
                            {b.responseCount || 0} resposta{b.responseCount === 1 ? "" : "s"}
                          </button>
                          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => duplicate(b.number)} disabled={busy === b.number}>Duplicar</button>
                          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(b.number)} disabled={busy === b.number}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>Nenhum briefing neste filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} briefing{filtered.length === 1 ? "" : "s"}
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
                  {/* Total */}
                  <div style={cardStyle}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                      TOTAL DE BRIEFINGS
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 14 }}>{counts.todas}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>briefings em {year}</div>
                  </div>

                  {/* Gráfico */}
                  <div style={cardStyle}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Resumo dos briefings</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, marginBottom: 8 }}>Comparativo por status.</div>
                    {barData.length > 0 ? (
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} margin={{ top: 22, right: 8, bottom: 0, left: 6 }} barCategoryGap="30%">
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={32} allowDecimals={false} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
                              {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                              <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "var(--color-text-primary)" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ height: 200, display: "grid", placeItems: "center", color: "var(--color-text-muted)", fontSize: 13 }}>Nenhum briefing no período.</div>
                    )}
                    <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 4 }}>
                      <Legend color={GREEN} label="Respondidos" />
                      <Legend color={CREAM} label="Aguardando" />
                      <Legend color={RED} label="Cancelados" />
                    </div>
                  </div>

                  {/* Cards de status */}
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ ...cardStyle, background: "rgba(47, 158, 68, 0.10)", border: "1px solid rgba(47, 158, 68, 0.35)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={iconBox(GREEN)}><IcCheck /></span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>RESPONDIDOS</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{counts.responded}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>briefing{counts.responded === 1 ? "" : "s"} respondido{counts.responded === 1 ? "" : "s"}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ ...cardStyle, background: "rgba(212, 176, 101, 0.12)", border: "1px solid rgba(212, 176, 101, 0.35)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={iconBox(CREAM)}><IcClock /></span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>AGUARDANDO RESPOSTAS</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{counts.awaiting}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>briefing{counts.awaiting === 1 ? "" : "s"} aguardando</div>
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

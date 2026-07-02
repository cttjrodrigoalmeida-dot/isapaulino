import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "../api";
import { timeAgo } from "./format";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

// Visão geral de volume: combina propostas, briefings e contratos numa única
// lista (cada um é um "projeto" do estúdio), agrupada por ano, para dar a noção
// do volume total.
interface Row {
  key: string;
  number: string; // nº AANN (propostas/briefings) ou "—" (contratos)
  kind: "Proposta" | "Briefing" | "Contrato";
  label: string;
  badgeClass: string;
  statusLabel: string;
  updatedAt: string;
  year: string;
}

// Ano de um nº AANN ("2624" → "2026"); cai na data se o nº não for numérico.
const yearFromNumber = (number: string, fallbackIso: string) =>
  /^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : `${new Date(fallbackIso).getFullYear()}`;
const yearFromDate = (iso: string) => `${new Date(iso).getFullYear()}`;

function Caret() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function Projetos({ onGoComercial }: { onGoComercial: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ propostas: 0, briefings: 0, contratos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ proposals }, { briefings }, { contracts }] = await Promise.all([
        api.listProposals(),
        api.listBriefings(),
        api.listContracts(),
      ]);
      const propRows: Row[] = proposals.map((p) => ({
        key: `proposta-${p.number}`,
        number: p.number,
        kind: "Proposta",
        label: p.client || p.serviceTitle || "—",
        badgeClass: p.status === "published" ? admin.badgePublished : admin.badgeDraft,
        statusLabel: p.status === "published" ? "Publicada" : "Rascunho",
        updatedAt: p.updatedAt,
        year: yearFromNumber(p.number, p.updatedAt),
      }));
      const briefRows: Row[] = briefings.map((b) => ({
        key: `briefing-${b.number}`,
        number: b.number,
        kind: "Briefing",
        label: b.title || `Proposta ${b.proposalNumber ?? "—"}`,
        badgeClass: b.status === "published" ? admin.badgePublished : admin.badgeDraft,
        statusLabel: b.status === "published" ? "Publicado" : "Rascunho",
        updatedAt: b.updatedAt,
        year: yearFromNumber(b.number, b.updatedAt),
      }));
      const contractStatus: Record<string, { label: string; cls: string }> = {
        draft: { label: "Rascunho", cls: admin.badgeDraft },
        published: { label: "Publicado", cls: admin.badgePublished },
        signed: { label: "Assinado", cls: admin.badgeSigned },
        cancelled: { label: "Cancelado", cls: admin.badgeCancelled },
      };
      const contractRows: Row[] = contracts.map((c) => ({
        key: `contrato-${c.id}`,
        number: "—",
        kind: "Contrato",
        label: `${c.title}${c.clientName ? ` · ${c.clientName}` : ""}`,
        badgeClass: contractStatus[c.status]?.cls ?? admin.badgeDraft,
        statusLabel: contractStatus[c.status]?.label ?? c.status,
        updatedAt: c.updatedAt,
        year: yearFromDate(c.updatedAt),
      }));

      const all = [...propRows, ...briefRows, ...contractRows].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setRows(all);
      setCounts({ propostas: proposals.length, briefings: briefings.length, contratos: contracts.length });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleYear = (year: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });

  // Agrupa por ano (desc).
  const groups = (() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const bucket = map.get(r.year);
      if (bucket) bucket.push(r);
      else map.set(r.year, [r]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, items]) => ({ year, items }));
  })();

  const total = counts.propostas + counts.briefings + counts.contratos;

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Projetos · visão geral</h1>
          <p className={s.greetSub}>
            Todos os projetos do estúdio (propostas, briefings e contratos) num só lugar, para ter noção do volume.
          </p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>
          Atualizar
        </button>
      </div>

      {/* Contadores de volume */}
      <div className={`${s.grid} ${s.cols4}`}>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Total de projetos</span>
          <span className={s.kpiValue}>{total}</span>
          <span className={s.kpiNote}>Propostas + briefings + contratos</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Propostas</span>
          <span className={s.kpiValue}>{counts.propostas}</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Briefings</span>
          <span className={s.kpiValue}>{counts.briefings}</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Contratos</span>
          <span className={s.kpiValue}>{counts.contratos}</span>
        </div>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      {loading ? (
        <div className={s.emptyMini}>Carregando projetos…</div>
      ) : rows.length === 0 ? (
        <div className={admin.empty}>
          Nenhum projeto ainda. Crie propostas e briefings no <strong>Comercial</strong>.
          <div style={{ marginTop: 14 }}>
            <button className={`${admin.btn} ${admin.btnPrimary}`} onClick={onGoComercial}>
              Ir para o Comercial
            </button>
          </div>
        </div>
      ) : (
        groups.map((g) => {
          const open = !collapsed.has(g.year);
          return (
            <div key={g.year} className={admin.yearGroup}>
              <button className={admin.yearHead} onClick={() => toggleYear(g.year)}>
                <span className={`${admin.yearCaret} ${open ? admin.yearCaretOpen : ""}`}>
                  <Caret />
                </span>
                <span className={admin.yearLabel}>{g.year}</span>
                <span className={admin.yearCount}>
                  {g.items.length} projeto{g.items.length === 1 ? "" : "s"}
                </span>
              </button>

              {open && (
                <table className={admin.table}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nº</th>
                      <th>Cliente / título</th>
                      <th>Status</th>
                      <th>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((r) => (
                      <tr key={r.key}>
                        <td>{r.kind}</td>
                        <td className={admin.rowNumber}>{r.number}</td>
                        <td>{r.label}</td>
                        <td>
                          <span className={`${admin.badge} ${r.badgeClass}`}>{r.statusLabel}</span>
                        </td>
                        <td>{timeAgo(r.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

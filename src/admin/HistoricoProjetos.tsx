import { useEffect, useState, useCallback, useMemo } from "react";
import { api, ApiError, type ContractSummary } from "./api";
import ProjectHistory from "./ProjectHistory";
import styles from "./Admin.module.css";

// Acesso PRINCIPAL ao histórico do projeto (também disponível dentro de cada
// cliente). Lista todos os projetos (contratos) com cliente e permite abrir a
// linha do tempo de qualquer um sem entrar no cadastro do cliente.

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
};
const projectLabel = (c: ContractSummary) =>
  (c.projectName || c.title || c.proposalTitle || "Projeto").trim();

export default function HistoricoProjetos() {
  const [rows, setRows] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ContractSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { contracts } = await api.listContracts();
      // Ordena: assinados primeiro (projetos ativos), depois por atualização.
      const sorted = [...contracts].sort((a, b) => {
        const rank = (c: ContractSummary) => (c.status === "signed" ? 0 : c.status === "cancelled" ? 2 : 1);
        return rank(a) - rank(b) || (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
      setRows(sorted);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao carregar projetos."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((c) =>
      projectLabel(c).toLowerCase().includes(t) ||
      (c.clientName ?? "").toLowerCase().includes(t) ||
      (c.contractNumber ?? "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  if (open) {
    return (
      <ProjectHistory
        contractId={open.id}
        projectLabel={projectLabel(open)}
        clientName={open.clientName ?? "—"}
        signed={open.status === "signed"}
        onBack={() => { setOpen(null); }}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Histórico do projeto</div>
          <div className={styles.pageHint}>Escolha um projeto para ver e editar a linha do tempo. Acesso rápido, sem entrar no cadastro do cliente.</div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 16, padding: "10px 14px" }}>
        <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Buscar por projeto, cliente ou nº do contrato…" />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>{q.trim() ? "Nenhum projeto encontrado para essa busca." : "Nenhum projeto ainda."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((c) => (
            <button key={c.id} className={styles.card} onClick={() => setOpen(c)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", width: "100%" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>{projectLabel(c)}</div>
                <div className={styles.pageHint} style={{ margin: "3px 0 0" }}>
                  {c.clientName || "Sem cliente"}
                  {c.contractNumber ? ` · Nº ${c.contractNumber}` : ""}
                  {c.signedAt ? ` · assinado ${fmtDate(c.signedAt)}` : ""}
                </div>
              </div>
              <StatusPill status={c.status} />
              <span style={{ color: "var(--color-text-muted)", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ContractSummary["status"] }) {
  const map: Record<ContractSummary["status"], { label: string; color: string }> = {
    signed: { label: "Assinado", color: "#4ade80" },
    published: { label: "Publicado", color: "#7c8698" },
    draft: { label: "Rascunho", color: "#7c8698" },
    cancelled: { label: "Cancelado", color: "#f0506e" },
  };
  const m = map[status] ?? map.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: `${m.color}1e`, color: m.color, border: `1px solid ${m.color}44`, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

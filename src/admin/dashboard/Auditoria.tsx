import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type AuditLog } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

function fmt(at: string): string {
  const d = new Date(at.replace(" ", "T") + (at.includes("Z") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString("pt-BR");
}
const methodColor: Record<string, string> = { POST: "badgeSigned", PUT: "badgeDraft", DELETE: "badgeCancelled" };

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { logs } = await api.listLogs();
      setLogs(logs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = logs.filter(
    (l) => !q || l.action.toLowerCase().includes(q.toLowerCase()) || (l.user || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Auditoria</h1>
          <p className={s.greetSub}>Registro das ações feitas no painel — quem fez o quê e quando.</p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>Atualizar</button>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      <div style={{ marginBottom: 12 }}>
        <input className={admin.input} style={{ maxWidth: 280 }} placeholder="Buscar por ação ou usuário…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : shown.length === 0 ? (
        <div className={admin.empty}>{logs.length === 0 ? "Nenhuma ação registrada ainda." : "Nada neste filtro."}</div>
      ) : (
        <table className={admin.table}>
          <thead>
            <tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Método</th><th>Status</th></tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id}>
                <td className={admin.mono}>{fmt(l.at)}</td>
                <td>{l.user || "—"}</td>
                <td>{l.action}</td>
                <td><span className={`${admin.badge} ${admin[methodColor[l.method] || "badgeDraft"]}`}>{l.method}</span></td>
                <td className={admin.mono}>{l.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

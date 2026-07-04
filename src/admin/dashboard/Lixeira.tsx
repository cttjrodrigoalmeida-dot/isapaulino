import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type TrashItem } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

function fmt(at: string): string {
  const d = new Date(at.replace(" ", "T") + (at.includes("Z") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString("pt-BR");
}

export default function Lixeira() {
  const [clients, setClients] = useState<TrashItem[]>([]);
  const [contracts, setContracts] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { clients, contracts } = await api.listTrash();
      setClients(clients);
      setContracts(contracts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (entity: "client" | "contract", id: string, action: "restore" | "purge", label: string) => {
    if (action === "purge" && !confirm(`Apagar "${label}" DEFINITIVAMENTE? Não dá para recuperar depois.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.trashAction(entity, id, action);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro na ação.");
    } finally {
      setBusy(false);
    }
  };

  const total = clients.length + contracts.length;

  const section = (title: string, items: TrashItem[], entity: "client" | "contract") => (
    <div className={s.card} style={{ marginBottom: 16 }}>
      <div className={s.cardTitleX}>{title} ({items.length})</div>
      {items.length === 0 ? (
        <div className={s.emptyMini} style={{ marginTop: 8 }}>Nada aqui.</div>
      ) : (
        <div className={admin.tableScroll}>
          <table className={admin.table}>
            <thead>
              <tr><th>{entity === "client" ? "Cliente" : "Contrato"}</th><th>Detalhe</th><th>Excluído em</th><th style={{ textAlign: "right" }}>Ações</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{entity === "client" ? it.name : it.title}</td>
                  <td className={s.listMeta}>{entity === "client" ? (it.email || it.cpfCnpj || "—") : (it.clientName || "—")}</td>
                  <td className={admin.mono}>{fmt(it.deletedAt)}</td>
                  <td>
                    <div className={admin.rowActions}>
                      <button className={`${admin.btn} ${admin.btnPrimary}`} disabled={busy} onClick={() => act(entity, it.id, "restore", String(it.name || it.title))}>Restaurar</button>
                      <button className={`${admin.btn} ${admin.btnDanger}`} disabled={busy} onClick={() => act(entity, it.id, "purge", String(it.name || it.title))}>Apagar definitivo</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Lixeira</h1>
          <p className={s.greetSub}>Clientes e contratos excluídos. Restaure o que apagou por engano ou apague de vez.</p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>Atualizar</button>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      {loading ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : total === 0 ? (
        <div className={admin.empty}>A lixeira está vazia. 🎉</div>
      ) : (
        <>
          {section("Contratos", contracts, "contract")}
          {section("Clientes", clients, "client")}
        </>
      )}
    </>
  );
}

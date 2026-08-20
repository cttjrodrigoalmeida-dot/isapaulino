import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type TrashItem } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

function fmt(at: string): string {
  const d = new Date(at.replace(" ", "T") + (at.includes("Z") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString("pt-BR");
}

type Entity = "client" | "contract" | "proposal" | "briefing";

export default function Lixeira() {
  const [clients, setClients] = useState<TrashItem[]>([]);
  const [contracts, setContracts] = useState<TrashItem[]>([]);
  const [proposals, setProposals] = useState<TrashItem[]>([]);
  const [briefings, setBriefings] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { clients, contracts, proposals, briefings } = await api.listTrash();
      setClients(clients);
      setContracts(contracts);
      setProposals(proposals);
      setBriefings(briefings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (entity: Entity, key: string, action: "restore" | "purge", label: string) => {
    if (action === "purge" && !confirm(`Apagar "${label}" DEFINITIVAMENTE? Não dá para recuperar depois.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.trashAction(entity, key, action);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro na ação.");
    } finally {
      setBusy(false);
    }
  };

  const total = clients.length + contracts.length + proposals.length + briefings.length;

  // Config por tipo: rótulo da 1ª coluna + como extrair chave/nome/detalhe.
  const cfgs: Record<Entity, { col: string; key: (i: TrashItem) => string; name: (i: TrashItem) => string; detail: (i: TrashItem) => string }> = {
    contract: { col: "Contrato", key: (i) => i.id, name: (i) => i.title || "Contrato", detail: (i) => i.clientName || "—" },
    proposal: { col: "Proposta", key: (i) => i.number || "", name: (i) => `Nº ${i.number}${i.serviceTitle ? ` · ${i.serviceTitle}` : ""}`, detail: (i) => i.client || "—" },
    briefing: { col: "Briefing", key: (i) => i.number || "", name: (i) => `Nº ${i.number}${i.title ? ` · ${i.title}` : ""}`, detail: (i) => (i.proposalNumber ? `proposta ${i.proposalNumber}` : "—") },
    client: { col: "Cliente", key: (i) => i.id, name: (i) => i.name || "Cliente", detail: (i) => i.email || i.cpfCnpj || "—" },
  };

  const section = (title: string, items: TrashItem[], entity: Entity) => {
    const c = cfgs[entity];
    return (
      <div className={s.card} style={{ marginBottom: 16 }}>
        <div className={s.cardTitleX}>{title} ({items.length})</div>
        {items.length === 0 ? (
          <div className={s.emptyMini} style={{ marginTop: 8 }}>Nada aqui.</div>
        ) : (
          <div className={admin.tableScroll}>
            <table className={admin.table}>
              <thead>
                <tr><th>{c.col}</th><th>Detalhe</th><th>Excluído em</th><th style={{ textAlign: "right" }}>Ações</th></tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const key = c.key(it);
                  const name = c.name(it);
                  return (
                    <tr key={`${entity}-${key}`}>
                      <td>{name}</td>
                      <td className={s.listMeta}>{c.detail(it)}</td>
                      <td className={admin.mono}>{fmt(it.deletedAt)}</td>
                      <td>
                        <div className={admin.rowActions}>
                          <button className={`${admin.btn} ${admin.btnPrimary}`} disabled={busy} onClick={() => act(entity, key, "restore", name)}>Restaurar</button>
                          <button className={`${admin.btn} ${admin.btnDanger}`} disabled={busy} onClick={() => act(entity, key, "purge", name)}>Apagar definitivo</button>
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
  };

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Lixeira</h1>
          <p className={s.greetSub}>Propostas, contratos, briefings e clientes excluídos. Restaure o que apagou por engano ou apague de vez.</p>
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
          {section("Propostas", proposals, "proposal")}
          {section("Contratos", contracts, "contract")}
          {section("Briefings", briefings, "briefing")}
          {section("Clientes", clients, "client")}
        </>
      )}
    </>
  );
}

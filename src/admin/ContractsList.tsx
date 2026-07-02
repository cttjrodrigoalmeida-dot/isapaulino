import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type ContractSummary, type ContractStatus } from "./api";
import { formatBRL } from "./dashboard/format";
import styles from "./Admin.module.css";

const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "badgeDraft" },
  published: { label: "Publicado", cls: "badgePublished" },
  signed: { label: "Assinado", cls: "badgeSigned" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

export default function ContractsList({
  onNew,
  onEdit,
  onPayments,
}: {
  onNew: () => void;
  onEdit: (id: string) => void;
  onPayments: (id: string, title: string) => void;
}) {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (c: ContractSummary) => {
    if (!confirm(`Excluir o contrato "${c.title}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(c.id);
    try {
      await api.deleteContract(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };

  // Verifica/atualiza a assinatura direto da lista (reconsulta a Autentique),
  // sem precisar entrar no contrato. Atualiza o status na hora se já assinado.
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
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async (c: ContractSummary) => {
    setBusy(c.id);
    try {
      const { contract } = await api.getContract(c.id);
      await api.createContract({
        client_id: contract.clientId,
        title: `${contract.title} (cópia)`,
        content: contract.content,
        data: contract.data, // copia o documento rico completo
        value: contract.value,
        deadline: contract.deadline,
        autentique_url: null, // o link de assinatura é específico do original
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao duplicar.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Contratos</div>
          <div className={styles.pageHint}>Crie, edite e publique contratos vinculados aos clientes.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btn} onClick={load} disabled={loading}>
            Atualizar
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>
            + Novo contrato
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum contrato ainda. Clique em <strong>“+ Novo contrato”</strong> para começar.
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Título</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const meta = STATUS_META[c.status];
              const isPublic = (c.status === "published" || c.status === "signed") && c.slug;
              return (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>{c.clientName || "—"}</td>
                  <td className={styles.mono}>{c.value != null ? formatBRL(c.value) : "—"}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      {isPublic && (
                        <a
                          className={`${styles.btn} ${styles.btnGhost}`}
                          href={`/contrato/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver
                        </a>
                      )}
                      <button className={styles.btn} onClick={() => onEdit(c.id)}>
                        Editar
                      </button>
                      <button className={styles.btn} onClick={() => onPayments(c.id, c.title)}>
                        Pagamentos
                      </button>
                      {c.autentiqueDocumentId && c.status !== "signed" && c.status !== "cancelled" && (
                        <button
                          className={`${styles.btn} ${styles.btnGhost}`}
                          onClick={() => checkSignature(c)}
                          disabled={busy === c.id}
                        >
                          Verificar assinatura
                        </button>
                      )}
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => duplicate(c)}
                        disabled={busy === c.id}
                      >
                        Duplicar
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => remove(c)}
                        disabled={busy === c.id}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

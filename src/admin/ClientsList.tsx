import { useEffect, useState, useCallback, useMemo } from "react";
import { api, ApiError, type Client } from "./api";
import { formatCpfCnpj, formatPhone, onlyDigits } from "./validation";
import styles from "./Admin.module.css";

export default function ClientsList({
  onNew,
  onEdit,
  onHistory,
}: {
  onNew: () => void;
  onEdit: (id: string) => void;
  onHistory: (id: string, name: string, phone: string | null) => void;
}) {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { clients } = await api.listClients();
      setItems(clients);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (c: Client) => {
    if (!confirm(`Excluir o cliente "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(c.id);
    try {
      await api.deleteClient(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };

  // Busca client-side: nome, e-mail, cidade ou dígitos do CPF/CNPJ/telefone.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const qDigits = onlyDigits(q);
    return items.filter((c) => {
      const haystack = [c.name, c.email, c.city, c.state].filter(Boolean).join(" ").toLowerCase();
      if (haystack.includes(q)) return true;
      if (qDigits) {
        const digits = onlyDigits(`${c.cpf_cnpj ?? ""} ${c.phone ?? ""}`);
        if (digits.includes(qDigits)) return true;
      }
      return false;
    });
  }, [items, query]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Clientes</div>
          <div className={styles.pageHint}>Cadastro de clientes do estúdio (base para contratos e propostas).</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btn} onClick={load} disabled={loading}>
            Atualizar
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>
            + Novo cliente
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!loading && items.length > 0 && (
        <div className={styles.field} style={{ marginBottom: 14 }}>
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, cidade, CPF/CNPJ ou telefone…"
          />
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum cliente ainda. Clique em <strong>“+ Novo cliente”</strong> para começar.
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Nenhum cliente encontrado para “{query}”.</div>
      ) : (
        <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF/CNPJ</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Cidade/UF</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className={styles.mono}>{c.cpf_cnpj ? formatCpfCnpj(c.cpf_cnpj) : "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.phone ? formatPhone(c.phone) : "—"}</td>
                <td>{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button className={styles.btn} onClick={() => onEdit(c.id)}>
                      Editar
                    </button>
                    <button className={styles.btn} onClick={() => onHistory(c.id, c.name, c.phone)}>
                      Histórico
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
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

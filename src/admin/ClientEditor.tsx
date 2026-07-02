import { useEffect, useState } from "react";
import { api, ApiError, type ClientInput } from "./api";
import { isValidCpfCnpj, isValidEmail } from "./validation";
import styles from "./Admin.module.css";

const EMPTY: ClientInput = {
  name: "",
  cpf_cnpj: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
};

export default function ClientEditor({
  id,
  onBack,
  onSaved,
}: {
  id: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = id === null;
  const [form, setForm] = useState<ClientInput>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    (async () => {
      try {
        const { client } = await api.getClient(id!);
        if (!alive) return;
        setForm({
          name: client.name,
          cpf_cnpj: client.cpf_cnpj ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          state: client.state ?? "",
        });
      } catch (err) {
        if (alive) setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setError(null);
    const name = (form.name ?? "").trim();
    if (!name) return setError("Informe o nome do cliente.");
    if (form.cpf_cnpj && !isValidCpfCnpj(form.cpf_cnpj)) return setError("CPF/CNPJ inválido.");
    if (form.email && !isValidEmail(form.email)) return setError("E-mail inválido.");

    setSaving(true);
    try {
      if (isNew) await api.createClient(form);
      else await api.updateClient(id!, form);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando cliente…</div>;

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>{isNew ? "Novo cliente" : "Editar cliente"}</div>
          <div className={styles.pageHint}>Campos com * são obrigatórios.</div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>
          ← Voltar
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.cardTitle}>Dados do cliente</div>

        <div className={styles.field}>
          <label className={styles.label}>Nome *</label>
          <input
            className={styles.input}
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nome completo ou razão social"
            autoFocus
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>CPF / CNPJ</label>
            <input
              className={`${styles.input} ${styles.mono}`}
              value={form.cpf_cnpj ?? ""}
              onChange={(e) => set("cpf_cnpj", e.target.value)}
              placeholder="Somente números ou com pontuação"
              inputMode="numeric"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Telefone</label>
            <input
              className={styles.input}
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(00) 00000-0000"
              inputMode="tel"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>E-mail</label>
          <input
            className={styles.input}
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="email@exemplo.com"
            inputMode="email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Endereço</label>
          <input
            className={styles.input}
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Rua, número, complemento"
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Cidade</label>
            <input
              className={styles.input}
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>UF</label>
            <input
              className={styles.input}
              value={form.state ?? ""}
              onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
              placeholder="SP"
              maxLength={2}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack} disabled={saving}>
            Cancelar
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving}>
            {saving ? "Salvando…" : isNew ? "Criar cliente" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

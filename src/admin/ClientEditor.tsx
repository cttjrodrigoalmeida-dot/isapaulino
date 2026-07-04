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
  role: "",
  nacionalidade: "",
  birth_date: "",
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
  const [access, setAccess] = useState<{ enabled: boolean; link: string } | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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
          role: client.role ?? "",
          nacionalidade: client.nacionalidade ?? "",
          birth_date: client.birth_date ?? "",
        });
        try {
          const a = await api.getClientAccess(id!);
          if (alive) setAccess(a);
        } catch {
          /* acesso é opcional na tela */
        }
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

  const toggleAccess = async () => {
    if (isNew) return;
    setError(null);
    setAccessBusy(true);
    try {
      await api.setClientAccess(id!, !access?.enabled);
      setAccess(await api.getClientAccess(id!));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao alterar o acesso.");
    } finally {
      setAccessBusy(false);
    }
  };
  const copyLink = () => {
    if (!access?.link) return;
    navigator.clipboard?.writeText(access.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  const regenerateLink = async () => {
    if (isNew) return;
    if (!confirm("Gerar um novo link revoga o link anterior (quem tiver o antigo perde o acesso). Continuar?")) return;
    setError(null);
    setAccessBusy(true);
    try {
      const a = await api.regenerateClientLink(id!);
      setAccess({ enabled: a.enabled, link: a.link });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao gerar novo link.");
    } finally {
      setAccessBusy(false);
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

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Profissão / papel</label>
            <input
              className={styles.input}
              value={form.role ?? ""}
              onChange={(e) => set("role", e.target.value)}
              placeholder="ex.: Arquiteto e Urbanista"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nacionalidade</label>
            <input
              className={styles.input}
              value={form.nacionalidade ?? ""}
              onChange={(e) => set("nacionalidade", e.target.value)}
              placeholder="ex.: Brasileiro(a)"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Data de nascimento</label>
          <input
            className={styles.input}
            value={form.birth_date ?? ""}
            onChange={(e) => set("birth_date", e.target.value)}
            placeholder="ex.: 21/08/1995"
          />
          <div className={styles.pageHint} style={{ marginTop: 6 }}>
            Profissão, nacionalidade e nascimento são usados para preencher o contrato automaticamente.
          </div>
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

      {!isNew && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Área do Cliente</div>
          <div className={styles.pageHint} style={{ marginBottom: 12 }}>
            Libere o acesso e envie o <strong>link exclusivo</strong> ao cliente (WhatsApp/e-mail). Ele entra sem senha e vê só o próprio contrato, pagamentos e histórico. O acesso também é liberado automaticamente ao <strong>publicar um contrato</strong>.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              className={`${styles.btn} ${access?.enabled ? styles.btnGhost : styles.btnPrimary}`}
              onClick={toggleAccess}
              disabled={accessBusy}
            >
              {accessBusy ? "…" : access?.enabled ? "Bloquear acesso" : "Liberar acesso"}
            </button>
            <span className={`${styles.badge} ${access?.enabled ? styles.badgePublished : styles.badgeDraft}`}>
              {access?.enabled ? "Acesso liberado" : "Sem acesso"}
            </span>
          </div>
          {access?.enabled && access.link && (
            <>
              <div className={styles.publicLinkBox} style={{ marginTop: 12 }}>
                <span className={styles.publicLinkUrl}>{access.link}</span>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={copyLink}>
                  {copied ? "Copiado!" : "Copiar link"}
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={regenerateLink} disabled={accessBusy}>
                  Gerar novo link
                </button>
              </div>
              <div className={styles.pageHint} style={{ marginTop: 6 }}>
                O link vale 30 dias. No 1º acesso, o cliente confirma o CPF/CNPJ. “Gerar novo link” revoga o anterior.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

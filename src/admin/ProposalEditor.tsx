import { useEffect, useState, useCallback } from "react";
import type { Proposal } from "../components/proposal/types";
import { SAMPLE_PROPOSAL } from "../components/proposal/sampleProposal";
import { api, ApiError } from "./api";
// Numeração com prefixo de ano (AANN): os 2 primeiros dígitos são sempre o ano.
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import {
  recomputeInvestment,
  recomputePayment,
  readComboFromNote,
  readPixDiscount,
  readMaxInstallments,
} from "./recompute";
import ListEditor from "./ListEditor";
import InvestmentEditor from "./InvestmentEditor";
import PaymentEditor from "./PaymentEditor";
import ProcessEditor from "./ProcessEditor";
import SectionsEditor from "./SectionsEditor";
import styles from "./Admin.module.css";

type Status = "draft" | "published";

// Extrai a quantidade de dias do texto de validade (ex.: "7 dias úteis" → 7).
function daysFromValidity(validity: string): number | null {
  const m = validity.match(/\d+/);
  return m ? Number(m[0]) : null;
}

// Data base da proposta ("DD/MM/AAAA"); fallback p/ hoje se não parsear.
function parseProposalDate(date: string): Date {
  const m = date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59, 59);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const today = new Date();
  today.setHours(23, 59, 59, 0);
  return today;
}

// Calcula o ISO de expiração (data da proposta + N dias, fim do dia) p/ o contador.
function computeValidUntil(validity: string, date: string): string | undefined {
  const days = daysFromValidity(validity);
  if (days == null) return undefined;
  const end = parseProposalDate(date);
  end.setDate(end.getDate() + days);
  return end.toISOString();
}

// Data de hoje no formato "DD/MM/AAAA" (padrão de uma proposta nova).
function todayBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ProposalEditor({
  number,
  onBack,
  onSaved,
}: {
  number: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = number === null;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [status, setStatus] = useState<Status>("draft");
  const [comboEnabled, setComboEnabled] = useState(false);
  const [comboPercent, setComboPercent] = useState(10);
  const [pixDiscount, setPixDiscount] = useState(5);
  const [maxInstallments, setMaxInstallments] = useState(4);
  const [tab, setTab] = useState<"campos" | "json">("campos");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Clientes cadastrados — para "puxar" o cliente no seletor (evita erro de nome no Ranking/Dashboard).
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    api.listClients().then(({ clients }) => setClients(clients.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, []);

  // Recálculo central: investimento → total → pagamento.
  const recomputeAll = useCallback(
    (
      p: Proposal,
      c = { enabled: comboEnabled, percent: comboPercent },
      pay = { pixDiscount, maxInstallments }
    ): Proposal =>
      recomputePayment(recomputeInvestment(p, c.enabled, c.percent), pay.pixDiscount, pay.maxInstallments),
    [comboEnabled, comboPercent, pixDiscount, maxInstallments]
  );

  // Carrega (editar) ou prepara nova proposta clonando a mais recente.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isNew) {
          const { proposals } = await api.listProposals();
          const nextNum = nextProposalNumber(proposals.map((p) => p.number));
          let template: Proposal = SAMPLE_PROPOSAL;
          if (proposals.length > 0) {
            const latest = [...proposals].sort((a, b) => Number(b.number) - Number(a.number))[0];
            template = (await api.getProposal(latest.number)).proposal;
          }
          const draft = structuredClone(template);
          draft.number = nextNum;
          draft.client = "";
          draft.clientFirstName = "";
          // Proposta nova começa com a data de hoje (editável).
          draft.date = todayBR();
          draft.validUntil = computeValidUntil(draft.validity, draft.date) ?? draft.validUntil;
          const combo = readComboFromNote(draft.comboNote);
          const pixD = readPixDiscount(draft.pixPlan?.discountLabel);
          const maxN = readMaxInstallments(draft.installmentPlan?.rows);
          if (!alive) return;
          setComboEnabled(combo.enabled);
          setComboPercent(combo.percent);
          setPixDiscount(pixD);
          setMaxInstallments(maxN);
          setProposal(
            recomputePayment(recomputeInvestment(draft, combo.enabled, combo.percent), pixD, maxN)
          );
          setStatus("draft");
        } else {
          const { proposal: p, status: s } = await api.getProposal(number!);
          if (!alive) return;
          setComboEnabled(readComboFromNote(p.comboNote).enabled);
          setComboPercent(readComboFromNote(p.comboNote).percent);
          setPixDiscount(readPixDiscount(p.pixPlan?.discountLabel));
          setMaxInstallments(readMaxInstallments(p.installmentPlan?.rows));
          setProposal(p);
          setStatus(s);
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
  }, [isNew, number]);

  // Campo simples (não financeiro): apenas substitui o valor.
  const set = useCallback(<K extends keyof Proposal>(key: K, value: Proposal[K]) => {
    setProposal((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  // Mudança que pode afetar os cálculos: recalcula tudo.
  const update = useCallback(
    (next: Proposal) => setProposal(recomputeAll(next)),
    [recomputeAll]
  );

  const onComboChange = (enabled: boolean, percent: number) => {
    setComboEnabled(enabled);
    setComboPercent(percent);
    setProposal((prev) => (prev ? recomputeAll(prev, { enabled, percent }) : prev));
  };
  const onPayChange = (pixD: number, maxN: number) => {
    setPixDiscount(pixD);
    setMaxInstallments(maxN);
    setProposal((prev) =>
      prev ? recomputeAll(prev, { enabled: comboEnabled, percent: comboPercent }, { pixDiscount: pixD, maxInstallments: maxN }) : prev
    );
  };

  const goJsonTab = () => {
    if (proposal) setJsonText(JSON.stringify(proposal, null, 2));
    setJsonError(null);
    setTab("json");
  };
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as Proposal;
      if (!parsed || typeof parsed !== "object") throw new Error("JSON inválido.");
      setComboEnabled(readComboFromNote(parsed.comboNote).enabled);
      setComboPercent(readComboFromNote(parsed.comboNote).percent);
      setPixDiscount(readPixDiscount(parsed.pixPlan?.discountLabel));
      setMaxInstallments(readMaxInstallments(parsed.installmentPlan?.rows));
      setProposal(parsed);
      setJsonError(null);
      setNotice("JSON aplicado aos campos.");
      setTab("campos");
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "JSON inválido.");
    }
  };

  const save = async (publish?: boolean) => {
    if (!proposal) return;
    setError(null);
    setNotice(null);
    const finalStatus: Status = publish ? "published" : status;
    if (!proposal.number.trim()) {
      setError("Informe o número da proposta.");
      return;
    }
    const clean: Proposal = {
      ...proposal,
      // Mantém o contador regressivo coerente com a validade/data informadas.
      validUntil: computeValidUntil(proposal.validity, proposal.date) ?? proposal.validUntil,
      serviceTags: (proposal.serviceTags ?? []).map((s) => s.trim()).filter(Boolean),
      ambientes: (proposal.ambientes ?? []).map((s) => s.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      if (isNew) await api.createProposal(clean, finalStatus);
      else await api.updateProposal(number!, clean, finalStatus);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !proposal) {
    return <div className={styles.loading}>Carregando proposta…</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>
            {isNew ? `Nova proposta Nº ${proposal.number}` : `Editar proposta Nº ${number}`}
          </div>
          <div className={styles.pageHint}>
            {isNew
              ? "Criada a partir da proposta mais recente — ajuste o que mudar."
              : "Valores (subtotais, total, PIX e parcelas) são calculados automaticamente."}
          </div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>
          ← Voltar
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "campos" ? styles.tabActive : ""}`} onClick={() => setTab("campos")}>
          Campos
        </button>
        <button className={`${styles.tab} ${tab === "json" ? styles.tabActive : ""}`} onClick={goJsonTab}>
          JSON avançado
        </button>
      </div>

      {tab === "campos" ? (
        <div className={styles.editorGrid}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Identificação</div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Número {isNew ? "(sugerido — edite se quiser)" : "(fixo)"}</label>
                <input
                  className={`${styles.input} ${styles.mono}`}
                  value={proposal.number}
                  onChange={(e) => set("number", e.target.value.trim())}
                  readOnly={!isNew}
                  inputMode="numeric"
                  placeholder="Ex.: 2624"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Data</label>
                <input
                  className={styles.input}
                  value={proposal.date}
                  onChange={(e) => {
                    const date = e.target.value;
                    setProposal((prev) =>
                      prev
                        ? { ...prev, date, validUntil: computeValidUntil(prev.validity, date) ?? prev.validUntil }
                        : prev
                    );
                  }}
                />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Cliente</label>
                {clients.length > 0 && (
                  <select
                    className={styles.input}
                    style={{ marginBottom: 8 }}
                    value=""
                    onChange={(e) => {
                      const c = clients.find((x) => x.id === e.target.value);
                      if (!c) return;
                      const first = c.name.trim().split(/\s+/)[0] || c.name;
                      setProposal((prev) => (prev ? { ...prev, client: c.name, clientFirstName: first } : prev));
                    }}
                  >
                    <option value="">— Puxar cliente cadastrado —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <input className={styles.input} value={proposal.client} onChange={(e) => set("client", e.target.value)} placeholder="Nome do cliente" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Primeiro nome (carta)</label>
                <input className={styles.input} value={proposal.clientFirstName} onChange={(e) => set("clientFirstName", e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Validade (texto exibido)</label>
              <input
                className={styles.input}
                value={proposal.validity}
                onChange={(e) => {
                  const validity = e.target.value;
                  setProposal((prev) =>
                    prev
                      ? { ...prev, validity, validUntil: computeValidUntil(validity, prev.date) ?? prev.validUntil }
                      : prev
                  );
                }}
              />
              <div className={styles.pageHint} style={{ marginTop: 6 }}>
                {proposal.validUntil
                  ? `Contador regressivo até ${new Date(proposal.validUntil).toLocaleDateString("pt-BR")} (derivado da quantidade de dias acima).`
                  : "Inclua um número de dias (ex.: “7 dias”) para ativar o contador regressivo."}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Capa / Escopo</div>
            <div className={styles.field}>
              <label className={styles.label}>Título do serviço</label>
              <input className={styles.input} value={proposal.serviceTitle} onChange={(e) => set("serviceTitle", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <ListEditor items={proposal.serviceTags ?? []} onChange={(v) => set("serviceTags", v)} placeholder="ex.: APARTAMENTO" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Apresentação do escopo</label>
              <textarea className={styles.textarea} rows={4} value={proposal.scopeIntro} onChange={(e) => set("scopeIntro", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Observação do escopo (opcional)</label>
              <textarea className={styles.textarea} rows={2} value={proposal.scopeNote ?? ""} onChange={(e) => set("scopeNote", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ambientes</label>
              <ListEditor items={proposal.ambientes ?? []} onChange={(v) => set("ambientes", v)} placeholder="ex.: Sala de TV" />
            </div>
          </div>

          {/* ordem igual à da página: Processo vem antes do Investimento */}
          <ProcessEditor proposal={proposal} onChange={(p) => setProposal(p)} />

          <InvestmentEditor
            proposal={proposal}
            comboEnabled={comboEnabled}
            comboPercent={comboPercent}
            onChange={update}
            onComboChange={onComboChange}
          />

          <PaymentEditor
            proposal={proposal}
            pixDiscount={pixDiscount}
            maxInstallments={maxInstallments}
            onChange={update}
            onPayChange={onPayChange}
          />

          <SectionsEditor proposal={proposal} onChange={(p) => setProposal(p)} />
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.cardTitle}>JSON avançado (objeto Proposal completo)</div>
          {jsonError && <div className={styles.error}>{jsonError}</div>}
          <textarea
            className={`${styles.textarea} ${styles.jsonArea}`}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={applyJson}>
              Aplicar JSON
            </button>
            <button className={styles.btn} onClick={() => setTab("campos")}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className={styles.editorBar}>
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>Status</label>
          <select
            className={styles.input}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            style={{ width: 180 }}
          >
            <option value="draft">Rascunho (oculto)</option>
            <option value="published">Publicada (link ativo)</option>
          </select>
        </div>
        <div className={styles.editorBarRight}>
          <button className={styles.btn} onClick={() => save(false)} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => save(true)} disabled={saving}>
            Salvar e publicar
          </button>
        </div>
      </div>
    </div>
  );
}

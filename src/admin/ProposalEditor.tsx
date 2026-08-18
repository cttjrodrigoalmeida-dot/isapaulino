import { useEffect, useState, useCallback, useRef } from "react";
import type { Proposal } from "../components/proposal/types";
import { SAMPLE_PROPOSAL } from "../components/proposal/sampleProposal";
import ProposalView from "../components/proposal/ProposalView";
import { api, ApiError } from "./api";
// Numeração com prefixo de ano (AANN): os 2 primeiros dígitos são sempre o ano.
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import RelatedDocs from "./RelatedDocs";
import {
  recomputeInvestment,
  recomputePayment,
  readComboFromNote,
  readPixDiscount,
  readMaxInstallments,
} from "./recompute";
import ListEditor from "./ListEditor";
import GalleryEditor from "./GalleryEditor";
import InvestmentEditor from "./InvestmentEditor";
import PaymentEditor from "./PaymentEditor";
import ProcessEditor from "./ProcessEditor";
import SectionsEditor from "./SectionsEditor";
import BackToTop from "./BackToTop";
import { useAutosavePref, AutosaveToggle } from "./autosave";
import styles from "./Admin.module.css";

type Status = "draft" | "published";

// Largura do painel de prévia (usada no drawer e para "encolher" o editor à esquerda).
const PREVIEW_W = "min(48vw, 760px)";

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
  // Senha de acesso da proposta (vazio = link público). Fica fora do JSON da
  // proposta (nunca vai para a página pública) — é uma coluna própria no banco.
  const [accessPassword, setAccessPassword] = useState("");
  const [comboEnabled, setComboEnabled] = useState(false);
  const [comboPercent, setComboPercent] = useState(10);
  const [pixDiscount, setPixDiscount] = useState(5);
  const [maxInstallments, setMaxInstallments] = useState(4);
  const [tab, setTab] = useState<"campos" | "json">("campos");
  const [showPreview, setShowPreview] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Salvamento automático (salva as edições sem sair da página) ──
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autosaveOn, setAutosaveOn] = useAutosavePref();
  const hydratedRef = useRef(false); // evita marcar "dirty" no carregamento
  const savingRef = useRef(false);   // evita autosave sobreposto
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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
          const { proposal: p, status: s, accessPassword: pw } = await api.getProposal(number!);
          if (!alive) return;
          setComboEnabled(readComboFromNote(p.comboNote).enabled);
          setComboPercent(readComboFromNote(p.comboNote).percent);
          setPixDiscount(readPixDiscount(p.pixPlan?.discountLabel));
          setMaxInstallments(readMaxInstallments(p.installmentPlan?.rows));
          setProposal(p);
          setStatus(s);
          setAccessPassword(pw ?? "");
        }
      } catch (err) {
        if (alive) setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
      } finally {
        if (alive) { setLoading(false); requestAnimationFrame(() => { hydratedRef.current = true; }); }
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

  // Monta a proposta "limpa" para persistir (usada no Salvar manual e no autosave).
  const buildClean = (p: Proposal): Proposal => ({
    ...p,
    // Mantém o contador regressivo coerente com a validade/data informadas.
    validUntil: computeValidUntil(p.validity, p.date) ?? p.validUntil,
    serviceTags: (p.serviceTags ?? []).map((s) => (s ?? "").trim()).filter(Boolean),
    ambientes: (p.ambientes ?? []).map((s) => (s ?? "").trim()).filter(Boolean),
  });

  const save = async (publish?: boolean) => {
    if (!proposal) return;
    setError(null);
    setNotice(null);
    const finalStatus: Status = publish ? "published" : status;
    if (!proposal.number.trim()) {
      setError("Informe o número da proposta.");
      return;
    }
    const clean = buildClean(proposal);
    savingRef.current = true;
    setSaving(true);
    try {
      if (isNew) await api.createProposal(clean, finalStatus, accessPassword);
      else await api.updateProposal(number!, clean, finalStatus, accessPassword);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Marca alterações pendentes (após o carregamento inicial).
  useEffect(() => {
    if (hydratedRef.current) setDirty(true);
  }, [proposal, status, accessPassword, comboEnabled, comboPercent, pixDiscount, maxInstallments]);

  // Autosave silencioso (só proposta JÁ criada): debounce ~2,5s de ociosidade.
  const latestRef = useRef({ proposal, status, accessPassword });
  latestRef.current = { proposal, status, accessPassword };
  useEffect(() => {
    if (!dirty || isNew || !autosaveOn) return;
    const cur = latestRef.current;
    if (!cur.proposal?.number?.trim()) return;
    const t = window.setTimeout(async () => {
      if (savingRef.current) return;
      const c = latestRef.current;
      if (!c.proposal) return;
      savingRef.current = true; setSaving(true);
      try {
        await api.updateProposal(number!, buildClean(c.proposal), c.status, c.accessPassword);
        setLastSavedAt(Date.now()); setDirty(false);
      } catch { /* mantém dirty; tenta na próxima */ }
      finally { savingRef.current = false; setSaving(false); }
    }, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, isNew, autosaveOn, proposal, status, accessPassword]);

  if (loading || !proposal) {
    return <div className={styles.loading}>Carregando proposta…</div>;
  }

  return (
    <div
      className={styles.container}
      style={
        showPreview
          ? {
              // Encolhe o editor p/ a esquerda enquanto a prévia estiver aberta,
              // reservando a largura do painel (senão ele tapa os campos da direita).
              maxWidth: "none",
              marginLeft: 0,
              marginRight: `calc(${PREVIEW_W} + 20px)`,
              transition: "margin-right .22s ease",
            }
          : { transition: "margin-right .22s ease" }
      }
    >
      <BackToTop />
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
        <div style={{ display: "flex", gap: 10 }}>
          <button className={`${styles.btn} ${showPreview ? styles.btnPrimary : ""}`} onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Ocultar prévia" : "👁 Pré-visualizar"}
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>
            ← Voltar
          </button>
        </div>
      </div>

      <RelatedDocs proposalNumber={number} current="proposal" />

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

      {/* Barra de estado do salvamento + interruptor do automático */}
      <div className={styles.editorToolbar}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span className={styles.saveBadge}>
            <span className={styles.saveBadgeDot} style={{ background: saving ? "#d9a531" : dirty ? "#d9a531" : "#4ade80" }} />
            {saving ? "Salvando…" : dirty ? (autosaveOn ? "Alterações não salvas" : "Não salvo — clique em Salvar") : lastSavedAt ? `Salvo às ${fmtTime(lastSavedAt)}` : isNew ? "Ainda não salva" : "Tudo salvo"}
          </span>
          <AutosaveToggle enabled={autosaveOn} onChange={setAutosaveOn} />
        </div>
        {isNew && <span className={styles.pageHint} style={{ margin: 0 }}>O automático começa após o 1º “Salvar”.</span>}
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

          {/* ordem igual à da página: Portfólio → Processo → Investimento */}
          <GalleryEditor proposal={proposal} onChange={(p) => setProposal(p)} />

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
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>
            Senha de acesso {accessPassword ? "🔒" : "(link público)"}
          </label>
          <input
            className={styles.input}
            type="text"
            value={accessPassword}
            onChange={(e) => setAccessPassword(e.target.value)}
            placeholder="Deixe em branco = pública"
            title="Se preenchida, o cliente precisa digitar esta senha para ver a proposta. Deixe em branco para deixar o link público."
            style={{ width: 210 }}
          />
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

      {/* Painel de pré-visualização ao vivo (atualiza a cada alteração) */}
      {showPreview && (
        <div
          style={{
            position: "fixed", top: 0, right: 0, zIndex: 60,
            width: PREVIEW_W, height: "100vh",
            background: "#0a0a0a", borderLeft: "1px solid var(--color-border)",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-text-primary)",
          }}>
            <strong style={{ fontSize: 13 }}>Prévia ao vivo · Nº {proposal.number}</strong>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowPreview(false)}>Fechar</button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {/* zoom encolhe o documento p/ caber no painel (mantém a rolagem correta) */}
            <div style={{ zoom: 0.62 }}>
              <ProposalView proposal={proposal} preview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from "react";
import type { Proposal } from "../components/proposal/types";
import { SAMPLE_PROPOSAL } from "../components/proposal/sampleProposal";
import ProposalView from "../components/proposal/ProposalView";
import { api, ApiError, numberOwnerConflict, type NumberUse } from "./api";
// Numeração com prefixo de ano (AANN): os 2 primeiros dígitos são sempre o ano.
import { nextProposalNumber, duplicateNumber } from "../components/proposal/proposalNumber";
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
import Section from "./EditorSection";
import { useAutosavePref, AutosaveToggle } from "./autosave";
import { usePreviewFollowPref, PreviewFollowToggle } from "./previewFollow";
import styles from "./Admin.module.css";

type Status = "draft" | "published";

// Seções da proposta (apoio: navegação e recolher/expandir).
const PROPOSAL_SECTIONS: { id: string; label: string }[] = [
  { id: "identificacao", label: "Identificação" },
  { id: "escopo", label: "Capa / Escopo" },
  { id: "portfolio", label: "Portfólio" },
  { id: "processo", label: "Processo" },
  { id: "investimento", label: "Investimento" },
  { id: "pagamento", label: "Pagamento" },
  { id: "condicoes", label: "Prazo & condições" },
];

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

// URL personalizada = número + complemento. Deriva o complemento a partir do
// slug salvo (tira o "<número>-" da frente); e monta o slug completo p/ salvar.
function suffixFromSlug(slug: string, num: string): string {
  const s = (slug ?? "").trim();
  const n = (num ?? "").trim();
  if (!s || s === n) return "";
  if (n && s.startsWith(`${n}-`)) return s.slice(n.length + 1);
  return s; // legado (slugs antigos já vêm com o número na frente)
}
function slugFromSuffix(suffix: string, num: string): string {
  const suf = (suffix ?? "").trim().replace(/^-+/, "");
  const n = (num ?? "").trim();
  return suf ? `${n}-${suf}` : "";
}

export default function ProposalEditor({
  number,
  duplicateFrom = null,
  onBack,
  onCreated,
}: {
  number: string | null;
  duplicateFrom?: string | null;
  onBack: () => void;
  /** Chamado após CRIAR uma proposta nova — o pai reabre o editor no modo edição
   *  (mesmo número), mantendo a Isabela na mesma página em vez de voltar à lista. */
  onCreated: (number: string) => void;
}) {
  const isNew = number === null;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  // Números já usados — para avisar se a numeração colidir (a URL é o número).
  const [existingNumbers, setExistingNumbers] = useState<string[]>([]);
  // Números em uso no sistema todo (com cliente dono) — o número é a identidade
  // do projeto e não pode pertencer a outro cliente.
  const [usedNumbers, setUsedNumbers] = useState<NumberUse[]>([]);
  const [status, setStatus] = useState<Status>("draft");
  // Senha de acesso da proposta (vazio = link público). Fica fora do JSON da
  // proposta (nunca vai para a página pública) — é uma coluna própria no banco.
  const [accessPassword, setAccessPassword] = useState("");
  // URL personalizada: o NÚMERO é sempre a base (/proposta/2630); aqui guardamos
  // só o COMPLEMENTO opcional (ex.: "Rodrigo-Almeida" → /proposta/2630-Rodrigo-Almeida).
  // No banco, o custom_slug é o slug completo (número + complemento).
  const [slugSuffix, setSlugSuffix] = useState("");
  // ── Apoio pessoal (D1): notas + checklist "revisado" + navegação/recolher ──
  const [notes, setNotes] = useState("");
  // `doneSet` (revisado) foi aposentado da UI — o apoio agora é o espelho editável
  // dos ambientes. A coluna editor_done segue persistida (retrocompat, inofensiva).
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [activeSectionId, setActiveSectionId] = useState("");
  const [apoioOpen, setApoioOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Arrastar item no espelho de ambientes (índice de origem).
  const ambDrag = useRef<number | null>(null);
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const jumpTo = (id: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.delete(id); return n; });
    requestAnimationFrame(() => document.getElementById(`sec-card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  // Marca/desmarca uma seção como concluída (reflete no ponto verde + progresso).
  const toggleDone = (id: string) => setDoneSet((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const propDoneCount = PROPOSAL_SECTIONS.filter((s) => doneSet.has(s.id)).length;
  const propPct = PROPOSAL_SECTIONS.length ? Math.round((propDoneCount / PROPOSAL_SECTIONS.length) * 100) : 0;
  const previewScrollRef = useRef<HTMLDivElement>(null); // container rolável da prévia
  const [followOn, setFollowOn] = usePreviewFollowPref();
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
  const [clients, setClients] = useState<{ id: string; name: string; role: string | null }[]>([]);
  useEffect(() => {
    api.listClients().then(({ clients }) => setClients(clients.map((c) => ({ id: c.id, name: c.name, role: c.role ?? null })))).catch(() => {});
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

  // Números de projeto em uso (cross-documento) para o aviso de colisão.
  useEffect(() => {
    let alive = true;
    api.documentNumbers().then(({ numbers }) => { if (alive) setUsedNumbers(numbers); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Carrega (editar) ou prepara nova proposta clonando a mais recente.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isNew) {
          const { proposals } = await api.listProposals();
          const existing = proposals.map((p) => p.number);
          if (alive) setExistingNumbers(existing);
          const draft = structuredClone(
            duplicateFrom
              ? (await api.getProposal(duplicateFrom)).proposal   // cópia: parte do original
              : proposals.length > 0
                ? (await api.getProposal(
                    [...proposals].sort((a, b) => Number(b.number) - Number(a.number))[0].number
                  )).proposal                                     // nova: parte da mais recente
                : SAMPLE_PROPOSAL
          );
          if (duplicateFrom) {
            // Cópia: mantém cliente/dados; só sugere um número novo estilo "2624-1".
            draft.number = duplicateNumber(duplicateFrom, existing);
          } else {
            draft.number = nextProposalNumber(existing);
            draft.client = "";
            draft.clientFirstName = "";
            // Proposta nova começa com a data de hoje (editável).
            draft.date = todayBR();
          }
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
          const { proposal: p, status: s, accessPassword: pw, customSlug: slug, editorNotes, editorDone } = await api.getProposal(number!);
          if (!alive) return;
          setComboEnabled(readComboFromNote(p.comboNote).enabled);
          setComboPercent(readComboFromNote(p.comboNote).percent);
          setPixDiscount(readPixDiscount(p.pixPlan?.discountLabel));
          setMaxInstallments(readMaxInstallments(p.installmentPlan?.rows));
          setProposal(p);
          setStatus(s);
          setAccessPassword(pw ?? "");
          setSlugSuffix(suffixFromSlug(slug ?? "", p.number ?? number ?? ""));
          setNotes(editorNotes ?? "");
          setDoneSet(new Set(editorDone ?? []));
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
  }, [isNew, number, duplicateFrom]);

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
    // A URL é o próprio número — não dá para ter duas propostas iguais.
    if (isNew && existingNumbers.includes(proposal.number.trim())) {
      setError(`O número ${proposal.number.trim()} já está em uso. Escolha outro (ex.: ${duplicateNumber(proposal.number, existingNumbers)}).`);
      return;
    }
    // O número é a identidade do projeto: não pode ser de OUTRO cliente.
    const clash = numberOwnerConflict(usedNumbers, proposal.number, proposal.client ?? "");
    if (isNew && clash) {
      setError(`O número ${proposal.number.trim()} já pertence ao projeto de "${clash}". Use um número diferente para não confundir na Área do Cliente.`);
      return;
    }
    const num = proposal.number.trim();
    const suffix = slugSuffix.trim();
    if (suffix && !/^[A-Za-z0-9_-]+$/.test(suffix)) {
      setError("Complemento da URL inválido: use apenas letras, números, hífen (-) e underscore (_), sem espaços.");
      return;
    }
    const slug = slugFromSuffix(suffix, num);
    const clean = buildClean(proposal);
    // "Salvar e publicar" abre a página pública em nova aba. Abrimos AGORA (ainda
    // no gesto do clique, antes do await) para o bloqueador de pop-up não barrar;
    // a URL é definida depois que a gravação confirma.
    const pubWin = publish ? window.open("", "_blank") : null;
    savingRef.current = true;
    setSaving(true);
    try {
      if (isNew) await api.createProposal(clean, finalStatus, accessPassword);
      else await api.updateProposal(number!, clean, finalStatus, accessPassword, slug, { editorNotes: notes, editorDone: [...doneSet] });
      if (publish) setStatus("published");
      setLastSavedAt(Date.now());
      setDirty(false);
      // Publicou → leva a aba já aberta para o link público (usa o slug se houver).
      if (pubWin) pubWin.location.href = `/proposta/${encodeURIComponent(slug || num)}`;
      // Criou uma nova → o pai reabre no modo edição (fica na mesma página).
      if (isNew) onCreated(num);
    } catch (err) {
      pubWin?.close();
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Marca alterações pendentes (após o carregamento inicial).
  useEffect(() => {
    if (hydratedRef.current) setDirty(true);
  }, [proposal, status, accessPassword, slugSuffix, notes, doneSet, comboEnabled, comboPercent, pixDiscount, maxInstallments]);

  // Autosave silencioso (só proposta JÁ criada): debounce ~2,5s de ociosidade.
  const latestRef = useRef({ proposal, status, accessPassword, slugSuffix, notes, doneSet });
  latestRef.current = { proposal, status, accessPassword, slugSuffix, notes, doneSet };
  useEffect(() => {
    if (!dirty || isNew || !autosaveOn) return;
    const cur = latestRef.current;
    if (!cur.proposal?.number?.trim()) return;
    const t = window.setTimeout(async () => {
      if (savingRef.current) return;
      const c = latestRef.current;
      if (!c.proposal) return;
      // Slug inválido não vai no autosave (undefined = mantém o atual), assim um
      // formato errado não impede de salvar o resto do conteúdo.
      const suf = c.slugSuffix.trim();
      const slugArg = suf === "" ? "" : /^[A-Za-z0-9_-]+$/.test(suf) ? slugFromSuffix(suf, c.proposal.number.trim()) : undefined;
      savingRef.current = true; setSaving(true);
      try {
        await api.updateProposal(number!, buildClean(c.proposal), c.status, c.accessPassword, slugArg, { editorNotes: c.notes, editorDone: [...c.doneSet] });
        setLastSavedAt(Date.now()); setDirty(false);
      } catch { /* mantém dirty; tenta na próxima */ }
      finally { savingRef.current = false; setSaving(false); }
    }, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, isNew, autosaveOn, proposal, status, accessPassword, slugSuffix, notes, doneSet]);

  // Scroll-spy: acende a seção visível durante a rolagem (alimenta rail + prévia).
  useEffect(() => {
    if (loading) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[id^="sec-card-"]'));
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, c) => c.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActiveSectionId(vis.target.id.replace("sec-card-", ""));
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading, tab, showPreview, collapsed]);

  // A prévia acompanha a seção em edição: ao rolar o editor (scroll-spy define
  // activeSectionId), a prévia rola para o mesmo trecho (data-spy). Rolagem
  // manual do container (getBoundingClientRect funciona apesar do zoom).
  useEffect(() => {
    if (!showPreview || !followOn || !activeSectionId) return;
    const cont = previewScrollRef.current;
    if (!cont) return;
    const t = window.setTimeout(() => {
      const sel = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(activeSectionId) : activeSectionId;
      const target = cont.querySelector<HTMLElement>(`[data-spy="${sel}"]`);
      if (!target) return;
      const delta = target.getBoundingClientRect().top - cont.getBoundingClientRect().top - 12;
      if (Math.abs(delta) < 2) return;
      cont.scrollTo({ top: cont.scrollTop + delta, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [activeSectionId, showPreview, followOn]);

  const collapseAll = () => setCollapsed(new Set(PROPOSAL_SECTIONS.map((s) => s.id)));
  const expandAll = () => setCollapsed(new Set());

  if (loading || !proposal) {
    return <div className={styles.loading}>Carregando proposta…</div>;
  }

  // ── Espelho editável dos AMBIENTES (📌 Meu apoio) ──
  // Reflete direto em proposal.ambientes: adicionar/renomear/arrastar/duplicar/
  // excluir aqui altera a proposta (a lista de Ambientes do escopo é a mesma fonte).
  const ambientes = proposal.ambientes ?? [];
  const setAmbientes = (next: string[]) => setProposal((prev) => (prev ? { ...prev, ambientes: next } : prev));
  const ambAdd = () => { setAmbientes([...ambientes, "Novo ambiente"]); if (!apoioOpen) setApoioOpen(true); };
  const ambRename = (i: number, v: string) => setAmbientes(ambientes.map((a, idx) => (idx === i ? v : a)));
  const ambDelete = (i: number) => setAmbientes(ambientes.filter((_, idx) => idx !== i));
  const ambDuplicate = (i: number) => { const l = ambientes.slice(); l.splice(i + 1, 0, l[i] ?? ""); setAmbientes(l); };
  const ambMove = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= ambientes.length || to >= ambientes.length || from === to) return;
    const l = ambientes.slice();
    const [m] = l.splice(from, 1);
    l.splice(from < to ? to - 1 : to, 0, m);
    setAmbientes(l);
  };

  return (
    <div
      className={styles.container}
      // Igual ao briefing: com a prévia aberta o editor fica largo (os rails
      // continuam visíveis) e a prévia flutua ao lado do rail direito.
      style={showPreview ? { maxWidth: "none" } : undefined}
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
          {tab === "campos" && (
            <button type="button" className={styles.btn} style={{ fontSize: 11 }}
              onClick={() => (collapsed.size >= PROPOSAL_SECTIONS.length - 1 ? expandAll() : collapseAll())}>
              {collapsed.size >= PROPOSAL_SECTIONS.length - 1 ? "Expandir tudo" : "Recolher tudo"}
            </button>
          )}
          {/* Pré-visualizar fica aqui, na barra fixa (sempre à mão na rolagem). */}
          <button type="button" className={`${styles.btn} ${showPreview ? styles.btnPrimary : ""}`} style={{ fontSize: 11 }} onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Ocultar prévia" : "👁 Pré-visualizar"}
          </button>
          {isNew && <span className={styles.pageHint} style={{ margin: 0 }}>O automático começa após o 1º “Salvar”.</span>}
        </div>
        {/* Identificador da proposta em edição — fica fixo na rolagem, para não
            confundir quando há várias janelas de propostas abertas. */}
        <span className={styles.editorDocId} title="Proposta que você está editando agora">
          ✎ Nº&nbsp;{(number ?? proposal.number) || "—"}{proposal.client ? ` · ${proposal.client}` : ""}
        </span>
      </div>

      {tab === "campos" ? (
        <div className={styles.editorWorkspace}>
          {/* RAIL ESQUERDO — seções (scroll-spy) + concluir + progresso */}
          <aside className={styles.editorRail}>
            <div className={styles.railTitle}>Seções</div>
            {PROPOSAL_SECTIONS.map((s) => {
              const active = s.id === activeSectionId;
              const done = doneSet.has(s.id);
              return (
                <div key={s.id} className={`${styles.navRow} ${active ? styles.navRowActive : ""} ${done ? styles.navRowDone : ""}`}>
                  <input type="checkbox" className={styles.navCheck} checked={done} onChange={() => toggleDone(s.id)} title={done ? "Concluído — clique para desmarcar" : "Marcar como concluído"} aria-label="Concluído" />
                  <button type="button" className={styles.navRowJump} onClick={() => jumpTo(s.id)} title={s.label}>
                    <span className={`${styles.statusDot} ${done ? styles.statusDotDone : active ? styles.statusDotActive : ""}`} />
                    <span className={styles.navLabel}>{s.label}</span>
                  </button>
                </div>
              );
            })}
            <div style={{ marginTop: 14 }}>
              <div className={styles.railTitle} style={{ marginBottom: 6 }}>Concluídas · {propDoneCount}/{PROPOSAL_SECTIONS.length} · {propPct}%</div>
              <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${propPct}%` }} /></div>
            </div>
            <button type="button" className={styles.btn} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ marginTop: 14, width: "100%", fontSize: 11 }}>↑ Voltar ao topo</button>
          </aside>

          {/* MAIN — cards do editor */}
          <div className={styles.editorGrid}>
          <Section id="identificacao" label="Identificação" collapsed={collapsed.has("identificacao")} onToggle={() => toggleCollapse("identificacao")}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Número {isNew ? "(sugerido — edite se quiser)" : "(fixo)"}</label>
                <input
                  className={`${styles.input} ${styles.mono}`}
                  value={proposal.number}
                  onChange={(e) => set("number", e.target.value.trim())}
                  readOnly={!isNew}
                  placeholder="Ex.: 2624"
                />
                {isNew && proposal.number.trim() !== "" && existingNumbers.includes(proposal.number.trim()) && (
                  <span className={styles.fieldWarn}>
                    ⚠ Atenção: este número já está vinculado a outro projeto. Use outro (ex.: {duplicateNumber(proposal.number, existingNumbers)}) para não repetir a URL.
                  </span>
                )}
                {(() => {
                  if (!isNew || proposal.number.trim() === "" || existingNumbers.includes(proposal.number.trim())) return null;
                  const owner = numberOwnerConflict(usedNumbers, proposal.number, proposal.client ?? "");
                  return owner ? (
                    <span className={styles.fieldWarn}>
                      ⚠ O número {proposal.number.trim()} já pertence ao projeto de <strong>{owner}</strong>. Use outro para não confundir na Área do Cliente.
                    </span>
                  ) : null;
                })()}
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
                      // Puxa o papel/profissão do cadastro (ex.: "Arq.") + nome:
                      // "Arq. Isabella Serrano". (Cadastre "Arquiteta" p/ o nome por extenso.)
                      const role = (c.role ?? "").trim();
                      const fullName = role ? `${role} ${c.name}`.trim() : c.name;
                      setProposal((prev) => (prev ? { ...prev, client: fullName, clientFirstName: first } : prev));
                      // Senha de acesso sugerida = primeiro nome (fácil de comunicar);
                      // só preenche se ainda estiver vazia (não sobrescreve senha própria).
                      setAccessPassword((pw) => (pw.trim() ? pw : first));
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
          </Section>

          <Section id="escopo" label="Capa / Escopo" collapsed={collapsed.has("escopo")} onToggle={() => toggleCollapse("escopo")}>
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
          </Section>

          {/* ordem igual à da página: Portfólio → Processo → Investimento */}
          <GalleryEditor proposal={proposal} onChange={(p) => setProposal(p)} sectionId="portfolio" collapsed={collapsed.has("portfolio")} onToggle={() => toggleCollapse("portfolio")} />

          <ProcessEditor proposal={proposal} onChange={(p) => setProposal(p)} sectionId="processo" collapsed={collapsed.has("processo")} onToggle={() => toggleCollapse("processo")} />

          <InvestmentEditor
            proposal={proposal}
            comboEnabled={comboEnabled}
            comboPercent={comboPercent}
            onChange={update}
            onComboChange={onComboChange}
            sectionId="investimento"
            collapsed={collapsed.has("investimento")}
            onToggle={() => toggleCollapse("investimento")}
          />

          <PaymentEditor
            proposal={proposal}
            pixDiscount={pixDiscount}
            maxInstallments={maxInstallments}
            onChange={update}
            onPayChange={onPayChange}
            sectionId="pagamento"
            collapsed={collapsed.has("pagamento")}
            onToggle={() => toggleCollapse("pagamento")}
          />

          <div id="sec-card-condicoes">
            <SectionsEditor proposal={proposal} onChange={(p) => setProposal(p)} />
          </div>
          </div>{/* fim do editorGrid (main) */}

          {/* RAIL DIREITO — Meu apoio (espelho editável dos ambientes + notas) */}
          <aside className={styles.editorRail}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className={styles.railTitle} style={{ margin: 0 }}>📌 Meu apoio</div>
              <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setApoioOpen((v) => !v)}>{apoioOpen ? "Recolher" : "Abrir"}</button>
            </div>
            {apoioOpen && (
              <>
                {/* Seções da proposta — navegação rápida (clique pula até o card). */}
                <div className={styles.railTitle} style={{ marginBottom: 6 }}>Seções da proposta</div>
                {PROPOSAL_SECTIONS.map((s) => {
                  const active = s.id === activeSectionId;
                  return (
                    <button key={s.id} type="button" className={`${styles.navRow} ${active ? styles.navRowActive : ""}`} onClick={() => jumpTo(s.id)} title={s.label}>
                      <span className={`${styles.statusDot} ${active ? styles.statusDotActive : ""}`} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    </button>
                  );
                })}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, margin: "16px 0 8px" }}>
                  <div className={styles.railTitle} style={{ margin: 0 }}>Ambientes do escopo</div>
                  <button type="button" className={styles.btn} style={{ fontSize: 10, padding: "5px 9px" }} onClick={ambAdd} title="Adicionar um ambiente — cria na proposta">+ Adicionar</button>
                </div>
                <p className={styles.pageHint} style={{ margin: "0 0 8px", fontSize: 11 }}>
                  Espelha os ambientes do escopo. Adicionar, renomear, arrastar ou excluir <strong>aqui altera a proposta</strong>.
                </p>
                {ambientes.length === 0 ? (
                  <p className={styles.pageHint} style={{ margin: "0 0 8px" }}>Nenhum ambiente ainda. Use <strong>+ Adicionar</strong>.</p>
                ) : (
                  ambientes.map((a, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => (ambDrag.current = i)}
                      onDragEnd={() => (ambDrag.current = null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (ambDrag.current != null) ambMove(ambDrag.current, i); ambDrag.current = null; }}
                      style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 2px", fontSize: 12.5 }}
                    >
                      <span className={styles.dragHandle} title="Arraste para reordenar (move na proposta)" style={{ cursor: "grab" }}>⠿</span>
                      <input
                        className={styles.input}
                        value={a}
                        onChange={(e) => ambRename(i, e.target.value)}
                        onFocus={() => jumpTo("escopo")}
                        placeholder="Ex.: Sala de TV"
                        title="Renomeia o ambiente na proposta"
                        style={{ flex: 1, fontSize: 12.5, padding: "5px 8px" }}
                      />
                      <button type="button" className={styles.iconBtn} onClick={() => ambDuplicate(i)} title="Duplicar ambiente">⧉</button>
                      <button type="button" className={styles.iconBtn} onClick={() => ambDelete(i)} title="Excluir ambiente" aria-label="Excluir">🗑</button>
                    </div>
                  ))
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 6 }}>
                  <div className={styles.railTitle} style={{ margin: 0 }}>Bloco de notas</div>
                  <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setNotes("")} disabled={!notes}>Limpar</button>
                </div>
                <textarea className={styles.textarea} rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações, pendências, o que confirmar com o cliente…" />
                <div className={styles.railTitle} style={{ marginTop: 14, marginBottom: 6 }}>Dicas rápidas</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                  <li>Salva sozinho enquanto você edita (proposta já salva).</li>
                  <li>Editar aqui (nome/ordem) muda a proposta na hora.</li>
                  <li>Use a prévia para ver como o cliente verá.</li>
                </ul>
              </>
            )}
          </aside>
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
          <label className={styles.label} style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Senha de acesso {accessPassword ? "🔒" : "(link público)"}</span>
            {accessPassword && (
              <button
                type="button"
                onClick={() => setAccessPassword("")}
                title="Remover a senha e liberar o acesso — o MESMO link enviado ao cliente passa a abrir direto. Depois é só Salvar."
                style={{ border: "none", background: "none", color: "#f0506e", cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0 }}
              >
                remover senha
              </button>
            )}
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
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>Complemento da URL (opcional)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className={`${styles.pageHint} ${styles.mono}`} style={{ margin: 0, fontSize: 12, whiteSpace: "nowrap" }}>
              /proposta/{(number || proposal.number || "").trim()}-
            </span>
            <input
              className={`${styles.input} ${styles.mono}`}
              type="text"
              value={slugSuffix}
              onChange={(e) => setSlugSuffix(e.target.value)}
              placeholder="Rodrigo-Almeida"
              title="O número do projeto é sempre a base do link. Aqui você só adiciona um complemento opcional (ex.: Rodrigo-Almeida). Só letras, números, hífen e underscore."
              style={{ width: 190 }}
            />
          </div>
          {(() => {
            const suf = slugSuffix.trim();
            const num = (number || proposal.number || "").trim();
            const invalid = suf !== "" && !/^[A-Za-z0-9_-]+$/.test(suf);
            if (invalid) return <span className={styles.fieldWarn}>⚠ Use só letras, números, hífen (-) e underscore (_), sem espaços.</span>;
            return <span className={styles.pageHint} style={{ margin: "4px 0 0", fontSize: 11 }}>Link: isabelapaulino.com.br/proposta/{suf ? `${num}-${suf}` : num} · o número {num} sempre funciona</span>;
          })()}
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

      {/* Painel de pré-visualização ao vivo — flutua ao lado do rail direito
          (igual ao briefing) e acompanha a seção em edição. */}
      {showPreview && (
        <div
          style={{
            position: "fixed", top: 132, right: 324, zIndex: 55,
            width: "min(40vw, 600px)", height: "calc(100vh - 148px)",
            background: "#0a0a0a", border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-text-primary)",
          }}>
            <strong style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Prévia ao vivo · Nº {proposal.number}</strong>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <PreviewFollowToggle enabled={followOn} onChange={setFollowOn} />
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowPreview(false)}>Fechar</button>
            </div>
          </div>
          <div ref={previewScrollRef} style={{ flex: 1, overflow: "auto" }}>
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

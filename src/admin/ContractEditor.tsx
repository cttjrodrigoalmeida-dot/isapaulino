import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type Client, type ContractInput, type ContractStatus, type ContractSummary, type ProposalSummary } from "./api";
import type { ContractDoc, SignatureStatus, SixTabelaCustos } from "../components/contract/types";
import { blankContractDoc, blankAditivoDoc } from "../components/contract/newContractDoc";
import { DEFAULT_TABELA_CUSTOS, DEFAULT_VALIDADE_CARDS } from "../components/contract/contractDefaults";
import ContractView from "../components/contract/ContractView";
import ListEditor from "./ListEditor";
import CurrencyInput from "./CurrencyInput";
import { formatBRL, valorPorExtenso, parseBRL as parseBRLNum } from "./proposalCalc";
import { buildParcelas, buildResumo } from "./contractCalc";
import RelatedDocs from "./RelatedDocs";
import { contractValue } from "./contractValue";
import {
  Txt,
  Area,
  ParagraphList,
  PartyFields,
  InfoCardsEditor,
  ParcelasEditor,
  ClausesEditor,
  TabelaCustosEditor,
} from "./ContractFieldEditors";
import styles from "./Admin.module.css";
import BackToTop from "./BackToTop";

type Tab = "campos" | "json";

// Largura do painel de prévia (usada no drawer e para "encolher" o editor à esquerda).
const PREVIEW_W = "min(48vw, 760px)";

const SIGN_STATUS: { value: SignatureStatus; label: string }[] = [
  { value: "aguardando", label: "Aguardando assinatura" },
  { value: "pendente", label: "Pendente" },
  { value: "assinado", label: "Assinado" },
  { value: "cancelado", label: "Cancelado" },
];

// Data de hoje no formato "DD/MM/AAAA".
function todayBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Card de seção recolhível (mesmo padrão do editor de briefing): cabeçalho com
// seta ▸/▾ + título (recolhe ao clicar) e, opcionalmente, ações à direita.
function Section({
  id,
  label,
  collapsed,
  onToggle,
  right,
  children,
}: {
  id: string;
  label: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.card} id={`sec-card-${id}`}>
      <div className={styles.blockHead} style={{ marginBottom: collapsed ? 0 : 14 }}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expandir" : "Recolher"}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit", flex: 1, minWidth: 0 }}
        >
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", width: 12, flexShrink: 0 }}>{collapsed ? "▸" : "▾"}</span>
          <span className={styles.cardTitle} style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        </button>
        {right && <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{right}</div>}
      </div>
      {!collapsed && children}
    </div>
  );
}

// Ícone da "caneta" usado nos botões de enviar para assinatura (topo e barra inferior).
function SignIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function ContractEditor({
  id,
  kind = "principal",
  parentId = null,
  onBack,
  onSaved,
}: {
  id: string | null;
  /** Tipo do documento ao criar um NOVO (ignorado ao editar). */
  kind?: "principal" | "aditivo";
  /** (Novo aditivo) contrato principal a pré-selecionar/copiar automaticamente. */
  parentId?: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = id === null;
  const [contractId, setContractId] = useState<string | null>(id);
  const [clients, setClients] = useState<Client[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  // Contratos principais existentes — base para vincular um termo aditivo.
  const [principals, setPrincipals] = useState<ContractSummary[]>([]);

  const [doc, setDoc] = useState<ContractDoc | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [legacyContent, setLegacyContent] = useState("");
  const [status, setStatus] = useState<ContractStatus>("draft");
  const [slug, setSlug] = useState<string | null>(null);
  const [autentiqueDocId, setAutentiqueDocId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signers, setSigners] = useState<
    { name: string | null; email: string | null; signed: boolean; signedAt: string | null; rejected: boolean }[] | null
  >(null);

  const [tab, setTab] = useState<Tab>("campos");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Âncora do topo — rola para o aviso/link após publicar ou enviar p/ assinatura.
  const topRef = useRef<HTMLDivElement>(null);
  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Apoio pessoal (D1): notas + checklist "revisado" + salvamento ──
  const [notes, setNotes] = useState("");
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [apoioOpen, setApoioOpen] = useState(true);
  // Recolher/expandir cada card (ids em `sectionsMeta`).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const hydratedRef = useRef(false); // evita marcar "dirty" no carregamento
  const savingRef = useRef(false);   // evita autosave sobreposto
  const toggleDone = (sid: string) =>
    setDoneSet((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  const toggleCollapse = (sid: string) =>
    setCollapsed((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  const jumpTo = (sid: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.delete(sid); return n; });
    requestAnimationFrame(() => document.getElementById(`sec-card-${sid}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ clients }, { proposals }, { contracts }, loaded] = await Promise.all([
          api.listClients(),
          api.listProposals(),
          api.listContracts(),
          isNew ? Promise.resolve(null) : api.getContract(id!),
        ]);
        if (!alive) return;
        setClients(clients);
        setProposals(proposals);
        // Só contratos principais (exclui aditivos e o próprio, se estiver editando).
        setPrincipals(contracts.filter((c) => c.kind !== "aditivo" && c.id !== id));
        if (loaded) {
          const c = loaded.contract;
          setClientId(c.clientId);
          setTitle(c.title);
          setLegacyContent(c.content ?? "");
          setStatus(c.status);
          setSlug(c.slug);
          setAutentiqueDocId(c.autentiqueDocumentId);
          let parsed: ContractDoc | null = null;
          if (c.data) {
            try {
              parsed = JSON.parse(c.data) as ContractDoc;
            } catch {
              /* data corrompido — cai no doc em branco abaixo */
            }
          }
          if (!parsed) {
            // Contrato legado (sem doc rico): parte de um doc novo com alguns campos preenchidos.
            parsed = blankContractDoc();
            parsed.clientName = c.clientName ?? "";
            parsed.autentiqueUrl = c.autentiqueUrl ?? "";
          }
          setDoc(parsed);
          setNotes(c.editorNotes ?? "");
          setDoneSet(new Set(c.editorDone ?? []));
        } else {
          const fresh = kind === "aditivo" ? blankAditivoDoc() : blankContractDoc();
          setDoc(fresh);
          setTitle(fresh.documentTitle.replace(/\n/g, " "));
          setStatus("draft");
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
  }, [id, isNew, kind]);

  const patch = useCallback((partial: Partial<ContractDoc>) => {
    setDoc((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  // Aplica os dados do cliente ao contrato: CONTRATANTE, nomes de exibição
  // (Cliente/Projeto/Data) e nº do contrato/proposta. Projeto e nº vêm de uma
  // proposta específica (se informada) ou da mais recente do cliente; Data vira
  // hoje (se ainda vazia).
  const applyClient = (cid: string, preferProposal?: ProposalSummary) => {
    const c = clients.find((x) => x.id === cid);
    if (!c) return;
    const latest = preferProposal ?? proposals
      .filter((p) => (p.client || "").trim().toLowerCase() === (c.name || "").trim().toLowerCase())
      .sort((a, b) => Number(b.number) - Number(a.number))[0];
    const endereco = [c.address, c.city, c.state].filter(Boolean).join(", ");
    setDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clientName: c.name || prev.clientName,
        // Nome do projeto NÃO vem do serviceTitle da proposta — só do briefing
        // (preenchido pelo bloco assíncrono abaixo) ou mantém o que já existe.
        projectName: prev.projectName,
        serviceTitle: !prev.serviceTitle && latest?.serviceTitle ? latest.serviceTitle : prev.serviceTitle,
        date: prev.date || todayBR(),
        contractNumber: latest?.number || prev.contractNumber,
        proposalNumber: latest?.number || prev.proposalNumber,
        contratante: {
          ...prev.contratante,
          name: c.name || prev.contratante.name,
          role: c.role || prev.contratante.role,
          nacionalidade: c.nacionalidade || prev.contratante.nacionalidade,
          nascimento: c.birth_date || prev.contratante.nascimento,
          cpfCnpj: c.cpf_cnpj || prev.contratante.cpfCnpj,
          email: c.email || prev.contratante.email,
          contato: c.phone || prev.contratante.contato,
          endereco: endereco || prev.contratante.endereco,
        },
        signature: {
          ...prev.signature,
          contratante: {
            ...prev.signature.contratante,
            name: c.name || prev.signature.contratante.name,
            role: c.role || prev.signature.contratante.role,
          },
        },
      };
    });

    // Tenta preencher o nome do projeto a partir do briefing vinculado à proposta
    // mais recente do cliente. Busca a resposta da pergunta "QUAL É O NOME DO SEU
    // PROJETO?" (info-01 no briefing padrão). Se não houver resposta ainda, usa
    // o título do briefing como fallback (geralmente contém o nome do projeto).
    if (latest?.number) {
      (async () => {
        try {
          const { briefings } = await api.listBriefings();
          // Busca briefing com o mesmo proposalNumber da proposta
          const linkedBriefing = briefings.find((b) => b.proposalNumber === latest.number);
          if (linkedBriefing) {
            const { briefing } = await api.getBriefing(linkedBriefing.number);
            // Pergunta padrão de nome do projeto no briefing: id "info-01"
            const projectNameQuestion = briefing.sections
              .flatMap((s) => s.questions)
              .find((q) => q.id === "info-01" || /nome do.*projeto/i.test(q.text));

            if (projectNameQuestion) {
              try {
                const { responses } = await api.listBriefingResponses(linkedBriefing.number);
                const latestResp = responses[responses.length - 1];
                if (latestResp?.answers?.[projectNameQuestion.id]) {
                  const projectName = latestResp.answers[projectNameQuestion.id].trim();
                  if (projectName) {
                    setDoc((prev) => prev ? { ...prev, projectName } : prev);
                    return; // já preencheu, sai
                  }
                }
              } catch { /* sem resposta ainda */ }
            }

            // Fallback: se o briefing tem o título (ex.: "Apartamento JK"),
            // usa ele como nome do projeto quando não é genérico.
            const title = briefing.title?.trim() || "";
            if (
              title &&
              !/briefing de detalhamento/i.test(title) &&
              !/briefing/i.test(title.replace(/\s+/g, ""))
            ) {
              setDoc((prev) => prev ? { ...prev, projectName: title } : prev);
              return;
            }

            // Último fallback: nome do cliente no briefing
            const clientFromBriefing = briefing.client?.trim();
            if (clientFromBriefing) {
              setDoc((prev) => prev ? { ...prev, projectName: clientFromBriefing } : prev);
            }
          }
        } catch { /* briefing não encontrado, ok */ }
      })();
    }
  };

  // Botão "Preencher do cliente" (reforço manual): reaplica os dados do cliente.
  const fillFromClient = () => {
    if (!clientId) return;
    applyClient(clientId);
    setNotice("Dados do cliente aplicados ao contrato.");
  };

  // Ao selecionar o cliente no seletor: preenche tudo automaticamente.
  const selectClient = (cid: string) => {
    setClientId(cid);
    applyClient(cid);
  };

  // Informar o Nº da proposta → busca a proposta e preenche cliente, projeto,
  // partes e nºs a partir dela (o número é o identificador do documento).
  const fillFromProposalNumber = (raw: string) => {
    const n = (raw || "").replace(/\D/g, ""); // aceita "26/25" ou "2625"
    if (!n) return;
    const prop = proposals.find((p) => p.number === n);
    if (!prop) { setError(`Proposta Nº ${n} não encontrada.`); return; }
    const c = clients.find((x) => (x.name || "").trim().toLowerCase() === (prop.client || "").trim().toLowerCase());
    if (c) {
      setClientId(c.id);
      applyClient(c.id, prop);
    } else {
      // Sem cliente cadastrado com esse nome: preenche o que dá da própria proposta.
      setDoc((prev) => prev ? {
        ...prev,
        clientName: prop.client ?? prev.clientName,
        serviceTitle: prop.serviceTitle ?? prev.serviceTitle,
        contractNumber: n,
        proposalNumber: n,
      } : prev);
    }
    setError(null);
    setNotice(`Dados da proposta Nº ${n} aplicados.`);
  };

  // (Termo aditivo) Copia partes/cliente/projeto do CONTRATO PRINCIPAL vinculado.
  // Usado ao selecionar o contrato principal e no botão "Atualizar do principal".
  const applyParentContract = async (parentId: string, announce = false) => {
    if (!parentId) return;
    try {
      const { contract } = await api.getContract(parentId);
      let p: ContractDoc | null = null;
      if (contract.data) {
        try { p = JSON.parse(contract.data) as ContractDoc; } catch { /* data corrompido */ }
      }
      if (!p) { setError("O contrato principal selecionado não tem dados para copiar."); return; }
      const src = p;
      setClientId(contract.clientId);
      setDoc((prev) => prev ? {
        ...prev,
        parentContractId: parentId,
        parentContractNumber: src.contractNumber || "",
        // O aditivo herda o MESMO número do contrato principal (identificado como
        // "Aditivo" na listagem). Editável se precisar de outro número.
        contractNumber: src.contractNumber || prev.contractNumber,
        clientName: src.clientName,
        projectName: src.projectName,
        serviceTitle: src.serviceTitle,
        tags: src.tags ?? prev.tags,
        proposalNumber: src.proposalNumber ?? prev.proposalNumber,
        contratante: { ...src.contratante },
        contratada: { ...src.contratada },
        signature: {
          ...prev.signature,
          contratante: { ...src.signature.contratante },
          contratada: { ...src.signature.contratada },
        },
      } : prev);
      if (announce) setNotice("Dados atualizados a partir do contrato principal.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar o contrato principal.");
    }
  };

  // Novo aditivo gerado a partir de um contrato específico: pré-seleciona e copia
  // o principal automaticamente (roda uma vez, quando o doc em branco estiver pronto).
  const parentApplied = useRef(false);
  useEffect(() => {
    if (isNew && kind === "aditivo" && parentId && doc && !parentApplied.current) {
      parentApplied.current = true;
      applyParentContract(parentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, kind, parentId, doc]);

  const goJsonTab = () => {
    if (doc) setJsonText(JSON.stringify(doc, null, 2));
    setJsonError(null);
    setTab("json");
  };
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as ContractDoc;
      if (!parsed || typeof parsed !== "object") throw new Error("JSON inválido.");
      setDoc(parsed);
      setJsonError(null);
      setNotice("JSON aplicado aos campos.");
      setTab("campos");
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "JSON inválido.");
    }
  };

  const buildInput = (overrideStatus?: ContractStatus): ContractInput => ({
    client_id: clientId,
    title: title.trim() || doc?.documentTitle || "Contrato",
    content: legacyContent,
    data: doc ? JSON.stringify(doc) : null,
    value: contractValue(doc),
    deadline: null,
    autentique_url: doc?.autentiqueUrl?.trim() || null,
    status: overrideStatus ?? status,
  });

  const validate = (): string | null => {
    if (!clientId) return doc?.kind === "aditivo" ? "Selecione o contrato principal (base do aditivo)." : "Selecione o cliente do contrato.";
    if (!title.trim() && !doc?.documentTitle) return "Informe o título do contrato.";
    return null;
  };

  const aidPayload = () => ({ editorNotes: notes, editorDone: [...doneSet] });
  const persist = async (input: ContractInput): Promise<string> => {
    if (contractId) {
      await api.updateContract(contractId, input, aidPayload());
      return contractId;
    }
    const { id: newId } = await api.createContract(input);
    setContractId(newId);
    return newId;
  };

  const save = async () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setNotice(null);
    savingRef.current = true;
    setSaving(true);
    try {
      await persist(buildInput());
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const publish = async () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const persistedId = await persist(buildInput());
      const { slug: newSlug } = await api.publishContract(persistedId);
      setSlug(newSlug);
      setStatus("published");
      setLastSavedAt(Date.now());
      setDirty(false);
      setNotice("Contrato publicado! Copie o link abaixo para enviar ao cliente.");
      scrollToTop();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao publicar.");
      scrollToTop();
    } finally {
      setSaving(false);
    }
  };

  // Envia para assinatura na Autentique. Sem arquivo → o servidor gera o PDF
  // automaticamente (Browser Rendering) a partir da página pública do contrato.
  const sendToAutentique = async (file?: File | null) => {
    if (!contractId) {
      setError("Salve o contrato antes de enviar para assinatura.");
      scrollToTop();
      return;
    }
    setError(null);
    setNotice(null);
    setSending(true);
    scrollToTop(); // sobe já para mostrar o "Enviando…"/aviso
    try {
      const { documentId, url } = await api.sendAutentique(contractId, file);
      setAutentiqueDocId(documentId);
      if (url) patch({ autentiqueUrl: url });
      setNotice(file ? "Documento enviado para a Autentique." : "PDF gerado e enviado para a Autentique.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar para a Autentique.");
    } finally {
      setSending(false);
      scrollToTop();
    }
  };

  // Reconsulta a Autentique na hora (não depende da entrega do webhook).
  const refreshSignature = async () => {
    if (!contractId) return;
    setError(null);
    setNotice(null);
    setRefreshing(true);
    try {
      const r = await api.refreshSignature(contractId);
      setSigners(r.signers);
      if (r.autentiqueUrl) patch({ autentiqueUrl: r.autentiqueUrl });
      if (r.status === "signed") {
        setStatus("signed");
        setNotice("Contrato assinado por todas as partes! Status atualizado para “assinado”.");
      } else {
        const pend = r.signers.filter((s) => !s.signed).length;
        setNotice(`Status atualizado. Faltam ${pend} assinatura(s) para concluir.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao consultar a Autentique.");
    } finally {
      setRefreshing(false);
    }
  };

  // Seções visíveis do editor (para navegação, checklist e recolher/expandir).
  const isAditivoDoc = doc?.kind === "aditivo";
  const sectionsMeta = useMemo(() => {
    const s: { id: string; label: string }[] = [
      { id: "vinculo", label: "Vínculo & publicação" },
      { id: "identificacao", label: "Identificação" },
      { id: "contratante", label: "Contratante" },
      { id: "contratada", label: "Contratada" },
      { id: "escopo", label: "Objeto & escopo" },
    ];
    if (!isAditivoDoc) s.push({ id: "prazo", label: "Prazo de entrega" }, { id: "arquivos", label: "Arquivos" }, { id: "validade", label: "Validade / vigência" });
    s.push({ id: "pagamento", label: isAditivoDoc ? "Valor e pagamento" : "Pagamento / tabela" });
    if (!isAditivoDoc) s.push({ id: "pix", label: "PIX" });
    s.push(
      { id: "assinatura", label: "Assinatura / status" },
      { id: "autentique", label: "Assinatura digital" },
      { id: "clausulas", label: "Cláusulas jurídicas" },
      { id: "contato", label: "Contato" },
      { id: "exibicao", label: "Exibição" },
    );
    return s;
  }, [isAditivoDoc]);

  // Marca alterações pendentes (após o carregamento inicial). Status NÃO entra —
  // mudança de status só é aplicada no Salvar/Republicar (evita cascata silenciosa).
  useEffect(() => {
    if (hydratedRef.current) setDirty(true);
  }, [doc, notes, doneSet, title, clientId, legacyContent]);

  // Autosave silencioso (só contrato JÁ salvo e válido): debounce ~2,5s de ociosidade.
  // Não envia `status` (mantém o salvo) — trocar status é sempre ação explícita.
  useEffect(() => {
    if (!dirty || !contractId || !clientId || !(title.trim() || doc?.documentTitle)) return;
    const t = window.setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true; setSaving(true);
      try {
        await api.updateContract(contractId, { ...buildInput(), status: undefined }, { editorNotes: notes, editorDone: [...doneSet] });
        setLastSavedAt(Date.now()); setDirty(false);
      } catch { /* mantém dirty; tenta na próxima */ }
      finally { savingRef.current = false; setSaving(false); }
    }, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, contractId, clientId, title, doc, legacyContent, notes, doneSet]);

  // Scroll-spy: acende a seção visível durante a rolagem.
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
  }, [loading, tab, showPreview, collapsed, doc?.kind, doc?.sixVariant]);

  if (loading || !doc) return <div className={styles.loading}>Carregando contrato…</div>;

  const isAditivo = doc.kind === "aditivo";
  const sp = doc.sixPagamento ?? { valorTotal: "", valorTotalExtenso: "", resumo: [], parcelas: [] };
  const setSp = (partial: Partial<typeof sp>) => patch({ sixPagamento: { ...sp, ...partial } });
  const tc: SixTabelaCustos = doc.sixTabelaCustos ?? { intro: "", tabelas: [], observacoes: [] };
  const setTc = (partial: Partial<SixTabelaCustos>) => patch({ sixTabelaCustos: { ...tc, ...partial } });
  // Valor total → extenso automático; se já há parcelas, recalcula os valores.
  const setValorTotal = (n: number | null) => {
    if (n == null) return setSp({ valorTotal: "", valorTotalExtenso: "" });
    const valorTotal = formatBRL(n);
    const partial: Partial<typeof sp> = { valorTotal, valorTotalExtenso: valorPorExtenso(n) };
    if (sp.parcelas.length > 0) partial.parcelas = buildParcelas(valorTotal, sp.parcelas.length, doc.date);
    setSp(partial);
  };
  // Nº de parcelas → gera parcelas (valor, extenso e vencimento 01–05 automáticos)
  // e (re)monta o resumo do pagamento a partir delas.
  const setNumParcelas = (n: number) => {
    const parcelas = buildParcelas(sp.valorTotal, n, doc.date);
    setSp({ parcelas, resumo: buildResumo(parcelas, sp.entrada) });
  };
  // Troca a variante da Seção 06; ao ir p/ "tabela-custos" e ainda não haver
  // tabela, materializa o modelo padrão (só ajustar valores por projeto).
  const changeVariant = (v: ContractDoc["sixVariant"]) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next: ContractDoc = { ...prev, sixVariant: v };
      if (v === "tabela-custos" && (!prev.sixTabelaCustos || prev.sixTabelaCustos.tabelas.length === 0)) {
        next.sixTabelaCustos = structuredClone(DEFAULT_TABELA_CUSTOS);
      }
      return next;
    });
  };
  const publicUrl = slug ? `${window.location.origin}/contrato/${slug}` : null;

  // Derivados do apoio (navegação/progresso/recolher).
  const collapseAll = () => setCollapsed(new Set(sectionsMeta.map((s) => s.id)));
  const expandAll = () => setCollapsed(new Set());
  const doneCount = sectionsMeta.filter((s) => doneSet.has(s.id)).length;
  const pct = sectionsMeta.length ? Math.round((doneCount / sectionsMeta.length) * 100) : 0;
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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
          : { maxWidth: "none", transition: "margin-right .22s ease" }
      }
    >
      <div ref={topRef} />
      <BackToTop />
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>
            {isNew && !contractId
              ? isAditivo ? "Novo termo aditivo" : "Novo contrato"
              : isAditivo ? "Editar termo aditivo" : "Editar contrato"}
          </div>
          <div className={styles.pageHint}>
            {isAditivo ? "Termo aditivo — versão enxuta do contrato (altera/inclui itens no contrato principal). " : ""}
            Documento 100% editável. Use a aba <strong>JSON avançado</strong> para qualquer campo não listado.
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

      <RelatedDocs proposalNumber={doc.proposalNumber} current="contract" />

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}
      {sending && <div className={styles.notice}>Gerando o PDF e enviando para a Autentique… aguarde.</div>}

      {publicUrl && (
        <div className={styles.publicLinkBox}>
          <span className={styles.publicLinkUrl}>{publicUrl}</span>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() =>
              navigator.clipboard?.writeText(publicUrl).then(
                () => setNotice("Link copiado."),
                () => setNotice(null)
              )
            }
          >
            Copiar link
          </button>
          <a className={`${styles.btn} ${styles.btnGhost}`} href={publicUrl} target="_blank" rel="noopener noreferrer">
            Abrir
          </a>
          {contractId && (
            <button
              className={`${styles.btn} ${styles.btnSign}`}
              onClick={() => sendToAutentique(null)}
              disabled={saving || sending}
              title="Gera o PDF e envia para as partes assinarem na Autentique"
            >
              <SignIcon />
              {sending ? "Enviando…" : "Enviar p/ assinatura"}
            </button>
          )}
          {autentiqueDocId && (
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={refreshSignature}
              disabled={refreshing}
              title="Reconsulta a Autentique e captura o link de assinatura para o botão da página"
            >
              {refreshing ? "Atualizando…" : "Atualizar status"}
            </button>
          )}
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "campos" ? styles.tabActive : ""}`} onClick={() => setTab("campos")}>
          Campos
        </button>
        <button className={`${styles.tab} ${tab === "json" ? styles.tabActive : ""}`} onClick={goJsonTab}>
          JSON avançado
        </button>
      </div>

      {tab === "json" ? (
        <div className={styles.card}>
          <div className={styles.cardTitle}>JSON avançado (objeto ContractDoc completo)</div>
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
      ) : (
       <>
        {/* Barra fixa — estado do salvamento + recolher/expandir tudo */}
        <div className={styles.editorToolbar}>
          <span className={styles.saveBadge}>
            <span className={styles.saveBadgeDot} style={{ background: saving ? "#d9a531" : dirty ? "#d9a531" : "#4ade80" }} />
            {saving ? "Salvando…" : dirty ? "Alterações não salvas" : lastSavedAt ? `Salvo às ${fmtTime(lastSavedAt)}` : contractId ? "Tudo salvo" : "Ainda não salvo"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={styles.btn} style={{ fontSize: 11 }} onClick={collapseAll}>Recolher tudo</button>
            <button type="button" className={styles.btn} style={{ fontSize: 11 }} onClick={expandAll}>Expandir tudo</button>
          </div>
        </div>

        <div className={styles.editorWorkspace} style={showPreview ? { display: "block" } : undefined}>
          {/* RAIL ESQUERDO — seções (scroll-spy) + progresso */}
          {!showPreview && (
          <aside className={styles.editorRail}>
            <div className={styles.railTitle}>Seções</div>
            {sectionsMeta.map((s) => {
              const done = doneSet.has(s.id);
              const active = s.id === activeSectionId;
              return (
                <button key={s.id} type="button" className={`${styles.navRow} ${active ? styles.navRowActive : ""}`} onClick={() => jumpTo(s.id)} title={s.label}>
                  <span className={`${styles.statusDot} ${done ? styles.statusDotDone : active ? styles.statusDotActive : ""}`} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                </button>
              );
            })}
            <div style={{ marginTop: 14 }}>
              <div className={styles.railTitle} style={{ marginBottom: 6 }}>Progresso · {pct}%</div>
              <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, fontSize: 10.5, color: "var(--color-text-muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className={`${styles.statusDot} ${styles.statusDotDone}`} />Revisado</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className={`${styles.statusDot} ${styles.statusDotActive}`} />Onde você está</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className={styles.statusDot} />Pendente</span>
              </div>
            </div>
            <button type="button" className={styles.btn} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ marginTop: 14, width: "100%", fontSize: 11 }}>↑ Voltar ao topo</button>
          </aside>
          )}

          {/* MAIN — cards do editor */}
          <div className={styles.editorGrid}>
          {/* ── Vínculo & publicação ── */}
          <Section id="vinculo" label="Vínculo & publicação" collapsed={collapsed.has("vinculo")} onToggle={() => toggleCollapse("vinculo")}>
            <div className={styles.row2}>
              {isAditivo ? (
                <div className={styles.field}>
                  <label className={styles.label}>Contrato principal (base do aditivo) *</label>
                  <select
                    className={styles.input}
                    value={doc.parentContractId ?? ""}
                    onChange={(e) => applyParentContract(e.target.value)}
                  >
                    <option value="">Selecione o contrato principal…</option>
                    {principals.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber ? `Nº ${c.contractNumber} · ` : ""}{c.clientName ?? "—"}{c.proposalTitle ? ` · ${c.proposalTitle}` : ""}
                      </option>
                    ))}
                  </select>
                  {principals.length === 0 && (
                    <div className={styles.placeholderHint}>Nenhum contrato principal encontrado. Crie o contrato principal primeiro.</div>
                  )}
                  {doc.parentContractNumber && (
                    <div className={styles.placeholderHint} style={{ marginTop: 6 }}>
                      Aditivo ao contrato principal <strong>Nº {doc.parentContractNumber}</strong> — herda o mesmo número, identificado como “Aditivo” na listagem.
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>Cliente *</label>
                  <select className={styles.input} value={clientId} onChange={(e) => selectClient(e.target.value)}>
                    <option value="">Selecione…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <div className={styles.placeholderHint}>Nenhum cliente cadastrado. Crie um cliente primeiro.</div>
                  )}
                </div>
              )}
              <Txt label="Título interno (listagem)" value={title} onChange={setTitle} placeholder="Ex.: Contrato — Paulo Henrique" />
            </div>
            <div className={styles.placeholderHint}>
              {isAditivo ? (
                <>Ao selecionar o contrato principal, as <strong>partes</strong>, Cliente e Projeto são copiados dele (não do cadastro do cliente). Se o principal mudar, clique em <strong>Atualizar do contrato principal</strong>.</>
              ) : (
                <>Ao selecionar o cliente, os dados da <strong>CONTRATANTE</strong>, Cliente, Projeto, Data e os nº do contrato/proposta são preenchidos automaticamente (tudo editável).</>
              )}
            </div>
          </Section>

          {/* ── Identificação ── */}
          <Section id="identificacao" label="Identificação / cabeçalho" collapsed={collapsed.has("identificacao")} onToggle={() => toggleCollapse("identificacao")}>
            <div className={styles.row2}>
              <Txt label="Nº do contrato" value={doc.contractNumber} onChange={(v) => patch({ contractNumber: v })} mono />
              <div className={styles.field}>
                <label className={styles.label}>Nº da proposta</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className={`${styles.input} ${styles.mono}`}
                    value={doc.proposalNumber ?? ""}
                    onChange={(e) => patch({ proposalNumber: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fillFromProposalNumber(doc.proposalNumber ?? ""); } }}
                    placeholder="ex.: 2625"
                  />
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => fillFromProposalNumber(doc.proposalNumber ?? "")}
                    title="Buscar e preencher os dados vinculados a este número"
                  >
                    🔍 Buscar
                  </button>
                </div>
                <div className={styles.placeholderHint}>Informe o nº e clique em 🔍 para preencher cliente, projeto e partes vinculados.</div>
              </div>
            </div>
            <div className={styles.row2}>
              <Txt label="Data" value={doc.date} onChange={(v) => patch({ date: v })} placeholder="24/06/2026" />
              <div className={styles.field}>
                <label className={styles.label}>Vigência (meses após a assinatura)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className={`${styles.input} ${styles.mono}`}
                  value={doc.vigenciaMeses ?? 3}
                  onChange={(e) => patch({ vigenciaMeses: Math.max(1, Math.trunc(Number(e.target.value)) || 3) })}
                />
                <div className={styles.pageHint} style={{ marginTop: 6 }}>
                  Padrão: <strong>3 meses</strong>. Usada nos gráficos (ativos / próximos do vencimento / vencidos).
                </div>
              </div>
            </div>
            <Area
              label="Título do documento (Enter quebra a linha)"
              value={doc.documentTitle}
              onChange={(v) => patch({ documentTitle: v })}
              rows={2}
            />
            <div className={styles.row2}>
              <Txt label="Subtítulo do serviço" value={doc.serviceTitle} onChange={(v) => patch({ serviceTitle: v })} />
              <Txt label="Projeto" value={doc.projectName} onChange={(v) => patch({ projectName: v })} />
            </div>
            <Txt label="Cliente (exibido)" value={doc.clientName} onChange={(v) => patch({ clientName: v })} />
            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <ListEditor items={doc.tags ?? []} onChange={(v) => patch({ tags: v })} placeholder="ex.: APARTAMENTO" />
            </div>
          </Section>

          {/* ── Partes ── */}
          <Section
            id="contratante"
            label="CONTRATANTE"
            collapsed={collapsed.has("contratante")}
            onToggle={() => toggleCollapse("contratante")}
            right={isAditivo ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ fontSize: 12 }}
                onClick={() => doc.parentContractId && applyParentContract(doc.parentContractId, true)}
                disabled={!doc.parentContractId}
              >
                Atualizar do contrato principal
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ fontSize: 12 }}
                onClick={fillFromClient}
                disabled={!clientId}
              >
                Preencher do cliente
              </button>
            )}
          >
            <PartyFields party={doc.contratante} onChange={(p) => patch({ contratante: p })} />
          </Section>
          <Section id="contratada" label="CONTRATADA" collapsed={collapsed.has("contratada")} onToggle={() => toggleCollapse("contratada")}>
            <PartyFields party={doc.contratada} onChange={(p) => patch({ contratada: p })} />
          </Section>

          {/* ── Objeto & escopo ── */}
          <Section id="escopo" label="Objeto & escopo" collapsed={collapsed.has("escopo")} onToggle={() => toggleCollapse("escopo")}>
            <div className={styles.field}>
              <label className={styles.label}>Parágrafos de introdução (objeto)</label>
              <ParagraphList items={doc.objetoIntro} onChange={(v) => patch({ objetoIntro: v })} rows={3} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ambientes do escopo</label>
              <ListEditor items={doc.escopoAmbientes} onChange={(v) => patch({ escopoAmbientes: v })} placeholder="ex.: Sala de Jantar" />
              {isAditivo && <div className={styles.placeholderHint}>No aditivo, aparecem na cláusula de escopo só se você preencher.</div>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Serviços incluídos</label>
              <ParagraphList items={doc.escopoServicos} onChange={(v) => patch({ escopoServicos: v })} rows={2} placeholder="ex.: Planta Layout" />
            </div>
          </Section>

          {/* Prazo / Arquivos / Validade — só no contrato principal (não no aditivo). */}
          {!isAditivo && (
          <>
          {/* ── Prazo de entrega (cláusula 05) ── */}
          <Section id="prazo" label="Prazo de entrega (serviços e prazos)" collapsed={collapsed.has("prazo")} onToggle={() => toggleCollapse("prazo")}>
            <div className={styles.placeholderHint} style={{ marginBottom: 10 }}>
              Cada card é um <strong>serviço + prazo</strong> exibido no bloco "PRAZO DE ENTREGA" (cláusula 05).
              Adicione só os serviços deste contrato — o <strong>último</strong> card é o "DISPONÍVEL PARA INICIAR" (destaque vermelho).
            </div>
            <InfoCardsEditor
              cards={doc.prazoCards}
              onChange={(v) => patch({ prazoCards: v })}
              valueLabel="Prazo (destaque)"
              labelLabel="Serviço (legenda)"
            />
          </Section>

          {/* ── Arquivos (cláusula 11) ── */}
          <Section id="arquivos" label="Arquivos — cards (cláusula 11)" collapsed={collapsed.has("arquivos")} onToggle={() => toggleCollapse("arquivos")}>
            <InfoCardsEditor
              cards={doc.arquivosCards}
              onChange={(v) => patch({ arquivosCards: v })}
              valueLabel="Texto"
              labelLabel="Título"
            />
          </Section>

          {/* ── Validade / vigência (cláusula 18) ── */}
          <Section id="validade" label="Validade / vigência — cards (cláusula 18)" collapsed={collapsed.has("validade")} onToggle={() => toggleCollapse("validade")}>
            <div className={styles.placeholderHint} style={{ marginBottom: 10 }}>
              Cards do bloco <strong>VIGÊNCIA / INÍCIO / TÉRMINO</strong>. O <strong>rótulo</strong> é o texto pequeno
              (ex.: "VIGÊNCIA") e o <strong>destaque</strong> é o texto grande (ex.: "3 meses"). O <strong>último</strong> card
              é o "TÉRMINO" (destaque verde).
            </div>
            <InfoCardsEditor
              cards={doc.validadeCards ?? DEFAULT_VALIDADE_CARDS}
              onChange={(v) => patch({ validadeCards: v })}
              valueLabel="Destaque"
              labelLabel="Rótulo"
            />
          </Section>
          </>
          )}

          {/* ── Seção 06 (aditivo: sempre pagamento, cláusula 03) ── */}
          <Section id="pagamento" label={isAditivo ? "Valor e pagamento (cláusula 03)" : "Seção 06 — pagamento ⟷ tabela de custos"} collapsed={collapsed.has("pagamento")} onToggle={() => toggleCollapse("pagamento")}>
            {isAditivo && (
              <div className={styles.placeholderHint} style={{ marginBottom: 8 }}>
                É <strong>aqui</strong> que você define o <strong>valor total</strong> e as <strong>parcelas</strong> do aditivo (mesmo formato do contrato principal) — não no texto da cláusula 03.
              </div>
            )}
            {!isAditivo && (
              <div className={styles.field}>
                <label className={styles.label}>Variante exibida</label>
                <select
                  className={styles.input}
                  value={doc.sixVariant}
                  onChange={(e) => changeVariant(e.target.value as ContractDoc["sixVariant"])}
                  style={{ width: 260 }}
                >
                  <option value="pagamento">Preço / pagamento (parcelas)</option>
                  <option value="tabela-custos">Tabela de custos dos serviços</option>
                </select>
              </div>
            )}

            {doc.sixVariant === "pagamento" ? (
              <>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Valor total (R$)</label>
                    <CurrencyInput
                      value={sp.valorTotal ? parseBRLNum(sp.valorTotal) : null}
                      onChange={setValorTotal}
                      className={`${styles.input} ${styles.mono}`}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Nº de parcelas</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      className={styles.input}
                      value={sp.parcelas.length || ""}
                      onChange={(e) => setNumParcelas(Number(e.target.value))}
                      placeholder="ex.: 4"
                    />
                  </div>
                </div>
                <Txt
                  label="Valor total por extenso (automático — editável)"
                  value={sp.valorTotalExtenso ?? ""}
                  onChange={(v) => setSp({ valorTotalExtenso: v })}
                />
                <div className={styles.field}>
                  <label className={styles.label}>Resumo do pagamento (automático — editável)</label>
                  <div className={styles.placeholderHint} style={{ marginBottom: 8 }}>
                    Montado a partir das parcelas (nº de parcelas · vencimento · sem juros). Ajuste as parcelas e clique em gerar, ou edite o texto abaixo.
                  </div>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    style={{ marginBottom: 8 }}
                    onClick={() => setSp({ resumo: buildResumo(sp.parcelas, sp.entrada) })}
                    disabled={sp.parcelas.length === 0}
                  >
                    ↻ Gerar a partir das parcelas
                  </button>
                  <ListEditor items={sp.resumo} onChange={(v) => setSp({ resumo: v })} placeholder="ex.: 4 parcelas mensais" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Parcelas</label>
                  <div className={styles.placeholderHint} style={{ marginBottom: 8 }}>
                    Geradas automaticamente (valor total ÷ nº de parcelas, vencimento entre os dias 01–05). Edite qualquer campo se precisar.
                  </div>
                  <ParcelasEditor parcelas={sp.parcelas} onChange={(v) => setSp({ parcelas: v })} />
                </div>
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Valor do contrato para a listagem (R$)</label>
                  <CurrencyInput
                    value={tc.valorTotalManual ? parseBRLNum(tc.valorTotalManual) : null}
                    onChange={(n) => setTc({ valorTotalManual: n == null ? "" : formatBRL(n) })}
                    className={`${styles.input} ${styles.mono}`}
                  />
                  <div className={styles.pageHint} style={{ marginTop: 6 }}>
                    Informe <strong>manualmente</strong> o valor que aparece na aba Contratos. Nesta variante (tabela de custos) o valor <strong>não</strong> é somado das linhas.
                  </div>
                </div>
                <Area label="Introdução da tabela (opcional)" value={tc.intro ?? ""} onChange={(v) => setTc({ intro: v })} rows={3} placeholder="Texto de abertura da tabela." />
                <div className={styles.field}>
                  <label className={styles.label}>Tabelas de custos</label>
                  <div className={styles.placeholderHint} style={{ marginBottom: 8 }}>
                    Cada <strong>bloco</strong> é uma seção da tabela (ex.: “Plantas Executivas”). Dentro do bloco, cada <strong>linha</strong> tem serviço, descrição e valor.
                  </div>
                  <TabelaCustosEditor tabelas={tc.tabelas} onChange={(v) => setTc({ tabelas: v })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Observações gerais (opcional)</label>
                  <ParagraphList items={tc.observacoes ?? []} onChange={(v) => setTc({ observacoes: v })} rows={2} />
                </div>
              </>
            )}
          </Section>

          {/* ── PIX (cláusula 07) — só no contrato principal ── */}
          {!isAditivo && (
          <Section id="pix" label="PIX" collapsed={collapsed.has("pix")} onToggle={() => toggleCollapse("pix")}>
            <div className={styles.row2}>
              <Txt label="Chave PIX" value={doc.pix.chave} onChange={(v) => patch({ pix: { ...doc.pix, chave: v } })} mono />
              <Txt label="Rótulo da chave" value={doc.pix.chaveLabel} onChange={(v) => patch({ pix: { ...doc.pix, chaveLabel: v } })} />
            </div>
            <Txt label="Titular" value={doc.pix.titular} onChange={(v) => patch({ pix: { ...doc.pix, titular: v } })} />
            <Area label="Lembrete (opcional)" value={doc.pix.lembrete ?? ""} onChange={(v) => patch({ pix: { ...doc.pix, lembrete: v || undefined } })} rows={2} />
          </Section>
          )}

          {/* ── Assinatura ── */}
          <Section id="assinatura" label="Assinatura / status (exibido na página)" collapsed={collapsed.has("assinatura")} onToggle={() => toggleCollapse("assinatura")}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Status da assinatura</label>
                <select
                  className={styles.input}
                  value={doc.signature.status}
                  onChange={(e) => patch({ signature: { ...doc.signature, status: e.target.value as SignatureStatus } })}
                >
                  {SIGN_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <Txt
                label="Assinado em (opcional)"
                value={doc.signature.assinadoEm ?? ""}
                onChange={(v) => patch({ signature: { ...doc.signature, assinadoEm: v || undefined } })}
                placeholder="25/06/2026 às 08:26"
              />
            </div>
            <Txt
              label="IP (opcional)"
              value={doc.signature.ip ?? ""}
              onChange={(v) => patch({ signature: { ...doc.signature, ip: v || undefined } })}
              mono
            />
            <Area
              label="Texto de validade legal"
              value={doc.signature.validadeLegal}
              onChange={(v) => patch({ signature: { ...doc.signature, validadeLegal: v } })}
              rows={2}
            />
            <div className={styles.row2}>
              <Txt
                label="CONTRATANTE — nome"
                value={doc.signature.contratante.name}
                onChange={(v) => patch({ signature: { ...doc.signature, contratante: { ...doc.signature.contratante, name: v } } })}
              />
              <Txt
                label="CONTRATANTE — papel"
                value={doc.signature.contratante.role}
                onChange={(v) => patch({ signature: { ...doc.signature, contratante: { ...doc.signature.contratante, role: v } } })}
              />
            </div>
            <div className={styles.row2}>
              <Txt
                label="CONTRATADA — nome"
                value={doc.signature.contratada.name}
                onChange={(v) => patch({ signature: { ...doc.signature, contratada: { ...doc.signature.contratada, name: v } } })}
              />
              <Txt
                label="CONTRATADA — papel"
                value={doc.signature.contratada.role}
                onChange={(v) => patch({ signature: { ...doc.signature, contratada: { ...doc.signature.contratada, role: v } } })}
              />
            </div>
          </Section>

          {/* ── Assinatura digital (Autentique) ── */}
          <Section id="autentique" label="Assinatura digital (Autentique)" collapsed={collapsed.has("autentique")} onToggle={() => toggleCollapse("autentique")}>
            <div className={styles.placeholderHint} style={{ marginBottom: 10 }}>
              Para enviar, use o botão <strong>“Enviar p/ assinatura”</strong> na <strong>barra inferior</strong> — o sistema
              gera o PDF automaticamente e envia para as partes assinarem (o contrato precisa estar <strong>publicado</strong>).
              Aqui você <strong>acompanha o status</strong> e, se precisar, pode enviar um PDF próprio.
            </div>
            {autentiqueDocId && (
              <div className={styles.field}>
                <label className={styles.label}>Documento na Autentique (id)</label>
                <input className={`${styles.input} ${styles.mono}`} value={autentiqueDocId} readOnly />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={refreshing} onClick={refreshSignature}>
                    {refreshing ? "Consultando…" : "Atualizar status da assinatura"}
                  </button>
                  <span className={styles.pageHint}>Reconsulta a Autentique agora (não depende do webhook).</span>
                </div>
                {signers && (
                  <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                    {signers.map((s, i) => (
                      <li key={i} className={styles.mono} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
                        <span>{s.signed ? "✅" : s.rejected ? "❌" : "⏳"}</span>
                        <span>{s.name || s.email || "signatário"}</span>
                        <span style={{ opacity: 0.6 }}>
                          {s.signed ? `assinou${s.signedAt ? " em " + s.signedAt.slice(0, 10) : ""}` : s.rejected ? "recusou" : "pendente"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {!contractId ? (
              <div className={styles.placeholderHint}>Salve o contrato primeiro para habilitar o envio.</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className={styles.pageHint}>Enviar um PDF próprio (opcional):</span>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={sending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) sendToAutentique(f);
                    e.target.value = "";
                  }}
                />
                {sending && <span className={styles.pageHint}>Enviando…</span>}
              </div>
            )}
          </Section>

          {/* ── Cláusulas ── */}
          <Section id="clausulas" label="Cláusulas jurídicas" collapsed={collapsed.has("clausulas")} onToggle={() => toggleCollapse("clausulas")}>
            <ClausesEditor clauses={doc.clauses} kind={doc.kind} onChange={(v) => patch({ clauses: v })} />
          </Section>

          {/* ── Contato ── */}
          <Section id="contato" label="Contato (rodapé)" collapsed={collapsed.has("contato")} onToggle={() => toggleCollapse("contato")}>
            <div className={styles.row2}>
              <Txt label="WhatsApp (número)" value={doc.contact.whatsapp} onChange={(v) => patch({ contact: { ...doc.contact, whatsapp: v } })} mono />
              <Txt label="WhatsApp (exibido)" value={doc.contact.whatsappLabel} onChange={(v) => patch({ contact: { ...doc.contact, whatsappLabel: v } })} />
            </div>
            <div className={styles.row2}>
              <Txt label="Instagram" value={doc.contact.instagram} onChange={(v) => patch({ contact: { ...doc.contact, instagram: v } })} />
              <Txt label="Website" value={doc.contact.website} onChange={(v) => patch({ contact: { ...doc.contact, website: v } })} />
            </div>
            <div className={styles.row2}>
              <Txt label="TikTok" value={doc.contact.tiktok ?? ""} onChange={(v) => patch({ contact: { ...doc.contact, tiktok: v || undefined } })} />
              <Txt label="Threads" value={doc.contact.threads ?? ""} onChange={(v) => patch({ contact: { ...doc.contact, threads: v || undefined } })} />
            </div>
            <Txt label="Pinterest" value={doc.contact.pinterest ?? ""} onChange={(v) => patch({ contact: { ...doc.contact, pinterest: v || undefined } })} />
          </Section>

          {/* ── Exibição ── */}
          <Section id="exibicao" label="Exibição" collapsed={collapsed.has("exibicao")} onToggle={() => toggleCollapse("exibicao")}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={doc.show?.countdown ?? false}
                onChange={(e) => patch({ show: { ...doc.show, countdown: e.target.checked } })}
              />
              <span className={styles.label} style={{ margin: 0 }}>Mostrar contadores regressivos das parcelas</span>
            </label>
          </Section>
          </div>{/* fim da coluna principal (editorGrid) */}

          {/* RAIL DIREITO — Meu apoio (checklist de revisão + bloco de notas) */}
          {!showPreview && (
          <aside className={styles.editorRail}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className={styles.railTitle} style={{ margin: 0 }}>📌 Meu apoio</div>
              <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setApoioOpen((v) => !v)}>{apoioOpen ? "Recolher" : "Abrir"}</button>
            </div>
            {apoioOpen && (
              <>
                <div className={styles.railTitle} style={{ marginBottom: 6 }}>Checklist de revisão</div>
                {sectionsMeta.map((s) => (
                  <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 2px", fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={doneSet.has(s.id)} onChange={() => toggleDone(s.id)} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                  </label>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 6 }}>
                  <div className={styles.railTitle} style={{ margin: 0 }}>Bloco de notas</div>
                  <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setNotes("")} disabled={!notes}>Limpar</button>
                </div>
                <textarea className={styles.textarea} rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações, pendências, o que confirmar com o cliente…" />
                <div className={styles.railTitle} style={{ marginTop: 14, marginBottom: 6 }}>Dicas rápidas</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                  <li>Salva sozinho enquanto você edita (contrato já salvo).</li>
                  <li>Marque as seções revisadas no checklist.</li>
                  <li>Use “Recolher tudo” para navegar mais rápido.</li>
                </ul>
              </>
            )}
          </aside>
          )}
        </div>{/* fim do editorWorkspace */}
       </>
      )}

      <div className={styles.editorBar}>
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>Publicação</label>
          <select
            className={styles.input}
            value={status}
            onChange={(e) => setStatus(e.target.value as ContractStatus)}
            style={{ width: 180 }}
            disabled={saving}
          >
            <option value="draft">Rascunho</option>
            <option value="published">Aguardando assinatura</option>
            <option value="signed">Assinado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div className={styles.editorBarRight}>
          {publicUrl && (
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() =>
                navigator.clipboard?.writeText(publicUrl).then(() => { setNotice("Link do contrato copiado!"); scrollToTop(); })
              }
              title="Copia o link da página do contrato para enviar ao cliente"
            >
              🔗 Copiar link
            </button>
          )}
          <button className={styles.btn} onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={publish} disabled={saving}>
            {slug ? "Republicar" : "Salvar e publicar"}
          </button>
          {contractId && (
            <button
              className={`${styles.btn} ${styles.btnSign}`}
              onClick={() => sendToAutentique(null)}
              disabled={saving || sending}
              title={slug ? "Gera o PDF e envia para as partes assinarem na Autentique" : "Publique o contrato primeiro"}
            >
              <SignIcon />
              {sending ? "Enviando…" : "Enviar p/ assinatura"}
            </button>
          )}
        </div>
      </div>

      {/* Painel de pré-visualização ao vivo (atualiza a cada alteração) */}
      {showPreview && (
        <div
          style={{
            position: "fixed", top: 0, right: 0, zIndex: 60,
            width: PREVIEW_W, height: "100vh",
            background: "#ffffff", borderLeft: "1px solid var(--color-border)",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-text-primary)",
          }}>
            <strong style={{ fontSize: 13 }}>Prévia ao vivo · {doc.documentTitle || "Contrato"}</strong>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowPreview(false)}>Fechar</button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {/* zoom encolhe o documento p/ caber no painel (mantém a rolagem correta) */}
            <div style={{ zoom: 0.64 }}>
              <ContractView doc={doc} preview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

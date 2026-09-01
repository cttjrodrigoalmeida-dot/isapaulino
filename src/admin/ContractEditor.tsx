import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, numberOwnerConflict, type Client, type ContractInput, type ContractStatus, type ContractSummary, type NumberUse, type ProposalSummary } from "./api";
import type { ContractDoc, ContractClause, SignatureStatus, SixTabelaCustos } from "../components/contract/types";
import { blankContractDoc, blankAditivoDoc } from "../components/contract/newContractDoc";
import { DEFAULT_TABELA_CUSTOS, DEFAULT_VALIDADE_CARDS } from "../components/contract/contractDefaults";
import ContractView from "../components/contract/ContractView";
import ListEditor from "./ListEditor";
import CurrencyInput from "./CurrencyInput";
import { formatBRL, valorPorExtenso, parseBRL as parseBRLNum } from "./proposalCalc";
import { buildParcelas, buildResumo } from "./contractCalc";
import RelatedDocs from "./RelatedDocs";
import { contractValue } from "./contractValue";
import { duplicateNumber } from "../components/proposal/proposalNumber";
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
import { useAutosavePref, AutosaveToggle } from "./autosave";
import { usePreviewFollowPref, PreviewFollowToggle } from "./previewFollow";
import { normalizeClauses } from "../components/contract/clauseNumbering";

type Tab = "campos" | "json";

const SIGN_STATUS: { value: SignatureStatus; label: string }[] = [
  { value: "aguardando", label: "Aguardando assinatura" },
  { value: "pendente", label: "Pendente" },
  { value: "assinado", label: "Assinado" },
  { value: "cancelado", label: "Cancelado" },
];

// Data de hoje no formato "DD/MM/AAAA".
// Link do contrato = número da proposta (base) + complemento opcional.
// Deriva o complemento a partir do slug salvo (tira "<número>-"); e monta o slug
// completo p/ salvar (número, ou número-complemento).
function suffixFromSlug(slug: string, base: string): string {
  const s = (slug ?? "").trim();
  const b = (base ?? "").trim();
  if (!s || s === b) return "";
  if (b && s.startsWith(`${b}-`)) return s.slice(b.length + 1);
  return ""; // slug legado (nome do cliente): sem complemento derivável
}
function slugFromParts(base: string, suffix: string): string {
  const b = (base ?? "").trim();
  const s = (suffix ?? "").trim().replace(/^-+/, "");
  if (!b) return ""; // sem número da proposta: mantém o slug atual (publish auto-gera)
  return s ? `${b}-${s}` : b;
}
// Base do link do contrato: o nº da proposta vinculada. No TERMO ADITIVO sem
// proposta vinculada, cai no nº do contrato (mesmo do principal) — assim o
// aditivo também pode ter senha e complemento de URL, como o principal.
function slugBaseOf(doc: Pick<ContractDoc, "proposalNumber" | "contractNumber" | "kind"> | null): string {
  const prop = (doc?.proposalNumber ?? "").trim();
  if (prop) return prop;
  if (doc?.kind === "aditivo") return (doc?.contractNumber ?? "").trim();
  return "";
}

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
  duplicateFrom = null,
  onBack,
  onSaved,
}: {
  id: string | null;
  /** Tipo do documento ao criar um NOVO (ignorado ao editar). */
  kind?: "principal" | "aditivo";
  /** (Novo aditivo) contrato principal a pré-selecionar/copiar automaticamente. */
  parentId?: string | null;
  /** (Cópia) contrato de origem — abre um NOVO pré-preenchido a partir dele. */
  duplicateFrom?: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = id === null;
  const [contractId, setContractId] = useState<string | null>(id);
  const [clients, setClients] = useState<Client[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  // Contratos principais existentes — base para vincular um termo aditivo.
  const [principals, setPrincipals] = useState<ContractSummary[]>([]);
  // Números de contrato já usados — para avisar se a numeração colidir.
  const [existingNumbers, setExistingNumbers] = useState<string[]>([]);
  // Números em uso no sistema todo (com cliente dono) — o número é a identidade
  // do projeto; só o aditivo repete o nº do contrato original (mesmo cliente).
  const [usedNumbers, setUsedNumbers] = useState<NumberUse[]>([]);

  const [doc, setDoc] = useState<ContractDoc | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [legacyContent, setLegacyContent] = useState("");
  const [status, setStatus] = useState<ContractStatus>("draft");
  const [slug, setSlug] = useState<string | null>(null);
  // Senha de acesso (cliente novo abre por senha) + complemento da URL (o número
  // da proposta vinculada é sempre a base: /contrato/2630[-Complemento]).
  const [accessPassword, setAccessPassword] = useState("");
  const [slugSuffix, setSlugSuffix] = useState("");
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
  const [autosaveOn, setAutosaveOn] = useAutosavePref();
  const hydratedRef = useRef(false); // evita marcar "dirty" no carregamento
  const savingRef = useRef(false);   // evita autosave sobreposto
  // Arrastar item no espelho de cláusulas (índice de origem).
  const clsDrag = useRef<number | null>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null); // container rolável da prévia
  const [followOn, setFollowOn] = usePreviewFollowPref();
  const toggleCollapse = (sid: string) =>
    setCollapsed((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  const jumpTo = (sid: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.delete(sid); return n; });
    requestAnimationFrame(() => document.getElementById(`sec-card-${sid}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  // Marca/desmarca uma seção como concluída (ponto verde + barra de progresso).
  const toggleDone = (id: string) => setDoneSet((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ clients }, { proposals }, { contracts }, { numbers }, loaded] = await Promise.all([
          api.listClients(),
          api.listProposals(),
          api.listContracts(),
          api.documentNumbers().catch(() => ({ numbers: [] as NumberUse[] })),
          isNew ? Promise.resolve(null) : api.getContract(id!),
        ]);
        if (!alive) return;
        setClients(clients);
        setProposals(proposals);
        setUsedNumbers(numbers);
        // Só contratos principais (exclui aditivos e o próprio, se estiver editando).
        setPrincipals(contracts.filter((c) => c.kind !== "aditivo" && c.id !== id));
        const existingNums = contracts.map((c) => c.contractNumber ?? "").filter(Boolean);
        setExistingNumbers(existingNums);
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
          setAccessPassword(c.accessPassword ?? "");
          setSlugSuffix(suffixFromSlug(c.slug ?? "", slugBaseOf(parsed)));
          setNotes(c.editorNotes ?? "");
          setDoneSet(new Set(c.editorDone ?? []));
        } else if (duplicateFrom) {
          // Cópia: abre um NOVO já preenchido a partir do contrato de origem.
          const src = (await api.getContract(duplicateFrom)).contract;
          setClientId(src.clientId);
          setTitle(`${src.title} (cópia)`);
          setLegacyContent(src.content ?? "");
          setStatus("draft");
          let parsed: ContractDoc | null = null;
          if (src.data) { try { parsed = JSON.parse(src.data) as ContractDoc; } catch { /* cai no branco */ } }
          if (!parsed) { parsed = blankContractDoc(); parsed.clientName = src.clientName ?? ""; }
          // Sugere um número de cópia estilo "2624-1" a partir do Nº que está no
          // próprio documento (o Nº do contrato é editável). O número fica em
          // parsed.contractNumber (data), não no topo do objeto Contract.
          parsed.contractNumber = duplicateNumber(parsed.contractNumber || "", existingNums);
          setDoc(parsed);
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
  }, [id, isNew, kind, duplicateFrom]);

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
    // Link = base (nº da proposta; aditivo cai no nº do contrato) + complemento.
    slug: slugFromParts(slugBaseOf(doc), slugSuffix),
    accessPassword: accessPassword.trim() || null,
  });

  // Cliente dono deste contrato (nome), para checar a unicidade do número.
  const ownerName = clients.find((x) => x.id === clientId)?.name ?? doc?.clientName ?? "";
  // Conflito do número com o projeto de OUTRO cliente (aditivo é liberado — repete
  // de propósito o nº do contrato original, que é do mesmo cliente).
  const numberClash =
    doc?.kind === "aditivo"
      ? null
      : numberOwnerConflict(usedNumbers, doc?.contractNumber ?? "", ownerName);

  const validate = (): string | null => {
    if (!clientId) return doc?.kind === "aditivo" ? "Selecione o contrato principal (base do aditivo)." : "Selecione o cliente do contrato.";
    if (!title.trim() && !doc?.documentTitle) return "Informe o título do contrato.";
    if (numberClash) return `O número ${(doc?.contractNumber ?? "").trim()} já pertence ao projeto de "${numberClash}". Use um número diferente para não confundir na Área do Cliente.`;
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
    if (v) { setError(v); scrollToTop(); return; }
    setError(null);
    setNotice(null);
    savingRef.current = true;
    setSaving(true);
    try {
      const wasNew = !contractId;
      await persist(buildInput());
      // 1ª vez: cria e volta para a lista. Depois: FICA na página (como a proposta),
      // mostrando "Salvo às HH:MM" — não joga a Isabela de volta para a lista.
      if (wasNew) { onSaved(); return; }
      setLastSavedAt(Date.now());
      setDirty(false);
      setNotice("Alterações salvas.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
      scrollToTop();
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
  }, [doc, notes, doneSet, title, clientId, legacyContent, accessPassword, slugSuffix]);

  // Autosave silencioso (só contrato JÁ salvo e válido): debounce ~2,5s de ociosidade.
  // Não envia `status` (mantém o salvo) — trocar status é sempre ação explícita.
  // Usa uma ref sempre atual (evita closure velha do `doc` dentro do setTimeout).
  const latestRef = useRef({ doc, status, clientId, title, legacyContent, notes, doneSet, accessPassword, slugSuffix });
  latestRef.current = { doc, status, clientId, title, legacyContent, notes, doneSet, accessPassword, slugSuffix };
  useEffect(() => {
    if (!dirty || !autosaveOn || !contractId) return;
    const cur = latestRef.current;
    if (!cur.clientId || !(cur.title.trim() || cur.doc?.documentTitle)) return;
    const t = window.setTimeout(async () => {
      if (savingRef.current) return;
      const c = latestRef.current;
      savingRef.current = true; setSaving(true);
      try {
        await api.updateContract(contractId, {
          client_id: c.clientId,
          title: c.title.trim() || c.doc?.documentTitle || "Contrato",
          content: c.legacyContent,
          data: c.doc ? JSON.stringify(c.doc) : null,
          value: contractValue(c.doc),
          deadline: null,
          autentique_url: c.doc?.autentiqueUrl?.trim() || null,
          slug: slugFromParts(slugBaseOf(c.doc), c.slugSuffix),
          accessPassword: c.accessPassword.trim() || null,
          // status omitido de propósito → o servidor mantém o status salvo
        }, { editorNotes: c.notes, editorDone: [...c.doneSet] });
        setLastSavedAt(Date.now()); setDirty(false);
      } catch { /* mantém dirty; tenta na próxima */ }
      finally { savingRef.current = false; setSaving(false); }
    }, 2500);
    return () => window.clearTimeout(t);
  }, [dirty, autosaveOn, contractId, doc, clientId, title, legacyContent, notes, doneSet, accessPassword, slugSuffix]);

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

  // A prévia acompanha a seção em edição (quando "Acompanhar rolagem" está ligado):
  // ao rolar o editor (scroll-spy define activeSectionId), a prévia rola para o
  // trecho correspondente (data-spy no ContractView). Rolagem manual do container
  // (getBoundingClientRect funciona apesar do zoom).
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
  const slugBase = slugBaseOf(doc); // base do link (proposta; aditivo cai no nº do contrato)

  // Derivados do apoio (navegação/recolher/progresso).
  const collapseAll = () => setCollapsed(new Set(sectionsMeta.map((s) => s.id)));
  const expandAll = () => setCollapsed(new Set());
  const ctrDoneCount = sectionsMeta.filter((s) => doneSet.has(s.id)).length;
  const ctrPct = sectionsMeta.length ? Math.round((ctrDoneCount / sectionsMeta.length) * 100) : 0;
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // ── Espelho editável das CLÁUSULAS (📌 Meu apoio) ──
  // Reflete direto em doc.clauses (o número é renumerado por posição). Adicionar/
  // renomear/arrastar/duplicar/excluir aqui altera as cláusulas jurídicas.
  const clauses = doc.clauses ?? [];
  const setClauses = (next: ContractClause[]) => patch({ clauses: normalizeClauses(next, doc.kind) });
  const clAdd = () => {
    setClauses([...clauses, { number: "", title: "Nova cláusula", blocks: [{ type: "p", text: "" }] }]);
    if (!apoioOpen) setApoioOpen(true);
    jumpTo("clausulas");
  };
  const clRename = (i: number, title: string) => setClauses(clauses.map((c, idx) => (idx === i ? { ...c, title } : c)));
  const clDelete = (i: number) => setClauses(clauses.filter((_, idx) => idx !== i));
  const clDuplicate = (i: number) => { const l = clauses.slice(); l.splice(i + 1, 0, structuredClone(clauses[i])); setClauses(l); };
  const clMove = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= clauses.length || to >= clauses.length || from === to) return;
    const l = clauses.slice();
    const [m] = l.splice(from, 1);
    l.splice(from < to ? to - 1 : to, 0, m);
    setClauses(l);
  };

  return (
    <div
      className={styles.container}
      // Igual ao briefing: com a prévia aberta os rails continuam visíveis e a
      // prévia flutua ao lado do rail direito (não encolhe mais o editor).
      style={{ maxWidth: "none" }}
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
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>
            ← Voltar
          </button>
        </div>
      </div>

      <RelatedDocs proposalNumber={doc.proposalNumber} current="contract" />

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}
      {sending && <div className={styles.notice}>Gerando o PDF e enviando para a Autentique… aguarde.</div>}

      {/* Acesso: senha (cliente novo) + link padronizado (número + complemento). */}
      <div className={styles.publicLinkBox} style={{ flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>
            Senha de acesso {accessPassword ? "🔒" : "(link público)"}
            {accessPassword && (
              <button
                type="button"
                onClick={() => setAccessPassword("")}
                style={{ marginLeft: 8, background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", font: "inherit", fontSize: 11, textDecoration: "underline", padding: 0 }}
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
            placeholder="ex.: contrato2630"
            title="O cliente novo (sem Área do Cliente) abre o contrato digitando esta senha. Vazio = link público."
            style={{ width: 200 }}
          />
        </div>
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>Complemento da URL (opcional)</label>
          {slugBase ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className={`${styles.pageHint} ${styles.mono}`} style={{ margin: 0, fontSize: 12, whiteSpace: "nowrap" }}>
                /contrato/{slugBase}-
              </span>
              <input
                className={`${styles.input} ${styles.mono}`}
                type="text"
                value={slugSuffix}
                onChange={(e) => setSlugSuffix(e.target.value)}
                placeholder="Rodrigo-Almeida"
                style={{ width: 170 }}
              />
            </div>
          ) : (
            <span className={styles.fieldWarn}>⚠ Defina o Nº da proposta vinculada (no documento) para o link ficar /contrato/&lt;número&gt;.</span>
          )}
          {slugBase && (() => {
            const suf = slugSuffix.trim();
            const invalid = suf !== "" && !/^[A-Za-z0-9_-]+$/.test(suf);
            if (invalid) return <span className={styles.fieldWarn}>⚠ Use só letras, números, hífen (-) e underscore (_), sem espaços.</span>;
            return <span className={styles.pageHint} style={{ margin: "4px 0 0", fontSize: 11 }}>Link ao publicar: isabelapaulino.com.br/contrato/{suf ? `${slugBase}-${suf}` : slugBase}</span>;
          })()}
        </div>
      </div>

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
        {/* Barra fixa — 1ª linha: Nº + nome (sutil, sempre visível). 2ª linha: selo + ações. */}
        <div className={styles.editorToolbar} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span className={styles.saveBadge}>
                <span className={styles.saveBadgeDot} style={{ background: saving ? "#d9a531" : dirty ? "#d9a531" : "#4ade80" }} />
                {saving ? "Salvando…" : dirty ? (autosaveOn ? "Alterações não salvas" : "Não salvo — clique em Salvar") : lastSavedAt ? `Salvo às ${fmtTime(lastSavedAt)}` : contractId ? "Tudo salvo" : "Ainda não salvo"}
              </span>
              <AutosaveToggle enabled={autosaveOn} onChange={setAutosaveOn} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={styles.btn} style={{ fontSize: 11 }} onClick={collapseAll}>Recolher tudo</button>
              <button type="button" className={styles.btn} style={{ fontSize: 11 }} onClick={expandAll}>Expandir tudo</button>
              {/* Pré-visualizar fica aqui, na barra fixa (sempre à mão na rolagem). */}
              <button type="button" className={`${styles.btn} ${showPreview ? styles.btnPrimary : ""}`} style={{ fontSize: 11 }} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Ocultar prévia" : "👁 Pré-visualizar"}
              </button>
            </div>
          </div>
          {/* Nº + nome do projeto — sutil, na última linha (não some sob o cabeçalho fixo).
              No aditivo, mostra também o Nº do contrato PRINCIPAL para identificar rápido. */}
          <span className={styles.editorDocId} style={{ marginLeft: 0, maxWidth: "100%" }} title={isAditivo ? "Termo aditivo que você está editando (e o contrato principal a que ele se refere)" : "Contrato que você está editando agora"}>
            ✎ {isAditivo ? "Aditivo · " : ""}Nº&nbsp;{(doc?.contractNumber || "").trim() || "—"}
            {isAditivo && (doc?.parentContractNumber || "").trim() ? ` · do contrato principal Nº ${doc.parentContractNumber!.trim()}` : ""}
            {doc?.projectName?.trim() ? ` · ${doc.projectName.trim()}` : (doc?.serviceTitle?.trim() ? ` · ${doc.serviceTitle.trim()}` : "")}
          </span>
        </div>

        <div className={styles.editorWorkspace}>
          {/* RAIL ESQUERDO — seções (scroll-spy) + concluir + progresso */}
          <aside className={styles.editorRail}>
            <div className={styles.railTitle}>Seções</div>
            {sectionsMeta.map((s) => {
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
            {sectionsMeta.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className={styles.railTitle} style={{ marginBottom: 6 }}>Concluídas · {ctrDoneCount}/{sectionsMeta.length} · {ctrPct}%</div>
                <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${ctrPct}%` }} /></div>
              </div>
            )}
            <button type="button" className={styles.btn} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ marginTop: 14, width: "100%", fontSize: 11 }}>↑ Voltar ao topo</button>
          </aside>

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
              <div>
                <Txt label="Nº do contrato" value={doc.contractNumber} onChange={(v) => patch({ contractNumber: v })} mono />
                {isNew && (doc.contractNumber ?? "").trim() !== "" && existingNumbers.includes((doc.contractNumber ?? "").trim()) && (
                  <span className={styles.fieldWarn}>
                    ⚠ Atenção: já existe um contrato com o Nº {(doc.contractNumber ?? "").trim()}. Sugestão: {duplicateNumber(doc.contractNumber ?? "", existingNumbers)}.
                  </span>
                )}
                {numberClash && (
                  <span className={styles.fieldWarn}>
                    ⚠ O número {(doc.contractNumber ?? "").trim()} já pertence ao projeto de <strong>{numberClash}</strong>. Use outro para não confundir na Área do Cliente.
                  </span>
                )}
              </div>
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

          {/* RAIL DIREITO — Meu apoio (espelho editável das cláusulas + notas) */}
          {!showPreview && (
          <aside className={styles.editorRail}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className={styles.railTitle} style={{ margin: 0 }}>📌 Meu apoio</div>
              <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setApoioOpen((v) => !v)}>{apoioOpen ? "Recolher" : "Abrir"}</button>
            </div>
            {apoioOpen && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
                  <div className={styles.railTitle} style={{ margin: 0 }}>Cláusulas do contrato</div>
                  <button type="button" className={styles.btn} style={{ fontSize: 10, padding: "5px 9px" }} onClick={clAdd} title="Adicionar uma cláusula — cria no contrato">+ Adicionar</button>
                </div>
                <p className={styles.pageHint} style={{ margin: "0 0 8px", fontSize: 11 }}>
                  Espelha as cláusulas jurídicas. Adicionar, renomear, arrastar ou excluir <strong>aqui altera o contrato</strong> (a numeração se ajusta sozinha).
                </p>
                {clauses.length === 0 ? (
                  <p className={styles.pageHint} style={{ margin: "0 0 8px" }}>Nenhuma cláusula ainda. Use <strong>+ Adicionar</strong>.</p>
                ) : (
                  clauses.map((cl, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => (clsDrag.current = i)}
                      onDragEnd={() => (clsDrag.current = null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (clsDrag.current != null) clMove(clsDrag.current, i); clsDrag.current = null; }}
                      style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 2px", fontSize: 12.5 }}
                    >
                      <span className={styles.dragHandle} title="Arraste para reordenar (move no contrato)" style={{ cursor: "grab" }}>⠿</span>
                      <span className={styles.mono} style={{ fontSize: 10.5, color: "var(--color-text-muted)", width: 20, flexShrink: 0, textAlign: "right" }}>{cl.number || "–"}</span>
                      <input
                        className={styles.input}
                        value={cl.title}
                        onChange={(e) => clRename(i, e.target.value)}
                        onFocus={() => jumpTo("clausulas")}
                        placeholder="Título da cláusula"
                        title="Renomeia a cláusula no contrato"
                        style={{ flex: 1, fontSize: 12.5, padding: "5px 8px" }}
                      />
                      <button type="button" className={styles.iconBtn} onClick={() => clDuplicate(i)} title="Duplicar cláusula">⧉</button>
                      <button type="button" className={styles.iconBtn} onClick={() => clDelete(i)} title="Excluir cláusula" aria-label="Excluir">🗑</button>
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
                  <li>Salva sozinho enquanto você edita (contrato já salvo).</li>
                  <li>Editar aqui (nome/ordem) muda o contrato na hora.</li>
                  <li>O texto de cada cláusula fica na seção “Cláusulas jurídicas”.</li>
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

      {/* Painel de pré-visualização ao vivo — flutua ao lado do rail direito
          (igual ao briefing), sem tapar os apoios. */}
      {showPreview && (
        <div
          style={{
            position: "fixed", top: 132, right: 16, zIndex: 55,
            width: "min(44vw, 680px)", height: "calc(100vh - 148px)",
            background: "#ffffff", border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-text-primary)",
          }}>
            <strong style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Prévia ao vivo · {doc.documentTitle || "Contrato"}</strong>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <PreviewFollowToggle enabled={followOn} onChange={setFollowOn} />
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowPreview(false)}>Fechar</button>
            </div>
          </div>
          <div ref={previewScrollRef} style={{ flex: 1, overflow: "auto" }}>
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

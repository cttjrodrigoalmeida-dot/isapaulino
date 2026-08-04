import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Client, type ContractInput, type ContractStatus, type ContractSummary, type ProposalSummary } from "./api";
import type { ContractDoc, SignatureStatus, SixTabelaCustos } from "../components/contract/types";
import { blankContractDoc, blankAditivoDoc } from "../components/contract/newContractDoc";
import { DEFAULT_TABELA_CUSTOS, DEFAULT_VALIDADE_CARDS } from "../components/contract/contractDefaults";
import ContractView from "../components/contract/ContractView";
import ListEditor from "./ListEditor";
import CurrencyInput from "./CurrencyInput";
import { formatBRL, valorPorExtenso, parseBRL as parseBRLNum } from "./proposalCalc";
import { buildParcelas, buildResumo } from "./contractCalc";
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
  onBack,
  onSaved,
}: {
  id: string | null;
  /** Tipo do documento ao criar um NOVO (ignorado ao editar). */
  kind?: "principal" | "aditivo";
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
        } else {
          const fresh = kind === "aditivo" ? blankAditivoDoc() : blankContractDoc();
          setDoc(fresh);
          setTitle(fresh.documentTitle.replace(/\n/g, " "));
          setStatus("draft");
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
  }, [id, isNew, kind]);

  const patch = useCallback((partial: Partial<ContractDoc>) => {
    setDoc((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  // Aplica os dados do cliente ao contrato: CONTRATANTE, nomes de exibição
  // (Cliente/Projeto/Data) e nº do contrato/proposta. Projeto e nº vêm da
  // proposta mais recente do cliente; Data vira hoje (se ainda vazia).
  const applyClient = (cid: string) => {
    const c = clients.find((x) => x.id === cid);
    if (!c) return;
    const latest = proposals
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

  const persist = async (input: ContractInput): Promise<string> => {
    if (contractId) {
      await api.updateContract(contractId, input);
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
    setSaving(true);
    try {
      await persist(buildInput());
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
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
      <div ref={topRef} />
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
        <div className={styles.editorGrid}>
          {/* ── Vínculo & publicação ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Vínculo & publicação</div>
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
          </div>

          {/* ── Identificação ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Identificação / cabeçalho</div>
            <div className={styles.row2}>
              <Txt label="Nº do contrato" value={doc.contractNumber} onChange={(v) => patch({ contractNumber: v })} mono />
              <Txt label="Nº da proposta" value={doc.proposalNumber ?? ""} onChange={(v) => patch({ proposalNumber: v })} mono />
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
          </div>

          {/* ── Partes ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              CONTRATANTE
              {isAditivo ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ marginLeft: 12, fontSize: 12 }}
                  onClick={() => doc.parentContractId && applyParentContract(doc.parentContractId, true)}
                  disabled={!doc.parentContractId}
                >
                  Atualizar do contrato principal
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ marginLeft: 12, fontSize: 12 }}
                  onClick={fillFromClient}
                  disabled={!clientId}
                >
                  Preencher do cliente
                </button>
              )}
            </div>
            <PartyFields party={doc.contratante} onChange={(p) => patch({ contratante: p })} />
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>CONTRATADA</div>
            <PartyFields party={doc.contratada} onChange={(p) => patch({ contratada: p })} />
          </div>

          {/* ── Objeto & escopo ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Objeto & escopo</div>
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
          </div>

          {/* Prazo / Arquivos / Validade — só no contrato principal (não no aditivo). */}
          {!isAditivo && (
          <>
          {/* ── Prazo de entrega (cláusula 05) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Prazo de entrega (serviços e prazos)</div>
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
          </div>

          {/* ── Arquivos (cláusula 11) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Arquivos — cards (cláusula 11)</div>
            <InfoCardsEditor
              cards={doc.arquivosCards}
              onChange={(v) => patch({ arquivosCards: v })}
              valueLabel="Texto"
              labelLabel="Título"
            />
          </div>

          {/* ── Validade / vigência (cláusula 18) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Validade / vigência — cards (cláusula 18)</div>
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
          </div>
          </>
          )}

          {/* ── Seção 06 (aditivo: sempre pagamento, cláusula 03) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>{isAditivo ? "Valor e pagamento (cláusula 03)" : "Seção 06 — pagamento ⟷ tabela de custos"}</div>
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
          </div>

          {/* ── PIX (cláusula 07) — só no contrato principal ── */}
          {!isAditivo && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>PIX</div>
            <div className={styles.row2}>
              <Txt label="Chave PIX" value={doc.pix.chave} onChange={(v) => patch({ pix: { ...doc.pix, chave: v } })} mono />
              <Txt label="Rótulo da chave" value={doc.pix.chaveLabel} onChange={(v) => patch({ pix: { ...doc.pix, chaveLabel: v } })} />
            </div>
            <Txt label="Titular" value={doc.pix.titular} onChange={(v) => patch({ pix: { ...doc.pix, titular: v } })} />
            <Area label="Lembrete (opcional)" value={doc.pix.lembrete ?? ""} onChange={(v) => patch({ pix: { ...doc.pix, lembrete: v || undefined } })} rows={2} />
          </div>
          )}

          {/* ── Assinatura ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Assinatura / status (exibido na página)</div>
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
          </div>

          {/* ── Assinatura digital (Autentique) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Assinatura digital (Autentique)</div>
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
          </div>

          {/* ── Cláusulas ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Cláusulas jurídicas</div>
            <ClausesEditor clauses={doc.clauses} onChange={(v) => patch({ clauses: v })} />
          </div>

          {/* ── Contato ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Contato (rodapé)</div>
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
          </div>

          {/* ── Exibição ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Exibição</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={doc.show?.countdown ?? false}
                onChange={(e) => patch({ show: { ...doc.show, countdown: e.target.checked } })}
              />
              <span className={styles.label} style={{ margin: 0 }}>Mostrar contadores regressivos das parcelas</span>
            </label>
          </div>
        </div>
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

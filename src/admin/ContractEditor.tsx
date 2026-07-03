import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Client, type ContractInput, type ContractStatus } from "./api";
import type { ContractDoc, SignatureStatus } from "../components/contract/types";
import { blankContractDoc } from "../components/contract/newContractDoc";
import ListEditor from "./ListEditor";
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

const SIGN_STATUS: { value: SignatureStatus; label: string }[] = [
  { value: "aguardando", label: "Aguardando assinatura" },
  { value: "pendente", label: "Pendente" },
  { value: "assinado", label: "Assinado" },
  { value: "cancelado", label: "Cancelado" },
];

// "R$ 2.000,00" → 2000. Usado para preencher a coluna `value` (listagem/financeiro).
function parseBRL(s?: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export default function ContractEditor({
  id,
  onBack,
  onSaved,
}: {
  id: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = id === null;
  const [contractId, setContractId] = useState<string | null>(id);
  const [clients, setClients] = useState<Client[]>([]);

  const [doc, setDoc] = useState<ContractDoc | null>(null);
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ clients }, loaded] = await Promise.all([
          api.listClients(),
          isNew ? Promise.resolve(null) : api.getContract(id!),
        ]);
        if (!alive) return;
        setClients(clients);
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
          const fresh = blankContractDoc();
          setDoc(fresh);
          setTitle(fresh.documentTitle);
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
  }, [id, isNew]);

  const patch = useCallback((partial: Partial<ContractDoc>) => {
    setDoc((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  // Preenche a CONTRATANTE (e nomes de exibição) com os dados do cliente selecionado.
  const fillFromClient = () => {
    const c = clients.find((x) => x.id === clientId);
    if (!c || !doc) return;
    const endereco = [c.address, c.city, c.state].filter(Boolean).join(", ");
    patch({
      clientName: c.name || doc.clientName,
      contratante: {
        ...doc.contratante,
        name: c.name || doc.contratante.name,
        role: c.role || doc.contratante.role,
        nacionalidade: c.nacionalidade || doc.contratante.nacionalidade,
        nascimento: c.birth_date || doc.contratante.nascimento,
        cpfCnpj: c.cpf_cnpj || doc.contratante.cpfCnpj,
        email: c.email || doc.contratante.email,
        contato: c.phone || doc.contratante.contato,
        endereco: endereco || doc.contratante.endereco,
      },
      signature: {
        ...doc.signature,
        contratante: {
          ...doc.signature.contratante,
          name: c.name || doc.signature.contratante.name,
          role: c.role || doc.signature.contratante.role,
        },
      },
    });
    setNotice("Dados do cliente aplicados à CONTRATANTE.");
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
    value: parseBRL(doc?.sixVariant === "pagamento" ? doc?.sixPagamento?.valorTotal : undefined),
    deadline: null,
    autentique_url: doc?.autentiqueUrl?.trim() || null,
    status: overrideStatus ?? status,
  });

  const validate = (): string | null => {
    if (!clientId) return "Selecione o cliente do contrato.";
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
      setNotice("Contrato publicado. O link abaixo já está acessível.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao publicar.");
    } finally {
      setSaving(false);
    }
  };

  // Envia para assinatura na Autentique. Sem arquivo → o servidor gera o PDF
  // automaticamente (Browser Rendering) a partir da página pública do contrato.
  const sendToAutentique = async (file?: File | null) => {
    if (!contractId) {
      setError("Salve o contrato antes de enviar para assinatura.");
      return;
    }
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const { documentId, url } = await api.sendAutentique(contractId, file);
      setAutentiqueDocId(documentId);
      if (url) patch({ autentiqueUrl: url });
      setNotice(file ? "Documento enviado para a Autentique." : "PDF gerado e enviado para a Autentique.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar para a Autentique.");
    } finally {
      setSending(false);
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

  const sp = doc.sixPagamento ?? { valorTotal: "", valorTotalExtenso: "", resumo: [], parcelas: [] };
  const setSp = (partial: Partial<typeof sp>) => patch({ sixPagamento: { ...sp, ...partial } });
  const tc = doc.sixTabelaCustos ?? { intro: "", tabelas: [], observacoes: [] };
  const setTc = (partial: Partial<typeof tc>) => patch({ sixTabelaCustos: { ...tc, ...partial } });
  const publicUrl = slug ? `${window.location.origin}/contrato/${slug}` : null;

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>{isNew && !contractId ? "Novo contrato" : "Editar contrato"}</div>
          <div className={styles.pageHint}>
            Documento 100% editável. Use a aba <strong>JSON avançado</strong> para qualquer campo não listado.
          </div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>
          ← Voltar
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

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
              <div className={styles.field}>
                <label className={styles.label}>Cliente *</label>
                <select className={styles.input} value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
              <Txt label="Título interno (listagem)" value={title} onChange={setTitle} placeholder="Ex.: Contrato — Paulo Henrique" />
            </div>
            <Txt
              label="Link de assinatura (Autentique)"
              value={doc.autentiqueUrl ?? ""}
              onChange={(v) => patch({ autentiqueUrl: v })}
              placeholder="Cole o link gerado na Autentique (opcional por enquanto)"
            />
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
              <Txt label="Título do documento" value={doc.documentTitle} onChange={(v) => patch({ documentTitle: v })} />
            </div>
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
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ marginLeft: 12, fontSize: 12 }}
                onClick={fillFromClient}
                disabled={!clientId}
              >
                Preencher do cliente
              </button>
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
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Serviços incluídos</label>
              <ParagraphList items={doc.escopoServicos} onChange={(v) => patch({ escopoServicos: v })} rows={2} placeholder="ex.: Planta Layout" />
            </div>
          </div>

          {/* ── Prazo (cláusula 05) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Prazo — cards (cláusula 05)</div>
            <InfoCardsEditor
              cards={doc.prazoCards}
              onChange={(v) => patch({ prazoCards: v })}
              valueLabel="Destaque"
              labelLabel="Legenda"
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

          {/* ── Seção 06 ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Seção 06 — pagamento ⟷ tabela de custos</div>
            <div className={styles.field}>
              <label className={styles.label}>Variante exibida</label>
              <select
                className={styles.input}
                value={doc.sixVariant}
                onChange={(e) => patch({ sixVariant: e.target.value as ContractDoc["sixVariant"] })}
                style={{ width: 260 }}
              >
                <option value="pagamento">Preço / pagamento (parcelas)</option>
                <option value="tabela-custos">Tabela de custos dos serviços</option>
              </select>
            </div>

            {doc.sixVariant === "pagamento" ? (
              <>
                <div className={styles.row2}>
                  <Txt label="Valor total" value={sp.valorTotal} onChange={(v) => setSp({ valorTotal: v })} mono placeholder="R$ 2.000,00" />
                  <Txt label="Valor total por extenso" value={sp.valorTotalExtenso ?? ""} onChange={(v) => setSp({ valorTotalExtenso: v })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Resumo do pagamento</label>
                  <ListEditor items={sp.resumo} onChange={(v) => setSp({ resumo: v })} placeholder="ex.: 4 parcelas mensais" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Parcelas</label>
                  <ParcelasEditor parcelas={sp.parcelas} onChange={(v) => setSp({ parcelas: v })} />
                </div>
              </>
            ) : (
              <>
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

          {/* ── PIX (cláusula 07) ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>PIX</div>
            <div className={styles.row2}>
              <Txt label="Chave PIX" value={doc.pix.chave} onChange={(v) => patch({ pix: { ...doc.pix, chave: v } })} mono />
              <Txt label="Rótulo da chave" value={doc.pix.chaveLabel} onChange={(v) => patch({ pix: { ...doc.pix, chaveLabel: v } })} />
            </div>
            <Txt label="Titular" value={doc.pix.titular} onChange={(v) => patch({ pix: { ...doc.pix, titular: v } })} />
            <Area label="Lembrete (opcional)" value={doc.pix.lembrete ?? ""} onChange={(v) => patch({ pix: { ...doc.pix, lembrete: v || undefined } })} rows={2} />
          </div>

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
              Integração <strong>ativa</strong>. Clique em <strong>“Gerar PDF e enviar”</strong> — o sistema gera o PDF do
              contrato automaticamente e envia para a CONTRATANTE e a CONTRATADA assinarem (usa os e-mails das partes acima).
              O contrato precisa estar <strong>publicado</strong>. Se preferir, envie um PDF próprio no campo abaixo. Erros
              aparecem no <strong>topo do editor</strong>.
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
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={sending}
                    onClick={() => sendToAutentique(null)}
                  >
                    {sending ? "Gerando e enviando…" : "Gerar PDF e enviar para assinatura"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className={styles.pageHint}>Ou envie um PDF próprio:</span>
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
                </div>
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
            <option value="draft">Rascunho (oculto)</option>
            <option value="published">Publicado (link ativo)</option>
            <option value="signed">Assinado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div className={styles.editorBarRight}>
          <button className={styles.btn} onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={publish} disabled={saving}>
            {slug ? "Republicar" : "Salvar e publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

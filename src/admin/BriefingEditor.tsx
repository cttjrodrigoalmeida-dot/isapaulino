import { useEffect, useRef, useState } from "react";
import type { Briefing, BriefingSection } from "../components/briefing/types";
import { SAMPLE_BRIEFING } from "../components/briefing/sampleBriefing";
import { api, ApiError, type ProposalSummary } from "./api";
import BriefingSectionEditor from "./BriefingSectionEditor";
import BriefingView from "../components/briefing/BriefingView";
import RelatedDocs from "./RelatedDocs";
import styles from "./Admin.module.css";

type Status = "draft" | "published";

// Largura do painel de prévia (usada no drawer e para "encolher" o editor à esquerda).
const PREVIEW_W = "min(48vw, 760px)";

export default function BriefingEditor({
  number,
  onBack,
  onSaved,
}: {
  number: string | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isNew = number === null;
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [status, setStatus] = useState<Status>("draft");
  const [tab, setTab] = useState<"campos" | "json">("campos");
  const [showPreview, setShowPreview] = useState(false);
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
        if (isNew) {
          const { briefings } = await api.listBriefings();
          let template: Briefing = SAMPLE_BRIEFING;
          if (briefings.length > 0) {
            const latest = [...briefings].sort((a, b) => Number(b.number) - Number(a.number))[0];
            template = (await api.getBriefing(latest.number)).briefing;
          }
          const draft = structuredClone(template);
          draft.number = "";
          draft.proposalNumber = "";
          if (!alive) return;
          setBriefing(draft);
          setStatus("draft");
        } else {
          const { briefing: b, status: s } = await api.getBriefing(number!);
          if (!alive) return;
          setBriefing(b);
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

  // Lista de propostas (para o seletor "Proposta vinculada").
  useEffect(() => {
    let alive = true;
    api
      .listProposals()
      .then(({ proposals }) => {
        if (alive) setProposals(proposals);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Vincula a proposta e puxa o snapshot de cliente/projeto/data/tags.
  const linkProposal = async (num: string) => {
    if (!num) return;
    try {
      const { proposal } = await api.getProposal(num);
      setBriefing((prev) =>
        prev
          ? {
              ...prev,
              number: num,
              proposalNumber: num,
              client: proposal.client,
              serviceTitle: proposal.serviceTitle,
              serviceTags: proposal.serviceTags,
              date: proposal.date,
            }
          : prev
      );
      setNotice(`Dados puxados da proposta Nº ${num}.`);
    } catch {
      setBriefing((prev) => (prev ? { ...prev, number: num, proposalNumber: num } : prev));
    }
  };

  const set = <K extends keyof Briefing>(key: K, value: Briefing[K]) =>
    setBriefing((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setSection = (i: number, next: BriefingSection) =>
    setBriefing((prev) =>
      prev ? { ...prev, sections: prev.sections.map((s, idx) => (idx === i ? next : s)) } : prev
    );
  const addSection = (kind: "info" | "ambiente") =>
    setBriefing((prev) =>
      prev
        ? {
            ...prev,
            sections: [
              ...prev.sections,
              {
                id: `sec-${Date.now()}`,
                kind,
                title: kind === "ambiente" ? "NOVO AMBIENTE" : "NOVA SEÇÃO",
                questions: [],
                ...(kind === "ambiente" ? { image: "" } : {}),
              },
            ],
          }
        : prev
    );
  const removeSection = (i: number) =>
    setBriefing((prev) => (prev ? { ...prev, sections: prev.sections.filter((_, idx) => idx !== i) } : prev));
  // "+ Continuação": nova seção do MESMO ambiente (herda o título do último
  // ambiente), mas começa EM BRANCO — sem repetir as perguntas anteriores.
  const addContinuacao = () =>
    setBriefing((prev) => {
      if (!prev) return prev;
      const lastAmbiente = [...prev.sections].reverse().find((s) => s.kind === "ambiente");
      return {
        ...prev,
        sections: [
          ...prev.sections,
          { id: `sec-${Date.now()}`, kind: "ambiente", title: lastAmbiente?.title ?? "NOVO AMBIENTE", questions: [], image: "" },
        ],
      };
    });
  // Duplica a seção inteira (mesmas perguntas) logo abaixo, com IDs novos.
  // Mantém o título: se for ambiente, vira "continuação" do mesmo (só troca a imagem).
  const duplicateSection = (i: number) =>
    setBriefing((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev.sections[i]);
      copy.id = `sec-${Date.now()}`;
      copy.questions = (copy.questions ?? []).map((q, qi) => ({ ...q, id: `q-${Date.now()}-${qi}` }));
      const list = prev.sections.slice();
      list.splice(i + 1, 0, copy);
      return { ...prev, sections: list };
    });
  const moveSection = (i: number, dir: -1 | 1) =>
    setBriefing((prev) => {
      if (!prev) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.sections.length) return prev;
      const list = prev.sections.slice();
      [list[i], list[j]] = [list[j], list[i]];
      return { ...prev, sections: list };
    });

  // ── Drag-and-drop de perguntas (inclusive entre blocos) ──
  const dragSource = useRef<{ s: number; q: number } | null>(null);
  // id da pergunta recém-movida → dispara o destaque animado no card de destino.
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const moveTimer = useRef<number | undefined>(undefined);
  const moveQuestionTo = (toS: number, toQ: number) => {
    const src = dragSource.current;
    dragSource.current = null;
    if (!src) return;
    const movedId = briefing?.sections[src.s]?.questions[src.q]?.id ?? null;
    setBriefing((prev) => {
      if (!prev) return prev;
      if (src.s < 0 || src.s >= prev.sections.length) return prev;
      const sections = prev.sections.map((s) => ({ ...s, questions: s.questions.slice() }));
      const [moved] = sections[src.s].questions.splice(src.q, 1);
      if (!moved) return prev;
      let insertAt = toQ;
      if (src.s === toS && src.q < toQ) insertAt -= 1; // ajuste ao remover antes do destino
      insertAt = Math.max(0, Math.min(insertAt, sections[toS].questions.length));
      sections[toS].questions.splice(insertAt, 0, moved);
      return { ...prev, sections };
    });
    if (movedId) {
      setJustMovedId(null); // reseta p/ reiniciar a animação em movimentos seguidos
      window.clearTimeout(moveTimer.current);
      requestAnimationFrame(() => setJustMovedId(movedId));
      moveTimer.current = window.setTimeout(() => setJustMovedId(null), 1300);
    }
  };

  const goJsonTab = () => {
    if (briefing) setJsonText(JSON.stringify(briefing, null, 2));
    setJsonError(null);
    setTab("json");
  };
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as Briefing;
      if (!parsed || typeof parsed !== "object") throw new Error("JSON inválido.");
      setBriefing(parsed);
      setJsonError(null);
      setNotice("JSON aplicado aos campos.");
      setTab("campos");
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "JSON inválido.");
    }
  };

  const save = async (publish?: boolean) => {
    if (!briefing) return;
    setError(null);
    setNotice(null);
    const finalStatus: Status = publish ? "published" : status;
    if (!briefing.number.trim()) {
      setError("Informe o número da proposta vinculada.");
      return;
    }
    setSaving(true);
    try {
      if (isNew) await api.createBriefing(briefing, finalStatus);
      else await api.updateBriefing(number!, briefing, finalStatus);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !briefing) {
    return <div className={styles.loading}>Carregando briefing…</div>;
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
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>
            {isNew ? "Novo briefing" : `Editar briefing Nº ${number}`}
          </div>
          <div className={styles.pageHint}>
            Cada briefing é vinculado a uma proposta (mesmo número). Link público: /briefing/{briefing.number || "Nº"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={`${styles.btn} ${showPreview ? styles.btnPrimary : ""}`} onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Ocultar prévia" : "👁 Pré-visualizar"}
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
        </div>
      </div>

      <RelatedDocs proposalNumber={briefing?.proposalNumber} current="briefing" />

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "campos" ? styles.tabActive : ""}`} onClick={() => setTab("campos")}>Campos</button>
        <button className={`${styles.tab} ${tab === "json" ? styles.tabActive : ""}`} onClick={goJsonTab}>JSON avançado</button>
      </div>

      {tab === "campos" ? (
        <div className={styles.editorGrid}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Dados do briefing</div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Proposta vinculada</label>
                {isNew ? (
                  <select
                    className={styles.input}
                    value={briefing.number}
                    onChange={(e) => linkProposal(e.target.value)}
                  >
                    <option value="">Selecione uma proposta publicada…</option>
                    {proposals
                      .filter((p) => p.status === "published")
                      .map((p) => (
                        <option key={p.number} value={p.number}>
                          Nº {p.number} · {p.client || "—"}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className={`${styles.input} ${styles.mono}`} value={briefing.number} readOnly />
                    <button type="button" className={styles.btn} onClick={() => linkProposal(briefing.number)}>
                      Atualizar dados
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Título</label>
                <input className={styles.input} value={briefing.title} onChange={(e) => set("title", e.target.value)} />
              </div>
            </div>

            {(briefing.client || briefing.serviceTitle) && (
              <p className={styles.pageHint}>
                Vinculado a: <strong>{briefing.client || "—"}</strong>
                {briefing.serviceTitle ? ` · ${briefing.serviceTitle}` : ""}
                {briefing.date ? ` · ${briefing.date}` : ""}
              </p>
            )}

            {isNew && proposals.filter((p) => p.status === "published").length === 0 && (
              <p className={styles.pageHint}>
                Nenhuma proposta publicada ainda. Publique uma proposta para poder vincular.
              </p>
            )}

            <div className={styles.field} style={{ marginTop: 14 }}>
              <label className={styles.label}>E-mail do estúdio (card maquete)</label>
              <input className={styles.input} value={briefing.studioEmail ?? ""} onChange={(e) => set("studioEmail", e.target.value)} />
            </div>
          </div>

          {briefing.sections.map((s, i) => (
            <BriefingSectionEditor
              key={s.id || i}
              section={s}
              index={i}
              onChange={(next) => setSection(i, next)}
              onRemove={() => removeSection(i)}
              onMove={(dir) => moveSection(i, dir)}
              onDuplicate={() => duplicateSection(i)}
              onQuestionDragStart={(qi) => { dragSource.current = { s: i, q: qi }; }}
              onQuestionDrop={(toQ) => moveQuestionTo(i, toQ)}
              justMovedId={justMovedId}
              isFirst={i === 0}
              isLast={i === briefing.sections.length - 1}
            />
          ))}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className={styles.btn} onClick={() => addSection("info")}>+ seção de informações</button>
            <button type="button" className={styles.btn} onClick={() => addSection("ambiente")}>+ ambiente</button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={addContinuacao}
              disabled={!briefing.sections.some((s) => s.kind === "ambiente")}
              title="Nova seção do mesmo ambiente, começando em branco (sem repetir as perguntas)"
            >
              + continuação
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.cardTitle}>JSON avançado (objeto Briefing completo)</div>
          {jsonError && <div className={styles.error}>{jsonError}</div>}
          <textarea className={`${styles.textarea} ${styles.jsonArea}`} value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={applyJson}>Aplicar JSON</button>
            <button className={styles.btn} onClick={() => setTab("campos")}>Cancelar</button>
          </div>
        </div>
      )}

      <div className={styles.editorBar}>
        <div className={styles.field} style={{ margin: 0 }}>
          <label className={styles.label} style={{ marginBottom: 4 }}>Status</label>
          <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value as Status)} style={{ width: 180 }}>
            <option value="draft">Rascunho (oculto)</option>
            <option value="published">Publicado (link ativo)</option>
          </select>
        </div>
        <div className={styles.editorBarRight}>
          <button className={styles.btn} onClick={() => save(false)} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => save(true)} disabled={saving}>Salvar e publicar</button>
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
            <strong style={{ fontSize: 13 }}>Prévia ao vivo · {briefing.title || "Briefing"}</strong>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowPreview(false)}>Fechar</button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {/* zoom encolhe o documento p/ caber no painel (mantém a rolagem correta) */}
            <div style={{ zoom: 0.64 }}>
              <BriefingView briefing={briefing} preview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

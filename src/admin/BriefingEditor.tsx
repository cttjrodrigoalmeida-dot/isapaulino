import { useEffect, useState } from "react";
import type { Briefing, BriefingSection } from "../components/briefing/types";
import { SAMPLE_BRIEFING } from "../components/briefing/sampleBriefing";
import { api, ApiError, type ProposalSummary } from "./api";
import BriefingSectionEditor from "./BriefingSectionEditor";
import styles from "./Admin.module.css";

type Status = "draft" | "published";

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
  // Novo bloco de imagem do MESMO ambiente: insere logo após a seção i uma
  // seção ambiente com o mesmo título (na página do cliente vira "continuação")
  // e JÁ com as MESMAS perguntas do bloco de cima (IDs novos, mantém os pinos).
  // A imagem fica vazia — é só enviar a nova foto.
  const addContinuation = (i: number) =>
    setBriefing((prev) => {
      if (!prev) return prev;
      const base = prev.sections[i];
      const questions = (base.questions ?? []).map((q, qi) => ({
        ...structuredClone(q),
        id: `q-${Date.now()}-${qi}`,
      }));
      const list = prev.sections.slice();
      list.splice(i + 1, 0, {
        id: `sec-${Date.now()}`,
        kind: "ambiente",
        title: base.title,
        image: "",
        questions,
      });
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
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>
            {isNew ? "Novo briefing" : `Editar briefing Nº ${number}`}
          </div>
          <div className={styles.pageHint}>
            Cada briefing é vinculado a uma proposta (mesmo número). Link público: /briefing/{briefing.number || "Nº"}
          </div>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
      </div>

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
              onAddContinuation={() => addContinuation(i)}
              isFirst={i === 0}
              isLast={i === briefing.sections.length - 1}
            />
          ))}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className={styles.btn} onClick={() => addSection("info")}>+ seção de informações</button>
            <button type="button" className={styles.btn} onClick={() => addSection("ambiente")}>+ ambiente</button>
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
    </div>
  );
}

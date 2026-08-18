import { useEffect, useMemo, useRef, useState } from "react";
import type { Briefing, BriefingSection, BriefingQuestion } from "../components/briefing/types";
import { SAMPLE_BRIEFING } from "../components/briefing/sampleBriefing";
import { api, ApiError, type ProposalSummary, type LibraryQuestion } from "./api";
import BriefingSectionEditor from "./BriefingSectionEditor";
import QuestionLibraryPicker from "./QuestionLibraryPicker";
import BackToTop from "./BackToTop";
import BriefingView from "../components/briefing/BriefingView";
import RelatedDocs from "./RelatedDocs";
import { useAutosavePref, AutosaveToggle } from "./autosave";
import styles from "./Admin.module.css";

// Pergunta reutilizável (clipboard/biblioteca): sem id/pin (posição é do ambiente).
const CLIP_KEY = "ips_briefing_qclip";
function stripQuestion(q: BriefingQuestion): BriefingQuestion {
  const { id: _id, pin: _pin, ...rest } = q;
  return rest as BriefingQuestion;
}

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
  const [showPreview, setShowPreview] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Apoio pessoal (D1): notas + checklist "preenchido" + salvamento ──
  const [notes, setNotes] = useState("");
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [apoioOpen, setApoioOpen] = useState(true);
  const [autosaveOn, setAutosaveOn] = useAutosavePref();
  const hydratedRef = useRef(false);   // evita marcar "dirty" no carregamento
  const savingRef = useRef(false);     // evita autosave sobreposto
  const previewScrollRef = useRef<HTMLDivElement>(null); // container rolável da prévia
  const toggleDone = (id: string) =>
    setDoneSet((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ── Seleção em massa de perguntas (global entre seções; por id da pergunta) ──
  const [selectedQ, setSelectedQ] = useState<Set<string>>(new Set());
  const clearSelQ = () => setSelectedQ(new Set());
  const toggleQ = (id: string) =>
    setSelectedQ((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // Marca/desmarca TODAS as perguntas de um ambiente (nível 1 da seleção).
  const toggleSectionSelect = (si: number) => {
    const ids = (briefing?.sections[si]?.questions ?? []).map((q) => q.id).filter(Boolean) as string[];
    if (!ids.length) return;
    setSelectedQ((s) => {
      const n = new Set(s);
      const allSel = ids.every((id) => n.has(id));
      ids.forEach((id) => (allSel ? n.delete(id) : n.add(id)));
      return n;
    });
  };
  const deleteSelectedQ = () => {
    if (!selectedQ.size) return;
    setBriefing((prev) => prev ? { ...prev, sections: prev.sections.map((s) => ({ ...s, questions: s.questions.filter((q) => !selectedQ.has(q.id)) })) } : prev);
    clearSelQ();
  };
  const duplicateSelectedQ = () => {
    if (!selectedQ.size) return;
    setBriefing((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s, si) => {
        const out: BriefingQuestion[] = [];
        s.questions.forEach((q, qi) => {
          out.push(q);
          if (selectedQ.has(q.id)) out.push({ ...structuredClone(q), id: `q-${Date.now()}-${si}-${qi}` });
        });
        return { ...s, questions: out };
      });
      return { ...prev, sections };
    });
    clearSelQ();
  };

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
          const { briefing: b, status: s, editorNotes, editorDone } = await api.getBriefing(number!);
          if (!alive) return;
          setBriefing(b);
          setStatus(s);
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
  const addContinuacao = () => {
    const newId = `sec-${Date.now()}`;
    setBriefing((prev) => {
      if (!prev) return prev;
      const lastAmbiente = [...prev.sections].reverse().find((s) => s.kind === "ambiente");
      return {
        ...prev,
        sections: [
          ...prev.sections,
          { id: newId, kind: "ambiente", title: lastAmbiente?.title ?? "NOVO AMBIENTE", questions: [], image: "", continuation: !!lastAmbiente },
        ],
      };
    });
    setScrollToId(newId);
  };
  // "+ Continuação" por seção: nova seção do MESMO ambiente da seção `i`
  // (herda o título dela), inserida logo abaixo e começando EM BRANCO.
  const continuarSection = (i: number) => {
    const newId = `sec-${Date.now()}`;
    setBriefing((prev) => {
      if (!prev) return prev;
      const base = prev.sections[i];
      const list = prev.sections.slice();
      list.splice(i + 1, 0, { id: newId, kind: "ambiente", title: base?.title ?? "NOVO AMBIENTE", questions: [], image: "", continuation: true });
      return { ...prev, sections: list };
    });
    setScrollToId(newId);
  };
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

  // ── Recolher/expandir seções ──
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const collapseAll = () => setCollapsed(new Set((briefing?.sections ?? []).map((s) => s.id)));
  const expandAll = () => setCollapsed(new Set());
  // Índice: expande (se recolhida) e rola até a seção.
  const jumpTo = (id: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setScrollToId(id);
  };

  // ── Copiar/colar perguntas (clipboard em localStorage, funciona entre briefings) ──
  // O clipboard guarda SEMPRE uma LISTA de perguntas (1 ou várias), então copiar/
  // colar funciona tanto para uma pergunta quanto para uma seleção.
  const readClip = (): BriefingQuestion[] => {
    try {
      const raw = window.localStorage.getItem(CLIP_KEY);
      if (!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? (v as BriefingQuestion[]) : [v as BriefingQuestion];
    } catch { return []; }
  };
  const [hasClip, setHasClip] = useState<boolean>(() => readClip().length > 0);
  const writeClip = (items: BriefingQuestion[]) => {
    try { window.localStorage.setItem(CLIP_KEY, JSON.stringify(items)); setHasClip(items.length > 0); } catch { /* localStorage indisponível */ }
  };
  const copyQuestion = (si: number, qi: number) => {
    const q = briefing?.sections[si]?.questions[qi];
    if (!q) return;
    writeClip([stripQuestion(q)]);
    setNotice("Pergunta copiada. Use “Colar pergunta” na seção desejada (inclusive em outro briefing).");
  };
  // Copia TODAS as perguntas marcadas (em ordem do documento).
  const copySelectedQ = () => {
    if (!selectedQ.size || !briefing) return;
    const items: BriefingQuestion[] = [];
    briefing.sections.forEach((s) => s.questions.forEach((q) => { if (selectedQ.has(q.id)) items.push(stripQuestion(q)); }));
    if (!items.length) return;
    writeClip(items);
    setNotice(`${items.length} pergunta${items.length === 1 ? "" : "s"} copiada${items.length === 1 ? "" : "s"}. Use “Colar pergunta” na seção desejada (inclusive em outro briefing).`);
  };
  // Cola a(s) pergunta(s) copiada(s) na seção `si`, na posição `at` (ou no fim).
  const pasteQuestion = (si: number, at?: number) => {
    const items = readClip();
    if (!items.length) return;
    const stamp = Date.now();
    const withIds = items.map((q, k) => ({ ...q, id: `q-${stamp}-${k}` }));
    setBriefing((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s, idx) => {
        if (idx !== si) return s;
        const qs = s.questions.slice();
        const pos = at == null ? qs.length : Math.max(0, Math.min(at, qs.length));
        qs.splice(pos, 0, ...withIds);
        return { ...s, questions: qs };
      });
      return { ...prev, sections };
    });
    flashQuestion(withIds[0].id); // destaca a primeira cópia recém-colada
  };

  // ── Biblioteca de perguntas (D1) ──
  const [library, setLibrary] = useState<LibraryQuestion[]>([]);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const refreshLibrary = () =>
    api.listQuestionLibrary().then(({ items }) => setLibrary(items)).catch(() => { /* sem biblioteca ainda */ });
  useEffect(() => { refreshLibrary(); }, []);
  // Pergunta que o modal oferece para salvar (quando aberto pelo botão da pergunta).
  const [pendingSave, setPendingSave] = useState<BriefingQuestion | null>(null);
  // Salva na biblioteca uma pergunta (existente ou nova composta no modal).
  const saveNewToLibrary = async (label: string, question: BriefingQuestion) => {
    try {
      await api.saveQuestionToLibrary(label.trim(), stripQuestion(question));
      await refreshLibrary();
      setNotice("Pergunta salva na biblioteca.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar na biblioteca.");
    }
  };
  const insertFromLibrary = (si: number, q: BriefingQuestion) => {
    const newId = `q-${Date.now()}`;
    let targetSecId: string | undefined;
    setBriefing((prev) => {
      if (!prev) return prev;
      targetSecId = prev.sections[si]?.id;
      const sections = prev.sections.map((s, idx) =>
        idx === si ? { ...s, questions: [...s.questions, { ...q, id: newId }] } : s);
      return { ...prev, sections };
    });
    setPickerFor(null);
    if (targetSecId) { setCollapsed((c) => { const n = new Set(c); n.delete(targetSecId!); return n; }); setScrollToId(targetSecId); }
    flashQuestion(newId);
  };

  // Deriva, por seção, se é continuação (e qual "parte") — só para o editor.
  const contInfo = useMemo(() => {
    const out: { isCont: boolean; part: number }[] = [];
    let groupTitle: string | null = null;
    let part = 0;
    (briefing?.sections ?? []).forEach((s, i) => {
      if (s.kind !== "ambiente") { out[i] = { isCont: false, part: 0 }; groupTitle = null; part = 0; return; }
      const prev = briefing!.sections[i - 1];
      const continues = groupTitle !== null && (s.continuation === true || (prev?.kind === "ambiente" && prev.title === s.title));
      if (continues) part += 1; else { groupTitle = s.title; part = 1; }
      out[i] = { isCont: part > 1, part };
    });
    return out;
  }, [briefing]);

  // ── Drag-and-drop de perguntas (inclusive entre blocos) ──
  const dragSource = useRef<{ s: number; q: number } | null>(null);
  // id da pergunta recém-movida → dispara o destaque animado no card de destino.
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const moveTimer = useRef<number | undefined>(undefined);
  // Destaca (anima) uma pergunta recém-inserida/colada por ~1,3s.
  const flashQuestion = (qid: string) => {
    setJustMovedId(null);
    window.clearTimeout(moveTimer.current);
    requestAnimationFrame(() => setJustMovedId(qid));
    moveTimer.current = window.setTimeout(() => setJustMovedId(null), 1300);
  };
  // Após criar uma "continuação", rola até a seção recém-criada.
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  useEffect(() => {
    if (!scrollToId) return;
    const el = document.getElementById(`sec-card-${scrollToId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollToId(null);
  }, [scrollToId]);
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

  // Marca alterações pendentes (após o carregamento inicial).
  useEffect(() => {
    if (hydratedRef.current) setDirty(true);
  }, [briefing, status, notes, doneSet]);

  // Autosave silencioso (só briefing JÁ criado): debounce ~2,5s de ociosidade.
  const latestRef = useRef({ briefing, status, notes, doneSet });
  latestRef.current = { briefing, status, notes, doneSet };
  useEffect(() => {
    if (!dirty || isNew || !autosaveOn) return;
    const t = window.setTimeout(async () => {
      if (savingRef.current) return;
      const cur = latestRef.current;
      if (!cur.briefing) return;
      savingRef.current = true; setSaving(true);
      try {
        await api.updateBriefing(number!, cur.briefing, cur.status, { editorNotes: cur.notes, editorDone: [...cur.doneSet] });
        setLastSavedAt(Date.now()); setDirty(false);
      } catch { /* mantém dirty; tenta na próxima */ }
      finally { savingRef.current = false; setSaving(false); }
    }, 2500);
    return () => window.clearTimeout(t);
  }, [dirty, briefing, status, notes, doneSet, isNew, number, autosaveOn]);

  // Scroll-spy: acende a seção visível durante a rolagem.
  useEffect(() => {
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
  }, [briefing?.sections.length, collapsed, tab]);

  // Salvar manual: FICA na página (não volta para a lista). Novo briefing:
  // o 1º salvar cria e volta (depois o autosave passa a valer).
  const save = async (publish?: boolean) => {
    if (!briefing) return;
    setError(null);
    setNotice(null);
    const finalStatus: Status = publish ? "published" : status;
    if (!briefing.number.trim()) {
      setError("Informe o número da proposta vinculada.");
      return;
    }
    savingRef.current = true; setSaving(true);
    try {
      if (isNew) { await api.createBriefing(briefing, finalStatus); onSaved(); return; }
      await api.updateBriefing(number!, briefing, finalStatus, { editorNotes: notes, editorDone: [...doneSet] });
      if (publish && status !== "published") setStatus("published");
      setLastSavedAt(Date.now());
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  // Derivados do apoio (navegação/progresso). Continuações colapsam no "run" pai.
  const navList = (briefing?.sections ?? []).map((s, i) => ({ s, i })).filter(({ i }) => !contInfo[i]?.isCont);
  const ambienteList = navList.filter(({ s }) => s.kind === "ambiente");
  const doneCount = navList.filter(({ s }) => doneSet.has(s.id)).length;
  const pct = navList.length ? Math.round((doneCount / navList.length) * 100) : 0;
  let activeRunId = "";
  if (briefing) {
    let ai = briefing.sections.findIndex((s) => s.id === activeSectionId);
    while (ai > 0 && contInfo[ai]?.isCont) ai--;
    activeRunId = ai >= 0 ? briefing.sections[ai]?.id ?? "" : "";
  }
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // A prévia acompanha automaticamente a seção que está sendo editada: ao rolar
  // o editor (scroll-spy define activeRunId), a prévia desce para o mesmo
  // ambiente. Rolagem manual do container (não scrollIntoView) para não mexer na
  // página; getBoundingClientRect funciona mesmo com o `zoom` da prévia.
  useEffect(() => {
    if (!showPreview) return;
    const id = activeRunId || activeSectionId;
    if (!id) return;
    const cont = previewScrollRef.current;
    if (!cont) return;
    const t = window.setTimeout(() => {
      const sel = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(id) : id;
      const target = cont.querySelector<HTMLElement>(`[data-spy="${sel}"]`);
      if (!target) return;
      const delta = target.getBoundingClientRect().top - cont.getBoundingClientRect().top - 12;
      if (Math.abs(delta) < 2) return;
      cont.scrollTo({ top: cont.scrollTop + delta, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [activeRunId, activeSectionId, showPreview]);

  // A prévia acompanha o tema do painel (evita "escuro no escuro" no modo claro).
  const adminTheme: "light" | "dark" =
    (typeof window !== "undefined" && window.localStorage.getItem("ips_admin_theme") === "dark") ? "dark" : "light";

  if (loading || !briefing) {
    return <div className={styles.loading}>Carregando briefing…</div>;
  }

  return (
    <div
      className={styles.container}
      // Editor mais largo: o conteúdo principal mantém a largura, os apoios
      // ficam ao lado (não espremem os campos). A prévia sobrepõe (não encolhe).
      style={{ maxWidth: "none" }}
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
          <button className={styles.btn} onClick={() => setPickerFor(briefing.sections.length - 1)} title="Ver a biblioteca — clique numa pergunta para inseri-la no fim do briefing; também dá para renomear/excluir.">
            📚 Biblioteca{library.length ? ` (${library.length})` : ""}
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
       <>
        {/* Barra de ações fixa — Salvar/Pré-visualizar sempre à mão + selo */}
        <div className={styles.editorToolbar}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span className={styles.saveBadge}>
              <span className={styles.saveBadgeDot} style={{ background: saving ? "#d9a531" : dirty ? "#d9a531" : "#4ade80" }} />
              {saving ? "Salvando…" : dirty ? (autosaveOn ? "Alterações não salvas" : "Não salvo — clique em Salvar") : lastSavedAt ? `Salvo às ${fmtTime(lastSavedAt)}` : "Tudo salvo"}
            </span>
            <AutosaveToggle enabled={autosaveOn} onChange={setAutosaveOn} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value as Status)} style={{ width: 150 }}>
              <option value="draft">Rascunho (oculto)</option>
              <option value="published">Publicado</option>
            </select>
            <button className={`${styles.btn} ${showPreview ? styles.btnPrimary : ""}`} onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Ocultar prévia" : "👁 Pré-visualizar"}
            </button>
            <button className={styles.btn} onClick={() => save(false)} disabled={saving}>💾 Salvar</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => save(true)} disabled={saving}>Salvar e publicar</button>
          </div>
        </div>

        {/* Barra de seleção em massa (aparece quando há perguntas marcadas). */}
        {selectedQ.size > 0 && (
          <div className={styles.selectionBar} style={{ position: "sticky", top: 178, zIndex: 7 }}>
            <span className={styles.selectionCount}>{selectedQ.size} pergunta{selectedQ.size === 1 ? "" : "s"} selecionada{selectedQ.size === 1 ? "" : "s"}</span>
            <button type="button" className={styles.btn} onClick={copySelectedQ} title="Copiar as perguntas marcadas — depois use “Colar pergunta” na seção desejada (inclusive em outro briefing).">⧉ Copiar selecionadas</button>
            <button type="button" className={styles.btn} onClick={duplicateSelectedQ} title="Duplicar as perguntas marcadas (cada uma logo abaixo dela).">⧉ Duplicar selecionadas</button>
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={deleteSelectedQ} title="Excluir as perguntas marcadas.">🗑 Excluir selecionadas</button>
            <button type="button" className={styles.btn} onClick={clearSelQ} style={{ marginLeft: "auto" }}>Limpar seleção</button>
          </div>
        )}

        <div className={styles.editorWorkspace}>
          {/* RAIL ESQUERDO — seções (scroll-spy) + progresso */}
          <aside className={styles.editorRail}>
            <div className={styles.railTitle}>Seções</div>
            {navList.map(({ s }) => {
              const done = doneSet.has(s.id);
              const active = s.id === activeRunId;
              const name = s.title || (s.kind === "ambiente" ? "Ambiente" : "Informações");
              return (
                <button key={s.id} type="button" className={`${styles.navRow} ${active ? styles.navRowActive : ""}`} onClick={() => jumpTo(s.id)} title={name}>
                  <span className={`${styles.statusDot} ${done ? styles.statusDotDone : active ? styles.statusDotActive : ""}`} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                </button>
              );
            })}
            <div style={{ marginTop: 14 }}>
              <div className={styles.railTitle} style={{ marginBottom: 6 }}>Progresso · {pct}%</div>
              <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, fontSize: 10.5, color: "var(--color-text-muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className={`${styles.statusDot} ${styles.statusDotDone}`} />Concluído</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className={`${styles.statusDot} ${styles.statusDotActive}`} />Em andamento</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className={styles.statusDot} />Pendente</span>
              </div>
            </div>
            <button type="button" className={styles.btn} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ marginTop: 14, width: "100%", fontSize: 11 }}>↑ Voltar ao topo</button>
          </aside>

          {/* MAIN — cards do editor */}
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

          {briefing.sections.length > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className={styles.btn} style={{ fontSize: 11 }} onClick={collapseAll}>Recolher tudo</button>
              <button type="button" className={styles.btn} style={{ fontSize: 11 }} onClick={expandAll}>Expandir tudo</button>
            </div>
          )}

          {briefing.sections.map((s, i) => {
            const secIds = s.questions.map((q) => q.id);
            const selCount = secIds.filter((id) => selectedQ.has(id)).length;
            const sectionSelect: "none" | "some" | "all" =
              selCount === 0 ? "none" : selCount === secIds.length ? "all" : "some";
            return (
            <BriefingSectionEditor
              key={s.id || i}
              section={s}
              index={i}
              collapsed={collapsed.has(s.id)}
              onToggleCollapse={() => toggleCollapse(s.id)}
              continuationInfo={contInfo[i]}
              selectedIds={selectedQ}
              sectionSelect={sectionSelect}
              onToggleSectionSelect={() => toggleSectionSelect(i)}
              onToggleQuestionSelect={(qi) => { const id = s.questions[qi]?.id; if (id) toggleQ(id); }}
              hasClipboard={hasClip}
              onCopyQuestion={(qi) => copyQuestion(i, qi)}
              onPasteQuestion={(at) => pasteQuestion(i, at)}
              onOpenLibrary={() => setPickerFor(i)}
              onSaveQuestionToLibrary={(q) => { setPendingSave(q); setPickerFor(i); }}
              onChange={(next) => setSection(i, next)}
              onRemove={() => removeSection(i)}
              onMove={(dir) => moveSection(i, dir)}
              onDuplicate={() => duplicateSection(i)}
              onContinuar={() => continuarSection(i)}
              onQuestionDragStart={(qi) => { dragSource.current = { s: i, q: qi }; }}
              onQuestionDrop={(toQ) => moveQuestionTo(i, toQ)}
              justMovedId={justMovedId}
              isFirst={i === 0}
              isLast={i === briefing.sections.length - 1}
            />
            );
          })}

          {pickerFor !== null && (
            <QuestionLibraryPicker
              items={library}
              sectionOptions={briefing.sections.map((s, i) => {
                const ci = contInfo[i];
                const name = s.title || (s.kind === "ambiente" ? "Ambiente" : "Informações");
                return ci?.isCont ? `↳ ${name} · parte ${ci.part}` : `${i + 1}. ${name}`;
              })}
              defaultTarget={Math.max(0, Math.min(pickerFor, briefing.sections.length - 1))}
              pendingSave={pendingSave}
              onInsert={(q, target) => insertFromLibrary(target, q)}
              onSaveNew={saveNewToLibrary}
              onRename={async (id, label) => { await api.renameLibraryQuestion(id, label); await refreshLibrary(); }}
              onDelete={async (id) => { await api.deleteLibraryQuestion(id); await refreshLibrary(); }}
              onClose={() => { setPickerFor(null); setPendingSave(null); }}
            />
          )}

          <BackToTop />

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
          </div>{/* fim da coluna principal (editorGrid) */}

          {/* RAIL DIREITO — Meu apoio (checklist de ambientes + bloco de notas) */}
          <aside className={styles.editorRail}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className={styles.railTitle} style={{ margin: 0 }}>📌 Meu apoio</div>
              <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setApoioOpen((v) => !v)}>{apoioOpen ? "Recolher" : "Abrir"}</button>
            </div>
            {apoioOpen && (
              <>
                <div className={styles.railTitle} style={{ marginBottom: 6 }}>Checklist de ambientes</div>
                {ambienteList.length === 0 ? (
                  <p className={styles.pageHint} style={{ margin: "0 0 8px" }}>Sem ambientes ainda.</p>
                ) : ambienteList.map(({ s }) => (
                  <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 2px", fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={doneSet.has(s.id)} onChange={() => toggleDone(s.id)} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || "Ambiente"}</span>
                  </label>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 6 }}>
                  <div className={styles.railTitle} style={{ margin: 0 }}>Bloco de notas</div>
                  <button type="button" className={styles.btn} style={{ fontSize: 10 }} onClick={() => setNotes("")} disabled={!notes}>Limpar</button>
                </div>
                <textarea className={styles.textarea} rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações rápidas, lembretes, observações…" />
                <div className={styles.railTitle} style={{ marginTop: 14, marginBottom: 6 }}>Dicas rápidas</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                  <li>Salva sozinho enquanto você preenche.</li>
                  <li>Use a prévia para ver como o cliente verá.</li>
                  <li>Marque os ambientes prontos no checklist.</li>
                </ul>
              </>
            )}
          </aside>
        </div>{/* fim do editorWorkspace */}
       </>
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


      {/* Painel de pré-visualização ao vivo (sobrepõe o conteúdo, mas deixa o
          rail direito "Meu apoio" visível — afastado da borda). */}
      {showPreview && (
        <div
          style={{
            position: "fixed", top: 132, right: 324, zIndex: 55,
            width: "min(40vw, 600px)", height: "calc(100vh - 148px)",
            background: adminTheme === "dark" ? "#0a0a0a" : "#ffffff", border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
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
          <div ref={previewScrollRef} style={{ flex: 1, overflow: "auto" }}>
            {/* zoom encolhe o documento p/ caber no painel (mantém a rolagem correta) */}
            <div style={{ zoom: 0.64 }}>
              <BriefingView briefing={briefing} preview forceTheme={adminTheme} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

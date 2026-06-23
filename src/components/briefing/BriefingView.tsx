import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { Briefing, BriefingSection, BriefingQuestion } from "./types";
import { getProposalByNumber } from "../proposal/proposalsRegistry";
import styles from "./BriefingView.module.css";

// Modo impressão: desliga zoom/animações e troca controles por texto fixo.
const PrintContext = createContext(false);

// ── Ícones inline ─────────────────────────────────────────────
const IconDownload = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconImage = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconGrid = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCopy = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </svg>
);
const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5c3 3.2 3 16 0 19M12 2.5c-3 3.2-3 16 0 19" />
  </svg>
);
const IconTikTok = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z" />
  </svg>
);
const IconPinterest = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
const IconArrowUp = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
    <path d="M5 12.5l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// estrela da página BIO (glifo ✦)
const STAR = "✦";
// separador interno das respostas de múltipla escolha (checklist)
const MULTI_SEP = ", ";

// divisor com estrela no meio (igual ao mockup)
const StarDivider = () => (
  <div className={styles.starDivider} aria-hidden>
    <span className={styles.starDividerLine} />
    <span className={styles.starDividerIcon}>{STAR}</span>
    <span className={styles.starDividerLine} />
  </div>
);

// botão "copiar" (área de transferência)
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button type="button" className={styles.copyBtn} onClick={copy}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

type Answers = Record<string, string>;
type Refs = Record<string, string>;

interface Props {
  briefing: Briefing;
}

const isRequired = (q: BriefingQuestion) => q.required !== false;
const isAnswered = (q: BriefingQuestion, answers: Answers) =>
  (answers[q.id] ?? "").trim().length > 0;

// ── Pergunta individual ───────────────────────────────────────
function QuestionItem({
  question,
  index,
  sectionKind,
  answer,
  onAnswer,
  refImage,
  onPickRef,
  onRemoveRef,
  pending,
  registerRef,
  contact,
  studioEmail,
}: {
  question: BriefingQuestion;
  index: number;
  sectionKind: "info" | "ambiente";
  answer: string;
  onAnswer: (value: string) => void;
  refImage?: string;
  onPickRef: (file: File) => void;
  onRemoveRef: () => void;
  pending: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  contact: Briefing["contact"];
  studioEmail?: string;
}) {
  const printing = useContext(PrintContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const type = question.type ?? "longtext";
  const allowReference = question.allowReference ?? sectionKind === "ambiente";
  const required = isRequired(question);
  const wantsTemplateAttach = type === "radio" && answer.startsWith("Anexar");
  const placeholder = question.hint
    ? `+ ${question.hint}`
    : "Escreva sua resposta aqui…";

  const attachInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*,.pdf,.dwg,.skp,.zip"
      className={styles.refHidden}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onPickRef(file);
        e.target.value = "";
      }}
    />
  );

  const email = studioEmail ?? "IsaPaulinoStudio@gmail.com";
  const waNumber = `https://wa.me/+${contact.whatsapp}`;

  const renderControl = () => {
    if (printing) {
      return <div className={styles.answerPrint}>{answer || " "}</div>;
    }
    switch (type) {
      case "text":
        return (
          <input
            type="text"
            className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder={placeholder}
            aria-invalid={pending}
          />
        );
      case "radio":
        return (
          <>
            <div className={styles.options}>
              {(question.options ?? []).map((opt) => {
                const sel = answer === opt;
                const attach = opt.startsWith("Anexar");
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.optionBtn} ${sel ? styles.optionBtnSel : ""}`}
                    onClick={() => onAnswer(opt)}
                  >
                    {attach && <IconImage />}
                    {opt}
                  </button>
                );
              })}
            </div>
            {wantsTemplateAttach &&
              (refImage ? (
                <span className={styles.refPreview}>
                  <img src={refImage} alt="Template anexado" className={styles.refImg} />
                  <button type="button" className={styles.refRemove} onClick={onRemoveRef} aria-label="Remover anexo">
                    ×
                  </button>
                </span>
              ) : (
                <>
                  <button type="button" className={styles.refBtn} onClick={() => fileRef.current?.click()}>
                    <IconImage /> Anexar arquivo do template
                  </button>
                  {attachInput}
                </>
              ))}
          </>
        );
      case "checklist": {
        const selected = answer ? answer.split(MULTI_SEP) : [];
        const toggle = (opt: string) => {
          const set = new Set(selected);
          if (set.has(opt)) set.delete(opt);
          else set.add(opt);
          const next = (question.options ?? []).filter((o) => set.has(o));
          onAnswer(next.join(MULTI_SEP));
        };
        return (
          <div className={styles.checklist}>
            <div className={styles.checklistHead}>
              <span className={styles.plus}>+</span> {question.placeholder ?? "selecione"}{" "}
              <span className={styles.checklistHint}>(múltipla escolha)</span>
            </div>
            {(question.options ?? []).map((opt) => {
              const sel = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.checklistRow} ${sel ? styles.checklistRowSel : ""}`}
                  onClick={() => toggle(opt)}
                >
                  <span className={styles.checklistMark}>
                    {sel ? <IconCheck /> : "–"}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        );
      }
      case "maquete":
        return (
          <>
            <div className={styles.maqueteCards}>
              <div className={styles.maqueteCard}>
                <span className={styles.maqueteIcon}>
                  <IconMail />
                </span>
                <span className={styles.maqueteCardTitle}>E-MAIL</span>
                <span className={styles.maqueteCardText}>Envie seus arquivos por e-mail.</span>
                <a href={`mailto:${email}`} className={styles.maqueteBtn}>
                  ENVIAR E-MAIL
                </a>
                <span className={styles.maqueteDivider} />
                <div className={styles.maqueteField}>
                  <span className={styles.maqueteFieldLabel}>E-MAIL PARA ENVIO</span>
                  <div className={styles.maqueteFieldRow}>
                    <a href={`mailto:${email}`} className={styles.maqueteFieldValue}>
                      {email}
                    </a>
                    {!printing && <CopyButton value={email} />}
                  </div>
                </div>
              </div>
              <div className={styles.maqueteCard}>
                <span className={styles.maqueteIcon}>
                  <IconWhatsApp />
                </span>
                <span className={styles.maqueteCardTitle}>WHATSAPP</span>
                <span className={styles.maqueteCardText}>Envie seus arquivos via whatsApp</span>
                <a href={waNumber} target="_blank" rel="noopener noreferrer" className={styles.maqueteBtn}>
                  ENVIAR MENSAGEM
                </a>
                <span className={styles.maqueteDivider} />
                <div className={styles.maqueteField}>
                  <span className={styles.maqueteFieldLabel}>LINK PARA CONTATO</span>
                  <div className={styles.maqueteFieldRow}>
                    <a href={waNumber} target="_blank" rel="noopener noreferrer" className={styles.maqueteFieldValue}>
                      {waNumber}
                    </a>
                    {!printing && <CopyButton value={waNumber} />}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.options}>
              {(question.options ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.optionBtn} ${answer === opt ? styles.optionBtnSel : ""}`}
                  onClick={() => onAnswer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        );
      default: // longtext
        return (
          <textarea
            className={`${styles.answer} ${pending ? styles.answerPending : ""}`}
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder={placeholder}
            aria-invalid={pending}
          />
        );
    }
  };

  return (
    <div ref={registerRef} className={`${styles.qItem} ${pending ? styles.qItemPending : ""}`}>
      <div className={styles.qHead}>
        <span className={styles.qNum}>{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.qText}>
          {question.text}
          {required && <span className={styles.reqMark}>*</span>}
        </span>
      </div>

      {renderControl()}

      {question.note && <p className={styles.qNote}>{question.note}</p>}

      {pending && !printing && (
        <span className={styles.pendingMsg}>Esta pergunta é obrigatória.</span>
      )}

      {(question.quickFills?.length || allowReference) && !printing && (
        <div className={styles.refRow}>
          {allowReference &&
            (refImage ? (
              <span className={styles.refPreview}>
                <img src={refImage} alt="Referência anexada" className={styles.refImg} />
                <button type="button" className={styles.refRemove} onClick={onRemoveRef} aria-label="Remover referência">
                  ×
                </button>
              </span>
            ) : (
              <>
                <button type="button" className={styles.refBtn} onClick={() => fileRef.current?.click()}>
                  <span className={styles.plus}>+</span> ANEXAR REFERÊNCIA
                </button>
                {attachInput}
              </>
            ))}
          {question.quickFills?.map((qf) => (
            <button
              key={qf}
              type="button"
              className={`${styles.quickFill} ${answer === qf ? styles.quickFillSel : ""}`}
              onClick={() => onAnswer(answer === qf ? "" : qf)}
            >
              <IconGrid /> {qf}
            </button>
          ))}
        </div>
      )}

      {printing && refImage && (
        <span className={styles.refPreview}>
          <img src={refImage} alt="Referência anexada" className={styles.refImg} />
        </span>
      )}
    </div>
  );
}

// ── Imagem com pinos + zoom no hover (desktop) ────────────────
function SectionFigure({ section }: { section: BriefingSection }) {
  const printing = useContext(PrintContext);
  const [zoom, setZoom] = useState<{ on: boolean; x: number; y: number }>({
    on: false,
    x: 50,
    y: 50,
  });
  if (!section.image) return null;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (printing) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({
      on: true,
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };
  const innerStyle = zoom.on
    ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
    : undefined;

  return (
    <figure className={styles.figure}>
      <div
        className={styles.figureViewport}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
      >
        <div className={styles.figureInner} style={innerStyle}>
          <img src={section.image} alt={section.title} className={styles.image} />
          {section.questions.map((q, i) =>
            q.pin ? (
              <span
                key={q.id}
                className={styles.pin}
                style={{ left: `${q.pin.x}%`, top: `${q.pin.y}%` }}
              >
                <span className={styles.pinDot}>{i + 1}</span>
                {q.pin.label && <span className={styles.pinLabel}>{q.pin.label}</span>}
              </span>
            ) : null
          )}
        </div>
      </div>
      <figcaption className={styles.figureHint}>
        <span className={styles.figureHintDesktop}>Passe o mouse sobre a imagem para ampliar.</span>
        <span className={styles.figureHintMobile}>Toque na imagem para ampliar.</span>
      </figcaption>
    </figure>
  );
}

export default function BriefingView({ briefing: b }: Props) {
  const linked = getProposalByNumber(b.proposalNumber);
  const clientName = linked?.client ?? b.client ?? "—";
  const projectTitle = linked?.serviceTitle ?? b.serviceTitle ?? b.title;
  const projectTags = linked?.serviceTags ?? [];
  const displayDate = linked?.date ?? b.date ?? "";
  const contact = b.contact;
  const storageKey = `briefing:${b.number}`;

  // Quebra o título do hero deixando a última palavra na linha de baixo
  // (ex.: "BRIEFING DE DETALHAMENTO" → "BRIEFING DE" / "DETALHAMENTO").
  const titleWords = b.title.split(" ");
  const titleTail = titleWords.pop() ?? "";
  const titleHead = titleWords.join(" ");

  // ── Respostas — persistidas em localStorage ──
  const [answers, setAnswers] = useState<Answers>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Answers) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* indisponível — ignora */
    }
  }, [answers, storageKey]);

  // ── Envio — contabilizado localmente (sem backend ainda, ver guia) ──
  const submittedKey = `${storageKey}:submitted`;
  const [submittedAt, setSubmittedAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(submittedKey);
    } catch {
      return null;
    }
  });

  // ── Imagens de referência — só em memória ──
  const [refs, setRefs] = useState<Refs>({});
  const refsRef = useRef(refs);
  refsRef.current = refs;
  useEffect(() => {
    return () => {
      Object.values(refsRef.current).forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // ── Pendências ──
  const [pending, setPending] = useState<Set<string>>(new Set());
  const removeFromSet = (set: Set<string>, id: string) => {
    const n = new Set(set);
    n.delete(id);
    return n;
  };

  const setAnswer = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setPending((prev) => (prev.has(qid) ? removeFromSet(prev, qid) : prev));
  };
  const pickRef = (qid: string, file: File) => {
    const url = URL.createObjectURL(file);
    setRefs((prev) => {
      const old = prev[qid];
      if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
      return { ...prev, [qid]: url };
    });
  };
  const removeRef = (qid: string) =>
    setRefs((prev) => {
      const old = prev[qid];
      if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
      const next = { ...prev };
      delete next[qid];
      return next;
    });

  const questionEls = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Progresso por seção ──
  const progress = useMemo(() => {
    const map: Record<string, { total: number; done: number; complete: boolean }> = {};
    b.sections.forEach((s) => {
      const req = s.questions.filter(isRequired);
      const done = req.filter((q) => isAnswered(q, answers)).length;
      map[s.id] = { total: req.length, done, complete: req.length > 0 && done === req.length };
    });
    return map;
  }, [b.sections, answers]);
  const totalReq = Object.values(progress).reduce((s, p) => s + p.total, 0);
  const totalDone = Object.values(progress).reduce((s, p) => s + p.done, 0);

  // ── Scroll-spy (timeline = só seções, sem "Capa") ──
  const spyEls = useRef<Record<string, HTMLElement | null>>({});
  const [activeId, setActiveId] = useState(b.sections[0]?.id ?? "");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, c) => c.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-spy");
        if (id) setActiveId(id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    Object.values(spyEls.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [b.sections]);
  const activeIdx = Math.max(0, b.sections.findIndex((s) => s.id === activeId));

  const goTo = (id: string) =>
    spyEls.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Voltar ao topo ──
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ── PDF ──
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);
  const exportPdf = () => setPrinting(true);

  // ── Validação ao enviar ──
  const validate = useCallback((): string[] => {
    const miss: string[] = [];
    b.sections.forEach((s) =>
      s.questions.forEach((q) => {
        if (isRequired(q) && !isAnswered(q, answers)) miss.push(q.id);
      })
    );
    return miss;
  }, [b.sections, answers]);

  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    `Olá, Isabela! Acabei de concluir e enviar o briefing da proposta Nº ${b.number}.`
  )}`;

  const handleSubmit = () => {
    const miss = validate();
    if (miss.length > 0) {
      setPending(new Set(miss));
      questionEls.current[miss[0]]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPending(new Set());
    const now = new Date().toISOString();
    setSubmittedAt(now);
    try {
      window.localStorage.setItem(submittedKey, now);
    } catch {
      /* indisponível — ignora */
    }
    window.open(waLink, "_blank", "noopener,noreferrer");
  };

  const missingCount = pending.size;

  const renderQuestion = (section: BriefingSection, q: BriefingQuestion, i: number) => (
    <QuestionItem
      key={q.id}
      question={q}
      index={i}
      sectionKind={section.kind}
      answer={answers[q.id] ?? ""}
      onAnswer={(v) => setAnswer(q.id, v)}
      refImage={refs[q.id]}
      onPickRef={(file) => pickRef(q.id, file)}
      onRemoveRef={() => removeRef(q.id)}
      pending={pending.has(q.id)}
      registerRef={(el) => {
        questionEls.current[q.id] = el;
      }}
      contact={contact}
      studioEmail={b.studioEmail}
    />
  );

  return (
    <PrintContext.Provider value={printing}>
      <div className={styles.page}>
        <div className={styles.ambient} aria-hidden />

        {/* redes sociais fixas (topo-direito, desktop) — 2x2 */}
        <div className={styles.socialFixed}>
          {contact.instagram && (
            <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="Instagram">
              <IconInstagram />
            </a>
          )}
          <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="Site">
            <IconGlobe />
          </a>
          {contact.tiktok && (
            <a href={`https://tiktok.com/@${contact.tiktok}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="TikTok">
              <IconTikTok />
            </a>
          )}
          {contact.pinterest && (
            <a href={`https://pinterest.com/${contact.pinterest}`} target="_blank" rel="noopener noreferrer" className={styles.socialFixedBtn} aria-label="Pinterest">
              <IconPinterest />
            </a>
          )}
        </div>

        {/* timeline lateral (desktop) — ambientes, acende por scroll */}
        <nav className={styles.timeline} aria-label="Progresso do briefing">
          <span className={styles.timelineStep}>
            ETAPA {String(activeIdx + 1).padStart(2, "0")}/
            {String(b.sections.length).padStart(2, "0")}
          </span>
          <span className={styles.timelineEyebrow}>BRIEFING POR AMBIENTE</span>
          <div className={styles.timelineDivider} aria-hidden>
            <span className={styles.timelineDividerLine} />
            <span className={styles.timelineDividerStar}>{STAR}</span>
            <span className={styles.timelineDividerLine} />
          </div>
          <ul className={styles.timelineList}>
            {b.sections.map((section, i) => {
              const complete = progress[section.id]?.complete ?? false;
              const reached = i <= activeIdx;
              const isActive = i === activeIdx;
              return (
                <li key={section.id} className={styles.timelineItem}>
                  <button type="button" className={styles.timelineBtn} onClick={() => goTo(section.id)}>
                    <span
                      className={`${styles.timelineDot} ${
                        complete
                          ? styles.timelineDotDone
                          : reached
                          ? styles.timelineDotLit
                          : ""
                      } ${isActive ? styles.timelineDotActive : ""}`}
                    >
                      {complete && <IconCheck />}
                    </span>
                    <span className={`${styles.timelineLabel} ${isActive ? styles.timelineLabelActive : ""}`}>
                      {section.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={styles.timelineMeta}>
            {totalDone}/{totalReq} respondidas
          </div>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroTopbar}>
            <img src="/assets/logo-parasite.webp" alt="Isabela Paulino Studio" className={styles.heroLogo} />
            <div className={styles.heroActions}>
              <span className={styles.autosave}>
                <span className={styles.autosaveDot} /> Salvamento automático
              </span>
              <button type="button" onClick={exportPdf} className={styles.pdfButton} aria-label="Exportar briefing em PDF">
                <IconDownload />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          <div className={styles.heroBody}>
            <span className={styles.eyebrow}>BRIEFING · Nº {b.number}</span>
            <h1 className={styles.heroTitle}>
              {titleHead && (
                <>
                  {titleHead}
                  <br />
                </>
              )}
              {titleTail}
            </h1>
            {projectTags.length > 0 && (
              <div className={styles.heroTags}>
                {projectTags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.heroMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Cliente</span>
                <span className={styles.metaValue}>{clientName}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Projeto</span>
                <span className={styles.metaValue}>{projectTitle}</span>
              </div>
              {displayDate && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Data</span>
                  <span className={styles.metaValue}>{displayDate}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={styles.container}>
          {b.sections.map((section) => {
            const lines = section.titleLines ?? [section.title];
            return (
              <div key={section.id}>
                <StarDivider />
                <section
                  data-spy={section.id}
                  ref={(el) => {
                    spyEls.current[section.id] = el;
                  }}
                  className={`${styles.section} ${
                    section.kind === "ambiente" ? styles.sectionAmbiente : ""
                  }`}
                >
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>
                      <span className={styles.sectionStar}>{STAR}</span>
                      <span className={styles.sectionTitleText}>
                        {lines.map((line, li) => (
                          <span
                            key={li}
                            className={li === 0 ? styles.titleLine : styles.titleLineMuted}
                          >
                            {line}
                          </span>
                        ))}
                      </span>
                    </h2>
                    {section.intro && <p className={styles.sectionIntro}>{section.intro}</p>}
                  </div>

                  {/* imagem no topo (full-width) + perguntas abaixo — igual ao PDF */}
                  {section.kind === "ambiente" && <SectionFigure section={section} />}
                  <div className={styles.questionsWide}>
                    {section.questions.map((q, i) => renderQuestion(section, q, i))}
                  </div>
                </section>
              </div>
            );
          })}

          <div className={styles.ctaWrap}>
            <p className={styles.ctaText}>
              Revise suas respostas e conclua. Você pode exportar o briefing em PDF a
              qualquer momento; ao enviar, conferimos se nada ficou pendente.
            </p>
            {missingCount > 0 && (
              <p className={styles.ctaAlert}>
                {missingCount === 1
                  ? "1 pergunta obrigatória está pendente — ela foi destacada em vermelho acima."
                  : `${missingCount} perguntas obrigatórias estão pendentes — destacadas em vermelho acima.`}
              </p>
            )}
            {submittedAt && (
              <p className={styles.ctaSent}>
                <IconCheck /> Envio registrado em{" "}
                {new Date(submittedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Pode reenviar pelo WhatsApp sempre que precisar.
              </p>
            )}
            <div className={styles.ctaButtons}>
              <button type="button" onClick={exportPdf} className={styles.pdfButtonCta}>
                <IconDownload />
                <span>Exportar PDF</span>
              </button>
              <button type="button" onClick={handleSubmit} className={styles.sendBtn}>
                <IconWhatsApp />
                <span>Enviar briefing</span>
              </button>
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          <img src="/assets/logo-parasite.webp" alt="Isabela Paulino Studio" className={styles.footerLogo} />
          <span className={styles.footerNote}>
            ISABELA PAULINO STUDIO · BRIEFING · PROPOSTA Nº {b.proposalNumber}
            {displayDate ? ` · ${displayDate}` : ""}
          </span>
        </footer>

        {/* stack flutuante: WhatsApp acima do botão Topo (igual proposta) */}
        <div className={styles.floatStack}>
          <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="Fale conosco pelo WhatsApp" className={styles.waFloat}>
            <img src="/assets/icons/whatsapp.webp" alt="WhatsApp" className={styles.waFloatIcon} />
          </a>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Voltar ao topo"
            className={`${styles.backToTop} ${showTop ? styles.backToTopVisible : ""}`}
          >
            <IconArrowUp />
            <span>Topo</span>
          </button>
        </div>
      </div>
    </PrintContext.Provider>
  );
}

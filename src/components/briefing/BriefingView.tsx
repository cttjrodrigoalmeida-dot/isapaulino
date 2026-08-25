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
import { DEFAULT_QUICKFILLS } from "./types";

// Prefixo da resposta quando o cliente escolhe "Outros" e digita um valor livre.
const OUTROS_PREFIX = "Outros: ";
// Separador interno das respostas de MÚLTIPLA ESCOLHA (várias opções marcadas).
// Newline é seguro (rótulos de opção não têm quebra de linha) e some quando
// exibido inline no PDF (ver `printAnswer`).
const MULTI_SEP = "\n";
const splitMulti = (v: string) => (v ? v.split(MULTI_SEP).filter(Boolean) : []);
const joinMulti = (list: string[]) => list.join(MULTI_SEP);
// Texto “achatado” de uma resposta para o modo impressão/PDF.
const printAnswer = (v: string) => splitMulti(v).join(" · ") || " ";
// Normaliza texto para a busca (sem acento, minúsculo) — "Suíte" acha "suite".
const normSearch = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
import { getProposalByNumber } from "../proposal/proposalsRegistry";
import CustomCursor from "../CustomCursor";
import FadeIn from "../FadeIn";
import SectionFigure from "./SectionFigure";
import { exportElementToPdf, waitForRenderReady } from "../../lib/pdfExport";
import styles from "./BriefingView.module.css";

// Modo impressão: desliga zoom/animações e troca controles por texto fixo.
const PrintContext = createContext(false);
// Modo bloqueado (admin fechou o briefing): cliente só VISUALIZA — controles
// viram texto fixo, sem anexar/enviar. Mantém o visual normal (não é impressão).
const FrozenContext = createContext(false);

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
const IconSun = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" strokeLinecap="round" strokeLinejoin="round" />
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
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
    <rect x="4" y="10.5" width="16" height="10" rx="2.2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
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
const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
  </svg>
);

// estrela da página BIO (glifo ✦)
const STAR = "✦";

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
// Cada pergunta pode ter VÁRIOS anexos (imagens e/ou PDFs) + links.
type RefItem = {
  /** URL de exibição: blob: (preview local), /api/files/… (já no R2) ou link externo. */
  url: string;
  /** nome amigável do arquivo (para PDFs/arquivos e para o alt). */
  name: string;
  /** imagem → mostra miniatura; senão (PDF/arquivo/link) → chip. */
  isImage: boolean;
  /** vídeo → mostra player inline. */
  isVideo?: boolean;
  /** link externo (Drive, Pinterest…) — não sobe pro R2. */
  isLink: boolean;
  /** arquivo local ainda por enviar ao R2. */
  file?: File;
};
type Refs = Record<string, RefItem[]>;

const IMG_EXT_RE = /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i;
// Deriva um RefItem a partir de uma URL já persistida (sem File).
function refItemFromUrl(url: string): RefItem {
  const isLink = !url.startsWith("blob:") && !url.startsWith("/api/files/");
  const name = decodeURIComponent(url.split("/").pop() || url).replace(/^https?:\/\//, "");
  return { url, name, isImage: IMG_EXT_RE.test(url), isVideo: VIDEO_EXT_RE.test(url), isLink };
}
// Referência vazia estável (evita re-render por identidade de array nova).
const EMPTY_REFS: RefItem[] = [];
// Normaliza o formato guardado (string legada OU array) para RefItem[].
function refsFromStored(v: unknown): RefItem[] {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr.filter((u): u is string => typeof u === "string" && !!u).map(refItemFromUrl);
}

interface Props {
  briefing: Briefing;
  /** modo prévia (dentro do editor): sem cursor custom nem "chrome" fixo. */
  preview?: boolean;
  /** força o tema (usado na prévia do editor p/ acompanhar o tema do painel). */
  forceTheme?: "light" | "dark";
  /** briefing bloqueado pelo admin: cliente só visualiza (não edita/reenvia). */
  locked?: boolean;
}

const isRequired = (q: BriefingQuestion) => q.required !== false;
const isAnswered = (q: BriefingQuestion, answers: Answers) =>
  (answers[q.id] ?? "").trim().length > 0;
// uma pergunta fica bloqueada quando outra pergunta, com a resposta atual
// dentro de `alertOptions`, aponta pra ela via `locksQuestionIds` — ou via
// `locksAllOtherQuestions` (bloqueia tudo, exceto `lockExceptIds`).
const isLockedQuestion = (
  q: BriefingQuestion,
  allQuestions: BriefingQuestion[],
  answers: Answers
) =>
  allQuestions.some((other) => {
    if (other.id === q.id) return false;
    if (!(other.alertOptions ?? []).includes(answers[other.id] ?? "")) return false;
    if (other.locksAllOtherQuestions) {
      return !(other.lockExceptIds ?? []).includes(q.id);
    }
    return other.locksQuestionIds?.includes(q.id) ?? false;
  });

// ── Pergunta individual ───────────────────────────────────────
function QuestionItem({
  question,
  index,
  sectionKind,
  answer,
  onAnswer,
  refItems,
  onPickFiles,
  onPickLink,
  onRemoveRef,
  pending,
  locked,
  answered,
  flash,
  hasPin,
  onGoToPin,
  registerRef,
  contact,
  studioEmail,
  briefingNumber,
}: {
  question: BriefingQuestion;
  index: number;
  sectionKind: "info" | "ambiente";
  answer: string;
  onAnswer: (value: string) => void;
  refItems: RefItem[];
  onPickFiles: (files: File[]) => void;
  onPickLink: (url: string) => void;
  onRemoveRef: (index: number) => void;
  pending: boolean;
  locked: boolean;
  /** já respondida (tem valor) — ganha borda de destaque. */
  answered: boolean;
  /** destaque temporário quando o cliente clica no pino da imagem */
  flash?: boolean;
  /** esta pergunta tem um pino na imagem (ambiente) — habilita o clique inverso */
  hasPin?: boolean;
  /** rola até a imagem e destaca o pino desta pergunta */
  onGoToPin?: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
  contact: Briefing["contact"];
  studioEmail?: string;
  briefingNumber: string;
}) {
  const printing = useContext(PrintContext);
  const frozen = useContext(FrozenContext);
  // Só-leitura: controles viram texto fixo (impressão OU briefing bloqueado).
  const readOnly = printing || frozen;
  const fileRef = useRef<HTMLInputElement>(null);
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const hasRefs = refItems.length > 0;
  const type = question.type ?? "longtext";
  // Data: hoje (no fuso local, formato YYYY-MM-DD) é o mínimo E o padrão do campo.
  // Assim o cliente não consegue escolher datas passadas e já parte de hoje.
  const todayISO = new Date().toLocaleDateString("en-CA");
  useEffect(() => {
    if (type === "date" && !readOnly && !locked && !answer) onAnswer(todayISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, readOnly, locked, answer]);
  // "arquivo" = resposta é só anexo (sem caixa de texto) → sempre habilita anexar.
  const isFileOnly = type === "arquivo";
  const allowReference = isFileOnly || (question.allowReference ?? sectionKind === "ambiente");
  // Botões de resposta rápida: a lista da pergunta é a fonte da verdade (o admin
  // pode remover "À DEFINIR"/"NÃO SE APLICA" individualmente). Perguntas antigas
  // (sem a lista definida) caem no padrão. Maquete não tem quick-fills padrão.
  const quickFills =
    type === "maquete"
      ? (question.quickFills ?? [])
      : (question.quickFills ?? DEFAULT_QUICKFILLS);
  const required = isRequired(question);
  const wantsTemplateAttach = type === "radio" && answer.startsWith("Anexar");
  const hasAlertAnswer = (question.alertOptions ?? []).includes(answer);
  const placeholder = question.hint
    ? `+ ${question.hint}`
    : "Escreva sua resposta aqui…";

  const attachInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*,video/*,audio/*,.pdf,.gif,.dwg,.skp,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
      multiple
      className={styles.refHidden}
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) onPickFiles(files);
        e.target.value = "";
      }}
    />
  );

  // Galeria de anexos (imagens viram miniatura; PDFs/arquivos e links viram chip).
  // Em impressão OU briefing bloqueado os botões de remover somem.
  const refGallery = (
    <span className={styles.refGallery}>
      {refItems.map((it, i) =>
        it.isImage ? (
          <span key={i} className={styles.refPreview}>
            <img src={it.url} alt={it.name || "Referência anexada"} className={styles.refImg} />
            {!readOnly && (
              <button type="button" className={styles.refRemove} onClick={() => onRemoveRef(i)} aria-label="Remover anexo">
                ×
              </button>
            )}
          </span>
        ) : it.isVideo ? (
          <span key={i} className={styles.refPreview}>
            <video src={it.url} className={styles.refImg} controls preload="metadata" playsInline />
            {!readOnly && (
              <button type="button" className={styles.refRemove} onClick={() => onRemoveRef(i)} aria-label="Remover anexo">
                ×
              </button>
            )}
          </span>
        ) : (
          <span key={i} className={styles.refLinkChip}>
            <a href={it.url} target="_blank" rel="noopener noreferrer">
              {it.isLink ? "🔗" : "📄"} {it.name}
            </a>
            {!readOnly && (
              <button type="button" className={styles.refChipRemove} onClick={() => onRemoveRef(i)} aria-label="Remover anexo">
                ×
              </button>
            )}
          </span>
        )
      )}
    </span>
  );

  const email = studioEmail ?? "IsaPaulinoStudio@gmail.com";
  const waNumber = `https://wa.me/+${contact.whatsapp}`;
  // E-mail pré-endereçado p/ o cliente enviar o template (ele anexa o arquivo lá).
  const templateMailto = `mailto:${email}?subject=${encodeURIComponent(
    `Template do escritório — Briefing Nº ${briefingNumber}`
  )}&body=${encodeURIComponent(
    "Olá, Isabela! Segue em anexo o template padrão do meu escritório.\n\n(Não esqueça de anexar o arquivo antes de enviar.)"
  )}`;

  const renderControl = () => {
    // "arquivo": não há controle de texto — só a área de anexo (renderizada abaixo).
    // No modo só-leitura sem anexo, mostra um traço discreto.
    if (isFileOnly) {
      return readOnly && !hasRefs ? <div className={styles.answerPrint}>— sem arquivo</div> : null;
    }
    if (readOnly) {
      return <div className={styles.answerPrint}>{type === "multicheck" ? printAnswer(answer) : answer || " "}</div>;
    }
    if (locked) {
      return (
        <p className={`${styles.qNote} ${styles.qNoteAlert}`}>
          Disponível quando o projeto estiver totalmente definido.
        </p>
      );
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
      case "number":
        return (
          <input
            type="number"
            inputMode="decimal"
            className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder={question.hint ? `+ ${question.hint}` : "Digite um número…"}
            aria-invalid={pending}
            style={{ maxWidth: 240 }}
          />
        );
      case "date":
        return (
          <input
            type="date"
            min={todayISO}
            className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
            value={answer || todayISO}
            onChange={(e) => { const v = e.target.value; onAnswer(v && v < todayISO ? todayISO : v); }}
            aria-invalid={pending}
            style={{ maxWidth: 240 }}
          />
        );
      case "yesno": {
        const otherSel = !!question.allowOther && answer.startsWith(OUTROS_PREFIX);
        return (
          <>
            <div className={styles.options}>
              {["Sim", "Não"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.optionBtn} ${answer === opt ? styles.optionBtnSel : ""}`}
                  onClick={() => onAnswer(answer === opt ? "" : opt)}
                >
                  {opt}
                </button>
              ))}
              {question.allowOther && (
                <button
                  type="button"
                  className={`${styles.optionBtn} ${otherSel ? styles.optionBtnSel : ""}`}
                  onClick={() => onAnswer(otherSel ? "" : OUTROS_PREFIX)}
                >
                  Outros
                </button>
              )}
            </div>
            {otherSel && (
              <input
                type="text"
                className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
                value={answer.slice(OUTROS_PREFIX.length)}
                onChange={(e) => onAnswer(OUTROS_PREFIX + e.target.value)}
                placeholder={question.hint ? `+ ${question.hint}` : "Explique ou justifique…"}
                autoFocus
              />
            )}
          </>
        );
      }
      case "scale": {
        const max = question.scaleMax && question.scaleMax > 1 ? question.scaleMax : 5;
        return (
          <div className={styles.options}>
            {Array.from({ length: max }, (_, i) => String(i + 1)).map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.optionBtn} ${styles.scaleBtn} ${answer === n ? styles.optionBtnSel : ""}`}
                onClick={() => onAnswer(answer === n ? "" : n)}
              >
                {n}
              </button>
            ))}
          </div>
        );
      }
      case "radio": {
        const otherSel = !!question.allowOther && answer.startsWith(OUTROS_PREFIX);
        return (
          <>
            <div className={styles.options}>
              {(question.options ?? []).map((opt) => {
                const sel = answer === opt;
                const attach = opt.startsWith("Anexar");
                const isAlert = sel && hasAlertAnswer;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.optionBtn} ${attach ? styles.optionBtnDashed : ""} ${sel ? styles.optionBtnSel : ""} ${isAlert ? styles.optionBtnAlert : ""}`}
                    onClick={() => onAnswer(opt)}
                  >
                    {attach && <IconImage />}
                    {opt}
                  </button>
                );
              })}
              {question.allowOther && (
                <button
                  type="button"
                  className={`${styles.optionBtn} ${otherSel ? styles.optionBtnSel : ""}`}
                  onClick={() => onAnswer(otherSel ? "" : OUTROS_PREFIX)}
                >
                  Outros
                </button>
              )}
            </div>
            {otherSel && (
              <input
                type="text"
                className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
                value={answer.slice(OUTROS_PREFIX.length)}
                onChange={(e) => onAnswer(OUTROS_PREFIX + e.target.value)}
                placeholder={question.hint ? `+ ${question.hint}` : "Especifique…"}
                autoFocus
              />
            )}
            {wantsTemplateAttach &&
              (hasRefs ? (
                <>
                  {refGallery}
                  <button type="button" className={styles.refBtn} onClick={() => fileRef.current?.click()}>
                    <span className={styles.plus}>+</span> Anexar outro
                  </button>
                  {attachInput}
                </>
              ) : (
                <>
                  <div className={styles.templateAttach}>
                    <button type="button" className={styles.refBtn} onClick={() => setRefModalOpen(true)}>
                      <span className={styles.plus}>+</span> Colar link (Drive, WeTransfer…)
                    </button>
                    <a className={styles.refBtn} href={templateMailto}>
                      <IconMail /> Enviar por e-mail
                    </a>
                    <button type="button" className={styles.refBtn} onClick={() => fileRef.current?.click()}>
                      <IconImage /> Anexar arquivo
                    </button>
                  </div>
                  <p className={styles.templateHint}>
                    Dica: para arquivos maiores, prefira o link ou o e-mail — assim não pesa no sistema.
                  </p>
                  {attachInput}
                </>
              ))}
          </>
        );
      }
      case "checklist": {
        const otherSel = !!question.allowOther && answer.startsWith(OUTROS_PREFIX);
        return (
          <div className={styles.checklist}>
            <div className={styles.checklistHead}>
              <span className={styles.plus}>+</span> {question.placeholder ?? "selecione"}
            </div>
            {(question.options ?? []).map((opt) => {
              const sel = answer === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.checklistRow} ${sel ? styles.checklistRowSel : ""}`}
                  onClick={() => onAnswer(sel ? "" : opt)}
                >
                  <span className={styles.checklistMark}>
                    {sel ? <IconCheck /> : "–"}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
            {question.allowOther && (
              <button
                type="button"
                className={`${styles.checklistRow} ${otherSel ? styles.checklistRowSel : ""}`}
                onClick={() => onAnswer(otherSel ? "" : OUTROS_PREFIX)}
              >
                <span className={styles.checklistMark}>{otherSel ? <IconCheck /> : "–"}</span>
                <span>Outros</span>
              </button>
            )}
            {otherSel && (
              <input
                type="text"
                className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
                value={answer.slice(OUTROS_PREFIX.length)}
                onChange={(e) => onAnswer(OUTROS_PREFIX + e.target.value)}
                placeholder={question.hint ? `+ ${question.hint}` : "Especifique…"}
                autoFocus
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        );
      }
      case "select": {
        const opts = question.options ?? [];
        const otherSel = !!question.allowOther && answer.startsWith(OUTROS_PREFIX);
        const OTHER_VALUE = "__outros__";
        const selectValue = otherSel ? OTHER_VALUE : opts.includes(answer) ? answer : "";
        return (
          <>
            <select
              className={`${styles.select} ${selectValue === "" ? styles.selectEmpty : ""} ${pending ? styles.answerPending : ""}`}
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                onAnswer(v === OTHER_VALUE ? OUTROS_PREFIX : v);
              }}
              aria-invalid={pending}
            >
              <option value="">{question.placeholder ?? "selecione…"}</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              {question.allowOther && <option value={OTHER_VALUE}>Outros</option>}
            </select>
            {otherSel && (
              <input
                type="text"
                className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
                value={answer.slice(OUTROS_PREFIX.length)}
                onChange={(e) => onAnswer(OUTROS_PREFIX + e.target.value)}
                placeholder={question.hint ? `+ ${question.hint}` : "Especifique…"}
                autoFocus
                style={{ marginTop: 8 }}
              />
            )}
          </>
        );
      }
      case "multicheck": {
        const selected = splitMulti(answer);
        const otherToken = selected.find((v) => v.startsWith(OUTROS_PREFIX));
        const otherSel = !!question.allowOther && otherToken !== undefined;
        const toggle = (opt: string) => {
          const next = selected.includes(opt)
            ? selected.filter((v) => v !== opt)
            : [...selected, opt];
          onAnswer(joinMulti(next));
        };
        const toggleOther = () => {
          const next = otherSel
            ? selected.filter((v) => !v.startsWith(OUTROS_PREFIX))
            : [...selected, OUTROS_PREFIX];
          onAnswer(joinMulti(next));
        };
        const setOtherText = (text: string) => {
          const next = selected.map((v) => (v.startsWith(OUTROS_PREFIX) ? OUTROS_PREFIX + text : v));
          onAnswer(joinMulti(next));
        };
        return (
          <div className={styles.checklist}>
            <div className={styles.checklistHead}>
              <span className={styles.plus}>+</span> {question.placeholder ?? "marque quantas quiser"}
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
                  <span className={`${styles.checklistMark} ${styles.checklistMarkBox}`}>
                    {sel ? <IconCheck /> : ""}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
            {question.allowOther && (
              <button
                type="button"
                className={`${styles.checklistRow} ${otherSel ? styles.checklistRowSel : ""}`}
                onClick={toggleOther}
              >
                <span className={`${styles.checklistMark} ${styles.checklistMarkBox}`}>
                  {otherSel ? <IconCheck /> : ""}
                </span>
                <span>Outros</span>
              </button>
            )}
            {otherSel && (
              <input
                type="text"
                className={`${styles.answerInput} ${pending ? styles.answerPending : ""}`}
                value={(otherToken ?? OUTROS_PREFIX).slice(OUTROS_PREFIX.length)}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={question.hint ? `+ ${question.hint}` : "Especifique…"}
                autoFocus
                style={{ marginTop: 8 }}
              />
            )}
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
              {(question.options ?? []).map((opt) => {
                const attach = opt.startsWith("Anexar");
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.optionBtn} ${attach ? styles.optionBtnDashed : ""} ${answer === opt ? styles.optionBtnSel : ""}`}
                    onClick={() => onAnswer(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
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
    <div
      ref={registerRef}
      className={`${styles.qItem} ${index % 2 === 1 ? styles.qItemMirror : ""} ${
        pending ? styles.qItemPending : ""
      } ${answered && !pending ? styles.qItemAnswered : ""} ${flash ? styles.qItemFlash : ""}`}
    >
      <div
        className={`${styles.qHead} ${hasPin && !printing ? styles.qHeadToPin : ""}`}
        onClick={hasPin && !printing ? onGoToPin : undefined}
        role={hasPin && !printing ? "button" : undefined}
        title={hasPin && !printing ? "Ver este ponto na imagem" : undefined}
      >
        <span className={styles.qNum}>{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.qText}>
          {question.text}
          {required && !locked && <span className={styles.reqMark}>*</span>}
          {hasPin && !printing && <span className={styles.qPinHint} aria-hidden> ◉ ver na imagem</span>}
        </span>
      </div>

      {renderControl()}

      {question.note && (
        <p className={`${styles.qNote} ${hasAlertAnswer ? styles.qNoteAlert : ""}`}>
          {question.note}
        </p>
      )}

      {pending && !printing && (
        <span className={styles.pendingMsg}>Esta pergunta é obrigatória.</span>
      )}

      {(quickFills.length || allowReference) && !readOnly && !locked && (
        <div className={styles.refRow}>
          {allowReference && (
            <>
              {hasRefs && refGallery}
              <button type="button" className={styles.refBtn} onClick={() => setRefModalOpen(true)}>
                <span className={styles.plus}>+</span> {isFileOnly ? (hasRefs ? "ANEXAR OUTRO" : "ANEXAR ARQUIVO") : (hasRefs ? "ANEXAR OUTRA" : "ANEXAR REFERÊNCIA")}
              </button>
              {attachInput}
            </>
          )}
          {quickFills.map((qf) => (
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

      {readOnly && hasRefs && refGallery}

      {refModalOpen && (
        <div
          className={styles.refModalOverlay}
          onClick={() => setRefModalOpen(false)}
          role="presentation"
        >
          <div className={styles.refModal} onClick={(e) => e.stopPropagation()}>
            <span className={styles.refModalTitle}>Anexar referência</span>

            <button
              type="button"
              className={styles.refModalImgBtn}
              onClick={() => {
                setRefModalOpen(false);
                fileRef.current?.click();
              }}
            >
              <IconImage /> Anexar imagem ou PDF
            </button>
            <span className={styles.refModalNote}>Você pode anexar várias — imagens e PDFs.</span>

            <span className={styles.refModalDivider}>ou</span>

            <div className={styles.refModalField}>
              <input
                type="url"
                className={styles.refModalInput}
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="Cole o link da referência (ex.: Pinterest)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkValue.trim()) {
                    e.preventDefault();
                    onPickLink(normalizeLink(linkValue));
                    setLinkValue("");
                    setRefModalOpen(false);
                  }
                }}
              />
              <div className={styles.refModalActions}>
                <button
                  type="button"
                  className={styles.refModalCancel}
                  onClick={() => {
                    setLinkValue("");
                    setRefModalOpen(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.refModalConfirm}
                  disabled={!linkValue.trim()}
                  onClick={() => {
                    onPickLink(normalizeLink(linkValue));
                    setLinkValue("");
                    setRefModalOpen(false);
                  }}
                >
                  Adicionar link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Garante um protocolo no link colado (ex.: "pinterest.com" → "https://pinterest.com").
function normalizeLink(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// (a imagem com pinos vive em SectionFigure.tsx — compartilhada com o admin)

export default function BriefingView({ briefing: b, preview = false, forceTheme, locked: frozen = false }: Props) {
  const linked = getProposalByNumber(b.proposalNumber);
  const clientName = linked?.client ?? b.client ?? "—";
  const projectTitle = linked?.serviceTitle ?? b.serviceTitle ?? b.title;
  const projectTags = linked?.serviceTags ?? b.serviceTags ?? [];
  const displayDate = linked?.date ?? b.date ?? "";
  const contact = b.contact;
  const storageKey = `briefing:${b.number}`;

  // ── Tema da página do cliente (escuro por padrão), persistido no navegador.
  //    Na prévia do editor, `forceTheme` acompanha o tema do painel. ──
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (forceTheme) return forceTheme;
    try {
      const v = localStorage.getItem("ips_briefing_theme");
      if (v === "light" || v === "dark") return v;
    } catch {
      /* ignore */
    }
    return "dark";
  });
  useEffect(() => {
    if (forceTheme) { setTheme(forceTheme); return; } // prévia: segue o painel, não persiste
  }, [forceTheme]);
  useEffect(() => {
    if (forceTheme) return; // não sobrescreve o tema salvo do cliente durante a prévia
    try {
      localStorage.setItem("ips_briefing_theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme, forceTheme]);

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

  // Cliente logado (veio da Área do Cliente): pré-preenche com as respostas já
  // enviadas ao servidor, para permitir EDITAR de qualquer dispositivo.
  const [editingSubmitted, setEditingSubmitted] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/client/briefings", { credentials: "include" });
        if (!res.ok) return; // visitante público / sem sessão — fluxo normal
        const { briefings } = (await res.json()) as {
          briefings?: { number: string; responded: boolean; answers: Answers; refImages?: Record<string, unknown> }[];
        };
        const mine = (briefings ?? []).find((x) => String(x.number) === String(b.number));
        if (alive && mine?.responded && mine.answers && Object.keys(mine.answers).length > 0) {
          setAnswers(mine.answers);
          // Recarrega os anexos já enviados para não perdê-los ao reeditar/reenviar.
          if (mine.refImages && typeof mine.refImages === "object") {
            const seeded: Refs = {};
            for (const [qid, v] of Object.entries(mine.refImages)) {
              const list = refsFromStored(v);
              if (list.length) seeded[qid] = list;
            }
            if (Object.keys(seeded).length) setRefs(seeded);
          }
          setEditingSubmitted(true);
        }
      } catch { /* segue o fluxo público */ }
    })();
    return () => { alive = false; };
  }, [b.number]);

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

  // ── Anexos de referência — vários por pergunta (imagens/PDFs + links) ──
  // Preview local via blob: e o File original para subir ao R2 no envio.
  const [refs, setRefs] = useState<Refs>({});
  const refsRef = useRef(refs);
  refsRef.current = refs;
  useEffect(() => {
    return () => {
      Object.values(refsRef.current).forEach((list) =>
        list.forEach((it) => {
          if (it.url.startsWith("blob:")) URL.revokeObjectURL(it.url);
        })
      );
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
  const pickFiles = (qid: string, files: File[]) => {
    const items: RefItem[] = files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      isImage: file.type.startsWith("image/") || IMG_EXT_RE.test(file.name),
      isVideo: file.type.startsWith("video/") || VIDEO_EXT_RE.test(file.name),
      isLink: false,
      file,
    }));
    setRefs((prev) => ({ ...prev, [qid]: [...(prev[qid] ?? []), ...items] }));
  };
  const pickLink = (qid: string, link: string) => {
    const item: RefItem = { url: link, name: link.replace(/^https?:\/\//, ""), isImage: false, isLink: true };
    setRefs((prev) => ({ ...prev, [qid]: [...(prev[qid] ?? []), item] }));
  };
  const removeRef = (qid: string, index: number) => {
    setRefs((prev) => {
      const list = prev[qid] ?? [];
      const gone = list[index];
      if (gone?.url.startsWith("blob:")) URL.revokeObjectURL(gone.url);
      const nextList = list.filter((_, i) => i !== index);
      const next = { ...prev };
      if (nextList.length) next[qid] = nextList;
      else delete next[qid];
      return next;
    });
  };

  const questionEls = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Pino clicável: rola até a pergunta e dá um "flash" de destaque ──
  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!flashId) return;
    const id = window.setTimeout(() => setFlashId(null), 1700);
    return () => window.clearTimeout(id);
  }, [flashId]);
  const goToQuestion = useCallback((qid: string) => {
    questionEls.current[qid]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(qid);
  }, []);

  // ── Caminho inverso: clicar na pergunta rola até a imagem e destaca o pino ──
  const figureEls = useRef<Record<string, HTMLElement | null>>({});
  const [flashPinId, setFlashPinId] = useState<string | null>(null);
  const flashPinTimer = useRef<number | undefined>(undefined);
  const goToPin = useCallback((qid: string) => {
    const sec = b.sections.find((s) => s.kind === "ambiente" && s.questions.some((q) => q.id === qid && q.pin));
    if (!sec) return;
    figureEls.current[sec.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashPinId(null);
    window.clearTimeout(flashPinTimer.current);
    requestAnimationFrame(() => setFlashPinId(qid));
    flashPinTimer.current = window.setTimeout(() => setFlashPinId(null), 1800);
  }, [b.sections]);

  // ── Blocos de continuação: seção ambiente com o MESMO título da anterior
  //    (novo bloco de imagem do mesmo ambiente) ganha cabeçalho compacto e
  //    não repete a etapa na timeline. ──
  const normTitle = (s: string) => s.trim().toLowerCase();
  const isContinuation = useCallback(
    (i: number) => {
      const s = b.sections[i];
      const p = b.sections[i - 1];
      return (
        !!p && s.kind === "ambiente" && p.kind === "ambiente" && normTitle(s.title) === normTitle(p.title)
      );
    },
    [b.sections]
  );

  // todas as perguntas (achatado), usado pra resolver bloqueios entre perguntas
  const allQuestions = useMemo(
    () => b.sections.flatMap((s) => s.questions),
    [b.sections]
  );

  // "arquivo" (resposta só-anexo) conta como respondida quando há anexo — ou um
  // preenchimento rápido ("À definir"). As demais seguem pela resposta em texto.
  const qAnswered = useCallback(
    (q: BriefingQuestion) =>
      q.type === "arquivo"
        ? (refs[q.id]?.length ?? 0) > 0 || isAnswered(q, answers)
        : isAnswered(q, answers),
    [refs, answers]
  );

  // ── Progresso por seção (pergunta bloqueada não conta como obrigatória) ──
  const progress = useMemo(() => {
    const map: Record<string, { total: number; done: number; complete: boolean }> = {};
    b.sections.forEach((s) => {
      const req = s.questions.filter(
        (q) => isRequired(q) && !isLockedQuestion(q, allQuestions, answers)
      );
      const done = req.filter(qAnswered).length;
      map[s.id] = { total: req.length, done, complete: req.length > 0 && done === req.length };
    });
    return map;
  }, [b.sections, answers, allQuestions, qAnswered]);
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
  // Timeline mostra só o primeiro bloco de cada ambiente (continuações não
  // viram etapa); a etapa ativa de uma continuação é a do bloco inicial.
  const navSections = useMemo(
    () => b.sections.filter((_, i) => !isContinuation(i)),
    [b.sections, isContinuation]
  );
  const activeIdx = useMemo(() => {
    let raw = b.sections.findIndex((s) => s.id === activeId);
    if (raw < 0) return 0;
    while (raw > 0 && isContinuation(raw)) raw--;
    const idx = navSections.findIndex((s) => s.id === b.sections[raw].id);
    return Math.max(0, idx);
  }, [b.sections, navSections, activeId, isContinuation]);

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

  // ── PDF (1 clique baixa; sem abrir a tela de impressão) ──
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    setPrinting(true);
    await waitForRenderReady();
    try {
      if (pageRef.current) {
        const bg = theme === "light" ? "#f3f4f6" : "#0a0a0a";
        try {
          await exportElementToPdf(pageRef.current, `Briefing-${b.number}`, { background: bg });
        } catch {
          // Falhou (ex.: imagem externa "tainta" o canvas) → tenta de novo SEM as
          // imagens, em vez de abrir a tela de impressão numa nova janela.
          await exportElementToPdf(pageRef.current, `Briefing-${b.number}`, { background: bg, skipImages: true });
        }
      }
    } catch {
      /* desiste em silêncio — nunca abre nova janela */
    } finally {
      setPrinting(false);
      setExporting(false);
    }
  };

  // Download em 1 clique a partir da lista: /briefing/<n>?pdf=1 baixa automaticamente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("pdf") !== "1") return;
    const t = setTimeout(() => { exportPdf(); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validação ao enviar ──
  const validate = useCallback((): string[] => {
    const miss: string[] = [];
    b.sections.forEach((s) =>
      s.questions.forEach((q) => {
        if (
          isRequired(q) &&
          !isLockedQuestion(q, allQuestions, answers) &&
          !qAnswered(q)
        )
          miss.push(q.id);
      })
    );
    return miss;
  }, [b.sections, answers, allQuestions, qAnswered]);

  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
    `Olá, Isabela! Acabei de concluir e enviar o briefing da proposta Nº ${b.number}.`
  )}`;

  const handleSubmit = () => {
    if (frozen) return; // briefing bloqueado — cliente só visualiza
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
    // Abre o WhatsApp já (gesto do usuário, evita bloqueio de pop-up);
    // o envio ao servidor — incluindo upload dos anexos — segue em background.
    window.open(waLink, "_blank", "noopener,noreferrer");
    void sendResponses();
  };

  // Sobe os anexos pro R2 e envia as respostas + URLs (best-effort).
  const sendResponses = async () => {
    const refImages: Record<string, string[]> = {};
    const current = refsRef.current;
    // Cada pergunta pode ter vários anexos — sobe os arquivos preservando a ordem.
    await Promise.all(
      Object.entries(current).map(async ([qid, list]) => {
        const urls = await Promise.all(
          list.map(async (it) => {
            if (!it.file) return it.url; // já é uma URL (/api/files/…) ou link
            try {
              const fd = new FormData();
              fd.append("file", it.file);
              const res = await fetch(`/api/briefings/${encodeURIComponent(b.number)}/upload`, {
                method: "POST",
                body: fd,
              });
              if (res.ok) {
                const data = (await res.json()) as { url?: string };
                if (data.url) return data.url;
              }
            } catch {
              /* anexo é best-effort — não bloqueia o envio das respostas */
            }
            return "";
          })
        );
        const kept = urls.filter(Boolean);
        if (kept.length) refImages[qid] = kept;
      })
    );
    try {
      await fetch(`/api/briefings/${encodeURIComponent(b.number)}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, client: b.client ?? linked?.client, refImages }),
      });
    } catch {
      /* best-effort */
    }
  };

  const missingCount = pending.size;

  // ── Busca dentro do briefing (perguntas e ambientes) ──
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  type SearchHit = { key: string; sectionId: string; questionId?: string; label: string; sub: string };
  const searchResults = useMemo<SearchHit[]>(() => {
    const q = normSearch(query);
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];
    b.sections.forEach((s) => {
      if (normSearch(s.title).includes(q)) {
        hits.push({ key: `s-${s.id}`, sectionId: s.id, label: s.title, sub: s.kind === "ambiente" ? "Ambiente" : "Seção" });
      }
      s.questions.forEach((qq) => {
        if (normSearch(qq.text).includes(q)) {
          hits.push({ key: `q-${qq.id}`, sectionId: s.id, questionId: qq.id, label: qq.text, sub: s.title });
        }
      });
    });
    return hits.slice(0, 8);
  }, [query, b.sections]);
  const goToResult = (r: SearchHit) => {
    if (r.questionId) goToQuestion(r.questionId);
    else goTo(r.sectionId);
    setQuery("");
    setSearchOpen(false);
  };

  const renderQuestion = (section: BriefingSection, q: BriefingQuestion, i: number) => (
    <FadeIn key={q.id} delay={i * 0.05}>
      <QuestionItem
        question={q}
        index={i}
        sectionKind={section.kind}
        answer={answers[q.id] ?? ""}
        onAnswer={(v) => setAnswer(q.id, v)}
        refItems={refs[q.id] ?? EMPTY_REFS}
        onPickFiles={(files) => pickFiles(q.id, files)}
        onPickLink={(url) => pickLink(q.id, url)}
        onRemoveRef={(idx) => removeRef(q.id, idx)}
        pending={pending.has(q.id)}
        locked={isLockedQuestion(q, allQuestions, answers)}
        answered={qAnswered(q)}
        flash={flashId === q.id}
        hasPin={section.kind === "ambiente" && !!q.pin}
        onGoToPin={() => goToPin(q.id)}
        registerRef={(el) => {
          questionEls.current[q.id] = el;
        }}
        contact={contact}
        studioEmail={b.studioEmail}
        briefingNumber={b.number}
      />
    </FadeIn>
  );

  return (
    // Na prévia mostramos a UI COMPLETA (opções, marcadores, botões) — só o PDF
    // real (printing) usa o modo impressão enxuto.
    <PrintContext.Provider value={printing}>
     <FrozenContext.Provider value={frozen}>
      <div className={`${styles.page} ${preview ? styles.pagePreview : ""}`} data-theme={theme} ref={pageRef}>
        {!printing && !preview && theme === "dark" && <CustomCursor />}
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
            {String(navSections.length).padStart(2, "0")}
          </span>
          <span className={styles.timelineEyebrow}>BRIEFING POR AMBIENTE</span>
          <div className={styles.timelineDivider} aria-hidden>
            <span className={styles.timelineDividerLine} />
            <span className={styles.timelineDividerStar}>{STAR}</span>
            <span className={styles.timelineDividerLine} />
          </div>
          <ul className={styles.timelineList}>
            {navSections.map((section, i) => {
              // progresso do "run" (bloco inicial + continuações do mesmo ambiente)
              const start = b.sections.findIndex((s) => s.id === section.id);
              let total = 0;
              let done = 0;
              for (let j = start; j === start || (j < b.sections.length && isContinuation(j)); j++) {
                total += progress[b.sections[j].id]?.total ?? 0;
                done += progress[b.sections[j].id]?.done ?? 0;
              }
              const complete = total > 0 && done === total;
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
          <FadeIn>
            <div className={styles.heroTopbar}>
              <img
                src={theme === "light" ? "/assets/logo-parasite-dark.webp" : "/assets/logo-parasite.webp"}
                alt="Isabela Paulino Studio"
                className={styles.heroLogo}
              />
              <div className={styles.heroActions}>
                <span className={styles.autosave}>
                  <span className={styles.autosaveDot} /> Salvamento automático
                </span>
                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className={styles.themeToggle}
                  aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
                  title={theme === "dark" ? "Tema claro" : "Tema escuro"}
                >
                  {theme === "dark" ? <IconSun /> : <IconMoon />}
                </button>
                <button type="button" onClick={exportPdf} className={styles.pdfButton} aria-label="Baixar briefing em PDF" data-pdf-ignore disabled={exporting}>
                  <IconDownload />
                  <span>{exporting ? "Gerando…" : "Baixar PDF"}</span>
                </button>
              </div>
            </div>
          </FadeIn>

          {!printing && (
            <FadeIn delay={0.1}>
              <div className={styles.searchBar} data-pdf-ignore>
                <div className={styles.searchWrap}>
                  <span className={styles.searchIcon}><IconSearch /></span>
                  <input
                    type="search"
                    className={styles.searchInput}
                    value={query}
                    placeholder="Buscar no briefing…"
                    aria-label="Buscar pergunta ou ambiente no briefing"
                    onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchResults[0]) { e.preventDefault(); goToResult(searchResults[0]); }
                      if (e.key === "Escape") { setQuery(""); setSearchOpen(false); }
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
                      aria-label="Limpar busca"
                    >
                      ×
                    </button>
                  )}
                  {searchOpen && query.trim().length >= 2 && (
                    <div className={styles.searchResults}>
                      {searchResults.length === 0 ? (
                        <div className={styles.searchEmpty}>Nada encontrado para “{query.trim()}”.</div>
                      ) : (
                        searchResults.map((r) => (
                          <button
                            key={r.key}
                            type="button"
                            className={styles.searchHit}
                            onMouseDown={(e) => { e.preventDefault(); goToResult(r); }}
                          >
                            <span className={styles.searchHitLabel}>{r.label}</span>
                            <span className={styles.searchHitSub}>{r.sub}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </FadeIn>
          )}

          <FadeIn delay={0.2}>
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
          </FadeIn>
        </header>

        <main className={styles.container}>
          {b.sections.map((section, si) => {
            const lines = section.titleLines ?? [section.title];
            const continuation = isContinuation(si);
            return (
              <div key={section.id}>
                {!continuation && <StarDivider />}
                <section
                  data-spy={section.id}
                  ref={(el) => {
                    spyEls.current[section.id] = el;
                  }}
                  className={`${styles.section} ${
                    section.kind === "ambiente" ? styles.sectionAmbiente : ""
                  } ${continuation ? styles.sectionContinuation : ""}`}
                >
                  <FadeIn>
                    {continuation ? (
                      // bloco extra do MESMO ambiente: cabeçalho compacto
                      <div className={styles.sectionHeadCont}>
                        <span className={styles.sectionContChip}>
                          {section.title} · continuação
                        </span>
                        {section.intro && <p className={styles.sectionIntro}>{section.intro}</p>}
                      </div>
                    ) : (
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
                    )}
                  </FadeIn>

                  {/* imagem no topo (formato natural) + perguntas abaixo */}
                  {section.kind === "ambiente" && (
                    <FadeIn delay={0.1}>
                      <SectionFigure
                        section={section}
                        interactive
                        printing={printing}
                        onPinClick={goToQuestion}
                        flashPinId={flashPinId}
                        figureRef={(el) => { figureEls.current[section.id] = el; }}
                      />
                    </FadeIn>
                  )}
                  <div className={styles.questionsWide}>
                    {section.questions.map((q, i) => renderQuestion(section, q, i))}
                  </div>
                </section>
              </div>
            );
          })}

          <div className={styles.ctaWrap}>
            {frozen ? (
              <p className={`${styles.ctaText} ${styles.ctaLocked}`}>
                <IconLock /> Este briefing foi <strong>fechado pelo estúdio</strong> e serve de base para o
                projeto. As respostas ficam preservadas — você pode consultar e baixar em PDF,
                mas não é mais possível editá-las. Precisa ajustar algo? Fale com a Isabela.
              </p>
            ) : (
              <p className={styles.ctaText}>
                Revise suas respostas e conclua. Você pode exportar o briefing em PDF a
                qualquer momento; ao enviar, conferimos se nada ficou pendente.
              </p>
            )}
            {!frozen && missingCount > 0 && (
              <p className={styles.ctaAlert}>
                {missingCount === 1
                  ? "1 pergunta obrigatória está pendente — ela foi destacada em vermelho acima."
                  : `${missingCount} perguntas obrigatórias estão pendentes — destacadas em vermelho acima.`}
              </p>
            )}
            {!frozen && editingSubmitted && (
              <p className={styles.ctaSent}>
                <IconCheck /> Você já respondeu este briefing — edite o que quiser e reenvie; suas respostas serão atualizadas.
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
                {frozen ? "." : ". Pode reenviar pelo WhatsApp sempre que precisar."}
              </p>
            )}
            <div className={styles.ctaButtons}>
              <button type="button" onClick={exportPdf} className={styles.pdfButtonCta} data-pdf-ignore disabled={exporting}>
                <IconDownload />
                <span>{exporting ? "Gerando PDF…" : "Baixar PDF"}</span>
              </button>
              {!frozen && (
                <button type="button" onClick={handleSubmit} className={styles.sendBtn}>
                  <IconWhatsApp />
                  <span>Enviar briefing</span>
                </button>
              )}
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          <img
            src={theme === "light" ? "/assets/logo-parasite-dark.webp" : "/assets/logo-parasite.webp"}
            alt="Isabela Paulino Studio"
            className={styles.footerLogo}
          />
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
     </FrozenContext.Provider>
    </PrintContext.Provider>
  );
}

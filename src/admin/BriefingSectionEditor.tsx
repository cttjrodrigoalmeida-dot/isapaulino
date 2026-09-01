import { useRef, useState } from "react";
import type { BriefingSection, BriefingQuestion, QuestionType } from "../components/briefing/types";
import { DEFAULT_QUICKFILLS } from "../components/briefing/types";
import { api, ApiError } from "./api";
import ListEditor from "./ListEditor";
import PinCanvas from "./PinCanvas";
import UploadHint from "./UploadHint";
import styles from "./Admin.module.css";

// Ações do cabeçalho da seção: botões só de ÍCONE (com dica no hover). Com
// texto, a linha estourava e cobria o título/contagem de perguntas do card.
const ICON_BTN = { padding: "5px 8px", fontSize: 13, lineHeight: 1.1, minWidth: 30 } as const;

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "longtext", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "radio", label: "Escolha única (botões)" },
  { value: "yesno", label: "Sim / Não" },
  { value: "checklist", label: "Lista selecionável (uma opção)" },
  { value: "multicheck", label: "Múltipla escolha (checkbox)" },
  { value: "select", label: "Seleção" },
  { value: "scale", label: "Escala / Avaliação" },
  { value: "maquete", label: "Maquete (e-mail/WhatsApp)" },
  { value: "arquivo", label: "Inserir arquivo (imagem/PDF)" },
];
// Tipos que têm lista de opções editável.
const HAS_OPTIONS: QuestionType[] = ["radio", "checklist", "multicheck", "select", "maquete"];
// Tipos de "escolha" que aceitam a opção extra "Outros" (campo livre).
const ALLOWS_OTHER: QuestionType[] = ["radio", "yesno", "checklist", "multicheck", "select"];

function QuestionEditor({
  q,
  index,
  isAmbiente,
  selected,
  onToggleSelect,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  onCopy,
  onSaveToLibrary,
  onPasteAfter,
  onReplace,
  hasClipboard,
  onDndStart,
  onDndOver,
  onDndDrop,
  showDropLine,
  moved,
  isFirst,
  isLast,
  hideType,
}: {
  q: BriefingQuestion;
  index: number;
  isAmbiente: boolean;
  /** oculta o seletor "Tipo de resposta" (declutter do editor) */
  hideType: boolean;
  /** pergunta marcada na seleção em massa (destaque rosa) */
  selected: boolean;
  onToggleSelect: () => void;
  onChange: (patch: Partial<BriefingQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onSaveToLibrary: () => void;
  /** cola a pergunta copiada logo abaixo desta */
  onPasteAfter: () => void;
  /** substitui ESTA pergunta pela copiada (ocupa o lugar dela) */
  onReplace: () => void;
  hasClipboard: boolean;
  onDndStart: () => void;
  onDndOver: () => void;
  onDndDrop: () => void;
  showDropLine: boolean;
  moved: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const type = q.type ?? "longtext";
  const cardRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={cardRef}
      className={`${styles.blockCard} ${selected ? styles.blockCardSelected : ""} ${moved ? styles.questionMoved : ""}`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDndOver(); }}
      onDrop={(e) => { e.preventDefault(); onDndDrop(); }}
      style={showDropLine ? { boxShadow: "inset 0 3px 0 0 var(--color-accent)" } : undefined}
    >
      <div className={styles.blockHead}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            className={styles.selectCheckbox}
            checked={selected}
            onChange={onToggleSelect}
            title="Selecionar esta pergunta (para excluir/duplicar em massa)"
          />
          <span
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              if (cardRef.current) e.dataTransfer.setDragImage(cardRef.current, 24, 24);
              onDndStart();
            }}
            title="Arraste para mover a pergunta (inclusive para outro bloco)"
            style={{ cursor: "grab", userSelect: "none", fontSize: 16, lineHeight: 1, color: "var(--color-text-muted)" }}
          >
            ⠿
          </span>
          <span className={styles.blockTag}>Pergunta {String(index + 1).padStart(2, "0")}</span>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className={styles.btn} onClick={() => onMove(-1)} disabled={isFirst}>↑</button>
          <button type="button" className={styles.btn} onClick={() => onMove(1)} disabled={isLast}>↓</button>
          <button type="button" className={styles.btn} onClick={onDuplicate} title="Cria uma cópia desta pergunta logo abaixo.">⧉ Duplicar</button>
          <button type="button" className={styles.btn} onClick={onCopy} title="Copiar esta pergunta para colar em outra seção (ou em outro briefing).">⧉ Copiar</button>
          {hasClipboard && (
            <button type="button" className={styles.btn} onClick={onPasteAfter} title="Colar a pergunta copiada logo abaixo desta.">⤵ Colar aqui</button>
          )}
          {hasClipboard && (
            <button type="button" className={styles.btn} onClick={onReplace} title="Substituir ESTA pergunta pela copiada (ocupa o lugar dela).">⇄ Substituir</button>
          )}
          <button type="button" className={styles.btn} onClick={onSaveToLibrary} title="Biblioteca — salvar esta pergunta, criar uma nova ou inserir uma salva." aria-label="Biblioteca" style={{ padding: "6px 9px" }}>☆</button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onRemove}>Remover</button>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Enunciado</label>
        <textarea className={styles.textarea} rows={2} value={q.text} onChange={(e) => onChange({ text: e.target.value })} />
      </div>

      {hideType ? (
        <div className={styles.field}>
          <label className={styles.label}>Dica/exemplo (opcional)</label>
          <input className={styles.input} value={q.hint ?? ""} onChange={(e) => onChange({ hint: e.target.value })} />
        </div>
      ) : (
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Tipo de resposta</label>
            <select className={styles.input} value={type} onChange={(e) => onChange({ type: e.target.value as QuestionType })}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Dica/exemplo (opcional)</label>
            <input className={styles.input} value={q.hint ?? ""} onChange={(e) => onChange({ hint: e.target.value })} />
          </div>
        </div>
      )}

      {type === "arquivo" && (
        <p className={styles.pageHint} style={{ marginTop: 0, marginBottom: 12 }}>
          A resposta é <strong>só anexo</strong>: o cliente insere imagem(ns) e/ou PDF, sem caixa de texto.
        </p>
      )}

      {HAS_OPTIONS.includes(type) && (
        <div className={styles.field}>
          <label className={styles.label}>Opções</label>
          <ListEditor items={q.options ?? []} onChange={(options) => onChange({ options })} placeholder="ex.: Sim" />
        </div>
      )}

      {type === "yesno" && (
        <p className={styles.pageHint} style={{ marginTop: 0, marginBottom: 12 }}>
          As opções <strong>Sim</strong> e <strong>Não</strong> já aparecem automaticamente. Marque “Outros” abaixo para
          permitir uma justificativa livre (ex.: Sim / Não / Outros).
        </p>
      )}

      {type === "scale" && (
        <div className={styles.field}>
          <label className={styles.label}>Nota máxima da escala</label>
          <select className={styles.input} value={q.scaleMax ?? 5} onChange={(e) => onChange({ scaleMax: Number(e.target.value) })}>
            {[3, 4, 5, 7, 10].map((n) => (
              <option key={n} value={n}>1 a {n}</option>
            ))}
          </select>
        </div>
      )}

      {ALLOWS_OTHER.includes(type) && (
        <label className={styles.comboToggle} style={{ margin: "0 0 12px" }}>
          <input type="checkbox" checked={!!q.allowOther} onChange={(e) => onChange({ allowOther: e.target.checked })} />
          <span>Incluir opção “Outros” — ao selecionar, abre um campo livre para o cliente digitar/justificar.</span>
        </label>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Observação/aviso abaixo (opcional)</label>
        <textarea className={styles.textarea} rows={2} value={q.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />
      </div>

      {type !== "maquete" && (
        <div className={styles.field}>
          <label className={styles.label}>Botões de resposta rápida</label>
          <p className={styles.pageHint} style={{ marginTop: 0, marginBottom: 8 }}>
            Já vêm com <strong>{DEFAULT_QUICKFILLS[0]}</strong> e <strong>{DEFAULT_QUICKFILLS[1]}</strong> — remova (✕) quando
            não fizer sentido, ou adicione outros (ex.: “IGUAL AO ANTERIOR”, “SIM”, “NÃO”).
          </p>
          <ListEditor
            items={q.quickFills ?? DEFAULT_QUICKFILLS}
            onChange={(list) => onChange({ quickFills: list })}
            placeholder="ex.: IGUAL AO ANTERIOR"
          />
        </div>
      )}

      {isAmbiente && (
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Pino — rótulo (opcional)</label>
            <input className={styles.input} value={q.pin?.label ?? ""} onChange={(e) => onChange({ pin: { x: q.pin?.x ?? 50, y: q.pin?.y ?? 50, label: e.target.value } })} />
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Pino X %</label>
              <input type="number" min={0} max={100} className={styles.input} value={q.pin?.x ?? 50} onChange={(e) => onChange({ pin: { x: Number(e.target.value), y: q.pin?.y ?? 50, label: q.pin?.label } })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Pino Y %</label>
              <input type="number" min={0} max={100} className={styles.input} value={q.pin?.y ?? 50} onChange={(e) => onChange({ pin: { x: q.pin?.x ?? 50, y: Number(e.target.value), label: q.pin?.label } })} />
            </div>
          </div>
        </div>
      )}

      <div className={styles.comboToggle}>
        <label className={styles.comboToggle} style={{ margin: 0 }}>
          <input type="checkbox" checked={q.required !== false} onChange={(e) => onChange({ required: e.target.checked })} />
          <span>Obrigatória</span>
        </label>
        <label className={styles.comboToggle} style={{ margin: 0 }}>
          {/* Reflete o padrão efetivo do cliente (ambiente vem ligado por padrão),
              para desmarcar realmente esconder o botão. */}
          <input type="checkbox" checked={q.allowReference ?? isAmbiente} onChange={(e) => onChange({ allowReference: e.target.checked })} />
          <span>Permitir anexar referência</span>
        </label>
      </div>
    </div>
  );
}

export default function BriefingSectionEditor({
  section,
  index,
  collapsed,
  onToggleCollapse,
  continuationInfo,
  selectedIds,
  sectionSelect,
  onToggleSectionSelect,
  onToggleQuestionSelect,
  hasClipboard,
  onCopyQuestion,
  onPasteQuestion,
  onReplaceQuestion,
  onOpenLibrary,
  onSaveQuestionToLibrary,
  onChange,
  onRemove,
  onMove,
  onReorderSection,
  onDuplicate,
  onContinuar,
  hasSectionClip,
  onCopySection,
  onPasteSection,
  onReplaceSection,
  onQuestionDragStart,
  onQuestionDrop,
  justMovedId,
  isFirst,
  isLast,
  hideType,
}: {
  section: BriefingSection;
  index: number;
  /** seção recolhida (mostra só o resumo) */
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** se esta seção (ambiente) é continuação e qual "parte" — só p/ rotular no editor */
  continuationInfo?: { isCont: boolean; part: number };
  /** ids das perguntas selecionadas (seleção em massa) */
  selectedIds: Set<string>;
  /** estado da seleção do ambiente: nenhuma / algumas / todas */
  sectionSelect: "none" | "some" | "all";
  /** marca/desmarca todas as perguntas deste ambiente */
  onToggleSectionSelect: () => void;
  /** marca/desmarca uma pergunta (por índice) */
  onToggleQuestionSelect: (qi: number) => void;
  /** há uma pergunta no clipboard (para exibir "Colar pergunta") */
  hasClipboard: boolean;
  onCopyQuestion: (qi: number) => void;
  /** cola a pergunta copiada na posição `at` (ou no fim se ausente) */
  onPasteQuestion: (at?: number) => void;
  /** substitui a pergunta `qi` pela copiada (ocupa o lugar dela) */
  onReplaceQuestion: (qi: number) => void;
  onOpenLibrary: () => void;
  onSaveQuestionToLibrary: (q: BriefingQuestion) => void;
  onChange: (next: BriefingSection) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  /** DnD de seção: reordena arrastando (tira `from`, insere em `to`) */
  onReorderSection: (from: number, to: number) => void;
  /** duplica a seção inteira (imagem + perguntas) logo abaixo */
  onDuplicate: () => void;
  /** nova seção do MESMO ambiente, logo abaixo, começando em branco */
  onContinuar: () => void;
  /** há um bloco (seção) copiado no clipboard */
  hasSectionClip: boolean;
  /** copia ESTE bloco (seção) inteiro para o clipboard */
  onCopySection: () => void;
  /** cola o bloco copiado logo abaixo deste */
  onPasteSection: () => void;
  /** substitui ESTE bloco pelo copiado (ocupa o lugar dele) */
  onReplaceSection: () => void;
  /** DnD: registra a pergunta arrastada (índice) desta seção */
  onQuestionDragStart: (qi: number) => void;
  /** DnD: solta a pergunta arrastada nesta seção, na posição toQ */
  onQuestionDrop: (toQ: number) => void;
  /** id da pergunta recém-movida (para animar o destaque) */
  justMovedId: string | null;
  isFirst: boolean;
  isLast: boolean;
  /** oculta o seletor "Tipo de resposta" nas perguntas (declutter) */
  hideType: boolean;
}) {
  const isAmbiente = section.kind === "ambiente";
  const isCont = isAmbiente && !!continuationInfo?.isCont;
  const set = (patch: Partial<BriefingSection>) => onChange({ ...section, ...patch });

  const [activePin, setActivePin] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  // Índice da pergunta sob o cursor durante o arraste (mostra a linha de destino).
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // DnD de SEÇÃO (arrastar o bloco inteiro p/ reordenar). Usa um tipo próprio no
  // dataTransfer p/ NÃO se misturar com o arraste de perguntas (que não usa tipo).
  const cardRef = useRef<HTMLDivElement>(null);
  const [sectionDropOver, setSectionDropOver] = useState(false);
  const SECTION_DND = "application/x-ips-section";

  const setQuestion = (qi: number, patch: Partial<BriefingQuestion>) =>
    set({ questions: section.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      set({ image: url });
    } catch (e) {
      setUploadError(e instanceof ApiError ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };
  const placePin = (x: number, y: number) => {
    if (activePin == null) return;
    const q = section.questions[activePin];
    setQuestion(activePin, { pin: { x, y, label: q.pin?.label } });
  };
  const setPinLabel = (i: number, label: string) => {
    const q = section.questions[i];
    setQuestion(i, { pin: { x: q.pin?.x ?? 50, y: q.pin?.y ?? 50, label } });
  };
  // adiciona uma nova pergunta JÁ com pino (no centro) e a seleciona para posicionar
  const addPin = () => {
    const next = [
      ...section.questions,
      {
        id: `q-${Date.now()}`,
        text: "Nova pergunta",
        type: "longtext" as const,
        required: true,
        pin: { x: 50, y: 50, label: "" },
      },
    ];
    set({ questions: next });
    setActivePin(next.length - 1);
  };
  const addQuestion = () =>
    set({
      questions: [
        ...section.questions,
        // Já entra com "À DEFINIR / NÃO SE APLICA" (a Isabela remove com o ✕ quando não fizer sentido).
        { id: `q-${Date.now()}`, text: "Nova pergunta", type: "longtext", required: true, quickFills: [...DEFAULT_QUICKFILLS] },
      ],
    });
  const removeQuestion = (qi: number) => set({ questions: section.questions.filter((_, i) => i !== qi) });
  // Duplica a pergunta logo abaixo (cópia completa: tipo, opções, pino…), com novo id.
  const duplicateQuestion = (qi: number) => {
    const copy = { ...structuredClone(section.questions[qi]), id: `q-${Date.now()}` };
    const list = section.questions.slice();
    list.splice(qi + 1, 0, copy);
    set({ questions: list });
  };
  const moveQuestion = (qi: number, dir: -1 | 1) => {
    const j = qi + dir;
    if (j < 0 || j >= section.questions.length) return;
    const list = section.questions.slice();
    [list[qi], list[j]] = [list[j], list[qi]];
    set({ questions: list });
  };

  return (
    <div
      ref={cardRef}
      className={styles.card}
      id={`sec-card-${section.id}`}
      style={{
        ...(isCont ? { marginLeft: 20, borderLeft: "3px solid var(--color-accent)" } : {}),
        ...(sectionDropOver ? { outline: "2px dashed var(--color-accent)", outlineOffset: 3 } : {}),
      }}
      onDragOver={(e) => {
        // só reage ao arraste de SEÇÃO (ignora o arraste de perguntas)
        if (!e.dataTransfer.types.includes(SECTION_DND)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!sectionDropOver) setSectionDropOver(true);
      }}
      onDragLeave={(e) => {
        // só limpa quando realmente sai do card (evita piscar entre filhos)
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setSectionDropOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(SECTION_DND)) return;
        e.preventDefault();
        setSectionDropOver(false);
        const from = Number(e.dataTransfer.getData(SECTION_DND));
        if (Number.isInteger(from) && from !== index) onReorderSection(from, index);
      }}
    >
      <div className={styles.blockHead}>
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData(SECTION_DND, String(index));
            if (cardRef.current) e.dataTransfer.setDragImage(cardRef.current, 24, 18);
          }}
          onDragEnd={() => setSectionDropOver(false)}
          title="Arraste para reordenar esta seção"
          aria-label="Arrastar seção"
          style={{ cursor: "grab", userSelect: "none", fontSize: 16, lineHeight: 1, color: "var(--color-text-muted)", flexShrink: 0, paddingRight: 2 }}
        >
          ⠿
        </span>
        <input
          type="checkbox"
          className={styles.selectCheckbox}
          style={{ marginRight: 4 }}
          ref={(el) => { if (el) el.indeterminate = sectionSelect === "some"; }}
          checked={sectionSelect === "all"}
          onChange={onToggleSectionSelect}
          disabled={section.questions.length === 0}
          title="Selecionar todas as perguntas deste ambiente"
        />
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir" : "Recolher"}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit", flex: 1, minWidth: 0 }}
        >
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", width: 12, flexShrink: 0 }}>{collapsed ? "▸" : "▾"}</span>
          <span className={styles.cardTitle} style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isCont
              ? `↳ Continuação · ${section.title || "Ambiente"} (parte ${continuationInfo?.part ?? 2})`
              : `Seção ${index + 1} · ${isAmbiente ? "AMBIENTE" : "Informações"}${section.title ? ` — ${section.title}` : ""}`}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>
            · {section.questions.length} pergunta{section.questions.length === 1 ? "" : "s"}
          </span>
        </button>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button type="button" className={styles.btn} style={ICON_BTN} onClick={() => onMove(-1)} disabled={isFirst} title="Mover esta seção para cima" aria-label="Mover para cima">↑</button>
          <button type="button" className={styles.btn} style={ICON_BTN} onClick={() => onMove(1)} disabled={isLast} title="Mover esta seção para baixo" aria-label="Mover para baixo">↓</button>
          <button type="button" className={styles.btn} style={ICON_BTN} onClick={onDuplicate} title="Duplicar seção — cria uma cópia logo abaixo (imagem + perguntas); é só trocar a imagem." aria-label="Duplicar seção">⧉</button>
          <button type="button" className={styles.btn} style={ICON_BTN} onClick={onCopySection} title="Copiar este bloco (seção) inteiro — para colar/substituir em outra seção (ou em outro briefing)." aria-label="Copiar seção">⎘</button>
          {hasSectionClip && (
            <button type="button" className={styles.btn} style={ICON_BTN} onClick={onPasteSection} title="Colar o bloco copiado logo abaixo deste." aria-label="Colar bloco">⤵</button>
          )}
          {hasSectionClip && (
            <button type="button" className={styles.btn} style={ICON_BTN} onClick={onReplaceSection} title="Substituir ESTE bloco pelo copiado (ocupa o lugar dele)." aria-label="Substituir bloco">⇄</button>
          )}
          {isAmbiente && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={ICON_BTN} onClick={onContinuar} title="+ Continuação — nova seção do mesmo ambiente logo abaixo, começando em branco (sem repetir as perguntas)." aria-label="Adicionar continuação">↳</button>
          )}
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} style={ICON_BTN} onClick={onRemove} title="Remover esta seção" aria-label="Remover seção">✕</button>
        </div>
      </div>

      {collapsed ? null : (
      <>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Tipo de seção</label>
          <select className={styles.input} value={section.kind} onChange={(e) => set({ kind: e.target.value as "info" | "ambiente" })}>
            <option value="info">Informações (sem imagem)</option>
            <option value="ambiente">Ambiente (imagem + pinos)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Título</label>
          <input className={styles.input} value={section.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Texto de apoio (opcional)</label>
        <textarea className={styles.textarea} rows={2} value={section.intro ?? ""} onChange={(e) => set({ intro: e.target.value })} />
      </div>

      {isAmbiente && (
        <div className={styles.field}>
          <label className={styles.label}>Imagem do ambiente</label>
          <div className={styles.pinToolbar}>
            <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Enviando…" : "⬆ Enviar imagem"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <input
              className={styles.input}
              value={section.image ?? ""}
              onChange={(e) => set({ image: e.target.value })}
              placeholder="ou cole um caminho/URL"
              style={{ flex: 1, minWidth: 200 }}
            />
          </div>
          {uploadError && <div className={styles.error}>{uploadError}</div>}
          <UploadHint compact />

          {section.image && (
            <>
              <p className={styles.pinHint}>
                Selecione uma pergunta e clique na imagem para posicionar o pino.
              </p>
              <div className={styles.pinToolbar}>
                {section.questions.map((q, i) => (
                  <button
                    key={q.id || i}
                    type="button"
                    className={`${styles.pinPick} ${activePin === i ? styles.pinPickActive : ""}`}
                    onClick={() => setActivePin(activePin === i ? null : i)}
                  >
                    📍 {i + 1}
                    {q.pin ? " ✓" : ""}
                  </button>
                ))}
                <button type="button" className={`${styles.pinPick}`} onClick={addPin}>
                  + adicionar pino
                </button>
                {activePin != null && section.questions[activePin]?.pin && (
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setQuestion(activePin, { pin: undefined })}>
                    Remover pino {activePin + 1}
                  </button>
                )}
              </div>
              <PinCanvas
                image={section.image}
                questions={section.questions}
                activeIndex={activePin}
                onPlace={placePin}
                onLabel={setPinLabel}
              />
            </>
          )}
        </div>
      )}

      <label className={styles.label} style={{ marginTop: 4 }}>Perguntas</label>
      {isAmbiente && (
        <p className={styles.pageHint} style={{ marginTop: 0 }}>
          Perguntas <strong>sem pino</strong> também aparecem para o cliente (sem número na
          imagem) — use quando a pergunta é do ambiente em geral, não de um ponto da foto.
        </p>
      )}
      {section.questions.map((q, qi) => (
        <QuestionEditor
          key={q.id || qi}
          q={q}
          index={qi}
          isAmbiente={isAmbiente}
          hideType={hideType}
          selected={selectedIds.has(q.id)}
          onToggleSelect={() => onToggleQuestionSelect(qi)}
          onChange={(patch) => setQuestion(qi, patch)}
          onRemove={() => removeQuestion(qi)}
          onMove={(dir) => moveQuestion(qi, dir)}
          onDuplicate={() => duplicateQuestion(qi)}
          onCopy={() => onCopyQuestion(qi)}
          onSaveToLibrary={() => onSaveQuestionToLibrary(section.questions[qi])}
          onPasteAfter={() => onPasteQuestion(qi + 1)}
          onReplace={() => onReplaceQuestion(qi)}
          hasClipboard={hasClipboard}
          onDndStart={() => onQuestionDragStart(qi)}
          onDndOver={() => setDropIdx(qi)}
          onDndDrop={() => { onQuestionDrop(qi); setDropIdx(null); }}
          showDropLine={dropIdx === qi}
          moved={!!justMovedId && q.id === justMovedId}
          isFirst={qi === 0}
          isLast={qi === section.questions.length - 1}
        />
      ))}
      {/* Zona de drop no fim: soltar aqui move a pergunta para o final deste bloco
          (funciona também quando o bloco está vazio). */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropIdx(section.questions.length); }}
        onDrop={(e) => { e.preventDefault(); onQuestionDrop(section.questions.length); setDropIdx(null); }}
        onDragLeave={() => setDropIdx((d) => (d === section.questions.length ? null : d))}
        style={{
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          minHeight: 40, padding: "8px 10px", borderRadius: 10,
          border: dropIdx === section.questions.length ? "2px dashed var(--color-accent)" : "2px dashed transparent",
        }}
      >
        <button type="button" className={styles.btn} onClick={addQuestion}>+ adicionar pergunta</button>
        <button type="button" className={styles.btn} onClick={onOpenLibrary} title="Inserir uma pergunta salva na biblioteca.">+ da biblioteca</button>
        {hasClipboard && (
          <button type="button" className={styles.btn} onClick={() => onPasteQuestion()} title="Colar a pergunta copiada no fim desta seção.">⤵ Colar pergunta</button>
        )}
        <span className={styles.pageHint} style={{ margin: 0 }}>ou arraste uma pergunta (de qualquer bloco) para cá</span>
      </div>
      {isAmbiente && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onContinuar} title="Nova seção do mesmo ambiente logo abaixo, começando em branco (sem repetir as perguntas).">+ Continuação deste ambiente</button>
        </div>
      )}
      </>
      )}
    </div>
  );
}

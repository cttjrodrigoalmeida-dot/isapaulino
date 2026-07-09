import { useRef, useState } from "react";
import type { BriefingSection, BriefingQuestion, QuestionType } from "../components/briefing/types";
import { api, ApiError } from "./api";
import ListEditor from "./ListEditor";
import PinCanvas from "./PinCanvas";
import UploadHint from "./UploadHint";
import styles from "./Admin.module.css";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "longtext", label: "Texto longo" },
  { value: "radio", label: "Escolha única (botões)" },
  { value: "checklist", label: "Lista selecionável" },
  { value: "select", label: "Seleção" },
  { value: "maquete", label: "Maquete (e-mail/WhatsApp)" },
];
const HAS_OPTIONS: QuestionType[] = ["radio", "checklist", "select", "maquete"];

function QuestionEditor({
  q,
  index,
  isAmbiente,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  q: BriefingQuestion;
  index: number;
  isAmbiente: boolean;
  onChange: (patch: Partial<BriefingQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const type = q.type ?? "longtext";
  return (
    <div className={styles.blockCard}>
      <div className={styles.blockHead}>
        <span className={styles.blockTag}>Pergunta {String(index + 1).padStart(2, "0")}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className={styles.btn} onClick={() => onMove(-1)} disabled={isFirst}>↑</button>
          <button type="button" className={styles.btn} onClick={() => onMove(1)} disabled={isLast}>↓</button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onRemove}>Remover</button>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Enunciado</label>
        <textarea className={styles.textarea} rows={2} value={q.text} onChange={(e) => onChange({ text: e.target.value })} />
      </div>

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

      {HAS_OPTIONS.includes(type) && (
        <div className={styles.field}>
          <label className={styles.label}>Opções</label>
          <ListEditor items={q.options ?? []} onChange={(options) => onChange({ options })} placeholder="ex.: Sim" />
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Observação/aviso abaixo (opcional)</label>
        <textarea className={styles.textarea} rows={2} value={q.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />
      </div>

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
          <input type="checkbox" checked={!!q.allowReference} onChange={(e) => onChange({ allowReference: e.target.checked })} />
          <span>Permitir anexar referência</span>
        </label>
      </div>
    </div>
  );
}

export default function BriefingSectionEditor({
  section,
  index,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  onAddContinuation,
  isFirst,
  isLast,
}: {
  section: BriefingSection;
  index: number;
  onChange: (next: BriefingSection) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  /** duplica a seção inteira (mesmas perguntas) logo abaixo */
  onDuplicate: () => void;
  /** insere logo abaixo um novo bloco de imagem do MESMO ambiente */
  onAddContinuation?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isAmbiente = section.kind === "ambiente";
  const set = (patch: Partial<BriefingSection>) => onChange({ ...section, ...patch });

  const [activePin, setActivePin] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        { id: `q-${Date.now()}`, text: "Nova pergunta", type: "longtext", required: true },
      ],
    });
  const removeQuestion = (qi: number) => set({ questions: section.questions.filter((_, i) => i !== qi) });
  const moveQuestion = (qi: number, dir: -1 | 1) => {
    const j = qi + dir;
    if (j < 0 || j >= section.questions.length) return;
    const list = section.questions.slice();
    [list[qi], list[j]] = [list[j], list[qi]];
    set({ questions: list });
  };

  return (
    <div className={styles.card}>
      <div className={styles.blockHead}>
        <div className={styles.cardTitle} style={{ margin: 0 }}>
          Seção {index + 1} · {isAmbiente ? "Ambiente" : "Informações"}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className={styles.btn} onClick={() => onMove(-1)} disabled={isFirst}>↑</button>
          <button type="button" className={styles.btn} onClick={() => onMove(1)} disabled={isLast}>↓</button>
          <button type="button" className={styles.btn} onClick={onDuplicate} title="Cria uma cópia desta seção logo abaixo, com as mesmas perguntas (é só trocar a imagem).">⧉ Duplicar</button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onRemove}>Remover seção</button>
        </div>
      </div>

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
          onChange={(patch) => setQuestion(qi, patch)}
          onRemove={() => removeQuestion(qi)}
          onMove={(dir) => moveQuestion(qi, dir)}
          isFirst={qi === 0}
          isLast={qi === section.questions.length - 1}
        />
      ))}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className={styles.btn} onClick={addQuestion}>+ adicionar pergunta</button>
        {isAmbiente && onAddContinuation && (
          <button type="button" className={styles.btn} onClick={onAddContinuation} title="Cria outro bloco do mesmo ambiente JÁ com as mesmas perguntas de cima — é só enviar a nova foto (na página vira 'continuação').">
            🖼 + outra imagem (mesmas perguntas)
          </button>
        )}
      </div>
    </div>
  );
}

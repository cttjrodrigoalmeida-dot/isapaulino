import type { BriefingQuestion } from "../components/briefing/types";
import styles from "./Admin.module.css";

// Imagem do ambiente com os pinos. Com uma pergunta ativa, clicar na imagem
// define o x,y% do pino. Cada pino mostra o número + uma caixa de texto
// (rótulo) logo abaixo, editável direto sobre a foto.
export default function PinCanvas({
  image,
  questions,
  activeIndex,
  onPlace,
  onLabel,
}: {
  image: string;
  questions: BriefingQuestion[];
  activeIndex: number | null;
  onPlace: (x: number, y: number) => void;
  onLabel: (index: number, label: string) => void;
}) {
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeIndex == null) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * 1000) / 10));
    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - r.top) / r.height) * 1000) / 10));
    onPlace(x, y);
  };

  return (
    <div
      className={styles.pinCanvas}
      onClick={onClick}
      style={{ cursor: activeIndex != null ? "crosshair" : "default" }}
    >
      <img src={image} alt="Ambiente" className={styles.pinCanvasImg} />
      {questions.map((q, i) =>
        q.pin ? (
          <div key={q.id || i} className={styles.pinGroup} style={{ left: `${q.pin.x}%`, top: `${q.pin.y}%` }}>
            <span className={`${styles.pinMarker} ${i === activeIndex ? styles.pinMarkerActive : ""}`}>
              {i + 1}
            </span>
            <input
              className={styles.pinLabelInput}
              value={q.pin.label ?? ""}
              placeholder="rótulo…"
              onChange={(e) => onLabel(i, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        ) : null
      )}
    </div>
  );
}

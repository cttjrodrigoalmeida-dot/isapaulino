import { useRef, useState } from "react";
import type { BriefingSection } from "./types";
import styles from "./BriefingView.module.css";

// ── Imagem do ambiente com pinos numerados ────────────────────
// Compartilhado entre a página pública (interactive: pinos clicáveis + pinça
// no celular) e o admin/Respostas (somente leitura). A imagem aparece no
// formato NATURAL (sem corte) — mesma geometria do PinCanvas do editor, para
// os pinos caírem exatamente onde a Isabela clicou.
const PINCH_MAX_SCALE = 2.2;

export default function SectionFigure({
  section,
  interactive = false,
  printing = false,
  onPinClick,
  flashPinId,
  figureRef,
}: {
  section: BriefingSection;
  /** true na página do cliente (pinos clicáveis, pinça no touch). */
  interactive?: boolean;
  /** modo impressão: desliga interações e dicas. */
  printing?: boolean;
  onPinClick?: (questionId: string) => void;
  /** id da pergunta cujo pino deve piscar (caminho pergunta → imagem). */
  flashPinId?: string | null;
  /** registra o elemento da figura (p/ rolar até a imagem). */
  figureRef?: (el: HTMLElement | null) => void;
}) {
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50, scale: 1 });
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  if (!section.image) return null;

  // zoom por pinça (dois dedos) — só no touch; desktop não tem zoom (a pedido)
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!interactive || printing || e.touches.length !== 2) return;
    const r = e.currentTarget.getBoundingClientRect();
    const [t1, t2] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const midX = ((t1.clientX + t2.clientX) / 2 - r.left) / r.width * 100;
    const midY = ((t1.clientY + t2.clientY) / 2 - r.top) / r.height * 100;
    if (!pinch.current) {
      pinch.current = { dist, scale: zoom.scale };
      return;
    }
    const scale = Math.min(
      PINCH_MAX_SCALE,
      Math.max(1, pinch.current.scale * (dist / pinch.current.dist))
    );
    setZoom({ on: scale > 1.03, x: midX, y: midY, scale });
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) pinch.current = null;
  };

  const innerStyle = zoom.on
    ? { transform: `scale(${zoom.scale})`, transformOrigin: `${zoom.x}% ${zoom.y}%` }
    : undefined;

  const clickable = interactive && !printing && !!onPinClick;
  const hasPins = section.questions.some((q) => q.pin);

  return (
    <figure className={styles.figure} ref={figureRef}>
      <div className={styles.figureViewport} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className={styles.figureInner} style={innerStyle}>
          <img src={section.image} alt={section.title} className={styles.image} />
          {section.questions.map((q, i) =>
            q.pin ? (
              <span
                key={q.id}
                className={`${styles.pin} ${clickable ? styles.pinClickable : ""} ${flashPinId === q.id ? styles.pinFlash : ""}`}
                style={{ left: `${q.pin.x}%`, top: `${q.pin.y}%` }}
                onClick={clickable ? () => onPinClick!(q.id) : undefined}
                role={clickable ? "button" : undefined}
                title={clickable ? `Ir para a pergunta ${i + 1}` : undefined}
              >
                <span className={styles.pinDot}>{i + 1}</span>
                {q.pin.label && <span className={styles.pinLabel}>{q.pin.label}</span>}
              </span>
            ) : null
          )}
        </div>
      </div>
      {interactive && !printing && hasPins && (
        <figcaption className={styles.figureHint}>
          <span className={styles.figureHintDesktop}>
            Clique num pino para ir à pergunta — ou no número da pergunta para ver o ponto na imagem.
          </span>
          <span className={styles.figureHintMobile}>
            Toque num pino para ir à pergunta (e no número da pergunta para voltar à imagem) · dois dedos para ampliar.
          </span>
        </figcaption>
      )}
    </figure>
  );
}

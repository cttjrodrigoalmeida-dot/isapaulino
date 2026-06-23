import { useEffect } from "react";
import { useParams } from "react-router-dom";
import BriefingView from "../components/briefing/BriefingView";
import { SAMPLE_BRIEFING } from "../components/briefing/sampleBriefing";
import styles from "../components/briefing/BriefingView.module.css";

// FASE VISUAL: renderiza o briefing de EXEMPLO (linkado à proposta 2624).
// Futuramente: buscar o briefing por número (/briefing/:number) na fonte real
// (admin/CMS + backend) e então renderizar <BriefingView briefing={...} />.
function getBriefingByNumber(number?: string) {
  if (!number || number === SAMPLE_BRIEFING.number) return SAMPLE_BRIEFING;
  return undefined;
}

export default function Briefing() {
  const { number } = useParams<{ number: string }>();
  const briefing = getBriefingByNumber(number);

  useEffect(() => {
    const prev = document.title;
    document.title = briefing
      ? `Briefing Nº ${briefing.number} · Isabela Paulino Studio`
      : "Briefing não encontrado · Isabela Paulino Studio";
    return () => {
      document.title = prev;
    };
  }, [briefing]);

  if (!briefing) {
    return (
      <div className={styles.page}>
        <div className={styles.ambient} aria-hidden />
        <div className={styles.notFound}>
          <h1 className={styles.notFoundTitle}>Briefing não encontrado</h1>
          <p className={styles.notFoundText}>
            Não localizamos um briefing com o número informado. Confira o link
            recebido ou fale com o estúdio.
          </p>
        </div>
      </div>
    );
  }

  return <BriefingView briefing={briefing} />;
}

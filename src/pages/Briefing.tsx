import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BriefingView from "../components/briefing/BriefingView";
import type { Briefing as BriefingType } from "../components/briefing/types";
import { SAMPLE_BRIEFING } from "../components/briefing/sampleBriefing";
import styles from "../components/briefing/BriefingView.module.css";

// O briefing vem da API (D1) por número. Se a API não encontrar (ainda não
// publicado / sem backend em dev), cai no exemplo estático — assim o link
// já existente (/briefing/2624) continua funcionando na transição.
type State =
  | { status: "loading" }
  | { status: "ok"; briefing: BriefingType }
  | { status: "notfound" };

function staticFallback(number?: string): BriefingType | undefined {
  if (!number || number === SAMPLE_BRIEFING.number) return SAMPLE_BRIEFING;
  return undefined;
}

export default function Briefing() {
  const { number } = useParams<{ number: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/briefings/${encodeURIComponent(number ?? "")}`, {
          credentials: "include",
        });
        if (res.ok) {
          const { briefing } = (await res.json()) as { briefing: BriefingType };
          if (alive) setState({ status: "ok", briefing });
          return;
        }
      } catch {
        /* sem backend / offline — usa o fallback */
      }
      const fb = staticFallback(number);
      if (alive) setState(fb ? { status: "ok", briefing: fb } : { status: "notfound" });
    })();
    return () => {
      alive = false;
    };
  }, [number]);

  useEffect(() => {
    const prev = document.title;
    if (state.status === "ok") {
      document.title = `Briefing Nº ${state.briefing.number} · Isabela Paulino Studio`;
    } else if (state.status === "notfound") {
      document.title = "Briefing não encontrado · Isabela Paulino Studio";
    }
    return () => {
      document.title = prev;
    };
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.ambient} aria-hidden />
        <div className={styles.notFound}>
          <p className={styles.notFoundText}>Carregando briefing…</p>
        </div>
      </div>
    );
  }

  if (state.status === "notfound") {
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

  return <BriefingView briefing={state.briefing} />;
}

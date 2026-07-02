import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProposalView from "../components/proposal/ProposalView";
import type { Proposal } from "../components/proposal/types";
import { getProposalByNumber } from "../components/proposal/proposalsRegistry";

// A proposta vem da API (D1) por número. Se a API não encontrar (ainda não
// publicada / sem backend em dev), cai no registro estático — assim os links
// já existentes (ex.: /proposta/2624) continuam funcionando na transição.
type State =
  | { status: "loading" }
  | { status: "ok"; proposal: Proposal }
  | { status: "notfound" };

export default function Proposta() {
  const { number } = useParams<{ number: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });

    (async () => {
      // 1) tenta a API
      try {
        const res = await fetch(`/api/proposals/${encodeURIComponent(number ?? "")}`, {
          credentials: "include",
        });
        if (res.ok) {
          const { proposal } = (await res.json()) as { proposal: Proposal };
          if (alive) setState({ status: "ok", proposal });
          return;
        }
      } catch {
        /* sem backend / offline — usa o fallback abaixo */
      }
      // 2) fallback: registro estático
      const fallback = getProposalByNumber(number ?? "");
      if (alive) {
        setState(fallback ? { status: "ok", proposal: fallback } : { status: "notfound" });
      }
    })();

    return () => {
      alive = false;
    };
  }, [number]);

  useEffect(() => {
    const prev = document.title;
    if (state.status === "ok") {
      document.title = `Proposta Nº ${state.proposal.number} · Isabela Paulino Studio`;
    } else if (state.status === "notfound") {
      document.title = "Proposta não encontrada · Isabela Paulino Studio";
    }
    return () => {
      document.title = prev;
    };
  }, [state]);

  if (state.status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#888", fontFamily: "Inter, sans-serif" }}>
        Carregando proposta…
      </div>
    );
  }

  if (state.status === "notfound") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#aaa", fontFamily: "Inter, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, color: "#f0f0f0", marginBottom: 8 }}>Proposta não encontrada</h1>
          <p style={{ fontSize: 14, color: "#888" }}>
            Confira o link recebido ou fale com o estúdio.
          </p>
        </div>
      </div>
    );
  }

  return <ProposalView proposal={state.proposal} />;
}

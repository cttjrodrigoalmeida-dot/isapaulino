import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProposalView from "../components/proposal/ProposalView";
import type { Proposal } from "../components/proposal/types";
import { getProposalByNumber } from "../components/proposal/proposalsRegistry";

// A proposta vem da API (D1) por número. Se a API não encontrar (ainda não
// publicada / sem backend em dev), cai no registro estático — assim os links
// já existentes (ex.: /proposta/2624) continuam funcionando na transição.
// Se a proposta tiver senha de acesso, a API responde { locked: true } e a
// página mostra um portão pedindo a senha antes de liberar o conteúdo.
type State =
  | { status: "loading" }
  | { status: "ok"; proposal: Proposal }
  | { status: "locked" }
  | { status: "notfound" };

export default function Proposta() {
  const { number } = useParams<{ number: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(
    async (signal?: { alive: boolean }) => {
      // 1) tenta a API
      try {
        const res = await fetch(`/api/proposals/${encodeURIComponent(number ?? "")}`, {
          credentials: "include",
        });
        if (res.ok) {
          const body = (await res.json()) as { proposal?: Proposal; locked?: boolean };
          if (signal && !signal.alive) return;
          if (body.locked) {
            setState({ status: "locked" });
            return;
          }
          if (body.proposal) {
            setState({ status: "ok", proposal: body.proposal });
            return;
          }
        }
      } catch {
        /* sem backend / offline — usa o fallback abaixo */
      }
      // 2) fallback: registro estático
      const fallback = getProposalByNumber(number ?? "");
      if (!signal || signal.alive) {
        setState(fallback ? { status: "ok", proposal: fallback } : { status: "notfound" });
      }
    },
    [number]
  );

  useEffect(() => {
    const signal = { alive: true };
    setState({ status: "loading" });
    load(signal);
    return () => {
      signal.alive = false;
    };
  }, [load]);

  useEffect(() => {
    const prev = document.title;
    if (state.status === "ok") {
      document.title = `Proposta Nº ${state.proposal.number} · Isabela Paulino Studio`;
    } else if (state.status === "notfound") {
      document.title = "Proposta não encontrada · Isabela Paulino Studio";
    } else if (state.status === "locked") {
      document.title = "Proposta protegida · Isabela Paulino Studio";
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

  if (state.status === "locked") {
    return <LockGate number={number ?? ""} onUnlocked={() => { setState({ status: "loading" }); load(); }} />;
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

// Portão de senha: fica na frente da proposta protegida até o cliente acertar.
function LockGate({ number, onUnlocked }: { number: string; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(number)}/unlock`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onUnlocked();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(body.error || "Não foi possível liberar. Tente novamente.");
    } catch {
      setErr("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 14 }}>🔒</div>
        <h1 style={{ fontSize: 20, color: "#f2f2f2", marginBottom: 6, fontWeight: 600 }}>Proposta protegida</h1>
        <p style={{ fontSize: 13.5, color: "#8a8a8a", marginBottom: 22, lineHeight: 1.5 }}>
          Digite a senha que o estúdio enviou para você para visualizar a proposta.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErr(null); }}
          placeholder="Senha de acesso"
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box", padding: "13px 15px", fontSize: 15,
            borderRadius: 10, border: `1px solid ${err ? "#f0506e" : "#2a2a2a"}`,
            background: "#151515", color: "#f2f2f2", outline: "none", textAlign: "center",
            letterSpacing: "0.04em", marginBottom: 12,
          }}
        />
        {err && <div style={{ color: "#f0506e", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button
          type="submit"
          disabled={busy || !password}
          style={{
            width: "100%", padding: "13px 15px", fontSize: 14, fontWeight: 600,
            borderRadius: 10, border: "none", cursor: busy || !password ? "default" : "pointer",
            background: busy || !password ? "#3a2730" : "#f0506e", color: "#fff",
            transition: "background 0.15s",
          }}
        >
          {busy ? "Verificando…" : "Ver proposta"}
        </button>
        <div style={{ marginTop: 18, fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.5 }}>
          Já é cliente do estúdio?{" "}
          <a
            href={`/cliente?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
            style={{ color: "#f0506e", textDecoration: "none", fontWeight: 500 }}
          >
            Entrar na Área do Cliente
          </a>{" "}
          — com o login, o acesso é liberado sem senha.
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ContractView from "../components/contract/ContractView";
import type { ContractDoc, SignatureStatus } from "../components/contract/types";
import { SAMPLE_CONTRACT } from "../components/contract/sampleContract";

interface PublicContract {
  title: string;
  status: string;
  autentiqueUrl: string | null;
  clientName: string | null;
  /** JSON do ContractDoc (quando o contrato já foi montado no editor rico). */
  data?: string | null;
  /** Data/hora da assinatura (ISO) preenchida pelo webhook da Autentique. */
  signedAt?: string | null;
}

// ISO → "25/06/2026 às 08:26" (fuso local). Fallback: devolve o texto original.
function formatSignedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
}

type State =
  | { status: "loading" }
  | { status: "ok"; doc: ContractDoc }
  | { status: "locked" }
  | { status: "notfound" };

// Mapeia o status do contrato (banco) para o status de assinatura exibido.
function toSignatureStatus(s: string): SignatureStatus {
  if (s === "signed") return "assinado";
  if (s === "cancelled") return "cancelado";
  return "aguardando";
}

// Monta o ContractDoc a partir da resposta. Se houver `data` (doc estruturado),
// usa-o; senão cai no SAMPLE com alguns campos sobrescritos pela API.
function buildDoc(c: PublicContract): ContractDoc {
  if (c.data) {
    try {
      const doc = JSON.parse(c.data) as ContractDoc;
      // Estados terminais do banco (assinado/cancelado) prevalecem sobre o doc.
      if (c.status === "signed" || c.status === "cancelled") {
        doc.signature = {
          ...doc.signature,
          status: toSignatureStatus(c.status),
          // Data da assinatura vinda do webhook da Autentique (se houver).
          assinadoEm: c.signedAt ? formatSignedAt(c.signedAt) : doc.signature.assinadoEm,
        };
      }
      if (c.autentiqueUrl) doc.autentiqueUrl = c.autentiqueUrl;
      return doc;
    } catch {
      /* JSON inválido — usa o fallback abaixo */
    }
  }
  return {
    ...SAMPLE_CONTRACT,
    clientName: c.clientName || SAMPLE_CONTRACT.clientName,
    autentiqueUrl: c.autentiqueUrl || "",
    signature: { ...SAMPLE_CONTRACT.signature, status: toSignatureStatus(c.status) },
  };
}

export default function Contrato() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const pdfMode = searchParams.get("pdf") === "1";
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0); // recarrega após desbloquear

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      try {
        // Na renderização de PDF no servidor, a URL traz ?access=<token> — repassamos
        // à API para liberar contratos protegidos por senha só nesse fluxo.
        const access = searchParams.get("access");
        const apiUrl = `/api/contracts/public/${encodeURIComponent(slug ?? "")}${access ? `?access=${encodeURIComponent(access)}` : ""}`;
        const res = await fetch(apiUrl, { credentials: "include" });
        if (res.ok) {
          const body = (await res.json()) as { contract?: PublicContract; locked?: boolean };
          if (alive) {
            if (body.locked) setState({ status: "locked" });
            else if (body.contract) setState({ status: "ok", doc: buildDoc(body.contract) });
            else setState({ status: "notfound" });
          }
          return;
        }
      } catch {
        /* cai no notfound */
      }
      if (alive) setState({ status: "notfound" });
    })();
    return () => {
      alive = false;
    };
  }, [slug, reloadKey]);

  useEffect(() => {
    const prev = document.title;
    if (state.status === "ok") document.title = `Contrato Nº ${state.doc.contractNumber} · Isabela Paulino Studio`;
    else if (state.status === "notfound") document.title = "Contrato não encontrado · Isabela Paulino Studio";
    return () => {
      document.title = prev;
    };
  }, [state]);

  if (state.status === "loading") {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#888", fontFamily: "Inter, sans-serif" }}>Carregando contrato…</div>;
  }
  if (state.status === "locked") {
    return <ContractLockGate slug={slug ?? ""} onUnlocked={() => setReloadKey((k) => k + 1)} />;
  }
  if (state.status === "notfound") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#aaa", fontFamily: "Inter, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, color: "#f0f0f0", marginBottom: 8 }}>Contrato não encontrado</h1>
          <p style={{ fontSize: 14, color: "#888" }}>Confira o link recebido ou fale com o estúdio.</p>
        </div>
      </div>
    );
  }

  return <ContractView doc={state.doc} pdfMode={pdfMode} />;
}

// Portão de senha do contrato (cliente novo, sem Área do Cliente).
function ContractLockGate({ slug, onUnlocked }: { slug: string; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/contracts/public/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { onUnlocked(); return; }
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
        <h1 style={{ fontSize: 20, color: "#f2f2f2", marginBottom: 6, fontWeight: 600 }}>Contrato protegido</h1>
        <p style={{ fontSize: 13.5, color: "#8a8a8a", marginBottom: 22, lineHeight: 1.5 }}>
          Digite a senha que o estúdio enviou para você para visualizar o contrato.
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
          {busy ? "Verificando…" : "Ver contrato"}
        </button>
        <div style={{ marginTop: 18, fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.5 }}>
          Já é cliente do estúdio?{" "}
          <a
            href={`/area?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
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

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

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/contracts/public/${encodeURIComponent(slug ?? "")}`);
        if (res.ok) {
          const { contract } = (await res.json()) as { contract: PublicContract };
          if (alive) setState({ status: "ok", doc: buildDoc(contract) });
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
  }, [slug]);

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

import { useEffect, useState } from "react";
import { api, type DocumentLinks } from "./api";

// Faixa "Relacionados": mostra o cliente e liga proposta ↔ contrato ↔ briefing
// de mesmo número (abrindo a página pública de cada um em nova aba). Aparece nos
// editores do painel; o elo entre os três é sempre o número da proposta.
export default function RelatedDocs({
  proposalNumber,
  current,
}: {
  proposalNumber?: string | null;
  current?: "proposal" | "contract" | "briefing";
}) {
  const [links, setLinks] = useState<DocumentLinks | null>(null);

  useEffect(() => {
    const p = (proposalNumber || "").trim();
    if (!p) { setLinks(null); return; }
    let alive = true;
    api.documentLinks(p).then((l) => { if (alive) setLinks(l); }).catch(() => { if (alive) setLinks(null); });
    return () => { alive = false; };
  }, [proposalNumber]);

  if (!proposalNumber || !links) return null;

  const items: { key: string; label: string; href: string | null; is: boolean }[] = [
    {
      key: "proposal",
      label: links.proposal ? `Proposta Nº ${links.proposal.number}` : "Proposta —",
      href: links.proposal ? `/proposta/${links.proposal.number}` : null,
      is: current === "proposal",
    },
    {
      key: "contract",
      label: links.contract?.number ? `Contrato Nº ${links.contract.number}` : links.contract ? "Contrato" : "Contrato —",
      href: links.contract?.slug ? `/contrato/${links.contract.slug}` : null,
      is: current === "contract",
    },
    {
      key: "briefing",
      label: links.briefing ? `Briefing Nº ${links.briefing.number}` : "Briefing —",
      href: links.briefing ? `/briefing/${links.briefing.number}` : null,
      is: current === "briefing",
    },
  ];

  return (
    <div style={wrap}>
      <span style={eyebrow}>Relacionados</span>
      {links.client && <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 600 }}>{links.client}</span>}
      {links.projectTitle && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>· {links.projectTitle}</span>}
      <span style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((it) =>
          it.is ? (
            <span key={it.key} style={{ ...chip, ...chipCurrent }}>{it.label} · atual</span>
          ) : it.href ? (
            <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" style={{ ...chip, ...chipLink }}>
              {it.label} ↗
            </a>
          ) : (
            <span key={it.key} style={{ ...chip, opacity: 0.5 }} title="Ainda não existe / não publicado">{it.label}</span>
          ),
        )}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  padding: "10px 14px", marginBottom: 14, borderRadius: 12,
  background: "var(--color-surface)", border: "1px solid var(--color-border)",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "var(--color-text-secondary)",
};
const chip: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8,
  border: "1px solid var(--color-border)", textDecoration: "none", whiteSpace: "nowrap",
};
const chipLink: React.CSSProperties = { color: "var(--color-accent, #3b82f6)", background: "transparent", cursor: "pointer" };
const chipCurrent: React.CSSProperties = { color: "var(--color-text-primary)", background: "var(--color-border)" };

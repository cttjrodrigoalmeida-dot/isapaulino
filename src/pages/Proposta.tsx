import { useEffect } from "react";
import ProposalView from "../components/proposal/ProposalView";
import { SAMPLE_PROPOSAL } from "../components/proposal/sampleProposal";

// FASE VISUAL: esta página renderiza a proposta de EXEMPLO para validação do layout.
// Nas próximas fases: buscar o arquivo criptografado por número (/proposta/:number),
// pedir a senha, descriptografar e então renderizar <ProposalView proposal={...} />.
export default function Proposta() {
  useEffect(() => {
    const prev = document.title;
    document.title = `Proposta Nº ${SAMPLE_PROPOSAL.number} · Isabela Paulino Studio`;
    return () => {
      document.title = prev;
    };
  }, []);

  return <ProposalView proposal={SAMPLE_PROPOSAL} />;
}

import { useEffect, useState } from "react";
import ProposalsList from "../ProposalsList";
import ProposalEditor from "../ProposalEditor";
import BriefingsList from "../BriefingsList";
import BriefingEditor from "../BriefingEditor";
import BriefingResponses from "../BriefingResponses";
import Contratos from "./Contratos";
import admin from "../Admin.module.css";

// Contratos também faz parte do comercial (proposta → contrato → briefing), então
// aparece aqui como aba além de ter a seção dedicada própria na barra lateral.
// Ordem do fluxo: primeiro a proposta, depois assinar o contrato, e só então o briefing.
type Area = "proposals" | "briefings" | "contracts";
type View =
  | { name: "list" }
  | { name: "editor"; number: string | null; duplicateFrom?: string | null }
  | { name: "responses"; number: string };

export default function Comercial({ requestNew }: { requestNew?: { area: Area; n: number } | null }) {
  const [area, setArea] = useState<Area>("proposals");
  const [view, setView] = useState<View>({ name: "list" });

  // QuickNav "Nova proposta"/"Novo briefing" → abre o editor correspondente.
  useEffect(() => {
    if (!requestNew) return;
    setArea(requestNew.area);
    setView({ name: "editor", number: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNew?.n]);

  const goArea = (a: Area) => {
    setArea(a);
    setView({ name: "list" });
  };

  return (
    <div>
      <div className={admin.tabs}>
        <button className={`${admin.tab} ${area === "proposals" ? admin.tabActive : ""}`} onClick={() => goArea("proposals")}>
          Propostas
        </button>
        <button className={`${admin.tab} ${area === "contracts" ? admin.tabActive : ""}`} onClick={() => goArea("contracts")}>
          Contratos
        </button>
        <button className={`${admin.tab} ${area === "briefings" ? admin.tabActive : ""}`} onClick={() => goArea("briefings")}>
          Briefings
        </button>
      </div>

      {area === "contracts" ? (
        <Contratos requestNew={requestNew?.area === "contracts" ? requestNew.n : null} />
      ) : area === "proposals" ? (
        view.name === "list" ? (
          <ProposalsList
            onNew={() => setView({ name: "editor", number: null })}
            onEdit={(number) => setView({ name: "editor", number })}
            onDuplicate={(number) => setView({ name: "editor", number: null, duplicateFrom: number })}
          />
        ) : (
          <ProposalEditor
            number={view.name === "editor" ? view.number : null}
            duplicateFrom={view.name === "editor" ? view.duplicateFrom ?? null : null}
            onBack={() => setView({ name: "list" })}
            onSaved={() => setView({ name: "list" })}
          />
        )
      ) : view.name === "list" ? (
        <BriefingsList
          onNew={() => setView({ name: "editor", number: null })}
          onEdit={(number) => setView({ name: "editor", number })}
          onResponses={(number) => setView({ name: "responses", number })}
          onDuplicate={(number) => setView({ name: "editor", number: null, duplicateFrom: number })}
        />
      ) : view.name === "responses" ? (
        <BriefingResponses number={view.number} onBack={() => setView({ name: "list" })} />
      ) : (
        <BriefingEditor
          number={view.name === "editor" ? view.number : null}
          duplicateFrom={view.name === "editor" ? view.duplicateFrom ?? null : null}
          onBack={() => setView({ name: "list" })}
          onSaved={() => setView({ name: "list" })}
        />
      )}
    </div>
  );
}

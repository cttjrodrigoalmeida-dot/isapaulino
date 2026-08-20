import { useEffect, useState } from "react";
import ClientsList from "../ClientsList";
import ClientEditor from "../ClientEditor";
import ClientHistory from "../ClientHistory";
import ClientPanorama from "../ClientPanorama";
import ProjectHistory from "../ProjectHistory";

type View =
  | { name: "list" }
  | { name: "editor"; id: string | null }
  | { name: "panorama"; id: string }
  | { name: "projectHistory"; contractId: string; projectLabel: string; clientName: string; signed: boolean; clientId: string }
  | { name: "history"; id: string; clientName: string; phone: string | null };

export default function Clientes({ requestNew, onGoArquivos }: { requestNew?: number | null; onGoArquivos?: (folder: string) => void }) {
  const [view, setView] = useState<View>({ name: "list" });

  // Atalho "Novo cliente" → abre o editor em modo novo.
  useEffect(() => {
    if (requestNew) setView({ name: "editor", id: null });
  }, [requestNew]);

  if (view.name === "editor") {
    return (
      <ClientEditor
        id={view.id}
        onBack={() => setView({ name: "list" })}
        onSaved={() => setView({ name: "list" })}
        onGoArquivos={onGoArquivos}
      />
    );
  }

  if (view.name === "panorama") {
    const cid = view.id;
    return (
      <ClientPanorama
        clientId={cid}
        onBack={() => setView({ name: "list" })}
        onEdit={(id) => setView({ name: "editor", id })}
        onOpenHistory={(contractId, projectLabel, signed, clientName) =>
          setView({ name: "projectHistory", contractId, projectLabel, signed, clientName, clientId: cid })}
      />
    );
  }

  if (view.name === "projectHistory") {
    return (
      <ProjectHistory
        contractId={view.contractId}
        projectLabel={view.projectLabel}
        clientName={view.clientName}
        signed={view.signed}
        onBack={() => setView({ name: "panorama", id: view.clientId })}
      />
    );
  }

  if (view.name === "history") {
    return (
      <ClientHistory
        clientId={view.id}
        clientName={view.clientName}
        clientPhone={view.phone}
        onBack={() => setView({ name: "list" })}
      />
    );
  }

  return (
    <ClientsList
      onNew={() => setView({ name: "editor", id: null })}
      onEdit={(id) => setView({ name: "editor", id })}
      onPanorama={(id) => setView({ name: "panorama", id })}
      onHistory={(id, name, phone) => setView({ name: "history", id, clientName: name, phone })}
    />
  );
}

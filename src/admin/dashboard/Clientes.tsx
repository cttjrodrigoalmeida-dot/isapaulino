import { useEffect, useState } from "react";
import ClientsList from "../ClientsList";
import ClientEditor from "../ClientEditor";
import ClientHistory from "../ClientHistory";
import ClientPanorama from "../ClientPanorama";

type View =
  | { name: "list" }
  | { name: "editor"; id: string | null }
  | { name: "panorama"; id: string }
  | { name: "history"; id: string; clientName: string; phone: string | null };

export default function Clientes({ requestNew }: { requestNew?: number | null }) {
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
      />
    );
  }

  if (view.name === "panorama") {
    return (
      <ClientPanorama
        clientId={view.id}
        onBack={() => setView({ name: "list" })}
        onEdit={(id) => setView({ name: "editor", id })}
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

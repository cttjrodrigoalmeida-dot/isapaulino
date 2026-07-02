import { useEffect, useState } from "react";
import ClientsList from "../ClientsList";
import ClientEditor from "../ClientEditor";

type View = { name: "list" } | { name: "editor"; id: string | null };

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

  return (
    <ClientsList
      onNew={() => setView({ name: "editor", id: null })}
      onEdit={(id) => setView({ name: "editor", id })}
    />
  );
}

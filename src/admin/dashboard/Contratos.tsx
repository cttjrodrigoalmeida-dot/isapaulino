import { useEffect, useState } from "react";
import ContractsList from "../ContractsList";
import ContractEditor from "../ContractEditor";
import ContractPayments from "../ContractPayments";

type View =
  | { name: "list" }
  | { name: "editor"; id: string | null; kind?: "principal" | "aditivo"; parentId?: string | null; duplicateFrom?: string | null }
  | { name: "payments"; id: string; title: string };

export default function Contratos({ requestNew }: { requestNew?: number | null }) {
  const [view, setView] = useState<View>({ name: "list" });

  useEffect(() => {
    if (requestNew) setView({ name: "editor", id: null, kind: "principal" });
  }, [requestNew]);

  if (view.name === "editor") {
    return (
      <ContractEditor
        id={view.id}
        kind={view.kind}
        parentId={view.parentId}
        duplicateFrom={view.duplicateFrom ?? null}
        onBack={() => setView({ name: "list" })}
        onSaved={() => setView({ name: "list" })}
      />
    );
  }

  if (view.name === "payments") {
    return (
      <ContractPayments
        contractId={view.id}
        contractTitle={view.title}
        onBack={() => setView({ name: "list" })}
      />
    );
  }

  return (
    <ContractsList
      onNew={() => setView({ name: "editor", id: null, kind: "principal" })}
      onNewAditivo={(parentId) => setView({ name: "editor", id: null, kind: "aditivo", parentId })}
      onEdit={(id) => setView({ name: "editor", id })}
      onPayments={(id, title) => setView({ name: "payments", id, title })}
      onDuplicate={(id) => setView({ name: "editor", id: null, kind: "principal", duplicateFrom: id })}
    />
  );
}

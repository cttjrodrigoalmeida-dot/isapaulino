import s from "./Dashboard.module.css";
import { IcPlus } from "./icons";

export type QuickAction =
  | "cliente"
  | "proposta"
  | "contrato"
  | "briefing"
  | "projeto"
  | "recebimento"
  | "lembrete"
  | "relatorio";

const ITEMS: { id: QuickAction; label: string }[] = [
  { id: "cliente", label: "Novo cliente" },
  { id: "proposta", label: "Nova proposta" },
  { id: "contrato", label: "Novo contrato" },
  { id: "briefing", label: "Novo briefing" },
  { id: "projeto", label: "Novo projeto" },
  { id: "recebimento", label: "Novo recebimento" },
  { id: "lembrete", label: "Enviar lembrete" },
  { id: "relatorio", label: "Exportar relatório" },
];

export default function QuickNav({ onAction }: { onAction: (a: QuickAction) => void }) {
  return (
    <nav className={s.quicknav}>
      {ITEMS.map((it) => (
        <button key={it.id} className={s.quickBtn} onClick={() => onAction(it.id)}>
          <IcPlus />
          {it.label}
        </button>
      ))}
    </nav>
  );
}

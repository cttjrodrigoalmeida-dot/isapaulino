// Tipos de evento do Histórico do Projeto (timeline). Cada tipo tem uma cor
// própria, usada no painel (registro) e na Área do Cliente (acompanhamento).
export interface ProjectEventType {
  id: string;
  label: string;
  color: string;
}

export const PROJECT_EVENT_TYPES: ProjectEventType[] = [
  { id: "inicio", label: "Início", color: "#7c8698" },
  { id: "reuniao", label: "Reunião", color: "#2f6fed" },
  { id: "entrega", label: "Entrega", color: "#2f9e44" },
  { id: "revisao", label: "Revisão", color: "#b07a16" },
  { id: "alteracao", label: "Alteração", color: "#f0506e" },
  { id: "marco", label: "Marco", color: "#8b5cf6" },
  { id: "observacao", label: "Observação", color: "#0891b2" },
];

export function eventTypeMeta(id: string): ProjectEventType {
  return PROJECT_EVENT_TYPES.find((t) => t.id === id) ?? { id, label: id || "Evento", color: "#7c8698" };
}

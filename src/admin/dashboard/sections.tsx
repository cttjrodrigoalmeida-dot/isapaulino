import type { ReactNode } from "react";
import {
  IcDashboard,
  IcComercial,
  IcClientes,
  IcProjetos,
  IcFinanceiro,
  IcCalendario,
  IcRelatorios,
  IcArquivos,
  IcStorage,
  IcTarefas,
  IcTabela,
  IcBiblioteca,
  IcHistorico,
} from "./icons";

export type SectionId =
  | "visao"
  | "comercial"
  | "clientes"
  // "contratos" continua acessível internamente (Comercial já cobre contratos),
  // mas não aparece mais como item do menu lateral.
  | "contratos"
  | "projetos"
  | "historico"
  | "tarefas"
  | "financeiro"
  | "tabela"
  | "calendario"
  | "relatorios"
  | "arquivos"
  | "biblioteca"
  | "auditoria"
  | "lixeira"
  | "armazenamento";

export interface SectionDef {
  id: SectionId;
  label: string;
  sub: string;
  icon: () => ReactNode;
  /** Cabeçalho da categoria no menu (vazio = sem categoria, ex.: Visão geral). */
  category?: string;
  /** true = página real nesta etapa; false = placeholder "em breve". */
  ready: boolean;
}

// Ordem = ordem no menu. O `category` cria os cabeçalhos (COMERCIAL, PRODUÇÃO…).
export const SECTIONS: SectionDef[] = [
  { id: "visao", label: "Visão geral", sub: "Resumo do estúdio", icon: IcDashboard, ready: true },

  { id: "comercial", label: "Comercial", sub: "Propostas, contrato e briefing", icon: IcComercial, category: "Comercial", ready: true },
  { id: "clientes", label: "Clientes", sub: "Lista e relacionamento", icon: IcClientes, category: "Comercial", ready: true },

  { id: "projetos", label: "Projetos", sub: "Andamento e entregas", icon: IcProjetos, category: "Produção", ready: true },
  { id: "tarefas", label: "Tarefas", sub: "Lista de tarefas", icon: IcTarefas, category: "Produção", ready: true },
  { id: "calendario", label: "Calendário", sub: "Compromissos e agendas", icon: IcCalendario, category: "Produção", ready: true },

  { id: "historico", label: "Histórico do projeto", sub: "Linha do tempo dos projetos", icon: IcHistorico, category: "Gestão", ready: true },
  { id: "financeiro", label: "Financeiro", sub: "Receitas, custos e parcelas", icon: IcFinanceiro, category: "Gestão", ready: true },
  { id: "tabela", label: "Tabela de custos", sub: "Custos e preços do estúdio", icon: IcTabela, category: "Gestão", ready: true },
  { id: "relatorios", label: "Relatórios", sub: "Desempenho e métricas", icon: IcRelatorios, category: "Gestão", ready: true },

  { id: "arquivos", label: "Arquivos", sub: "Pastas e documentos", icon: IcArquivos, category: "Recursos", ready: true },
  { id: "biblioteca", label: "Biblioteca", sub: "Imagens, perguntas, blocos e notas", icon: IcBiblioteca, category: "Recursos", ready: true },

  { id: "auditoria", label: "Auditoria", sub: "Registro de ações", icon: IcRelatorios, category: "Sistema", ready: true },
  { id: "lixeira", label: "Lixeira", sub: "Restaurar excluídos", icon: IcArquivos, category: "Sistema", ready: true },
  { id: "armazenamento", label: "Armazenamento", sub: "Uso do R2 e backup", icon: IcStorage, category: "Sistema", ready: true },
];

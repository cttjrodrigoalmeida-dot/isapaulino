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
  IcContrato,
} from "./icons";

export type SectionId =
  | "visao"
  | "comercial"
  | "clientes"
  | "contratos"
  | "projetos"
  | "financeiro"
  | "calendario"
  | "relatorios"
  | "arquivos"
  | "auditoria"
  | "lixeira"
  | "armazenamento";

export interface SectionDef {
  id: SectionId;
  label: string;
  sub: string;
  icon: () => ReactNode;
  /** true = página real nesta etapa; false = placeholder "em breve". */
  ready: boolean;
}

export const SECTIONS: SectionDef[] = [
  { id: "visao", label: "Visão geral", sub: "Resumo do estúdio", icon: IcDashboard, ready: true },
  { id: "comercial", label: "Comercial", sub: "Propostas, contrato e briefing", icon: IcComercial, ready: true },
  { id: "clientes", label: "Clientes", sub: "Lista e relacionamento", icon: IcClientes, ready: true },
  { id: "contratos", label: "Contratos", sub: "Documentos e assinatura", icon: IcContrato, ready: true },
  { id: "projetos", label: "Projetos", sub: "Andamento e entregas", icon: IcProjetos, ready: true },
  { id: "financeiro", label: "Financeiro", sub: "Receitas, custos e parcelas", icon: IcFinanceiro, ready: true },
  { id: "calendario", label: "Calendário", sub: "Compromissos e agendas", icon: IcCalendario, ready: true },
  { id: "relatorios", label: "Relatórios", sub: "Desempenho e métricas", icon: IcRelatorios, ready: true },
  { id: "arquivos", label: "Arquivos", sub: "Pastas e documentos", icon: IcArquivos, ready: true },
  { id: "auditoria", label: "Auditoria", sub: "Registro de ações", icon: IcRelatorios, ready: true },
  { id: "lixeira", label: "Lixeira", sub: "Restaurar excluídos", icon: IcArquivos, ready: true },
  { id: "armazenamento", label: "Armazenamento", sub: "Uso do R2 e backup", icon: IcStorage, ready: true },
];

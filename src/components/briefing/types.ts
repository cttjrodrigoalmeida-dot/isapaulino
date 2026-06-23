// ============================================================
// Modelo de dados de um Briefing (Isabela Paulino Studio)
// Um briefing é LINKADO a uma proposta (por número) e organizado em SEÇÕES.
// Há dois tipos de seção:
//   - "info"      → perguntas gerais (Informações Iniciais), sem imagem.
//   - "ambiente"  → uma imagem (render/foto) com perguntas posicionadas por
//                   PINOS NUMERADOS (x,y em %). Ex.: Cozinha, Sala de TV, Banheiro.
//
// IMPORTANTE: este arquivo descreve o TEMPLATE do briefing (conteúdo editável
// que, futuramente, virá do admin/CMS). As RESPOSTAS do cliente NÃO ficam aqui —
// vivem no estado do componente (e localStorage) e são exportadas em PDF.
// ============================================================

import type { ContactInfo } from "../proposal/types";

export type QuestionType =
  | "text"
  | "longtext"
  | "radio"
  | "select"
  | "checklist"
  | "maquete";

export interface BriefingQuestion {
  /** Identificador estável (chave de resposta/referência). */
  id: string;
  /** Enunciado da pergunta. */
  text: string;
  /** Dica/exemplo opcional (exibido com "+" antes). */
  hint?: string;
  /** Observação/aviso opcional, em destaque abaixo da pergunta. */
  note?: string;
  /** Tipo do controle. Default: "longtext" (caixa de texto). */
  type?: QuestionType;
  /** Opções para radio/select/maquete. */
  options?: string[];
  /** Placeholder do select (ex.: "selecione"). */
  placeholder?: string;
  /**
   * Pino numerado sobre a imagem (só em seções "ambiente"), em % (0–100).
   * `label` é um rótulo curto exibido abaixo do número.
   */
  pin?: { x: number; y: number; label?: string };
  /** Se false, a resposta é opcional. Default: true (todas obrigatórias). */
  required?: boolean;
  /** Se true, oferece anexar imagem de referência. Default depende da seção. */
  allowReference?: boolean;
  /** Botões de preenchimento rápido (ex.: ["À DEFINIR", "NÃO SE APLICA"]). */
  quickFills?: string[];
}

export interface BriefingSection {
  id: string;
  /** "info" = perguntas gerais; "ambiente" = imagem + pinos. */
  kind: "info" | "ambiente";
  /** Título da seção, ex.: "INFORMAÇÕES INICIAIS" / "COZINHA/GOURMET".
   *  Usado também como rótulo na timeline. */
  title: string;
  /** Título exibido em linhas (a 1ª na cor primária, as demais em secundária).
   *  Se ausente, usa `title` numa linha só. Ex.: ["INFORMAÇÕES", "INICIAIS"]. */
  titleLines?: string[];
  /** Linha de apoio exibida sob o título. */
  intro?: string;
  /** Imagem base (apenas em seções "ambiente"). */
  image?: string;
  questions: BriefingQuestion[];
}

export interface Briefing {
  /** Número do briefing — espelha o número da proposta linkada. */
  number: string;
  /** FK → Proposal.number. Usado para puxar cliente/projeto/data. */
  proposalNumber: string;
  /** Título da página, ex.: "BRIEFING DE DETALHAMENTO". */
  title: string;
  /** Seções na ordem de exibição (Informações Iniciais + ambientes). */
  sections: BriefingSection[];
  /** Contato (reutiliza o modelo da proposta). */
  contact: ContactInfo;
  /** E-mail de envio exibido no card de maquete. */
  studioEmail?: string;

  // ── Fallback de exibição caso a proposta linkada não seja encontrada ──
  client?: string;
  serviceTitle?: string;
  date?: string;
}

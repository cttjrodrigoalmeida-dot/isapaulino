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

/**
 * Botões de resposta rápida presentes em TODAS as perguntas (menos "maquete").
 * Extras por pergunta ficam em `BriefingQuestion.quickFills` e aparecem depois
 * destes, na mesma linha.
 */
export const DEFAULT_QUICKFILLS = ["À DEFINIR", "NÃO SE APLICA"];

export type QuestionType =
  /** Sem campo de resposta: a pergunta mostra SÓ os botões rápidos
   *  ("À DEFINIR" / "NÃO SE APLICA" / extras). Para quando digitar não faz
   *  sentido e a escolha rápida já basta. */
  | "none"
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "radio"
  | "yesno"
  | "checklist"
  | "multicheck"
  | "select"
  | "scale"
  | "maquete"
  | "arquivo";

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
  /** Opções para radio/checklist/multicheck/select/maquete. */
  options?: string[];
  /**
   * Nota máxima da escala (só em `type: "scale"`). Default: 5.
   */
  scaleMax?: number;
  /**
   * Se true, inclui uma opção "Outros" — ao selecionar, abre um campo livre para
   * o cliente digitar. A resposta fica "Outros: <texto>". Vale para perguntas de
   * escolha (radio, sim/não, lista, múltipla escolha e seleção).
   */
  allowOther?: boolean;
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
  /**
   * Botões de preenchimento rápido EXTRAS desta pergunta (ex.: ["IGUAL AO ANTERIOR"]).
   * Os padrões `DEFAULT_QUICKFILLS` ("À DEFINIR"/"NÃO SE APLICA") já aparecem em
   * todas as perguntas automaticamente — não precisa repeti-los aqui.
   */
  quickFills?: string[];
  /**
   * Opções que, quando selecionadas, deixam o próprio botão em alerta (borda
   * vermelha) e bloqueiam outras perguntas (ver `locksQuestionIds` /
   * `locksAllOtherQuestions`).
   */
  alertOptions?: string[];
  /** Ids de outras perguntas que ficam bloqueadas enquanto uma opção de `alertOptions` estiver selecionada. */
  locksQuestionIds?: string[];
  /** Se true, bloqueia TODAS as outras perguntas do briefing (exceto as listadas em `lockExceptIds`). */
  locksAllOtherQuestions?: boolean;
  /** Ids que ficam de fora do bloqueio quando `locksAllOtherQuestions` for true. */
  lockExceptIds?: string[];
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
  /**
   * Marca esta seção como CONTINUAÇÃO do ambiente anterior (mesmo título).
   * Usado SÓ no editor, para agrupar/rotular visualmente (não muda a página do
   * cliente). Definido pelo botão "+ Continuação".
   */
  continuation?: boolean;
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

  // ── Snapshot da proposta vinculada (puxado ao vincular no admin) ──
  // Usado para exibir cliente/projeto/data/tags sem depender de buscar a
  // proposta de novo na hora de renderizar o briefing.
  client?: string;
  serviceTitle?: string;
  serviceTags?: string[];
  date?: string;
}

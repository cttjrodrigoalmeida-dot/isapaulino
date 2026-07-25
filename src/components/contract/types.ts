// ============================================================
// Modelo de dados de um Contrato (Isabela Paulino Studio)
// Documento estruturado e 100% personalizável, renderizado em /contrato/:slug
// e editável no painel. Espelha a filosofia da Proposta: o texto jurídico fixo
// das cláusulas vive em contractDefaults.ts e pode ser sobrescrito por contrato.
// ============================================================

import type { ContactInfo } from "../proposal/types";

export type SignatureStatus = "aguardando" | "pendente" | "assinado" | "cancelado";

/** Uma das partes do contrato (CONTRATANTE / CONTRATADA). */
export interface ContractParty {
  /** "CONTRATANTE" / "CONTRATADA" */
  label: string;
  name: string;
  role: string;            // "ARQUITETO E URBANISTA"
  nacionalidade: string;
  nascimento: string;      // "21/08/1995"
  cpfCnpj: string;
  contato: string;         // "+55 62 9 9194-2598"
  email: string;
  endereco: string;
}

/** Etapas do projeto (01 Proposta · 02 Contrato · 03 Briefing · 04 Área de Cliente). */
export interface ContractStage {
  number: string;
  label: string;
  active?: boolean;
}

/** Bloco de conteúdo de uma cláusula: parágrafo simples ou lista de itens. */
export type ClauseBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

/** Cláusula jurídica (01–18). */
export interface ContractClause {
  /** "01".."18" */
  number: string;
  /** Rótulo curto exibido acima do título, ex.: "OBJETO". */
  eyebrow?: string;
  /** Título da cláusula, ex.: "DO OBJETO". */
  title: string;
  blocks: ClauseBlock[];
}

/** Card de informação (rótulo + valor), usado nos blocos de prazo/arquivos. */
export interface InfoCard {
  label: string;
  value: string;
  sub?: string;
}

// ── Seção 06 — variante "pagamento" ──
export interface ContractInstallmentRow {
  number: string;          // "01".."04"
  label: string;           // "PRIMEIRA PARCELA"
  valor: string;           // "R$ 500,00"
  valorExtenso?: string;
  vencimento: string;      // "01/08/2026 a 05/08/2026"
}

export interface SixPagamento {
  valorTotal: string;      // "R$ 2.000,00"
  valorTotalExtenso?: string;
  /** Resumo do pagamento, ex.: ["4 parcelas mensais", "Vencimento todo dia 05", "Sem juros"]. */
  resumo: string[];
  entrada?: { valor: string; valorExtenso?: string; vencimento: string };
  parcelas: ContractInstallmentRow[];
}

// ── Seção 06 — variante "tabela-custos" ──
export interface CostRow {
  servico: string;
  descricao?: string;
  valor: string;           // pode ter várias linhas (usar \n)
}
export interface CostTable {
  titulo: string;          // "• PLANTAS EXECUTIVAS"
  nota?: string;
  /** Cabeçalhos das colunas. Default: ["SERVIÇO", "DESCRIÇÃO", "VALOR UNITÁRIO"]. */
  colunas?: string[];
  linhas: CostRow[];
}
export interface SixTabelaCustos {
  intro?: string;
  tabelas: CostTable[];
  observacoes?: string[];
}

/** Card PIX (cláusula 07). */
export interface PixInfo {
  chave: string;           // valor copiável, ex.: "49914763000137"
  chaveLabel: string;      // "CHAVE PIX (CNPJ)"
  titular: string;         // "ISABELA PAULINO STUDIO"
  lembrete?: string;
}

/** Bloco de assinatura/status. */
export interface SignatureBlock {
  status: SignatureStatus;
  assinadoEm?: string;     // "25/06/2026 ás 08:26"
  ip?: string;
  /** Texto de validade legal, ex.: "Conforme MP 2.200-2/2001 e Lei 14.063/2020." */
  validadeLegal: string;
  contratante: { name: string; role: string };
  contratada: { name: string; role: string };
}

export interface ContractDoc {
  // ── Identificação / cabeçalho ──
  contractNumber: string;       // "2622"
  proposalNumber?: string;      // "2624"
  date: string;                 // "24/06/2026"
  /** "CONTRATO DE PRESTAÇÃO DE SERVIÇO" */
  documentTitle: string;
  /** "DETALHAMENTO EXECUTIVO" */
  serviceTitle: string;
  tags?: string[];              // ["APARTAMENTO", "TERCEIRIZAÇÃO"]
  projectName: string;          // exibido em "PROJETO"
  clientName: string;           // exibido em "CLIENTE"
  stages: ContractStage[];

  // ── Partes ──
  contratante: ContractParty;
  contratada: ContractParty;

  // ── Objeto / escopo ──
  objetoIntro: string[];        // parágrafos iniciais (As partes… / O detalhamento…)
  escopoAmbientes: string[];    // ambientes do escopo
  escopoServicos: string[];     // serviços incluídos (2.2)

  // ── Cláusulas jurídicas (01–18) ──
  clauses: ContractClause[];

  // ── Blocos visuais ──
  prazoCards: InfoCard[];       // cláusula 05
  arquivosCards: InfoCard[];    // cláusula 11
  /** Cards do bloco de validade/vigência (cláusula 18): VIGÊNCIA / INÍCIO / TÉRMINO.
   *  label = rótulo (ex.: "VIGÊNCIA"), value = destaque (ex.: "3 meses"). */
  validadeCards?: InfoCard[];   // cláusula 18
  sixVariant: "pagamento" | "tabela-custos";
  sixPagamento?: SixPagamento;
  sixTabelaCustos?: SixTabelaCustos;
  pix: PixInfo;

  // ── Assinatura / status ──
  signature: SignatureBlock;
  autentiqueUrl?: string;
  validUntil?: string;          // ISO para o contador regressivo (opcional)

  // ── Contato ──
  contact: ContactInfo;

  /** Visibilidade de seções opcionais. */
  show?: {
    countdown?: boolean;
    [k: string]: boolean | undefined;
  };
}

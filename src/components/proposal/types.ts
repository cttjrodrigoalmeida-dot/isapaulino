// ============================================================
// Modelo de dados de uma Proposta (Isabela Paulino Studio)
// Compartilhado entre o CMS (editor) e a página pública (ProposalView).
// Tudo aqui é o que MUDA por cliente. O conteúdo fixo da marca
// (sobre o estúdio, processo, condições gerais, não inclusos) vive
// em proposalDefaults.ts e pode ser sobrescrito por proposta.
// ============================================================

export interface PriceLine {
  label: string;
  /** Valor já formatado, ex.: "R$ 480,00". String para permitir "a combinar", "—", etc. */
  value: string;
  /**
   * Item de CORTESIA (brinde): não entra no subtotal do bloco nem no
   * investimento total. Na proposta pública sai numa faixa de brindes à parte
   * (valor original riscado → R$ 0,00). `value` guarda o valor original.
   */
  brinde?: boolean;
}

export interface InvestmentBlock {
  /** Ex.: "ANTEPROJETO" / "DETALHAMENTO" */
  title: string;
  /** Ex.: "PLANTAS TÉCNICAS" / "LAYOUT · MARMORARIA · MARCENARIA · SERRALHERIA" */
  subtitle?: string;
  lines: PriceLine[];
  /** Subtotal do bloco já formatado, ex.: "R$ 2.450,00" */
  subtotal: string;
  /** Observação de desconto/parcelamento do bloco */
  discountNote?: string;
}

export interface ProcessStep {
  /** Ex.: "01" */
  number: string;
  title: string;
  /** Linhas/itens da etapa */
  items: string[];
  /** Observação opcional (ex.: dúvidas comuns) — aceita texto simples */
  note?: string;
}

export interface ClauseItem {
  title: string;
  body: string;
}

export interface GalleryItem {
  /** Caminho da imagem (upload no repo) ou URL */
  image: string;
  /** Legenda opcional, ex.: nome do projeto / ambiente */
  caption?: string;
}

export interface PaymentOption {
  title: string;
  desc: string;
}

/** Card 01 — pagamento à vista via PIX (com destaque/"brilho"). */
export interface PixPlan {
  /** Selo do desconto, ex.: "5% OFF" */
  discountLabel: string;
  /** Quanto o cliente economiza, ex.: "R$ 100,00" */
  saveAmount: string;
  /** Valor cheio (exibido riscado), ex.: "R$ 2.000,00" */
  fromValue: string;
  /** Valor final à vista, ex.: "R$ 1.900,00" */
  payValue: string;
  /** Rodapé com check, ex.: "Pagamento após assinatura do contrato".
   *  LEGADO: usado só quando `footnotes` está vazio (propostas antigas). */
  footnote?: string;
  /** Rodapés com check — vários, iguais aos do Card 02.
   *  Ex.: ["Pagamento após assinatura do contrato", "Sem taxas adicionais"] */
  footnotes?: string[];
}

/** Card 02 — parcelamento. */
export interface InstallmentPlan {
  /** Chamada do card, ex.: "Até 4x sem juros" */
  headline: string;
  /** Linhas da tabela: { label: "2x", value: "R$ 1.000,00" } */
  rows: PriceLine[];
  /** Rodapés com check, ex.: ["Pagamento em 4x sem juros", "Vencimentos definidos previamente"] */
  notes?: string[];
}

export interface ContactInfo {
  whatsapp: string;   // ex.: "5562991942598"
  whatsappLabel: string; // ex.: "+55 (62) 9 9194-2598"
  instagram: string;  // ex.: "isapaulinostudio"
  website: string;    // ex.: "isabelapaulino.com.br"
  tiktok?: string;
  threads?: string;
  pinterest?: string;
}

export interface Proposal {
  // ── Identificação ──
  /** Número sequencial, ex.: "0007" */
  number: string;
  client: string;          // "ARQ. NOME DO CLIENTE"
  clientFirstName: string; // usado na carta "HEY ISA, TUDO BEM?"
  date: string;            // "18/05/2026"
  validity: string;        // "3 dias úteis" (texto exibido)
  validUntil?: string;     // ISO de expiração (ex.: "2026-06-19T23:59:59") p/ contador regressivo

  // ── Capa / chamada ──
  serviceTitle: string;    // "DETALHAMENTO EXECUTIVO"
  serviceTags: string[];   // ["APARTAMENTO", "TERCEIRIZAÇÃO"]
  coverImage?: string;     // imagem opcional de capa do projeto

  // ── Carta de boas-vindas / escopo ──
  scopeIntro: string;      // parágrafo(s) de apresentação do escopo
  scopeNote?: string;      // observação (ex.: entregas em PDF e DWG/PLN)
  ambientes: string[];     // lista de ambientes do escopo

  // ── Portfólio / trabalhos anteriores ──
  galleryTitle?: string;   // ex.: "Projetos anteriores"
  galleryIntro?: string;
  gallery?: GalleryItem[]; // imagens editáveis (se vazio, a seção não aparece)

  // ── Investimento ──
  investimentoIntro?: string;
  investmentBlocks: InvestmentBlock[];
  /** Destaque de desconto combinado (ex.: fechar anteprojeto + detalhamento) */
  comboNote?: string;
  total: string;           // "R$ 0.000,00"
  totalExtenso: string;    // valor por extenso

  // ── Forma de pagamento (exibida abaixo do total) ──
  pixKey: string;          // texto exibido, ex.: "CNPJ: 49914763000137 (CONTA PJ)"
  /** Valor exato da chave (sem rótulo/parênteses), usado pelo botão "copiar". Se ausente, copia pixKey. */
  pixKeyValue?: string;
  /** Card 01 (PIX à vista, em destaque). Se ausente, usa o layout antigo de paymentOptions. */
  pixPlan?: PixPlan;
  /** Card 02 (parcelamento). */
  installmentPlan?: InstallmentPlan;
  /** Lembrete ao lado da chave PIX, ex.: "Envie o comprovante após o pagamento..." */
  pixReminder?: string;
  /** Layout antigo (fallback) caso pixPlan/installmentPlan não sejam informados. */
  paymentOptions?: PaymentOption[];
  paymentNote?: string;

  // ── Prazo ──
  /** Nome do projeto no título do bloco principal: "Prazo de Entrega: {prazoTitulo}". */
  prazoTitulo?: string;
  prazoDetalhamento: string; // "15 dias úteis"
  prazoAnteprojeto?: string; // "7 dias úteis"
  availableDate?: string;    // "DD-MM-AAAA"
  prazoNote?: string;
  /** Blocos de prazo adicionais (um por projeto/serviço) — cards separados abaixo. */
  prazoBlocos?: { titulo: string; itens: { label: string; value: string }[] }[];

  // ── Contato ──
  contact: ContactInfo;

  // ── Conteúdo fixo da marca (sobrescrevível). Se ausente, usa defaults. ──
  studioAbout?: { eyebrow: string; titleLines: string[]; paragraphs: string[]; photo?: string };
  processSteps?: ProcessStep[];
  clauses?: ClauseItem[];
  notIncluded?: string[];

  // ── Visibilidade de seções ──
  show?: {
    about?: boolean;
    process?: boolean;
    clauses?: boolean;
    notIncluded?: boolean;
  };
}

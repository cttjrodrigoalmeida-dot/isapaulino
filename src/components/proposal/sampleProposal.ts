import type { Proposal } from "./types";
import { DEFAULT_CONTACT } from "./proposalDefaults";

// Proposta de exemplo — usada para validar o visual do template.
// Reproduz os campos editáveis do "modelo de proposta.pdf".
export const SAMPLE_PROPOSAL: Proposal = {
  number: "2624", // 26 = ano (2026) + 24 = nº sequencial da proposta
  client: "ARQ. NOME DO CLIENTE",
  clientFirstName: "Isa",
  date: "18/05/2026",
  validity: "3 dias úteis",
  // expiração de exemplo: ~3 dias a partir de agora (apenas p/ o contador ao vivo)
  validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),

  serviceTitle: "DETALHAMENTO EXECUTIVO",
  serviceTags: ["APARTAMENTO", "TERCEIRIZAÇÃO"],
  coverImage: "",

  scopeIntro:
    "Esta proposta tem como objetivo o desenvolvimento do Projeto Executivo de Cerillo Gavi com 11 ambientes. O trabalho será realizado de forma terceirizada, garantindo qualidade técnica, precisão nos detalhes e clareza executiva.",
  scopeNote:
    "As entregas serão realizadas em arquivos PDF e DWG ou .PLN. Nos próximos tópicos, apresentamos o escopo detalhado, os prazos previstos e as condições gerais para a execução deste projeto.",
  ambientes: [
    "Gourmet",
    "Quarto 01 / Varanda",
    "Banho 01",
    "Quarto 02",
    "Escritório",
    "Sala de Jantar",
    "Sala de TV",
    "Hall de entrada",
    "Quarto Master",
    "Closet Master",
    "Banho Master",
  ],

  galleryTitle: "Projetos anteriores",
  galleryIntro:
    "Uma amostra de detalhamentos executivos já desenvolvidos pelo estúdio — clareza técnica e organização prontas para a obra.",
  gallery: [
    { image: "/assets/portfolio/1.webp" },
    { image: "/assets/portfolio/2.webp" },
    { image: "/assets/portfolio/3.webp" },
    { image: "/assets/portfolio/4.webp" },
    { image: "/assets/portfolio/cafe-fiori.webp" },
    { image: "/assets/portfolio/PRANCHA%20PORTFOLIOS%20(1).webp" },
  ],

  investimentoIntro:
    "Para o desenvolvimento do seu detalhamento, o investimento será de:",
  investmentBlocks: [
    {
      title: "ANTEPROJETO",
      subtitle: "PLANTAS TÉCNICAS",
      lines: [
        { label: "Planta de Forro", value: "R$ 000,00" },
        { label: "Planta Luminotécnica", value: "R$ 000,00" },
        { label: "Planta Hidráulica", value: "R$ 000,00" },
        { label: "Planta Elétrica", value: "R$ 000,00" },
        { label: "Paginação de Piso e Parede", value: "R$ 000,00" },
      ],
      subtotal: "R$ 0.000,00",
      discountNote:
        "5% de desconto para pagamento à vista ou parcelamento em até 6x, sem desconto.",
    },
    {
      title: "DETALHAMENTO",
      subtitle: "LAYOUT · MARMORARIA · MARCENARIA · SERRALHERIA",
      lines: [
        { label: "Circulação", value: "R$ 150,00" },
        { label: "Sala de Jantar", value: "R$ 200,00" },
        { label: "Hall de Entrada", value: "R$ 235,00" },
        { label: "Banho 01", value: "R$ 260,00" },
        { label: "Banho Master", value: "R$ 270,00" },
        { label: "Gourmet", value: "R$ 300,00" },
        { label: "Sala de TV", value: "R$ 350,00" },
        { label: "Quarto 01", value: "R$ 480,00" },
        { label: "Quarto 02", value: "R$ 480,00" },
        { label: "Quarto Master", value: "R$ 480,00" },
        { label: "Escritório / Leitura", value: "R$ 480,00" },
        { label: "Closet Master", value: "R$ 530,00" },
      ],
      subtotal: "R$ 0.000,00",
      discountNote:
        "5% de desconto para pagamento à vista ou parcelamento em até 6x, sem desconto.",
    },
  ],
  comboNote: "10% de desconto caso fechar Anteprojeto e Detalhamento juntos.",
  total: "R$ 0.000,00",
  totalExtenso: "(valor por extenso)",

  pixKey: "CNPJ: 49914763000137 (Conta PJ)",
  pixKeyValue: "49914763000137",
  pixPlan: {
    discountLabel: "5% OFF",
    saveAmount: "R$ 100,00",
    fromValue: "R$ 2.000,00",
    payValue: "R$ 1.900,00",
    footnote: "Pagamento após assinatura do contrato",
  },
  installmentPlan: {
    headline: "Até 4x sem juros",
    rows: [
      { label: "À vista", value: "R$ 1.900,00" },
      { label: "2x", value: "R$ 1.000,00" },
      { label: "3x", value: "R$ 666,00" },
      { label: "4x", value: "R$ 500,00" },
    ],
    notes: ["Pagamento em 4x sem juros", "Vencimentos definidos previamente"],
  },
  pixReminder:
    "Envie o comprovante após o pagamento para darmos continuidade ao projeto.",
  paymentNote:
    "Caso prefira alguma outra forma de pagamento, basta me avisar. Ficarei feliz em encontrar a melhor alternativa para você.",

  prazoDetalhamento: "15 dias úteis",
  prazoAnteprojeto: "7 dias úteis",
  availableDate: "00-00-2026",
  prazoNote:
    "Importante: os prazos serão contabilizados a partir da data disponível para início indicada nesta proposta, desde que todas as informações e documentos necessários para a etapa contratada tenham sido recebidos e validados, incluindo layout definido (.DWG), briefing respondido, modelagem 3D aprovada (quando aplicável), CTB de layers ou Template (se houver), assinatura do contrato e confirmação do pagamento da entrada. Os prazos apresentados referem-se exclusivamente ao período de produção técnica, não incluindo períodos de análise, aprovações, revisões, ajustes ou pendências de informações.",

  contact: DEFAULT_CONTACT,
};

// Exemplo completo de contrato (caso "Nº 2622" do PDF de referência).
// Usado como template para novos contratos e fallback de pré-visualização.
import type { ContractDoc } from "./types";
import { DEFAULT_CONTACT } from "../proposal/proposalDefaults";
import {
  DEFAULT_STAGES,
  DEFAULT_CONTRATADA,
  DEFAULT_PIX,
  DEFAULT_PRAZO_CARDS,
  DEFAULT_ARQUIVOS_CARDS,
  DEFAULT_VALIDADE_LEGAL,
  DEFAULT_CLAUSES,
  DEFAULT_TABELA_CUSTOS,
} from "./contractDefaults";

export const SAMPLE_CONTRACT: ContractDoc = {
  contractNumber: "2622",
  proposalNumber: "2624",
  date: "24/06/2026",
  documentTitle: "CONTRATO DE\nPRESTAÇÃO DE SERVIÇO",
  serviceTitle: "DETALHAMENTO EXECUTIVO",
  tags: ["APARTAMENTO", "TERCEIRIZAÇÃO"],
  projectName: "ARQ.º NOME DO CLIENTE",
  clientName: "PAULO HENRIQUE QUEIROZ",
  stages: DEFAULT_STAGES,

  contratante: {
    label: "CONTRATANTE",
    name: "PAULO HENRIQUE QUEIROZ",
    role: "ARQUITETO E URBANISTA",
    nacionalidade: "Brasileiro",
    nascimento: "00/00/00",
    cpfCnpj: "00000000-0",
    contato: "+55 62 0 0000-0000",
    email: "emaildocliente@gmail.com",
    endereco: "rua t50 n 700 apto 210 Setor Marista. CEP 0000000",
  },
  contratada: DEFAULT_CONTRATADA,

  objetoIntro: [
    "As partes acima qualificadas têm entre si, justo e contratado, o presente Contrato de Prestação de Serviços de Arquitetura, que se regerá pelas cláusulas e condições a seguir.",
    "O detalhamento executivo será desenvolvido exclusivamente com base na planta de layout aprovada, arquivo SketchUp, briefing, materiais, especificações e demais informações fornecidas pelo CONTRATANTE, sendo este responsável pela veracidade, integridade e atualização dos documentos enviados.",
  ],
  escopoAmbientes: [
    "Gourmet", "Quarto 01/Varanda", "Banho 01", "Quarto 02", "Escritório", "Sala de Jantar",
    "Hall de entrada", "Quarto Master", "Closet Master", "Banho Master",
  ],
  escopoServicos: [
    "Planta Layout",
    "Planta Forro",
    "Planta Luminotécnico",
    "Planta hidráulica",
    "Planta Elétrica",
    "Planta Demolir e Construir",
    "Planta Paginação de Piso e Parede",
    "Detalhamento de Marmoraria",
    "Detalhamento de Marcenaria",
    "Detalhamento Serralheria",
    "Definição e padronização gráfica conforme template fornecido pelo CONTRATANTE ou, na ausência deste, template próprio da CONTRATADA;",
    "Entrega de arquivos finais em Archicad, Sketchup ou dwg e PDF, organizados em pastas;",
    "Inclusão de 02 (duas) rodadas de revisão técnica, limitadas a ajustes de cotas, simbologias, indicações e compatibilizações gráficas.",
  ],

  clauses: DEFAULT_CLAUSES,
  prazoCards: DEFAULT_PRAZO_CARDS,
  arquivosCards: DEFAULT_ARQUIVOS_CARDS,

  sixVariant: "pagamento",
  sixPagamento: {
    valorTotal: "R$ 2.000,00",
    valorTotalExtenso: "(valor em extenso automático)",
    resumo: ["4 parcelas mensais", "Vencimento todo dia 05", "Sem juros"],
    parcelas: [
      { number: "01", label: "PRIMEIRA PARCELA", valor: "R$ 500,00", valorExtenso: "(valor em extenso automático)", vencimento: "01/08/2026 a 05/08/2026" },
      { number: "02", label: "SEGUNDA PARCELA", valor: "R$ 500,00", valorExtenso: "(valor em extenso automático)", vencimento: "01/09/2026 a 05/09/2026" },
      { number: "03", label: "TERCEIRA PARCELA", valor: "R$ 500,00", valorExtenso: "(valor em extenso automático)", vencimento: "01/10/2026 a 05/10/2026" },
      { number: "04", label: "QUARTA PARCELA", valor: "R$ 500,00", valorExtenso: "(valor em extenso automático)", vencimento: "01/11/2026 a 05/11/2026" },
    ],
  },
  sixTabelaCustos: DEFAULT_TABELA_CUSTOS,

  pix: DEFAULT_PIX,

  signature: {
    status: "aguardando",
    validadeLegal: DEFAULT_VALIDADE_LEGAL,
    contratante: { name: "PAULO HENRIQUE QUEIROZ", role: "ARQUITETO E URBANISTA" },
    contratada: { name: "ISABELA PAULINO", role: "ARQUITETA | TERCEIRIZAÇÃO" },
  },
  autentiqueUrl: "",
  contact: DEFAULT_CONTACT,
  show: { countdown: true },
};

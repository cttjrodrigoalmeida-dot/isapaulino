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
} from "./contractDefaults";

export const SAMPLE_CONTRACT: ContractDoc = {
  contractNumber: "2622",
  proposalNumber: "2624",
  date: "24/06/2026",
  documentTitle: "CONTRATO DE PRESTAÇÃO DE SERVIÇO",
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
  sixTabelaCustos: {
    intro: "Cada planta executiva possui valor unitário de R$ 140,00 (cento e quarenta reais), independentemente do tipo de planta técnica. Havendo necessidade de plantas executivas adicionais, será aplicado o mesmo valor unitário.",
    tabelas: [
      {
        titulo: "• PLANTAS EXECUTIVAS",
        linhas: [
          { servico: "Planta Layout", descricao: "Representação técnica da disposição dos ambientes, mobiliário e elementos fixos.", valor: "R$ 140,00\n(cento e quarenta reais)" },
          { servico: "Paginação de Piso | Parede", descricao: "Especificação e paginação dos revestimentos de piso por ambiente.", valor: "A PARTIR DE R$ 200" },
          { servico: "Demais Plantas Executivas", descricao: "Demais plantas técnicas necessárias para a execução do projeto.", valor: "R$ 140,00\n(cento e quarenta reais)" },
        ],
      },
      {
        titulo: "• DETALHAMENTO DE MARCENARIA E MARMORARIA",
        nota: "O valor mínimo para o detalhamento de marcenaria e marmoraria é de R$ 510,00, podendo variar conforme a complexidade, quantidade de elementos e ambientes, exigências técnicas e detalhamentos adicionais solicitados pela CONTRATANTE.",
        linhas: [
          { servico: "Marcenaria + Marmoraria", descricao: "Detalhamento executivo de marcenaria e marmoraria por ambiente.", valor: "A PARTIR DE R$ 510,00" },
        ],
      },
      {
        titulo: "• DETALHAMENTOS ADICIONAIS",
        colunas: ["SERVIÇO", "COBRANÇA"],
        linhas: [
          { servico: "Letreiros, Placas, Esquadrias, Corrimão/Guarda-corpo, Adesivos, Pinturas especiais, Revestimentos especiais, Serralheria, Drywall, Estofados personalizados, Cortinas, Tela tensionada e Outros elementos especiais.", valor: "conforme HF" },
        ],
      },
      {
        titulo: "• RENDERIZAÇÃO (CONTRATANTE FORNECE O MODELO)",
        linhas: [
          { servico: "Renderização Imagem interna (ambientes internos)", descricao: "Renderização de imagem realista a partir do modelo 3D fornecido pelo CONTRATANTE. 1ª à 5ª imagem / A partir da 6ª imagem", valor: "R$ 140,00\nR$ 115,00" },
          { servico: "Renderização Imagem Externa (Fachadas e Áreas Externas)", descricao: "Renderização de fachadas ou áreas externas a partir do modelo 3D fornecido pelo CONTRATANTE. 1ª à 5ª imagem / A partir da 6ª imagem", valor: "A PARTIR DE R$ 210,00\nA PARTIR DE R$ 170,00" },
          { servico: "Com inserção de figuras humanas", descricao: "(ou tratativas de imagens especializadas)", valor: "+30% ACRÉSCIMO\nsobre o valor da imagem correspondente" },
        ],
      },
      {
        titulo: "• MODELAGEM 3D + RENDERIZAÇÃO",
        linhas: [
          { servico: "Modelagem 3D + renderização interna (ambientes internos)", descricao: "Desenvolvimento da modelagem 3D e imagem realista detalhada do ambiente. 1ª à 5ª imagem / A partir da 6ª imagem", valor: "R$ 210,00\nR$ 170,00" },
          { servico: "Modelagem 3D + renderização Externa (Fachadas e Áreas Externas)", descricao: "Desenvolvimento da modelagem 3D e imagem realista detalhada da fachada, áreas externas ou vistas em nível do solo. 1ª à 5ª imagem / A partir da 6ª imagem", valor: "A PARTIR DE R$ 350,00\nA PARTIR DE R$ 320,00" },
          { servico: "Vista aérea", descricao: "Vista aérea do projeto ou do entorno.", valor: "A PARTIR DE R$ 320,00" },
          { servico: "Com inserção de figuras humanas", descricao: "(ou tratativas de imagens especializadas)", valor: "+30% ACRÉSCIMO\nsobre o valor da imagem correspondente" },
        ],
      },
      {
        titulo: "• OUTROS SERVIÇOS",
        linhas: [
          { servico: "Planta Humanizada Realista", descricao: "Elaboração de planta humanizada com representação realista de mobiliário, materiais e acabamentos.", valor: "A PARTIR DE R$ 350,00" },
          { servico: "Vídeo Curto (Reels Instagram)", descricao: "Vídeo curto de até 30 segundos para Reels Instagram.", valor: "A PARTIR DE R$ 350,00" },
          { servico: "Passeio Virtual (Tour Virtual 360º)", descricao: "Passeio virtual em 360 graus para apresentação do projeto.", valor: "A PARTIR DE R$ 150,00 | PONTO" },
          { servico: "Modelagem de Topografia", descricao: "Modelagem, ajuste ou correção de topografia existente, incluindo cortes, taludes, platôs ou nivelamentos.", valor: "A PARTIR DE R$ 300,00" },
          { servico: "Alterações Adicionais no Projeto", descricao: "Alterações adicionais no detalhamento executivo e na visualização arquitetônica.", valor: "MÍNIMO 15%" },
          { servico: "Conversão de Croquis ou Desenhos Manuais", descricao: "Conversão de croquis ou desenhos manuais para formato digital (.dwg ou outro software compatível).", valor: "R$ 150 por hora" },
        ],
      },
    ],
    observacoes: [
      "O serviço de Modelagem 3D + Renderização possui contratação mínima de 03 (três) imagens, exceto para projetos de banheiro, lavabo, lavanderia ou depósito de pequeno porte, nos quais será admitida a contratação de apenas 01 (uma) imagem.",
      "Os valores desta tabela correspondem aos valores mínimos de cada serviço e poderão ser ajustados conforme a complexidade, quantidade de ambientes, nível de detalhamento, prazo de execução ou demais particularidades do projeto.",
      "Serviços adicionais, alterações de escopo ou valores superiores aos mínimos desta tabela serão previamente apresentados à CONTRATANTE para aprovação e registrados no Histórico Financeiro (HF).",
      "Esta tabela possui caráter orientativo e integra a política comercial da CONTRATADA, podendo ser atualizada periodicamente, sem prejuízo dos valores já aprovados e formalizados entre as partes.",
    ],
  },

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

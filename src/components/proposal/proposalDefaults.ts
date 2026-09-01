// ============================================================
// Conteúdo FIXO da marca para as propostas.
// Texto extraído do "modelo de proposta.pdf" do Isabela Paulino Studio.
// Estes valores são usados quando a proposta não sobrescreve a seção.
// (No futuro, editáveis no CMS em "Configurações da proposta".)
// ============================================================

import type { ProcessStep, ClauseItem, ContactInfo } from "./types";

export const DEFAULT_CONTACT: ContactInfo = {
  whatsapp: "5562991942598",
  whatsappLabel: "+55 (62) 9 9194-2598",
  instagram: "isapaulinostudio",
  website: "isabelapaulino.com",
  tiktok: "isapaulinostudio",
  threads: "isapaulinostudio",
  pinterest: "isapaulinostudio",
};

export const DEFAULT_STUDIO_ABOUT = {
  eyebrow: "SOBRE ISABELA PAULINO STUDIO",
  // quebras de linha exatas (renderizadas linha a linha)
  titleLines: [
    "SEJA BEM-VINDO",
    "A UM ESTÚDIO",
    "ESPECIALIZADO EM",
    "TORNAR PROJETOS",
    "EXECUTÁVEIS.",
  ],
  paragraphs: [
    "Fundado em 2020 pela arquiteta Isabela Paulino, o estúdio atua com detalhamento executivo terceirizado para arquitetos, designers e construtoras que precisam transformar ideias em projetos claros, organizados e prontos para execução.",
    "Com mais de 200 projetos realizados no Brasil e no exterior, o estúdio entende como o detalhamento costuma ficar para o final, justamente quando o prazo está apertado, o cliente está cobrando e a obra precisa de respostas. É nesse ponto que o estúdio entra.",
    "Organizamos as informações, desenvolvemos o material técnico e preparamos o projeto para que quem executa consiga entender, seguir e construir com mais segurança.",
  ],
  name: "ISABELA PAULINO",
  credentials: "ARQUITETA · CAU A313396-6",
  tools: ["AUTOCAD", "ARCHICAD", "SKETCHUP LAYOUT", "REVIT"],
  photo: "/assets/images/hero-photo.webp",
};

export const DEFAULT_PROCESS_STEPS: ProcessStep[] = [
  {
    number: "01",
    title: "Alinhamento inicial e recebimento de materiais",
    items: [
      "Reunião via WhatsApp ou videoconferência (com horário agendado) para alinhar o escopo do projeto, prazos e responsabilidades de ambas as partes.",
      "Após o alinhamento, o escritório contratante deve fornecer os seguintes materiais:",
      "Layout definido em formato .DWG ou .PLN;",
      "Modelagem 3D atualizada (SketchUp, Revit, Archicad ou outro formato compatível), contendo informações suficientes para visualização e extração de medidas;",
      "Briefing respondido (fornecido previamente pela contratada);",
      "Arquivo CTB do AutoCAD ou Template Archicad (se houver);",
      "Projeto executivo/base já desenvolvido pelo escritório (se houver), como referência.",
    ],
  },
  {
    number: "02",
    title: "Estruturação técnica e cronograma",
    items: [
      "Organização e conferência do arquivo-base enviado pelo contratante;",
      "Análise técnica das informações recebidas;",
      "Levantamento de dúvidas e incompatibilidades identificadas;",
      "Definição das pranchas necessárias para o escopo contratado;",
      "Planejamento da produção e cronograma de execução.",
    ],
    note: "O ideal é que a entrega de materiais seja feita de uma única vez — isso evita retrabalho e garante mais agilidade. O layout deve ser definido e aprovado antes do envio; alterações podem impactar o cronograma e gerar custos adicionais.",
  },
  {
    number: "03",
    title: "Desenvolvimento técnico e revisões",
    items: [
      "Produção completa das pranchas técnicas de acordo com o escopo;",
      "Revisão interna para checagem de consistência;",
      "Envio da primeira versão ao contratante;",
      "Inclusão de 1 rodada de revisão técnica pós-entrega, conforme condições desta proposta (revisões adicionais poderão ser orçadas separadamente).",
    ],
  },
  {
    number: "04",
    title: "Entrega final e suporte complementar",
    items: [
      "Entrega de todos os arquivos finais em DWG ou .PLN e PDF;",
      "Organização em pastas com nomenclatura padronizada, facilitando o uso;",
      "Suporte técnico para esclarecimento de dúvidas e correções pontuais por até 5 dias úteis após a entrega final;",
      "Após esse período, novas alterações serão consideradas como serviço extra e orçadas à parte.",
    ],
  },
];

export const DEFAULT_CLAUSES: ClauseItem[] = [
  {
    title: "Início dos prazos",
    body: "O prazo de entrega terá início somente após a confirmação do recebimento de todos os materiais necessários para a execução dos serviços, incluindo referências de materiais, acabamentos e metais, além de demais informações relevantes. Também será necessário o envio do contrato assinado e a confirmação bancária do pagamento da parcela de entrada.",
  },
  {
    title: "Base técnica do projeto",
    body: "O detalhamento executivo será desenvolvido com base no material fornecido pelo CONTRATANTE, único responsável pelo conteúdo técnico inicial. Qualquer alteração significativa no projeto após o início da produção resultará na suspensão imediata do serviço e no envio de um novo orçamento proporcional à complexidade das mudanças.",
  },
  {
    title: "Alterações ou cancelamento",
    body: "Caso o CONTRATANTE solicite alterações substanciais ou o cancelamento do serviço após o início da produção, os valores correspondentes ao que já tiver sido executado serão devidos integralmente.",
  },
  {
    title: "Revisões inclusas",
    body: "Está prevista 1 (uma) rodada de revisão pós-entrega, limitada a ajustes técnicos como cotas, acabamentos, simbologia gráfica, indicações de materiais e correções pontuais. Não estão inclusas alterações de layout, modificações de projeto arquitetônico original ou substituições de materiais não previstos. Revisões adicionais serão orçadas separadamente.",
  },
  {
    title: "Prazo para solicitação de revisões",
    body: "As revisões deverão ser solicitadas em até 7 (sete) dias úteis após o envio das pranchas para análise, encaminhadas exclusivamente por e-mail ou WhatsApp, por um único responsável designado, a fim de evitar divergências de comunicação.",
  },
  {
    title: "Itens não revisados",
    body: "Itens não mencionados na solicitação de revisão serão considerados concluídos e aprovados, não estando sujeitos a alterações posteriores sem cobrança adicional.",
  },
  {
    title: "Padrão gráfico e representação",
    body: "A CONTRATADA seguirá o template definido pelo CONTRATANTE, quando fornecido. Na ausência de template, será adotado o template interno da CONTRATADA, baseado em boas práticas de representação gráfica.",
  },
  {
    title: "Responsabilidade sobre o conteúdo técnico",
    body: "Após a revisão ou o encerramento do prazo de 7 dias úteis para ajustes, a CONTRATADA não se responsabiliza por inconsistências técnicas ou informações não fornecidas no momento adequado. Por se tratar de projeto executivo terceirizado, é dever do CONTRATANTE conferir cuidadosamente todos os detalhes antes da execução da obra.",
  },
  {
    title: "Prazos e fila de produção",
    body: "Os prazos de entrega seguirão o cronograma definido para o projeto no início do serviço, podendo variar conforme a complexidade e a demanda em andamento. Qualquer necessidade de readequação será informada previamente pela CONTRATADA.",
  },
  {
    title: "Direitos autorais e propriedade dos arquivos",
    body: "A CONTRATADA não poderá revender, ceder ou reaproveitar os arquivos em outros trabalhos. É permitido à CONTRATADA divulgar o projeto executivo, imagens ou trechos como portfólio e redes sociais, desde que respeitada a autoria do projeto e sem exposição de dados confidenciais.",
  },
  {
    title: "Entrega e formato dos arquivos",
    body: "Todos os arquivos serão entregues exclusivamente em formato digital DWG ou .PLN e PDF, organizados em pastas e enviados por e-mail ou outro meio eletrônico acordado. Impressões físicas não estão incluídas nesta proposta.",
  },
  {
    title: "Suporte técnico pós-entrega",
    body: "Está incluso suporte técnico gratuito por até 5 (cinco) dias úteis após a entrega final, para dúvidas pontuais ou correções simples. Após esse período, qualquer solicitação será considerada uma nova demanda, com orçamento e prazo próprios.",
  },
  {
    title: "Alterações durante o desenvolvimento",
    body: "Alterações, definições ou solicitações realizadas após o início da produção — inclusive durante reuniões, chamadas de vídeo, ligações, mensagens ou revisões — que impliquem mudança de layout, redefinição de soluções projetuais, inclusão de novos elementos ou retrabalho técnico, poderão impactar o cronograma e ser consideradas serviços adicionais, sujeitos à análise e orçamento complementar.",
  },
];

export const DEFAULT_NOT_INCLUDED: string[] = [
  "Projetos Estrutural, Elétrico e Hidrossanitário;",
  "Gerenciamento e Acompanhamento de Obra;",
  "Impressões;",
  "Imagens 3D (ou qualquer outro tipo de visualização arquitetônica);",
  "Alterações após a entrega final — exceto suporte gratuito durante 5 dias úteis;",
  "Levantamento de medidas;",
  "Sondagens, levantamento planialtimétrico e análise do solo;",
  "Taxas ou qualquer outro boleto pertinente a projeto, terreno e obra;",
  "Quadro Quantitativo (orçamentos de produtos);",
  "Compatibilização com projetos complementares não fornecidos pelo contratante;",
  "Quaisquer outros serviços não mencionados anteriormente na proposta.",
];

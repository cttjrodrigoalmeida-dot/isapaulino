// ============================================================
// Conteúdo fixo (boilerplate) do contrato — transcrito do PDF de referência
// (2600- CONTRATO_SISTEMA_R02). Tudo aqui é DEFAULT e pode ser sobrescrito por
// contrato no admin (igual a proposalDefaults.ts). Mantém o documento 100%
// personalizável sem obrigar a redigitar o texto jurídico.
// ============================================================

import type {
  ContractStage,
  ContractClause,
  InfoCard,
  ContractParty,
  PixInfo,
} from "./types";

export const DEFAULT_STAGES: ContractStage[] = [
  { number: "01", label: "PROPOSTA" },
  { number: "02", label: "CONTRATO", active: true },
  { number: "03", label: "BRIEFING" },
  { number: "04", label: "ÁREA DE CLIENTE" },
];

/** Dados fixos da CONTRATADA (Isabela Paulino Studio). */
export const DEFAULT_CONTRATADA: ContractParty = {
  label: "CONTRATADA",
  name: "ISABELA PAULINO",
  role: "ARQUITETA | TERCEIRIZAÇÃO",
  nacionalidade: "Brasileira",
  nascimento: "21/08/1995",
  cpfCnpj: "703878871-05",
  contato: "+55 62 9 9194-2598",
  email: "IsaPaulinoStudio@gmail.com",
  endereco: "Goiânia-GO, Brasil.",
};

export const DEFAULT_PIX: PixInfo = {
  chave: "49914763000137",
  chaveLabel: "CHAVE PIX (CNPJ)",
  titular: "ISABELA PAULINO STUDIO",
  lembrete: "Envie o comprovante após o pagamento para darmos continuidade ao projeto.",
};

// value = texto em destaque (grande) · label = legenda · o ÚLTIMO card é o
// destaque "disponível para iniciar" (rosa, com ícone de relógio).
export const DEFAULT_PRAZO_CARDS: InfoCard[] = [
  { value: "15 DIAS ÚTEIS", label: "DETALHAMENTO EXECUTIVO" },
  { value: "Á DEFINIR", label: "MODELAGEM 3D" },
  { value: "Á DEFINIR", label: "IMAGENS 3D - FINAIS" },
  { value: "7 DIAS ÚTEIS", label: "ANTEPROJETO" },
  { value: "29-06-2026", label: "DISPONÍVEL PARA INICIAR" },
];

export const DEFAULT_ARQUIVOS_CARDS: InfoCard[] = [
  { label: "PRAZO DISPONÍVEL", value: "90 DIAS APÓS A ENTREGA FINAL" },
  { label: "APÓS ESSE PRAZO", value: "OS ARQUIVOS PODERÃO SER EXCLUÍDOS" },
  { label: "SUA RESPONSABILIDADE", value: "FAÇA O DOWNLOAD E MANTENHA CÓPIAS DE SEGURANÇA." },
];

export const DEFAULT_VALIDADE_LEGAL =
  "Conforme MP 2.200-2/2001 e Lei 14.063/2020. Este contrato será assinado eletronicamente pelas partes e terá validade jurídica conforme a legislação vigente.";

/** Cláusulas jurídicas padrão (texto do PDF). Cada uma é editável por contrato. */
export const DEFAULT_CLAUSES: ContractClause[] = [
  {
    number: "01",
    eyebrow: "OBJETO",
    title: "DO OBJETO",
    blocks: [
      {
        type: "p",
        text: "1.1. O presente contrato tem por objeto a prestação de serviços técnicos de arquitetura, compreendendo o desenvolvimento de detalhamento executivo, modelagem 3D, renderização de imagens e demais serviços descritos na Proposta Comercial, que integra este contrato para todos os fins legais. A CONTRATADA atua exclusivamente como prestadora de serviços técnicos, não possuindo obrigação de desenvolver soluções de projeto, concepção arquitetônica ou definições de layout, limitando-se ao desenvolvimento técnico conforme as informações, definições e aprovações fornecidas pela CONTRATANTE.",
      },
    ],
  },
  {
    number: "02",
    eyebrow: "ESCOPO",
    title: "DO ESCOPO DOS SERVIÇOS",
    blocks: [
      { type: "p", text: "2.1. Os serviços contratados referem-se exclusivamente ao desenvolvimento do detalhamento executivo do apartamento." },
      { type: "p", text: "2.3. O Detalhamento Executivo será desenvolvido sem alteração de layout, sendo adotada integralmente a configuração definida na planta fornecida pelo CONTRATANTE." },
      { type: "p", text: "2.4. Não estão incluídas no escopo mudanças de layout, alterações conceituais, revisões arquitetônicas. Qualquer solicitação fora deste escopo será considerada serviço adicional e orçada à parte." },
      { type: "p", text: "2.5. Alterações de layout, materiais, acabamentos, marcenaria, marmoraria, paginações, equipamentos, especificações técnicas ou quaisquer definições previamente aprovadas pelo CONTRATANTE, quando solicitadas após o início da execução dos serviços, caracterizam retrabalho e serão consideradas serviços adicionais, mediante novo orçamento ou cobrança conforme previsto neste contrato." },
      { type: "p", text: "2.6. Alterações que impliquem aumento da área detalhada, inclusão de ambientes, criação de novas pranchas, detalhamentos adicionais ou ampliação do escopo inicialmente contratado serão consideradas serviços adicionais e dependerão de aprovação de novo orçamento." },
    ],
  },
  {
    number: "03",
    eyebrow: "CONTRATANTE",
    title: "OBRIGAÇÕES DO CONTRATANTE",
    blocks: [
      { type: "p", text: "3.1. São obrigações do CONTRATANTE: fornecer todos os materiais necessários ao desenvolvimento do projeto, antes do início dos serviços, incluindo obrigatoriamente:" },
      {
        type: "list",
        items: [
          "A Planta baixa em Dwg e Arquivo em Sketchup;",
          "Enviar o briefing devidamente respondido, por escrito, bem como todas as informações, referências, definições e documentos necessários para o correto início e desenvolvimento dos serviços;",
          "Disponibilizar o template ou CTB de layers do escritório, se houver;",
          "Indicar um representante único para centralizar a comunicação, o envio de informações e as decisões relacionadas ao projeto;",
          "Conferir integralmente o projeto executivo antes do início da execução da obra, responsabilizando-se por sua validação;",
          "Respeitar os prazos de análise, validação e solicitação de revisões previstos neste contrato.",
        ],
      },
      { type: "p", text: "3.2. O CONTRATANTE declara estar ciente de que alterações significativas após o início da produção poderão gerar suspensão do serviço e novo orçamento." },
      { type: "p", text: "3.3. Sempre que houver atraso no envio de informações, documentos, arquivos, aprovações, respostas ou definições por parte do CONTRATANTE, o prazo de execução ficará automaticamente suspenso, sendo retomado somente após a regularização das pendências, sem que isso caracterize atraso da CONTRATADA." },
      { type: "p", text: "3.4. Caso o CONTRATANTE não se manifeste em até 07 (sete) dias úteis após o envio de qualquer etapa para conferência, revisão ou aprovação, esta será considerada aprovada para fins de continuidade dos serviços." },
    ],
  },
  {
    number: "04",
    eyebrow: "CONTRATADA",
    title: "OBRIGAÇÕES DA CONTRATADA",
    blocks: [
      { type: "p", text: "4.1. Compete à CONTRATADA:" },
      {
        type: "list",
        items: [
          "Enviar ao CONTRATANTE uma cópia deste contrato, por e-mail ou WhatsApp, contendo todas as condições e especificidades da prestação de serviços contratada;",
          "Cumprir os prazos estabelecidos, desde que todas as informações, materiais e documentos necessários tenham sido corretamente fornecidos pelo CONTRATANTE;",
          "Prestar suporte técnico por até 07 (sete) dias úteis após a entrega final, limitado ao esclarecimento de dúvidas e orientações relacionadas aos serviços executados, não estando incluídas alterações, revisões ou novos detalhamentos. Encerrado o prazo de 07 (sete) dias úteis, qualquer suporte adicional dependerá de nova contratação ou orçamento específico.",
        ],
      },
    ],
  },
  {
    number: "05",
    eyebrow: "PRAZO",
    title: "DO PRAZO",
    blocks: [
      { type: "p", text: "5.1. O prazo para execução dos serviços será o previsto na Proposta Comercial ou ajustado entre as partes, podendo ser prorrogado em caso de alteração de escopo, solicitações adicionais ou qualquer fato imputável ao CONTRATANTE que impacte a execução dos serviços." },
      { type: "p", text: "5.2. O prazo estimado para execução do detalhamento executivo dos ambientes contratados será de até 15 (quinze) dias úteis." },
      { type: "p", text: "5.3. A contagem do prazo terá início somente após o cumprimento cumulativo das seguintes condições:" },
      {
        type: "list",
        items: [
          "Entrega ou aprovação de todos os materiais, informações e documentos necessários, conforme a Cláusula 3ª;",
          "Assinatura deste contrato;",
          "Confirmação do pagamento da parcela de entrada.",
        ],
      },
      { type: "p", text: "5.4. O prazo refere-se exclusivamente ao período de produção técnica, não sendo computados os períodos de espera decorrentes de aprovações, revisões, solicitações de ajustes, complementação de informações ou ausência de manifestação da CONTRATANTE. Regularizadas as pendências, a contagem do prazo será retomada considerando-se o saldo remanescente, sem que isso caracterize atraso da CONTRATADA." },
    ],
  },
  {
    number: "07",
    eyebrow: "FORMA DE PAGAMENTO",
    title: "DAS CONDIÇÕES DE PAGAMENTO",
    blocks: [
      { type: "p", text: "7.1. As formas de pagamento aceitas são: Via PIX." },
      { type: "p", text: "7.2. O atraso no pagamento de qualquer parcela acarretará a incidência de multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso, nos termos do art. 406 do Código Civil." },
      { type: "p", text: "7.3. A CONTRATADA poderá encaminhar lembretes de vencimento como mera liberalidade, permanecendo o CONTRATANTE responsável pelo pagamento nas datas contratadas, independentemente do recebimento de qualquer aviso." },
      { type: "p", text: "7.4. O atraso no pagamento de qualquer parcela autoriza a interrupção imediata dos serviços, que somente serão retomados após a quitação dos valores em aberto." },
    ],
  },
  {
    number: "08",
    eyebrow: "FORÇA MAIOR",
    title: "DA FORÇA MAIOR E CASO FORTUITO",
    blocks: [
      { type: "p", text: "8.1. Nenhuma das partes será considerada inadimplente caso o cumprimento das obrigações contratuais seja impedido por caso fortuito ou força maior, nos termos do artigo 393 do Código Civil." },
      { type: "p", text: "8.2. Consideram-se casos de força maior, entre outros: desastres naturais; incêndios; enchentes; pandemias; falhas prolongadas de energia elétrica; indisponibilidade de internet; indisponibilidade de servidores ou serviços de armazenamento em nuvem; falhas em softwares essenciais; atos governamentais; greves e quaisquer outros eventos imprevisíveis ou inevitáveis que impeçam temporariamente a execução dos serviços." },
      { type: "p", text: "8.3. Ocorrendo qualquer dessas situações, os prazos ficarão automaticamente suspensos até cessar o impedimento." },
    ],
  },
  {
    number: "09",
    eyebrow: "REVISÕES",
    title: "DAS REVISÕES",
    blocks: [
      { type: "p", text: "9.1. Estão incluídas 01 (uma) rodada de revisão, desde que solicitadas em até 07 (sete) dias úteis após o envio das pranchas." },
      { type: "p", text: "9.2. As solicitações deverão ser encaminhadas por e-mail ou WhatsApp, de forma consolidada." },
      { type: "p", text: "9.3. Itens não mencionados nas solicitações de revisão serão considerados aprovados." },
      { type: "p", text: "9.4. Cada rodada de revisão deverá contemplar todas as solicitações de ajustes em um único envio, não sendo admitido o fracionamento das solicitações para caracterização de uma mesma revisão." },
      { type: "p", text: "9.5. Alterações decorrentes de mudança de conceito, layout, materiais, especificações, soluções arquitetônicas ou definições anteriormente aprovadas não serão consideradas revisão, sendo tratadas como serviço adicional." },
      { type: "p", text: "9.6. Solicitações apresentadas após o encerramento das revisões previstas neste contrato serão objeto de novo orçamento ou cobrança por hora técnica, conforme aplicável." },
    ],
  },
  {
    number: "10",
    eyebrow: "REUNIÃO TÉCNICA",
    title: "DAS REUNIÕES TÉCNICAS",
    blocks: [
      { type: "p", text: "10.1. As reuniões destinam-se ao alinhamento técnico, esclarecimento de dúvidas e validação dos serviços contratados." },
      { type: "p", text: "10.2. Cada reunião terá duração máxima de 01 (uma) hora, salvo ajuste entre as partes." },
      { type: "p", text: "10.3. Solicitações de alterações, desenvolvimento técnico ou qualquer atividade que extrapole o escopo contratado serão consideradas serviço adicional." },
      { type: "p", text: "10.4. Os serviços adicionais realizados durante a reunião serão cobrados pelo valor de R$ 150,00 (cento e cinquenta reais) por hora técnica, com cobrança proporcional em frações mínimas de 30 (trinta) minutos." },
      { type: "p", text: "10.5. O prosseguimento da reunião após a solicitação dos serviços adicionais caracteriza a concordância do CONTRATANTE com a cobrança prevista nesta cláusula." },
    ],
  },
  {
    number: "11",
    eyebrow: "ARQUIVOS DIGITAIS",
    title: "DA DISPONIBILIDADE DOS ARQUIVOS",
    blocks: [
      { type: "p", text: "11.1. Após a conclusão dos serviços, os arquivos digitais serão disponibilizados ao CONTRATANTE por meio de link para download, e-mail, WhatsApp ou outro meio acordado entre as partes." },
      { type: "p", text: "11.2. Os arquivos permanecerão disponíveis para novo envio ou recuperação pelo prazo de 90 (noventa) dias, contados da entrega final." },
      { type: "p", text: "11.3. Após esse prazo, a CONTRATADA poderá excluir os arquivos de seus sistemas, não sendo obrigada a mantê-los armazenados ou fornecer nova cópia." },
      { type: "p", text: "11.4. É de responsabilidade exclusiva do CONTRATANTE realizar o download, conferir o conteúdo recebido e manter cópias de segurança (backup). Decorrido o prazo de 90 (noventa) dias, improrrogável, a CONTRATADA não responderá pela perda, indisponibilidade ou impossibilidade de recuperação dos arquivos." },
    ],
  },
  {
    number: "12",
    eyebrow: "NÃO INCLUSOS",
    title: "DOS SERVIÇOS NÃO INCLUSOS",
    blocks: [
      { type: "p", text: "12.1. Não fazem parte deste contrato:" },
      {
        type: "list",
        items: [
          "Plantas Técnicas além das mencionadas na cláusula 02.",
          "Projetos estrutural, elétrico e hidrossanitário;",
          "Gerenciamento ou acompanhamento de obra;",
          "Detalhamento das esquadrias, exceto se for marcenaria;",
          "Levantamento de medidas;",
          "Imagens 3D, animações, tours virtuais ou plantas humanizadas;",
          "Impressões físicas;",
          "Alterações após a entrega final, exceto o suporte previsto;",
          "Orçamentos, Quadro Quantitativos, Manual de Obra, Memorial Descritivo, taxas, licenças ou quaisquer serviços não descritos neste contrato.",
          "Alterações solicitadas durante reuniões técnicas que extrapolem o escopo originalmente contratado, as quais serão tratadas como serviço adicional.",
          "Compatibilização de projetos elaborados por terceiros, salvo contratação específica.",
        ],
      },
    ],
  },
  {
    number: "13",
    eyebrow: "RESPONSABILIDADE TÉCNICA",
    title: "DA RESPONSABILIDADE TÉCNICA",
    blocks: [
      { type: "p", text: "13.1. A CONTRATADA atua exclusivamente como prestadora de serviços técnicos de detalhamento executivo, desenvolvendo a documentação técnica com base nas informações, definições e aprovações fornecidas pela CONTRATANTE, não assumindo autoria do projeto arquitetônico, responsabilidade pela concepção arquitetônica, definições de layout, dimensionamento, compatibilização entre disciplinas ou especificações técnicas do projeto." },
      { type: "p", text: "13.2. O projeto executivo será elaborado com base nas informações fornecidas pela CONTRATANTE, que é a única responsável por sua veracidade, integridade, atualização, conferência e validação final antes da execução da obra." },
      { type: "p", text: "13.3. A CONTRATADA não responderá por incompatibilidades, erros ou prejuízos decorrentes de informações incorretas ou incompletas, alterações realizadas pela CONTRATANTE ou por terceiros, nem pela execução, gerenciamento, fiscalização da obra ou quaisquer serviços executados por terceiros." },
    ],
  },
  {
    number: "14",
    eyebrow: "DIREITOS AUTORAIS",
    title: "DOS DIREITOS AUTORAIS",
    blocks: [
      { type: "p", text: "14.1. Os arquivos entregues são de uso exclusivo do CONTRATANTE no âmbito do projeto contratado, nos termos da Lei nº 9.610/98." },
      { type: "p", text: "14.2. O projeto arquitetônico e sua autoria permanecem de titularidade do CONTRATANTE ou do respectivo autor do projeto." },
      { type: "p", text: "14.3. A CONTRATADA poderá utilizar imagens, pranchas, detalhamentos e demais materiais produzidos durante a execução dos serviços em seu portfólio, redes sociais, site, revistas e demais materiais de divulgação profissional, sempre respeitando a autoria do projeto e preservando informações confidenciais, quando houver." },
      { type: "p", text: "14.4. Quaisquer alterações realizadas pelo CONTRATANTE ou por terceiros após a entrega dos arquivos isentam a CONTRATADA de responsabilidade técnica sobre as modificações efetuadas." },
    ],
  },
  {
    number: "15",
    eyebrow: "CANCELAMENTO",
    title: "DO CANCELAMENTO",
    blocks: [
      { type: "p", text: "15.1. O CONTRATANTE poderá solicitar o cancelamento dos serviços a qualquer momento, mediante comunicação por e-mail ou WhatsApp." },
      { type: "p", text: "15.2. Caso o cancelamento ocorra após o início da execução dos serviços, o CONTRATANTE deverá pagar pelos serviços efetivamente executados até a data da solicitação, ainda que não concluídos ou entregues integralmente. O valor será apurado com base nos valores unitários previstos na Proposta Comercial, sendo automaticamente cancelados os descontos concedidos em razão da contratação integral." },
      { type: "p", text: "15.3. Do valor apurado serão descontados os pagamentos já realizados. Havendo saldo devedor, este deverá ser quitado em até 15 (quinze) dias úteis após a apresentação do demonstrativo de cálculo. Havendo saldo em favor do CONTRATANTE, a devolução será realizada no mesmo prazo." },
      { type: "p", text: "15.4. Os arquivos, pranchas e demais materiais produzidos até a data do cancelamento somente serão disponibilizados após a quitação integral dos valores devidos." },
      { type: "p", text: "15.5. A ausência de manifestação da CONTRATANTE, a suspensão ou paralisação da obra, a desistência do projeto ou qualquer outro fato que impeça sua continuidade não afastam a obrigação de pagamento pelos serviços efetivamente executados." },
    ],
  },
  {
    number: "16",
    eyebrow: "HORÁRIO COMERCIAL",
    title: "HORÁRIO DE ATENDIMENTO COMERCIAL",
    blocks: [
      { type: "p", text: "16.1. O atendimento da CONTRATADA ocorrerá de segunda a sexta-feira, das 9h às 18h, exceto feriados." },
      { type: "p", text: "16.2. Reuniões deverão ser agendadas com antecedência mínima de 01 (um) dia útil, respeitando o horário de atendimento." },
      { type: "p", text: "16.3. A CONTRATADA não se obriga a responder demandas fora do horário comercial, as quais serão tratadas no próximo dia útil." },
      { type: "p", text: "16.4. Ausências programadas, férias ou ajustes temporários no horário de atendimento poderão ocorrer, sendo informados ao CONTRATANTE sempre que possível." },
      { type: "p", text: "16.5. Somente serão consideradas válidas as solicitações encaminhadas pelos canais oficiais de comunicação da CONTRATADA, tais como e-mail ou WhatsApp informado neste contrato." },
    ],
  },
  {
    number: "17",
    eyebrow: "INCAPACIDADE TEMPORÁRIA",
    title: "INCAPACIDADE TEMPORÁRIA DA CONTRATADA",
    blocks: [
      { type: "p", text: "17.1. Em caso de acidente, cirurgia, morte familiar, doença ou qualquer situação que impossibilite temporariamente a CONTRATADA de dar continuidade aos serviços, o CONTRATANTE será comunicado assim que possível, com indicação de prazo estimado para retomada das atividades." },
      { type: "p", text: "17.2. Nessas situações, as partes poderão, de comum acordo: a) Estabelecer um novo prazo de entrega; b) Autorizar o repasse dos serviços a profissional indicado pela CONTRATADA, permanecendo esta responsável pela supervisão e qualidade dos serviços; c) Optar pelo cancelamento do contrato, sendo devido o pagamento proporcional aos serviços executados, conforme critérios previstos na cláusula de cancelamento." },
      { type: "p", text: "17.3. Todas as decisões deverão ser formalizadas por escrito, não afastando as demais obrigações contratuais assumidas pelas partes." },
    ],
  },
  {
    number: "18",
    eyebrow: "VALIDADE DO CONTRATO",
    title: "VALIDADE E VIGÊNCIA DO CONTRATO",
    blocks: [
      { type: "p", text: "18.1. O presente contrato entra em vigor na data de sua assinatura e terá validade de 03 (três) meses, podendo ser encerrado com a conclusão dos serviços e a quitação integral dos valores, o que ocorrer primeiro." },
      { type: "p", text: "18.2. Caso haja impedimentos alheios à CONTRATADA, como ausência de informações, atrasos de validação ou solicitações adicionais pela CONTRATANTE, o prazo poderá ser ajustado mediante acordo entre as partes." },
      { type: "p", text: "18.3. Permanecem vigentes, após o término do contrato, as cláusulas relativas a pagamento, direitos autorais, responsabilidades e foro." },
    ],
  },
  {
    number: "19",
    eyebrow: "FORO | ASSINATURA",
    title: "DO FORO",
    blocks: [
      { type: "p", text: "19.1. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de Goiânia, Estado de Goiás, com renúncia expressa a qualquer outro, por mais privilegiado que seja." },
    ],
  },
];

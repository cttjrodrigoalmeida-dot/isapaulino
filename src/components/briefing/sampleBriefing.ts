import type { Briefing } from "./types";
import { DEFAULT_CONTACT } from "../proposal/proposalDefaults";

// Briefing de exemplo — reproduz o layout/textos do modelo (PDF).
// Linkado à proposta de exemplo (number "2624"): a página puxa cliente,
// projeto e data da proposta correspondente.

// Linha de apoio repetida sob cada ambiente.
const AMBIENTE_INTRO =
  "Utilize os pontos destacados na imagem como guia para responder às perguntas correspondentes. Quanto mais completas forem as informações e referências fornecidas, mais preciso será o desenvolvimento do detalhamento técnico.";

export const SAMPLE_BRIEFING: Briefing = {
  number: "2624",
  proposalNumber: "2624",
  title: "BRIEFING DE DETALHAMENTO",
  studioEmail: "IsaPaulinoStudio@gmail.com",

  sections: [
    {
      id: "informacoes-iniciais",
      kind: "info",
      title: "INFORMAÇÕES INICIAIS",
      titleLines: ["INFORMAÇÕES", "INICIAIS"],
      questions: [
        {
          id: "info-01",
          text: "QUAL É O NOME DO SEU PROJETO?",
          hint: "Ex.: Residência Aurora, Apartamento Horizonte ou Casa Bosque Alto.",
          type: "text",
          allowReference: false,
        },
        {
          id: "info-02",
          text: "O PROJETO ESTÁ TOTALMENTE DEFINIDO?",
          type: "radio",
          options: [
            "Sim, está tudo definido.",
            "Não, ainda existem definições pendentes.",
          ],
          note: "Para iniciarmos o detalhamento, é importante que o projeto esteja totalmente definido. Alterações posteriores podem gerar retrabalho, impactar prazos e resultar em custos adicionais.",
          allowReference: false,
          alertOptions: ["Não, ainda existem definições pendentes."],
          locksQuestionIds: ["info-03"],
        },
        {
          id: "info-03",
          text: "EXISTE ALGUM SOFTWARE DE SUA PREFERÊNCIA PARA ELABORAÇÃO DO DETALHAMENTO TÉCNICO?",
          type: "checklist",
          placeholder: "selecione",
          options: ["AutoCAD", "SketchUp Layout", "Archicad", "Revit", "Sem preferência"],
          allowReference: false,
        },
        {
          id: "info-04",
          text: "VOCÊ POSSUI UM TEMPLATE PADRÃO DO SEU ESCRITÓRIO?",
          type: "radio",
          options: ["Anexar template", "Já enviei", "Não tenho template"],
          allowReference: false,
          dashedOptions: true,
        },
        {
          id: "info-05",
          text: "COMO PREFERE ENVIAR A MAQUETE?",
          type: "maquete",
          options: ["Já enviei", "Não existe", "Sem preferência."],
          allowReference: false,
          dashedOptions: true,
        },
        {
          id: "info-06",
          text: "EXISTE ALGUMA OBSERVAÇÃO, RESTRIÇÃO OU NECESSIDADE ESPECÍFICA PARA ESTE PROJETO?",
          hint: "Exemplos: padrão gráfico específico, compatibilização, urgência, observações técnicas ou informações complementares.",
          type: "longtext",
          allowReference: false,
        },
        {
          id: "info-07",
          text: "QUAL DISPOSITIVO VOCÊ ESTÁ UTILIZANDO PARA RESPONDER ESTE BRIEFING?",
          type: "checklist",
          placeholder: "selecione",
          options: ["Desktop", "Celular", "Tablet/Ipad"],
          allowReference: false,
        },
      ],
    },

    {
      id: "cozinha",
      kind: "ambiente",
      title: "COZINHA/GOURMET",
      intro: AMBIENTE_INTRO,
      image: "/assets/portfolio/cafe-fiori.webp",
      questions: [
        {
          id: "coz-1",
          text: "QUAL A ALTURA DO PÉ-DIREITO DO AMBIENTE?",
          hint: "exemplo: 2,50m, 2,70m, 2,85m etc...",
          pin: { x: 48, y: 16, label: "PÉ-DIREITO" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "coz-2",
          text: "NICHO SOBRE NICHO: QUAL PADRÃO DE MDF DESEJA (COR, TEXTURA, MARCA ESPECÍFICA)?",
          hint: "Exemplos: Louro Freijó - Arauco, Areia - Guararapes etc...",
          pin: { x: 30, y: 40, label: "NICHO" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "coz-3",
          text: "PORTA DE ABRIR: EM QUAL MATERIAL?",
          hint: "Exemplos: Moldura de Metalon cor dourado com vidro canelado...",
          pin: { x: 64, y: 46, label: "PORTA" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "coz-4",
          text: "ARMÁRIO INFERIOR: QUAL PADRÃO DE MDF DESEJA (COR, TEXTURA, MARCA ESPECÍFICA)?",
          hint: "Exemplos: Louro Freijó - Arauco, Areia - Guararapes etc...",
          pin: { x: 40, y: 74, label: "ARMÁRIO" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "coz-5",
          text: "ALGUM DETALHE EXTRA OU EXIGÊNCIA ESPECÍFICA?",
          hint: "Por favor, adicione qualquer informação adicional, como detalhes importantes ou preferências que não tenham sido mencionadas.",
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
      ],
    },

    {
      id: "sala",
      kind: "ambiente",
      title: "SALA DE TV",
      intro: AMBIENTE_INTRO,
      image: "/assets/portfolio/1.webp",
      questions: [
        {
          id: "sala-1",
          text: "O PAINEL DA TV TERÁ ILUMINAÇÃO EMBUTIDA?",
          pin: { x: 40, y: 32, label: "PAINEL" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "sala-2",
          text: "QUAL REVESTIMENTO VOCÊ IMAGINA PARA ESTA PAREDE?",
          hint: "Exemplos: ripado de madeira, mármore, cimento queimado...",
          pin: { x: 72, y: 55, label: "PAREDE" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "sala-3",
          text: "ALGUM DETALHE EXTRA OU EXIGÊNCIA ESPECÍFICA?",
          hint: "Por favor, adicione qualquer informação adicional, como detalhes importantes ou preferências que não tenham sido mencionadas.",
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
      ],
    },

    {
      id: "banheiro",
      kind: "ambiente",
      title: "BANHEIRO",
      intro: AMBIENTE_INTRO,
      image: "/assets/portfolio/2.webp",
      questions: [
        {
          id: "ban-1",
          text: "QUAL MATERIAL E COR PARA A BANCADA DA PIA?",
          hint: "Exemplos: mármore branco, granito preto, porcelanato...",
          pin: { x: 38, y: 58, label: "BANCADA" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "ban-2",
          text: "TEM PREFERÊNCIA DE REVESTIMENTO PARA O BOX?",
          pin: { x: 68, y: 38, label: "BOX" },
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
        {
          id: "ban-3",
          text: "ALGUM DETALHE EXTRA OU EXIGÊNCIA ESPECÍFICA?",
          hint: "Por favor, adicione qualquer informação adicional, como detalhes importantes ou preferências que não tenham sido mencionadas.",
          quickFills: ["À DEFINIR", "NÃO SE APLICA"],
        },
      ],
    },
  ],

  contact: DEFAULT_CONTACT,
};

// Documento em branco para NOVOS contratos: reaproveita todo o boilerplate
// jurídico dos defaults (cláusulas, cards de prazo/arquivos, PIX, validade legal)
// e zera apenas os campos específicos do cliente/caso. Mantém o contrato 100%
// personalizável desde a criação, sem obrigar a redigitar o texto fixo.
import type { ContractDoc, ContractParty } from "./types";
import { DEFAULT_CONTACT } from "../proposal/proposalDefaults";
import {
  DEFAULT_STAGES,
  DEFAULT_CONTRATADA,
  DEFAULT_PIX,
  DEFAULT_PRAZO_CARDS,
  DEFAULT_ARQUIVOS_CARDS,
  DEFAULT_VALIDADE_CARDS,
  DEFAULT_VALIDADE_LEGAL,
  DEFAULT_CLAUSES,
  DEFAULT_CLAUSES_ADITIVO,
  DEFAULT_ADITIVO_INTRO,
} from "./contractDefaults";

const EMPTY_CONTRATANTE: ContractParty = {
  label: "CONTRATANTE",
  name: "",
  role: "",
  nacionalidade: "Brasileiro(a)",
  nascimento: "",
  cpfCnpj: "",
  contato: "",
  email: "",
  endereco: "",
};

/** Cria um ContractDoc novo (deep-clone dos defaults — não muta os originais). */
export function blankContractDoc(): ContractDoc {
  return structuredClone({
    kind: "principal",
    vigenciaMeses: 3,
    contractNumber: "",
    proposalNumber: "",
    date: "",
    documentTitle: "CONTRATO DE\nPRESTAÇÃO DE SERVIÇO",
    serviceTitle: "DETALHAMENTO EXECUTIVO",
    tags: [],
    projectName: "",
    clientName: "",
    stages: DEFAULT_STAGES,

    contratante: EMPTY_CONTRATANTE,
    contratada: DEFAULT_CONTRATADA,

    objetoIntro: [
      "As partes acima qualificadas têm entre si, justo e contratado, o presente Contrato de Prestação de Serviços de Arquitetura, que se regerá pelas cláusulas e condições a seguir.",
    ],
    escopoAmbientes: [],
    escopoServicos: [],

    clauses: DEFAULT_CLAUSES,
    prazoCards: DEFAULT_PRAZO_CARDS,
    arquivosCards: DEFAULT_ARQUIVOS_CARDS,
    validadeCards: DEFAULT_VALIDADE_CARDS,

    sixVariant: "pagamento",
    sixPagamento: {
      valorTotal: "",
      valorTotalExtenso: "",
      resumo: ["Sem juros"],
      parcelas: [],
    },
    pix: DEFAULT_PIX,

    signature: {
      status: "aguardando",
      validadeLegal: DEFAULT_VALIDADE_LEGAL,
      contratante: { name: "", role: "" },
      contratada: { name: DEFAULT_CONTRATADA.name, role: DEFAULT_CONTRATADA.role },
    },
    autentiqueUrl: "",
    contact: DEFAULT_CONTACT,
    show: { countdown: true },
  });
}

/** Cria um TERMO ADITIVO novo — versão enxuta do contrato, com as cláusulas do
 *  aditivo e o pagamento (que também alimenta o financeiro). Reaproveita a base. */
export function blankAditivoDoc(): ContractDoc {
  const base = blankContractDoc();
  return {
    ...base,
    kind: "aditivo",
    documentTitle: "TERMO ADITIVO AO CONTRATO DE\nPRESTAÇÃO DE SERVIÇOS DE ARQUITETURA",
    objetoIntro: [DEFAULT_ADITIVO_INTRO],
    escopoAmbientes: [],
    escopoServicos: [],
    clauses: structuredClone(DEFAULT_CLAUSES_ADITIVO),
    sixVariant: "pagamento",
    sixPagamento: { valorTotal: "", valorTotalExtenso: "", resumo: ["Sem juros"], parcelas: [] },
  };
}

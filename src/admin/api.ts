// Cliente da API admin (Pages Functions). Sempre com credentials:"include"
// para enviar/receber o cookie de sessão.
import type { Proposal } from "../components/proposal/types";
import type { Briefing } from "../components/briefing/types";

export type ProposalOutcome = "aprovada" | "nao-aprovada";

export interface ProposalSummary {
  number: string;
  client: string | null;
  serviceTitle: string | null;
  date: string | null;
  status: "draft" | "published" | "cancelled";
  /** Resultado comercial (manual). Só 'aprovada' entra no faturamento. */
  outcome: ProposalOutcome;
  /** Valor da proposta (R$) parseado do JSON — para os gráficos por valor. */
  value: number;
  updatedAt: string;
}

/** Documentos vinculados a um número de proposta (atalhos "Relacionados"). */
export interface DocumentLinks {
  proposalNumber: string;
  client: string | null;
  projectTitle: string | null;
  proposal: { number: string; status: string | null; outcome: string | null } | null;
  contract: { slug: string | null; number: string | null; status: string } | null;
  briefing: { number: string; status: string } | null;
}

export interface BriefingSummary {
  number: string;
  proposalNumber: string | null;
  title: string | null;
  /** Nome do projeto = resposta da 1ª pergunta do briefing (null se não respondido). */
  projectName: string | null;
  /** Título puxado da proposta vinculada (por cliente/proposta), quando existir. */
  proposalTitle: string | null;
  /** Nome do cliente da proposta vinculada (por proposal_number), quando existir. */
  clientName: string | null;
  status: "draft" | "published" | "cancelled";
  updatedAt: string;
  createdAt: string;
  responseCount: number;
  /** Data/hora da última resposta recebida (ISO). */
  lastResponseAt: string | null;
}

export interface BriefingResponse {
  id: number;
  client: string | null;
  submittedAt: string;
  answers: Record<string, string>;
  refImages: Record<string, string>;
}

export interface AdminUser {
  username: string;
  /** Nome de exibição (topo do painel); vazio = usa o username. */
  name?: string;
}

/** Panorama do cliente (Central do Cliente). */
export interface ClientPanoramaProject {
  id: string;
  title: string | null;
  value: number | null;
  status: ContractStatus;
  slug: string | null;
  signedAt: string | null;
  number: string | null;
  vigenciaMeses: number | null;
  kind: "principal" | "aditivo" | null;
  projectName: string | null;
  proposalNumber: string | null;
}
export interface ClientPanorama {
  client: {
    id: string; name: string; cpfCnpj: string | null; email: string | null;
    phone: string | null; address: string | null; city: string | null; state: string | null;
    photoUrl: string | null; role: string | null; accessEnabled: number; createdAt: string;
  };
  projects: ClientPanoramaProject[];
  hf: { total: number; pago: number; pendente: number; n: number };
}

export interface Client {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  /** Profissão/papel (ex.: "ARQUITETO E URBANISTA") — usado no contrato. */
  role: string | null;
  nacionalidade: string | null;
  /** Nascimento (texto livre; também usado para aniversariantes). */
  birth_date: string | null;
  /** Foto/avatar do cliente (URL pública no R2). */
  photo_url: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Campos editáveis de um cliente (sem id/timestamps). */
export type ClientInput = Pick<
  Client,
  "name" | "cpf_cnpj" | "email" | "phone" | "address" | "city" | "state" | "role" | "nacionalidade" | "birth_date"
>;

// ── Histórico Financeiro (HF) ──
export type HistoryStatus = "pending" | "charged" | "paid" | "cancelled";
export type HistoryKind = "adicional" | "retrabalho" | "hora-tecnica" | "pagamento" | "outro";

export interface HistoryItem {
  id: string;
  clientId: string;
  contractId: string | null;
  date: string;
  description: string;
  amount: number;
  kind: HistoryKind;
  status: HistoryStatus;
  asaasPaymentId: string | null;
  invoiceUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}
export interface HistoryTotals {
  pending: number;
  charged: number;
  paid: number;
}
export interface HistoryInput {
  description: string;
  amount: number;
  kind?: HistoryKind;
  contract_id?: string | null;
  date?: string | null;
  status?: HistoryStatus;
}

export type ContractStatus = "draft" | "published" | "signed" | "cancelled";

/** Resumo de contrato para a listagem (com nome do cliente via JOIN). */
export interface ContractSummary {
  id: string;
  clientId: string;
  clientName: string | null;
  title: string;
  value: number | null;
  status: ContractStatus;
  slug: string | null;
  updatedAt: string;
  createdAt: string;
  publishedAt: string | null;
  /** Nome do projeto (campo PROJETO do doc) — usado como título na lista. */
  projectName: string | null;
  /** Título puxado da proposta vinculada (por proposta/cliente) — fallback do título. */
  proposalTitle: string | null;
  /** Tipo do documento: "principal" | "aditivo" | null (legado = principal). */
  kind: string | null;
  /** Data/hora da assinatura (para vigência/vencimento e gráficos). */
  signedAt: string | null;
  /** Vigência em meses após a assinatura (padrão 3 quando ausente). */
  vigenciaMeses: number | null;
  /** Nº do contrato (extraído do JSON rich doc). */
  contractNumber: string | null;
  /** Id do documento na Autentique (preenchido quando enviado para assinatura). */
  autentiqueDocumentId: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: number;
  createdAt: string;
}

/** Contrato completo (detalhe/edição). */
export interface Contract extends ContractSummary {
  content: string;
  /** JSON do ContractDoc (documento rico); null nos contratos legados. */
  data: string | null;
  deadline: string | null;
  autentiqueUrl: string | null;
  /** Id do documento na Autentique (quando enviado para assinatura). */
  autentiqueDocumentId: string | null;
  /** Data/hora da assinatura (preenchida pelo webhook da Autentique). */
  signedAt: string | null;
  createdAt: string;
}

/** Campos enviados ao criar/atualizar um contrato. */
export interface ContractInput {
  client_id: string;
  title: string;
  content?: string;
  /** JSON do ContractDoc (documento rico). */
  data?: string | null;
  value: number | null;
  deadline: string | null;
  autentique_url: string | null;
  status?: ContractStatus;
}

export interface StoragePrefixUsage {
  prefix: string;
  label: string;
  bytes: number;
  count: number;
}

export interface StorageUsage {
  totalBytes: number;
  objectCount: number;
  byPrefix: StoragePrefixUsage[];
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  title: string;
  notes: string | null;
  kind: "tarefa" | "compromisso";
  done: boolean;
}

export interface DashboardOverview {
  generatedAt: string;
  proposals: {
    total: number;
    draft: number;
    published: number;
    totalValue: number;
    avgTicket: number;
    approvedValue: number;
    lostValue: number;
    approvedCount: number;
    lostCount: number;
  };
  briefings: {
    total: number;
    draft: number;
    published: number;
    responsesTotal: number;
    withoutResponse: number;
  };
  contracts: {
    total: number;
    draft: number;
    published: number;
    signed: number;
  };
  funnel: {
    leads: number;
    briefings: number;
    propostas: number;
    contratos: number;
    projetos: number;
    entregues: number;
  };
  revenueByMonth: { key: string; label: string; value: number }[];
  clientRanking: { client: string; total: number; count: number; photo: string | null; clientId: string | null }[];
  recentActivity: { at: string; type: string; title: string; sub: string }[];
  pendencias: { kind: string; count: number; label: string }[];
  /** Itens da agenda de hoje + atrasados não concluídos (card "Atenção hoje"). */
  agendaHoje: { id: string; title: string; time: string | null; kind: "tarefa" | "compromisso"; date: string; overdue: boolean }[];
  /** Aniversariantes de hoje + próximos 30 dias. */
  aniversariantes: { id: string; name: string; phone: string | null; photo: string | null; date: string; days: number; today: boolean }[];
  finance: {
    faturado: number;
    recebido: number;
    aReceber: number;
    atrasados: number;
    receivedByMonth: { key: string; label: string; value: number }[];
    annualGoal: number;
  };
}

export type InstallmentStatus = "pending" | "confirmed" | "received" | "overdue" | "deleted";

export interface Installment {
  id: string;
  contractId: string;
  asaasPaymentId: string | null;
  invoiceUrl: string | null;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  // presentes na listagem cruzada (/api/installments):
  contractTitle?: string | null;
  clientName?: string | null;
  /** 'hf' quando a linha é um serviço adicional (Histórico Financeiro). */
  kind?: string;
}

export interface ContractPaymentConfig {
  id: string;
  contractId: string;
  totalValue: number;
  downPayment: number;
  installmentsCount: number;
  status: string;
  createdAt: string;
}

export interface SavePaymentInput {
  total_value: number;
  down_payment: number;
  installments_count: number;
  first_due_date: string;
}

export interface MarkPaidInput {
  payment_date: string;
  payment_method: string;
  notes: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, body?.error || `Erro ${res.status}`);
  }
  return body as T;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const api = {
  // ── auth ──
  me: () => req<{ user: AdminUser }>("/api/auth/me"),
  login: (username: string, password: string) =>
    req<{ ok: true; user: AdminUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: true }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getProfile: () => req<{ username: string; name: string }>("/api/auth/profile"),
  updateProfile: (input: {
    name?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    req<{ ok: true; username: string; name: string }>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  // ── dashboard ──
  // Envia o "hoje" local (fuso do navegador) p/ casar a agenda com o Calendário.
  dashboardOverview: () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    return req<DashboardOverview>(`/api/dashboard/overview?today=${today}`);
  },

  // ── configurações (meta anual, etc.) ──
  setSetting: (key: string, value: string) =>
    req<{ ok: true }>("/api/settings", { method: "PUT", body: JSON.stringify({ key, value }) }),

  // ── relatórios (série temporal de recebimentos) ──
  reports: () => req<{ received: ReportMonth[] }>("/api/reports"),

  // ── logs de auditoria ──
  listLogs: () => req<{ logs: AuditLog[] }>("/api/audit"),

  // ── lixeira (soft-delete) ──
  listTrash: () =>
    req<{ clients: TrashItem[]; contracts: TrashItem[] }>("/api/trash"),
  trashAction: (entity: "client" | "contract", id: string, action: "restore" | "purge") =>
    req<{ ok: true }>("/api/trash", { method: "POST", body: JSON.stringify({ entity, id, action }) }),

  // ── calendário ──
  listCalendar: (from?: string, to?: string) => {
    const qs = from && to ? `?from=${from}&to=${to}` : "";
    return req<{ events: CalendarEvent[] }>(`/api/calendar${qs}`);
  },
  createCalendarEvent: (e: {
    date: string;
    title: string;
    time?: string | null;
    notes?: string | null;
    kind?: "tarefa" | "compromisso";
  }) =>
    req<{ ok: true; event: CalendarEvent }>("/api/calendar", {
      method: "POST",
      body: JSON.stringify(e),
    }),
  updateCalendarEvent: (
    id: string,
    patch: Partial<Pick<CalendarEvent, "title" | "notes" | "time" | "kind" | "done">>
  ) =>
    req<{ ok: true }>(`/api/calendar/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  deleteCalendarEvent: (id: string) =>
    req<{ ok: true }>(`/api/calendar/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // ── propostas ──
  listProposals: () => req<{ proposals: ProposalSummary[] }>("/api/proposals"),
  setProposalOutcome: (number: string, outcome: ProposalOutcome) =>
    req<{ ok: true; outcome: ProposalOutcome }>(`/api/proposals/${encodeURIComponent(number)}/outcome`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }),
  getProposal: (number: string) =>
    req<{ proposal: Proposal; status: "draft" | "published" }>(
      `/api/proposals/${encodeURIComponent(number)}`
    ),
  createProposal: (proposal: Proposal, status: "draft" | "published") =>
    req<{ ok: true; number: string; status: string }>("/api/proposals", {
      method: "POST",
      body: JSON.stringify({ proposal, status }),
    }),
  updateProposal: (number: string, proposal: Proposal, status: "draft" | "published") =>
    req<{ ok: true; number: string; status: string }>(
      `/api/proposals/${encodeURIComponent(number)}`,
      { method: "PUT", body: JSON.stringify({ proposal, status }) }
    ),
  deleteProposal: (number: string) =>
    req<{ ok: true }>(`/api/proposals/${encodeURIComponent(number)}`, {
      method: "DELETE",
    }),
  cancelProposal: (number: string) =>
    req<{ ok: true }>(`/api/proposals/${encodeURIComponent(number)}/cancel`, { method: "POST" }),

  // ── documentos vinculados (proposta ↔ contrato ↔ briefing) ──
  documentLinks: (proposal: string) =>
    req<DocumentLinks>(`/api/documents/links?proposal=${encodeURIComponent(proposal)}`),

  // ── briefings ──
  listBriefings: () => req<{ briefings: BriefingSummary[] }>("/api/briefings"),
  getBriefing: (number: string) =>
    req<{ briefing: Briefing; status: "draft" | "published" }>(
      `/api/briefings/${encodeURIComponent(number)}`
    ),
  createBriefing: (briefing: Briefing, status: "draft" | "published") =>
    req<{ ok: true; number: string; status: string }>("/api/briefings", {
      method: "POST",
      body: JSON.stringify({ briefing, status }),
    }),
  updateBriefing: (number: string, briefing: Briefing, status: "draft" | "published") =>
    req<{ ok: true; number: string; status: string }>(
      `/api/briefings/${encodeURIComponent(number)}`,
      { method: "PUT", body: JSON.stringify({ briefing, status }) }
    ),
  deleteBriefing: (number: string) =>
    req<{ ok: true }>(`/api/briefings/${encodeURIComponent(number)}`, {
      method: "DELETE",
    }),
  cancelBriefing: (number: string) =>
    req<{ ok: true }>(`/api/briefings/${encodeURIComponent(number)}/cancel`, { method: "POST" }),
  listBriefingResponses: (number: string) =>
    req<{ responses: BriefingResponse[] }>(
      `/api/briefings/${encodeURIComponent(number)}/responses`
    ),
  updateBriefingResponse: (number: string, id: number, answers: Record<string, string>) =>
    req<{ ok: true }>(`/api/briefings/${encodeURIComponent(number)}/responses`, {
      method: "PUT",
      body: JSON.stringify({ id, answers }),
    }),

  // ── clientes ──
  listClients: (q?: string) =>
    req<{ clients: Client[] }>(`/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getClient: (id: string) => req<{ client: Client }>(`/api/clients/${encodeURIComponent(id)}`),
  clientPanorama: (id: string) =>
    req<ClientPanorama>(`/api/clients/${encodeURIComponent(id)}/panorama`),
  createClient: (client: ClientInput) =>
    req<{ ok: true; id: string }>("/api/clients", {
      method: "POST",
      body: JSON.stringify(client),
    }),
  updateClient: (id: string, client: ClientInput) =>
    req<{ ok: true; id: string }>(`/api/clients/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(client),
    }),
  deleteClient: (id: string) =>
    req<{ ok: true }>(`/api/clients/${encodeURIComponent(id)}`, { method: "DELETE" }),
  async uploadClientPhoto(id: string, file: File): Promise<{ ok: true; photo_url: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/clients/${encodeURIComponent(id)}/photo`, { method: "POST", credentials: "include", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body?.error || `Erro ${res.status}`);
    return body as { ok: true; photo_url: string };
  },
  deleteClientPhoto: (id: string) =>
    req<{ ok: true }>(`/api/clients/${encodeURIComponent(id)}/photo`, { method: "DELETE" }),

  // ── Histórico Financeiro (HF) do cliente ──
  listClientHistory: (clientId: string) =>
    req<{ items: HistoryItem[]; totals: HistoryTotals }>(
      `/api/clients/${encodeURIComponent(clientId)}/history`
    ),
  createClientHistory: (clientId: string, input: HistoryInput) =>
    req<{ ok: true; id: string }>(`/api/clients/${encodeURIComponent(clientId)}/history`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  // Recebimento manual (fora do ASAAS) — grava no HF já pago e entra na receita.
  registerManualPayment: (input: {
    client_id: string;
    contract_id?: string | null;
    amount: number;
    date?: string;
    description?: string;
    method?: string;
  }) =>
    req<{ ok: true; id: string }>("/api/payments/manual", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateClientHistory: (clientId: string, hid: string, input: Partial<HistoryInput>) =>
    req<{ ok: true; id: string; status: HistoryStatus }>(
      `/api/clients/${encodeURIComponent(clientId)}/history/${encodeURIComponent(hid)}`,
      { method: "PUT", body: JSON.stringify(input) }
    ),
  deleteClientHistory: (clientId: string, hid: string) =>
    req<{ ok: true }>(
      `/api/clients/${encodeURIComponent(clientId)}/history/${encodeURIComponent(hid)}`,
      { method: "DELETE" }
    ),
  generateHistoryAsaas: (clientId: string, hid: string) =>
    req<{ ok: true; asaasPaymentId: string; url?: string; message?: string }>(
      `/api/clients/${encodeURIComponent(clientId)}/history/${encodeURIComponent(hid)}/generate-asaas`,
      { method: "POST" }
    ),

  // ── Acesso do cliente à Área do Cliente (Fase 3) ──
  getClientAccess: (clientId: string) =>
    req<{ enabled: boolean; link: string }>(`/api/clients/${encodeURIComponent(clientId)}/access`),
  setClientAccess: (clientId: string, enabled: boolean) =>
    req<{ ok: true; enabled: boolean; link: string }>(`/api/clients/${encodeURIComponent(clientId)}/access`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    }),
  regenerateClientLink: (clientId: string) =>
    req<{ ok: true; enabled: boolean; link: string }>(`/api/clients/${encodeURIComponent(clientId)}/access`, {
      method: "PUT",
      body: JSON.stringify({ regenerate: true }),
    }),

  // ── contratos ──
  listContracts: (status?: string) =>
    req<{ contracts: ContractSummary[] }>(`/api/contracts${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getContract: (id: string) => req<{ contract: Contract }>(`/api/contracts/${encodeURIComponent(id)}`),
  createContract: (contract: ContractInput) =>
    req<{ ok: true; id: string }>("/api/contracts", {
      method: "POST",
      body: JSON.stringify(contract),
    }),
  updateContract: (id: string, contract: ContractInput) =>
    req<{ ok: true; id: string; status: ContractStatus }>(`/api/contracts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(contract),
    }),
  deleteContract: (id: string) =>
    req<{ ok: true }>(`/api/contracts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  cancelContract: (id: string) =>
    req<{ ok: true }>(`/api/contracts/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  publishContract: (id: string) =>
    req<{ ok: true; slug: string; status: ContractStatus }>(
      `/api/contracts/${encodeURIComponent(id)}/publish`,
      { method: "POST" }
    ),
  // Envia o contrato (PDF) para assinatura na Autentique. Multipart (não-JSON).
  // Inativo até AUTENTIQUE_TOKEN existir (o backend responde com erro amigável).
  async sendAutentique(
    id: string,
    file?: File | null
  ): Promise<{ ok: true; documentId: string; url: string }> {
    const fd = new FormData();
    if (file) fd.append("file", file); // sem arquivo → o servidor gera o PDF automaticamente
    const res = await fetch(`/api/contracts/${encodeURIComponent(id)}/send-autentique`, {
      method: "POST",
      credentials: "include",
      body: fd, // sem Content-Type: o browser define o boundary
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body?.error || `Erro ${res.status}`);
    return body as { ok: true; documentId: string; url: string };
  },

  // Reconsulta a Autentique na hora (mesma lógica do webhook) e devolve o status
  // por signatário; marca 'signed' se todos assinaram.
  refreshSignature: (id: string) =>
    req<{
      ok: true;
      fullySigned: boolean;
      status: string;
      autentiqueUrl: string | null;
      signers: { name: string | null; email: string | null; signed: boolean; signedAt: string | null; rejected: boolean; link: string | null }[];
    }>(`/api/contracts/${encodeURIComponent(id)}/refresh-signature`, { method: "POST" }),

  // Sincroniza os pagamentos de um contrato com o ASAAS (não depende do webhook).
  syncPayments: (contractId: string) =>
    req<{ ok: true; updated: number; parcels?: { number: number; status: string }[]; message?: string }>(
      `/api/contracts/${encodeURIComponent(contractId)}/sync-payments`,
      { method: "POST" }
    ),

  // ── notificações (sininho) ──
  listNotifications: () =>
    req<{ items: AppNotification[]; unread: number }>(`/api/notifications`),
  markNotificationsRead: (ids?: string[]) =>
    req<{ ok: true }>(`/api/notifications`, {
      method: "POST",
      body: JSON.stringify(ids && ids.length ? { ids } : {}),
    }),

  // ── pagamentos / parcelas ──
  getContractPayments: (contractId: string) =>
    req<{ config: ContractPaymentConfig | null; installments: Installment[] }>(
      `/api/contracts/${encodeURIComponent(contractId)}/payments`
    ),
  saveContractPayments: (contractId: string, input: SavePaymentInput) =>
    req<{ ok: true; configId: string; count: number }>(
      `/api/contracts/${encodeURIComponent(contractId)}/payments`,
      { method: "POST", body: JSON.stringify(input) }
    ),
  deleteContractPayments: (contractId: string) =>
    req<{ ok: true; cancelled: number }>(
      `/api/contracts/${encodeURIComponent(contractId)}/payments`,
      { method: "DELETE" }
    ),
  generateAsaas: (contractId: string) =>
    req<{ ok: true; created: number; message?: string }>(
      `/api/contracts/${encodeURIComponent(contractId)}/generate-asaas`,
      { method: "POST" }
    ),
  listInstallments: (params?: { status?: string; contract?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.contract) qs.set("contract", params.contract);
    const s = qs.toString();
    return req<{ installments: Installment[] }>(`/api/installments${s ? `?${s}` : ""}`);
  },
  markInstallmentPaid: (id: string, input: MarkPaidInput) =>
    req<{ ok: true; id: string; status: string }>(`/api/installments/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  // ── armazenamento (R2) + backup (D1) ──
  storageUsage: () => req<StorageUsage>("/api/storage/usage"),
  listBackups: () => req<{ backups: { key: string; size: number; uploaded: string }[] }>("/api/storage/backups"),
  backupDownloadUrl: (key: string) => `/api/storage/backups?key=${encodeURIComponent(key)}`,
  async downloadBackup(): Promise<void> {
    const res = await fetch("/api/storage/backup", { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.error || `Erro ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `backup-isapaulino-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ── upload de imagem (R2) ──
  async uploadImage(file: File): Promise<{ url: string; key: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: fd, // não setar Content-Type: o browser define o boundary
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body?.error || `Erro ${res.status}`);
    return body as { url: string; key: string };
  },

  // ── documentos (arquivos gerais no R2, prefixo docs/) ──
  listDocuments: () => req<{ files: DocumentFile[]; folders: { name: string; count: number }[] }>("/api/documents"),
  createFolder: (folder: string) =>
    req<{ ok: true; folder: string }>("/api/documents/folder", { method: "POST", body: JSON.stringify({ folder }) }),
  deleteFolder: (folder: string) =>
    req<{ ok: true; deleted: number }>("/api/documents/folder", { method: "DELETE", body: JSON.stringify({ folder }) }),
  async uploadDocument(file: File, folder?: string, clientId?: string): Promise<{ ok: true; key: string; name: string; folder: string }> {
    const fd = new FormData();
    fd.append("file", file);
    if (folder) fd.append("folder", folder);
    if (clientId) fd.append("clientId", clientId);
    const res = await fetch("/api/documents", { method: "POST", credentials: "include", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body?.error || `Erro ${res.status}`);
    return body as { ok: true; key: string; name: string; folder: string };
  },
  deleteDocument: (key: string) =>
    req<{ ok: true }>("/api/documents", { method: "DELETE", body: JSON.stringify({ key }) }),
  documentDownloadUrl: (key: string) => `/api/documents/download?key=${encodeURIComponent(key)}`,
};

export interface TrashItem {
  id: string;
  name?: string | null;
  title?: string | null;
  clientName?: string | null;
  status?: string | null;
  cpfCnpj?: string | null;
  email?: string | null;
  deletedAt: string;
}

export interface AuditLog {
  id: string;
  at: string;
  user: string | null;
  action: string;
  method: string;
  path: string;
  status: number | null;
}

export interface ReportMonth {
  ym: string; // "2026-07"
  installments: number;
  hf: number;
  total: number;
}

export interface DocumentFile {
  key: string;
  name: string;
  folder: string;
  size: number;
  uploaded: string;
  contentType: string | null;
  clientId: string | null;
  clientName: string | null;
}

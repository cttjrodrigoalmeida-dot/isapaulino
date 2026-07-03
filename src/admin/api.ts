// Cliente da API admin (Pages Functions). Sempre com credentials:"include"
// para enviar/receber o cookie de sessão.
import type { Proposal } from "../components/proposal/types";
import type { Briefing } from "../components/briefing/types";

export interface ProposalSummary {
  number: string;
  client: string | null;
  serviceTitle: string | null;
  date: string | null;
  status: "draft" | "published";
  updatedAt: string;
}

export interface BriefingSummary {
  number: string;
  proposalNumber: string | null;
  title: string | null;
  status: "draft" | "published";
  updatedAt: string;
  responseCount: number;
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
  /** Nascimento (texto livre). */
  birth_date: string | null;
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
export type HistoryKind = "adicional" | "retrabalho" | "hora-tecnica" | "outro";

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
  publishedAt: string | null;
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
  };
  briefings: {
    total: number;
    draft: number;
    published: number;
    responsesTotal: number;
    withoutResponse: number;
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
  clientRanking: { client: string; total: number; count: number }[];
  recentActivity: { at: string; type: string; title: string; sub: string }[];
  pendencias: { kind: string; count: number; label: string }[];
  finance: {
    faturado: number;
    recebido: number;
    aReceber: number;
    atrasados: number;
    receivedByMonth: { key: string; label: string; value: number }[];
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
  dashboardOverview: () => req<DashboardOverview>("/api/dashboard/overview"),

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
  listBriefingResponses: (number: string) =>
    req<{ responses: BriefingResponse[] }>(
      `/api/briefings/${encodeURIComponent(number)}/responses`
    ),

  // ── clientes ──
  listClients: (q?: string) =>
    req<{ clients: Client[] }>(`/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getClient: (id: string) => req<{ client: Client }>(`/api/clients/${encodeURIComponent(id)}`),
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
    req<{ ok: true; enabled: boolean }>(`/api/clients/${encodeURIComponent(clientId)}/access`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
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
  publishContract: (id: string) =>
    req<{ ok: true; slug: string; status: ContractStatus }>(
      `/api/contracts/${encodeURIComponent(id)}/publish`,
      { method: "POST" }
    ),
  // Envia o contrato (PDF) para assinatura na Autentique. Multipart (não-JSON).
  // Inativo até AUTENTIQUE_TOKEN existir (o backend responde com erro amigável).
  async sendAutentique(
    id: string,
    file: File
  ): Promise<{ ok: true; documentId: string; url: string }> {
    const fd = new FormData();
    fd.append("file", file);
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
};

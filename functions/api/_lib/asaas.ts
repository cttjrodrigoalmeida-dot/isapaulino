// Cliente da API do ASAAS (https://docs.asaas.com). Toda a integração é
// OPCIONAL: sem ASAAS_API_KEY, `asaasConfigured` é false e os endpoints que
// dependem dela retornam um erro amigável em vez de quebrar.
import type { Env } from "./types";
import { HttpError } from "./http";

const DEFAULT_URL = "https://api.asaas.com/v3";

export function asaasConfigured(env: Env): boolean {
  return !!env.ASAAS_API_KEY;
}

function baseUrl(env: Env): string {
  return (env.ASAAS_API_URL || DEFAULT_URL).replace(/\/+$/, "");
}

async function asaasFetch<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.ASAAS_API_KEY) {
    throw new HttpError(400, "Integração ASAAS não configurada (defina ASAAS_API_KEY).");
  }
  const res = await fetch(`${baseUrl(env)}${path}`, {
    ...init,
    headers: {
      access_token: env.ASAAS_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = body?.errors?.[0]?.description || `Erro ASAAS ${res.status}`;
    throw new HttpError(res.status === 401 ? 400 : res.status, `ASAAS: ${msg}`);
  }
  return body as T;
}

export interface AsaasClient {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  phone?: string | null;
}

interface AsaasCustomer {
  id: string;
}

/** Busca um customer por CPF/CNPJ; cria se não existir. Evita duplicados. */
export async function findOrCreateCustomer(env: Env, client: AsaasClient): Promise<string> {
  const cpf = client.cpfCnpj.replace(/\D+/g, "");
  const found = await asaasFetch<{ data: AsaasCustomer[] }>(
    env,
    `/customers?cpfCnpj=${encodeURIComponent(cpf)}`
  );
  if (found.data && found.data.length > 0) return found.data[0].id;

  const created = await asaasFetch<AsaasCustomer>(env, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name: client.name,
      cpfCnpj: cpf,
      email: client.email || undefined,
      phone: client.phone ? client.phone.replace(/\D+/g, "") : undefined,
    }),
  });
  return created.id;
}

export interface CreatePaymentInput {
  customer: string; // id do customer no ASAAS
  value: number;
  dueDate: string; // 'YYYY-MM-DD'
  description?: string;
  externalReference?: string;
}

interface AsaasPayment {
  id: string;
  invoiceUrl?: string;
}

/** Cria uma cobrança. billingType UNDEFINED = cliente escolhe (PIX/boleto/cartão). */
export async function createPayment(env: Env, input: CreatePaymentInput): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(env, "/payments", {
    method: "POST",
    body: JSON.stringify({ billingType: "UNDEFINED", ...input }),
  });
}

export async function deletePayment(env: Env, asaasPaymentId: string): Promise<void> {
  await asaasFetch(env, `/payments/${encodeURIComponent(asaasPaymentId)}`, { method: "DELETE" });
}

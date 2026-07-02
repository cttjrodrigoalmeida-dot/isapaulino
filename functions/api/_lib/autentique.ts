// Cliente da API da Autentique (GraphQL — https://docs.autentique.com.br).
// Toda a integração é OPCIONAL: sem AUTENTIQUE_TOKEN, `autentiqueConfigured` é
// false e os endpoints que dependem dela retornam um erro amigável (não quebram).
// Upload de arquivo segue o "GraphQL multipart request spec".
import type { Env } from "./types";
import { HttpError } from "./http";

const DEFAULT_URL = "https://api.autentique.com.br/v2/graphql";

export function autentiqueConfigured(env: Env): boolean {
  return !!env.AUTENTIQUE_TOKEN;
}

function apiUrl(env: Env): string {
  return (env.AUTENTIQUE_API_URL || DEFAULT_URL).replace(/\/+$/, "");
}

function requireToken(env: Env): string {
  if (!env.AUTENTIQUE_TOKEN) {
    throw new HttpError(400, "Integração Autentique não configurada (defina AUTENTIQUE_TOKEN).");
  }
  return env.AUTENTIQUE_TOKEN;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

function unwrap<T>(status: number, body: GraphQLResponse<T>): T {
  if (body.errors && body.errors.length > 0) {
    throw new HttpError(400, `Autentique: ${body.errors[0].message}`);
  }
  if (!body.data) {
    throw new HttpError(status >= 400 ? status : 502, `Autentique: resposta inválida (${status}).`);
  }
  return body.data;
}

/** Query/mutation JSON (sem upload). */
async function graphqlJson<T>(env: Env, query: string, variables: unknown): Promise<T> {
  const token = requireToken(env);
  const res = await fetch(apiUrl(env), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  const body = (text ? JSON.parse(text) : {}) as GraphQLResponse<T>;
  return unwrap(res.status, body);
}

/** Mutation com upload de arquivo (multipart). */
async function graphqlMultipart<T>(env: Env, form: FormData): Promise<T> {
  const token = requireToken(env);
  const res = await fetch(apiUrl(env), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // sem Content-Type: o boundary é automático
    body: form,
  });
  const text = await res.text();
  const body = (text ? JSON.parse(text) : {}) as GraphQLResponse<T>;
  return unwrap(res.status, body);
}

// ── Tipos ──────────────────────────────────────────────────────────
export type SignerAction = "SIGN" | "APPROVE" | "RECOGNIZE" | "SIGN_AS_A_WITNESS";

export interface AutentiqueSigner {
  name?: string;
  email: string;
  action?: SignerAction;
}

export interface AutentiqueSignature {
  public_id: string;
  name: string | null;
  email: string | null;
  link?: { short_link: string } | null;
}

export interface AutentiqueDocument {
  id: string;
  name: string;
  signatures: AutentiqueSignature[];
}

// ── createDocument ─────────────────────────────────────────────────
const CREATE_DOCUMENT = `
mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
  createDocument(document: $document, signers: $signers, file: $file) {
    id
    name
    signatures { public_id name email link { short_link } }
  }
}`;

/** Cria um documento na Autentique com os signatários e o arquivo (PDF). */
export async function createSignatureDocument(
  env: Env,
  opts: { name: string; signers: AutentiqueSigner[]; file: Blob; fileName?: string }
): Promise<AutentiqueDocument> {
  const operations = {
    query: CREATE_DOCUMENT,
    variables: {
      document: { name: opts.name },
      signers: opts.signers.map((s) => ({
        email: s.email,
        action: s.action || "SIGN",
        ...(s.name ? { name: s.name } : {}),
      })),
      file: null,
    },
  };
  const form = new FormData();
  form.append("operations", JSON.stringify(operations));
  form.append("map", JSON.stringify({ file: ["variables.file"] }));
  form.append("file", opts.file, opts.fileName || "contrato.pdf");
  const data = await graphqlMultipart<{ createDocument: AutentiqueDocument }>(env, form);
  return data.createDocument;
}

// ── document (status) ──────────────────────────────────────────────
const DOCUMENT_QUERY = `
query Document($id: UUID!) {
  document(id: $id) {
    id
    name
    signatures { public_id email name signed { created_at } rejected { created_at } }
  }
}`;

export interface AutentiqueDocStatus {
  id: string;
  name: string;
  signatures: {
    public_id: string;
    email: string | null;
    name: string | null;
    signed: { created_at: string } | null;
    rejected: { created_at: string } | null;
  }[];
}

/** Consulta o status de um documento (quem já assinou). */
export async function getDocument(env: Env, id: string): Promise<AutentiqueDocStatus> {
  const data = await graphqlJson<{ document: AutentiqueDocStatus }>(env, DOCUMENT_QUERY, { id });
  return data.document;
}

/** true se todas as assinaturas do documento já foram concluídas. */
export function isFullySigned(doc: AutentiqueDocStatus): boolean {
  return doc.signatures.length > 0 && doc.signatures.every((s) => !!s.signed);
}

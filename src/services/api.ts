import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AppStorageSnapshot,
  ContractCompanySnapshot,
  ContractRecord,
  ContractSigner,
  Locale,
} from '../types';
import type { ClientAuditMetadata } from '../utils/cryptoAndDevice';

/**
 * Talks to server.ts. The browser never touches the database directly:
 * Supabase is only used here for login (auth), everything else goes
 * through /api/* with the user's access token.
 */

export type AuthMode = 'supabase' | 'dev' | 'disabled';

export interface BackendClientConfig {
  authMode: AuthMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  simulatedPayments: boolean;
}

export interface AuthUserInfo {
  id: string;
  email: string;
  name?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  body: Record<string, unknown>;
  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = typeof body.code === 'string' ? body.code : undefined;
    this.body = body;
  }
}

const DEV_USER_KEY = 'contratoja_dev_user';

let config: BackendClientConfig | null = null;
let supabase: SupabaseClient | null = null;
let initPromise: Promise<BackendClientConfig> | null = null;

export function initBackend(): Promise<BackendClientConfig> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const res = await fetch('/api/config');
        config = (await res.json()) as BackendClientConfig;
      } catch {
        config = { authMode: 'disabled', supabaseUrl: '', supabaseAnonKey: '', simulatedPayments: false };
      }
      if (config.authMode === 'supabase' && config.supabaseUrl && config.supabaseAnonKey) {
        supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
      }
      return config;
    })();
  }
  return initPromise;
}

export function getBackendConfig(): BackendClientConfig | null {
  return config;
}

/* ---------------- Auth ---------------- */

export async function getCurrentAuthUser(): Promise<AuthUserInfo | null> {
  const cfg = await initBackend();
  if (cfg.authMode === 'supabase' && supabase) {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    return {
      id: u.id,
      email: (u.email || '').toLowerCase(),
      name: (u.user_metadata?.name as string | undefined) || undefined,
    };
  }
  if (cfg.authMode === 'dev') {
    const email = localStorage.getItem(DEV_USER_KEY);
    return email ? { id: `dev_${email}`, email } : null;
  }
  return null;
}

function translateAuthError(message: string, locale: Locale): string {
  const pt = locale !== 'es-PY';
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return pt ? 'E-mail ou senha incorretos.' : 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return pt ? 'Este e-mail já tem conta. Use "Entrar".' : 'Este correo ya tiene cuenta. Usá "Ingresar".';
  if (m.includes('email not confirmed'))
    return pt ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).' : 'Confirmá tu correo antes de ingresar (revisá tu bandeja).';
  if (m.includes('password')) return pt ? 'Senha fraca: use pelo menos 6 caracteres.' : 'Contraseña débil: usá al menos 6 caracteres.';
  return message;
}

export async function signUpWithPassword(
  name: string,
  email: string,
  password: string,
  locale: Locale
): Promise<{ user: AuthUserInfo | null; needsEmailConfirmation: boolean; error?: string }> {
  const cfg = await initBackend();
  if (cfg.authMode === 'supabase' && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    if (error) return { user: null, needsEmailConfirmation: false, error: translateAuthError(error.message, locale) };
    if (!data.session || !data.user) return { user: null, needsEmailConfirmation: true };
    return {
      user: { id: data.user.id, email: (data.user.email || email).toLowerCase(), name },
      needsEmailConfirmation: false,
    };
  }
  if (cfg.authMode === 'dev') {
    const e = email.trim().toLowerCase();
    localStorage.setItem(DEV_USER_KEY, e);
    return { user: { id: `dev_${e}`, email: e, name }, needsEmailConfirmation: false };
  }
  return { user: null, needsEmailConfirmation: false, error: 'Login indisponível: servidor sem Supabase configurado.' };
}

export async function signInWithPassword(
  email: string,
  password: string,
  locale: Locale
): Promise<{ user: AuthUserInfo | null; error?: string }> {
  const cfg = await initBackend();
  if (cfg.authMode === 'supabase' && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { user: null, error: translateAuthError(error?.message || 'Erro', locale) };
    return {
      user: {
        id: data.user.id,
        email: (data.user.email || email).toLowerCase(),
        name: (data.user.user_metadata?.name as string | undefined) || undefined,
      },
    };
  }
  if (cfg.authMode === 'dev') {
    const e = email.trim().toLowerCase();
    localStorage.setItem(DEV_USER_KEY, e);
    return { user: { id: `dev_${e}`, email: e } };
  }
  return { user: null, error: 'Login indisponível: servidor sem Supabase configurado.' };
}

export async function signOutBackend(): Promise<void> {
  const cfg = await initBackend();
  if (cfg.authMode === 'supabase' && supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(DEV_USER_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const cfg = await initBackend();
  if (cfg.authMode === 'supabase' && supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  if (cfg.authMode === 'dev') {
    const email = localStorage.getItem(DEV_USER_KEY);
    return email ? { 'x-dev-user': email } : {};
  }
  return {};
}

/** Headers for JSON calls to our own /api (adds the login token when there is one). */
export async function jsonAuthHeaders(): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json', ...(await authHeaders()) };
}

/* ---------------- HTTP helpers ---------------- */

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** fetch() to our server with the login token attached. Throws ApiError on non-2xx. */
export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit & { json?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.auth === false ? {} : await authHeaders()),
    ...((init.headers as Record<string, string>) || {}),
  };
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, { ...init, headers, body });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(res.status, (data.error as string) || `Erro ${res.status}`, data);
  }
  return data as T;
}

/* ---------------- Workspace ---------------- */

export const workspaceApi = {
  async load(): Promise<AppStorageSnapshot | null> {
    const out = await apiFetch<{ snapshot: AppStorageSnapshot | null }>('/api/workspace');
    return out.snapshot;
  },
  async save(snapshot: AppStorageSnapshot): Promise<AppStorageSnapshot> {
    const out = await apiFetch<{ snapshot: AppStorageSnapshot }>('/api/workspace', {
      method: 'PUT',
      json: { snapshot },
    });
    return out.snapshot;
  },
};

export const creditsApi = {
  async purchase(params: {
    packageId: string;
    country: string;
    paymentMethod: string;
    packageLabel: string;
  }): Promise<AppStorageSnapshot> {
    const out = await apiFetch<{ snapshot: AppStorageSnapshot }>('/api/credits/purchase', {
      method: 'POST',
      json: params,
    });
    return out.snapshot;
  },
};

/* ---------------- Public (no login) ---------------- */

export interface PublicSignLookup {
  contract: ContractRecord;
  signer: ContractSigner;
  company: ContractCompanySnapshot | null;
  blockedBySigner: ContractSigner | null;
  locale: Locale;
}

export interface VerifyResult {
  found: boolean;
  authentic: boolean;
  limited?: boolean;
  contract?: ContractRecord;
  computedHash?: string;
  company?: ContractCompanySnapshot | null;
  locale?: Locale;
}

function signPath(contractId: string, token: string) {
  return `/api/public/sign/${encodeURIComponent(contractId)}/${encodeURIComponent(token)}`;
}

export const publicApi = {
  async getSignLookup(contractId: string, token: string): Promise<PublicSignLookup | null> {
    const out = await apiFetch<{ lookup: PublicSignLookup | null }>(signPath(contractId, token), {
      auth: false,
    });
    return out.lookup;
  },
  async recordView(contractId: string, token: string, audit: ClientAuditMetadata): Promise<void> {
    await apiFetch(`${signPath(contractId, token)}/view`, {
      method: 'POST',
      auth: false,
      json: { audit },
    });
  },
  async submitSignature(
    contractId: string,
    token: string,
    payload: {
      name: string;
      document: string;
      signatureDataUrl: string;
      selfieDataUrl?: string;
      consentAccepted: boolean;
      audit: ClientAuditMetadata;
    }
  ): Promise<{ contract: ContractRecord; signer: ContractSigner; allSigned: boolean }> {
    return apiFetch(signPath(contractId, token), { method: 'POST', auth: false, json: payload });
  },
  async verify(query: string): Promise<VerifyResult> {
    return apiFetch<VerifyResult>(`/api/public/verify?q=${encodeURIComponent(query)}`, {
      auth: false,
    });
  },
};

import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppStorageSnapshot, CreditTransaction } from '../src/types/index.ts';

/**
 * Server-side persistence.
 *
 * Each company (one owner account) has ONE workspace row. The server is the
 * source of truth for: credits, the credit ledger (transactions) and signer
 * data written from the public signing page.
 *
 * Two implementations:
 *  - SupabaseStore: production (tables in supabase/schema.sql)
 *  - FileStore: local/dev fallback when Supabase is not configured
 *    (data/dev-db.json). Never use FileStore in production.
 */

export interface WorkspaceMeta {
  /** Contract ids that already consumed a credit (survives deletes). */
  consumedContractIds: string[];
  /** Template ids that already earned the library-sharing bonus. */
  rewardedTemplateIds: string[];
}

export interface WorkspaceRow {
  ownerId: string;
  ownerEmail: string;
  data: AppStorageSnapshot;
  credits: number;
  transactions: CreditTransaction[];
  meta: WorkspaceMeta;
  version: number;
  updatedAt: string;
}

export interface ContractLookup {
  row: WorkspaceRow;
  contractId: string;
}

export interface Store {
  readonly kind: 'supabase' | 'file';
  getWorkspace(ownerId: string): Promise<WorkspaceRow | null>;
  /**
   * Insert (expectedVersion = 0) or update with optimistic locking.
   * Returns false when someone else saved first (caller should reload + retry).
   */
  saveWorkspace(row: WorkspaceRow, expectedVersion: number): Promise<boolean>;
  findByContractId(contractId: string): Promise<WorkspaceRow | null>;
  findByHashOrCode(query: string): Promise<ContractLookup | null>;
}

export function emptyMeta(): WorkspaceMeta {
  return { consumedContractIds: [], rewardedTemplateIds: [] };
}

function contractIndexRows(row: WorkspaceRow) {
  return (row.data.contracts || []).map((c) => ({
    contract_id: c.id,
    owner_id: row.ownerId,
    code: (c.code || '').toLowerCase(),
    document_hash: c.documentHash ? c.documentHash.toLowerCase() : null,
    status: c.status,
  }));
}

/* ------------------------------------------------------------------ */
/* Supabase                                                            */
/* ------------------------------------------------------------------ */

class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;
  constructor(db: SupabaseClient) {
    this.db = db;
  }

  private fromDb(r: Record<string, unknown>): WorkspaceRow {
    return {
      ownerId: r.owner_id as string,
      ownerEmail: (r.owner_email as string) || '',
      data: r.data as AppStorageSnapshot,
      credits: Number(r.credits ?? 0),
      transactions: (r.transactions as CreditTransaction[]) || [],
      meta: { ...emptyMeta(), ...((r.meta as WorkspaceMeta) || {}) },
      version: Number(r.version ?? 0),
      updatedAt: r.updated_at as string,
    };
  }

  async getWorkspace(ownerId: string) {
    const { data, error } = await this.db
      .from('workspaces')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.fromDb(data) : null;
  }

  async saveWorkspace(row: WorkspaceRow, expectedVersion: number) {
    const payload = {
      owner_id: row.ownerId,
      owner_email: row.ownerEmail,
      data: row.data,
      credits: row.credits,
      transactions: row.transactions,
      meta: row.meta,
      version: expectedVersion + 1,
      updated_at: row.updatedAt,
    };

    if (expectedVersion === 0) {
      const { error } = await this.db.from('workspaces').insert(payload);
      if (error) {
        // 23505 = unique violation → someone created it first
        if ((error as { code?: string }).code === '23505') return false;
        throw error;
      }
    } else {
      const { data, error } = await this.db
        .from('workspaces')
        .update(payload)
        .eq('owner_id', row.ownerId)
        .eq('version', expectedVersion)
        .select('owner_id');
      if (error) throw error;
      if (!data || data.length === 0) return false;
    }

    row.version = expectedVersion + 1;

    // Refresh lookup index used by the public signing / verify pages.
    const { error: delErr } = await this.db
      .from('contract_index')
      .delete()
      .eq('owner_id', row.ownerId);
    if (delErr) throw delErr;
    const idx = contractIndexRows(row);
    if (idx.length > 0) {
      const { error: insErr } = await this.db.from('contract_index').insert(idx);
      if (insErr) throw insErr;
    }
    return true;
  }

  async findByContractId(contractId: string) {
    const { data, error } = await this.db
      .from('contract_index')
      .select('owner_id')
      .eq('contract_id', contractId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.getWorkspace(data.owner_id as string);
  }

  async findByHashOrCode(query: string) {
    const q = query.trim().toLowerCase();
    // Only plain identifiers reach the PostgREST filter (no commas/parentheses).
    if (!/^[a-z0-9_-]{3,80}$/.test(q)) return null;
    const isHash = /^[0-9a-f]{64}$/.test(q);
    let req = this.db.from('contract_index').select('owner_id, contract_id, status');
    req = isHash ? req.eq('document_hash', q) : req.or(`code.eq.${q},contract_id.eq.${q}`);
    const { data, error } = await req.limit(20);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    // Same code can exist in several companies (CJ-2026-001): prefer signed.
    const pick =
      data.find((d) => d.status === 'signed') || data[0];
    const row = await this.getWorkspace(pick.owner_id as string);
    return row ? { row, contractId: pick.contract_id as string } : null;
  }
}

/* ------------------------------------------------------------------ */
/* Local JSON file (dev only)                                          */
/* ------------------------------------------------------------------ */

class FileStore implements Store {
  readonly kind = 'file' as const;
  private rows: Record<string, WorkspaceRow> = {};
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    try {
      if (fs.existsSync(filePath)) {
        this.rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (err) {
      console.error('[store] Could not read dev DB, starting empty:', err);
      this.rows = {};
    }
  }

  private flush() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.rows));
  }

  private clone(row: WorkspaceRow): WorkspaceRow {
    return JSON.parse(JSON.stringify(row));
  }

  async getWorkspace(ownerId: string) {
    const row = this.rows[ownerId];
    return row ? this.clone(row) : null;
  }

  async saveWorkspace(row: WorkspaceRow, expectedVersion: number) {
    const current = this.rows[row.ownerId];
    const currentVersion = current ? current.version : 0;
    if (currentVersion !== expectedVersion) return false;
    row.version = expectedVersion + 1;
    this.rows[row.ownerId] = this.clone(row);
    this.flush();
    return true;
  }

  async findByContractId(contractId: string) {
    for (const row of Object.values(this.rows)) {
      if (row.data.contracts?.some((c) => c.id === contractId)) {
        return this.clone(row);
      }
    }
    return null;
  }

  async findByHashOrCode(query: string) {
    const q = query.trim().toLowerCase();
    let fallback: ContractLookup | null = null;
    for (const row of Object.values(this.rows)) {
      for (const c of row.data.contracts || []) {
        const match =
          c.id.toLowerCase() === q ||
          (c.code || '').toLowerCase() === q ||
          (c.documentHash || '').toLowerCase() === q;
        if (!match) continue;
        const hit = { row: this.clone(row), contractId: c.id };
        if (c.status === 'signed') return hit;
        fallback = fallback || hit;
      }
    }
    return fallback;
  }
}

/* ------------------------------------------------------------------ */

export interface BackendConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  isProduction: boolean;
}

export function readBackendConfig(): BackendConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export function isSupabaseConfigured(cfg: BackendConfig): boolean {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.supabaseServiceKey);
}

export function createStore(cfg: BackendConfig, adminClient: SupabaseClient | null): Store {
  if (adminClient) return new SupabaseStore(adminClient);
  const file = process.env.DEV_DB_FILE || path.resolve(process.cwd(), 'data/dev-db.json');
  console.warn(
    `[store] Supabase NÃO configurado — usando banco local de desenvolvimento em ${file}. ` +
      'Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY para produção.'
  );
  return new FileStore(file);
}

export function createAdminClient(cfg: BackendConfig): SupabaseClient | null {
  if (!isSupabaseConfigured(cfg)) return null;
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

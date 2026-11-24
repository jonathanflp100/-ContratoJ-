import crypto from 'crypto';
import type {
  AppStorageSnapshot,
  ContractRecord,
  ContractSigner,
  ContractTimelineEvent,
  CreditTransaction,
} from '../src/types/index.ts';
import { computeContractSha256 } from './hash.ts';
import { emptyMeta, type WorkspaceRow } from './store.ts';

export const WELCOME_CREDITS = 2;
export const LIBRARY_SHARE_BONUS = 2;
/** Max number of templates that can earn the sharing bonus (anti-abuse). */
export const MAX_LIBRARY_REWARDS = 5;

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function isPt(snapshot: AppStorageSnapshot | null | undefined) {
  return snapshot?.locale !== 'es-PY';
}

export function createEmptyRow(
  ownerId: string,
  ownerEmail: string,
  locale: AppStorageSnapshot['locale'] | undefined,
  now: string
): WorkspaceRow {
  const welcome: CreditTransaction = {
    id: newId('tx'),
    companyId: '',
    type: 'bonus',
    amount: WELCOME_CREDITS,
    description:
      locale === 'es-PY'
        ? `Bono de bienvenida (${WELCOME_CREDITS} créditos gratis)`
        : `Bônus de boas-vindas (${WELCOME_CREDITS} créditos grátis)`,
    createdAt: now,
  };
  return {
    ownerId,
    ownerEmail,
    data: {
      user: null,
      company: null,
      locale: locale === 'es-PY' ? 'es-PY' : 'pt-BR',
      credits: WELCOME_CREDITS,
      templates: [],
      contracts: [],
      transactions: [welcome],
    },
    credits: WELCOME_CREDITS,
    transactions: [welcome],
    meta: emptyMeta(),
    version: 0,
    updatedAt: now,
  };
}

/** A contract "spends" a credit once it leaves draft or is sent to sign. */
export function contractRequiresCredit(c: ContractRecord): boolean {
  return Boolean(c.creditConsumed) || c.status !== 'draft' || (c.signers?.length ?? 0) > 0;
}

function unionTimeline(
  a: ContractTimelineEvent[] | undefined,
  b: ContractTimelineEvent[] | undefined
): ContractTimelineEvent[] {
  const map = new Map<string, ContractTimelineEvent>();
  for (const ev of [...(a || []), ...(b || [])]) {
    if (ev && ev.id && !map.has(ev.id)) map.set(ev.id, ev);
  }
  return [...map.values()].sort((x, y) => x.timestamp.localeCompare(y.timestamp));
}

/**
 * Signer data written on the server by the public signing page always wins
 * over a (possibly stale) copy coming from the owner's browser.
 */
function mergeSigners(
  incoming: ContractSigner[] | undefined,
  stored: ContractSigner[] | undefined
): ContractSigner[] | undefined {
  if (!incoming) return incoming;
  const byId = new Map((stored || []).map((s) => [s.id, s]));
  return incoming.map((s) => {
    const server = byId.get(s.id);
    if (!server) return s;
    if (server.status === 'signed') return server;
    return { ...s, viewedAt: s.viewedAt || server.viewedAt };
  });
}

export function finalizeIfAllSigned(contract: ContractRecord, now: string): ContractRecord {
  const signers = contract.signers || [];
  let next = contract;
  if (signers.length > 0 && signers.every((s) => s.status === 'signed') && next.status !== 'signed') {
    const lastSigned = signers
      .map((s) => s.signedAt || '')
      .sort()
      .pop();
    next = { ...next, status: 'signed', signedAt: lastSigned || now };
  }
  if (next.status === 'signed' && !next.documentHash) {
    const hash = computeContractSha256(next);
    next = {
      ...next,
      documentHash: hash,
      timeline: unionTimeline(next.timeline, [
        { id: newId('tl'), type: 'completed', timestamp: next.signedAt || now, detail: hash },
      ]),
    };
  }
  return next;
}

function mergeContract(
  incoming: ContractRecord,
  stored: ContractRecord | undefined,
  now: string
): ContractRecord {
  if (stored && stored.status === 'signed' && stored.documentHash) {
    // Signed + sealed: content is immutable. Only housekeeping fields move.
    return {
      ...stored,
      expirationInfo: incoming.expirationInfo ?? stored.expirationInfo,
      attachments: incoming.attachments ?? stored.attachments,
      attachmentsPurgedAt: incoming.attachmentsPurgedAt ?? stored.attachmentsPurgedAt,
      timeline: unionTimeline(stored.timeline, incoming.timeline),
    };
  }

  const merged: ContractRecord = {
    ...incoming,
    creditConsumed: contractRequiresCredit(incoming) || Boolean(stored?.creditConsumed),
    signers: mergeSigners(incoming.signers, stored?.signers),
    timeline: unionTimeline(stored?.timeline, incoming.timeline),
  };
  return finalizeIfAllSigned(merged, now);
}

export type MergeResult =
  | { ok: true; row: WorkspaceRow }
  | { ok: false; reason: 'insufficient_credits'; needed: number; available: number };

/**
 * Applies a snapshot coming from the owner's browser on top of what the
 * server has. Credits and the credit ledger are computed here — whatever the
 * browser says about credits is ignored.
 */
export function mergeIncomingWorkspace(params: {
  stored: WorkspaceRow | null;
  incoming: AppStorageSnapshot;
  ownerId: string;
  ownerEmail: string;
  now: string;
}): MergeResult {
  const { incoming, ownerId, ownerEmail, now } = params;
  const base =
    params.stored || createEmptyRow(ownerId, ownerEmail, incoming.locale, now);

  const storedById = new Map((base.data.contracts || []).map((c) => [c.id, c]));
  const contracts = (Array.isArray(incoming.contracts) ? incoming.contracts : []).map((c) =>
    mergeContract(c, storedById.get(c.id), now)
  );

  const meta = {
    consumedContractIds: [...base.meta.consumedContractIds],
    rewardedTemplateIds: [...base.meta.rewardedTemplateIds],
  };
  const consumed = new Set(meta.consumedContractIds);
  const companyId = incoming.company?.id || base.data.company?.id || '';
  const pt = isPt(incoming);

  let credits = base.credits;
  const newTx: CreditTransaction[] = [];

  for (const c of contracts) {
    if (!c.creditConsumed || consumed.has(c.id)) continue;
    credits -= 1;
    consumed.add(c.id);
    meta.consumedContractIds.push(c.id);
    newTx.push({
      id: newId('tx'),
      companyId,
      type: 'usage',
      amount: -1,
      description: `${c.code} · ${c.clientName}`,
      createdAt: now,
    });
  }

  const templates = Array.isArray(incoming.templates) ? incoming.templates : [];
  for (const tpl of templates) {
    if (!tpl.sharedToLibrary || meta.rewardedTemplateIds.includes(tpl.id)) continue;
    if (meta.rewardedTemplateIds.length >= MAX_LIBRARY_REWARDS) break;
    credits += LIBRARY_SHARE_BONUS;
    meta.rewardedTemplateIds.push(tpl.id);
    newTx.push({
      id: newId('tx'),
      companyId,
      type: 'bonus',
      amount: LIBRARY_SHARE_BONUS,
      description: pt
        ? `Compartilhamento anônimo na biblioteca (${tpl.title})`
        : `Contribución anónima a biblioteca (${tpl.title})`,
      createdAt: now,
    });
  }

  if (credits < 0) {
    return {
      ok: false,
      reason: 'insufficient_credits',
      needed: base.credits - credits,
      available: base.credits,
    };
  }

  const transactions = [...newTx, ...base.transactions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const data: AppStorageSnapshot = {
    ...incoming,
    contracts,
    templates,
    credits,
    transactions,
  };

  return {
    ok: true,
    row: {
      ...base,
      ownerEmail: ownerEmail || base.ownerEmail,
      data,
      credits,
      transactions,
      meta,
      updatedAt: now,
    },
  };
}

/** Snapshot returned to the owner: always carries server credits/ledger. */
export function toClientSnapshot(row: WorkspaceRow): AppStorageSnapshot {
  return { ...row.data, credits: row.credits, transactions: row.transactions };
}

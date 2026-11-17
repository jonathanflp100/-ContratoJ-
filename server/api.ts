import type { Express, Request, RequestHandler, Response } from 'express';
import type {
  AppStorageSnapshot,
  ContractCompanySnapshot,
  ContractRecord,
  ContractSigner,
  CreditTransaction,
} from '../src/types/index.ts';
import { computeContractSha256 } from './hash.ts';
import type { Store, WorkspaceRow } from './store.ts';
import {
  createEmptyRow,
  finalizeIfAllSigned,
  mergeIncomingWorkspace,
  newId,
  toClientSnapshot,
} from './workspace.ts';

/** Keep in sync with CREDIT_PACKAGES in src/services/storage.ts */
export const SERVER_CREDIT_PACKAGES = {
  avulso: { credits: 10, priceBRL: 79.9, pricePYG: 115000 },
  profissional: { credits: 30, priceBRL: 179.9, pricePYG: 260000 },
} as const;

const MAX_SIGNATURE_BYTES = 600 * 1024;
const MAX_SELFIE_BYTES = 2 * 1024 * 1024;
const MAX_RETRIES = 4;

function sendError(res: Response, status: number, error: string, extra: object = {}) {
  res.status(status).json({ error, ...extra });
}

function isImageDataUrl(value: unknown, maxBytes: number): value is string {
  return (
    typeof value === 'string' &&
    /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value) &&
    value.length <= maxBytes * 1.37
  );
}

function clientIp(req: Request): string {
  // app.set('trust proxy', 1) makes req.ip the real client behind one proxy.
  return req.ip || req.socket.remoteAddress || '';
}

function maskDocument(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-3)}`;
}

function companyOf(row: WorkspaceRow, contract: ContractRecord): ContractCompanySnapshot | null {
  if (contract.companySnapshot) return contract.companySnapshot;
  const c = row.data.company;
  if (!c) return null;
  return {
    name: c.name,
    country: c.country,
    taxId: c.taxId,
    logoDataUrl: c.logoDataUrl,
    brandColor: c.brandColor,
    address: c.address,
    phone: c.phone,
  };
}

/** What a signer is allowed to see: no other tokens, selfies or client uploads. */
function sanitizeForSigner(contract: ContractRecord, viewerToken: string): ContractRecord {
  return {
    ...contract,
    attachments: [],
    signers: (contract.signers || []).map((s) =>
      s.token === viewerToken
        ? s
        : { ...s, token: '', selfieDataUrl: undefined, whatsapp: '', userAgent: undefined }
    ),
  };
}

function sanitizeForVerify(contract: ContractRecord, limited: boolean): ContractRecord {
  const signers = (contract.signers || []).map((s) => ({
    ...s,
    token: '',
    selfieDataUrl: undefined,
    whatsapp: '',
    userAgent: undefined,
    document: limited ? maskDocument(s.document) : s.document,
    signatureDataUrl: limited ? undefined : s.signatureDataUrl,
  }));
  return {
    ...contract,
    attachments: [],
    signers,
    ...(limited
      ? {
          renderedContent: '',
          variables: {},
          clientDocument: maskDocument(contract.clientDocument),
          documentHash: undefined,
          clientEmail: '',
          clientPhone: '',
        }
      : {}),
  };
}

function findBlockingSigner(contract: ContractRecord, signer: ContractSigner) {
  if (contract.signatureConfig?.order !== 'sequential' || signer.status !== 'pending') return null;
  return (
    (contract.signers || [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .find((s) => s.order < signer.order && s.status !== 'signed') || null
  );
}

/**
 * Read-modify-write with optimistic locking. `mutate` returns the new row,
 * or a Response-producing error.
 */
async function updateRow<T>(
  load: () => Promise<WorkspaceRow | null>,
  store: Store,
  mutate: (row: WorkspaceRow) => { row: WorkspaceRow; result: T } | { error: [number, string, object?] }
): Promise<{ result: T } | { error: [number, string, object?] }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await load();
    if (!current) return { error: [404, 'Contrato não encontrado.'] };
    const out = mutate(current);
    if ('error' in out) return out;
    const ok = await store.saveWorkspace(out.row, current.version);
    if (ok) return { result: out.result };
  }
  return { error: [409, 'O documento está sendo atualizado. Tente de novo.'] };
}

export function registerApiRoutes(
  app: Express,
  deps: {
    store: Store;
    requireAuth: RequestHandler;
    publicLimiter: RequestHandler;
    clientConfig: Record<string, unknown>;
    allowSimulatedPayments: boolean;
  }
) {
  const { store, requireAuth, publicLimiter } = deps;

  app.get('/api/config', (_req, res) => {
    res.json(deps.clientConfig);
  });

  /* ---------------- Workspace (owner) ---------------- */

  app.get('/api/workspace', requireAuth, async (req, res) => {
    try {
      const row = await store.getWorkspace(req.authUser!.id);
      res.json({ snapshot: row ? toClientSnapshot(row) : null, version: row?.version ?? 0 });
    } catch (err) {
      console.error('[workspace:get]', err);
      sendError(res, 500, 'Erro ao carregar seus dados.');
    }
  });

  app.put('/api/workspace', requireAuth, async (req, res) => {
    const incoming = (req.body?.snapshot || null) as AppStorageSnapshot | null;
    if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.contracts)) {
      sendError(res, 400, 'Dados inválidos.');
      return;
    }
    const user = req.authUser!;
    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const stored = await store.getWorkspace(user.id);
        const merged = mergeIncomingWorkspace({
          stored,
          incoming,
          ownerId: user.id,
          ownerEmail: user.email,
          now: new Date().toISOString(),
        });
        if (!merged.ok) {
          res.status(402).json({
            error: 'Créditos insuficientes.',
            code: 'insufficient_credits',
            snapshot: stored ? toClientSnapshot(stored) : null,
          });
          return;
        }
        const ok = await store.saveWorkspace(merged.row, stored?.version ?? 0);
        if (ok) {
          res.json({ snapshot: toClientSnapshot(merged.row), version: merged.row.version });
          return;
        }
      }
      sendError(res, 409, 'Conflito ao salvar. Tente de novo.');
    } catch (err) {
      console.error('[workspace:put]', err);
      sendError(res, 500, 'Erro ao salvar seus dados.');
    }
  });

  /* ---------------- Credits ---------------- */

  app.post('/api/credits/purchase', requireAuth, async (req, res) => {
    if (!deps.allowSimulatedPayments) {
      sendError(
        res,
        501,
        'Pagamento online ainda não está ativo. Fale com o suporte para comprar créditos.'
      );
      return;
    }
    const { packageId, country, paymentMethod, packageLabel } = req.body || {};
    const pkg = SERVER_CREDIT_PACKAGES[packageId as keyof typeof SERVER_CREDIT_PACKAGES];
    if (!pkg) {
      sendError(res, 400, 'Pacote inválido.');
      return;
    }
    const user = req.authUser!;
    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const stored =
          (await store.getWorkspace(user.id)) ||
          createEmptyRow(user.id, user.email, undefined, new Date().toISOString());
        const price = country === 'PY' ? pkg.pricePYG : pkg.priceBRL;
        const tx: CreditTransaction = {
          id: newId('tx'),
          companyId: stored.data.company?.id || '',
          type: 'purchase',
          amount: pkg.credits,
          description: `${String(packageLabel || packageId).slice(0, 80)} (+${pkg.credits})`,
          packageId: packageId as CreditTransaction['packageId'],
          priceDisplay:
            country === 'PY'
              ? `Gs. ${price.toLocaleString('es-PY')}`
              : `R$ ${price.toFixed(2).replace('.', ',')}`,
          paymentMethod: `${String(paymentMethod || '').slice(0, 40)} (simulado)`,
          createdAt: new Date().toISOString(),
        };
        const row: WorkspaceRow = {
          ...stored,
          credits: stored.credits + pkg.credits,
          transactions: [tx, ...stored.transactions],
          updatedAt: tx.createdAt,
        };
        row.data = { ...row.data, credits: row.credits, transactions: row.transactions };
        if (await store.saveWorkspace(row, stored.version)) {
          res.json({ snapshot: toClientSnapshot(row), version: row.version });
          return;
        }
      }
      sendError(res, 409, 'Conflito ao registrar a compra. Tente de novo.');
    } catch (err) {
      console.error('[credits:purchase]', err);
      sendError(res, 500, 'Erro ao registrar a compra.');
    }
  });

  /* ---------------- Public signing (no login) ---------------- */

  app.get('/api/public/sign/:contractId/:token', publicLimiter, async (req, res) => {
    try {
      const { contractId, token } = req.params;
      const row = await store.findByContractId(contractId);
      const contract = row?.data.contracts.find((c) => c.id === contractId);
      const signer = contract?.signers?.find((s) => s.token === token && token.length >= 12);
      if (!row || !contract || !signer) {
        res.json({ lookup: null });
        return;
      }
      res.json({
        lookup: {
          contract: sanitizeForSigner(contract, token),
          signer,
          company: companyOf(row, contract),
          blockedBySigner: findBlockingSigner(contract, signer),
          locale: row.data.locale,
        },
      });
    } catch (err) {
      console.error('[public:sign:get]', err);
      sendError(res, 500, 'Erro ao carregar o documento.');
    }
  });

  app.post('/api/public/sign/:contractId/:token/view', publicLimiter, async (req, res) => {
    const { contractId, token } = req.params;
    const audit = req.body?.audit || {};
    try {
      const out = await updateRow(
        () => store.findByContractId(contractId),
        store,
        (row) => {
          const contract = row.data.contracts.find((c) => c.id === contractId);
          const signer = contract?.signers?.find((s) => s.token === token);
          if (!contract || !signer) return { error: [404, 'Link inválido.'] };
          if (signer.viewedAt) return { row, result: { changed: false } };
          const now = new Date().toISOString();
          const updated: ContractRecord = {
            ...contract,
            signers: contract.signers!.map((s) => (s.token === token ? { ...s, viewedAt: now } : s)),
            timeline: [
              ...(contract.timeline || []),
              {
                id: newId('tl'),
                type: 'viewed',
                timestamp: now,
                actorName: signer.name,
                timezone: String(audit.timezone || '').slice(0, 60),
                browser: String(audit.browser || '').slice(0, 60),
                device: String(audit.device || '').slice(0, 60),
              },
            ],
            updatedAt: now,
          };
          row.data = {
            ...row.data,
            contracts: row.data.contracts.map((c) => (c.id === contractId ? updated : c)),
          };
          return { row, result: { changed: true } };
        }
      );
      if ('error' in out) {
        sendError(res, out.error[0], out.error[1]);
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[public:sign:view]', err);
      sendError(res, 500, 'Erro ao registrar visualização.');
    }
  });

  app.post('/api/public/sign/:contractId/:token', publicLimiter, async (req, res) => {
    const { contractId, token } = req.params;
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 160);
    const document = String(body.document || '').trim().slice(0, 40);
    const audit = body.audit || {};

    if (!name || !document || body.consentAccepted !== true) {
      sendError(res, 400, 'Preencha nome, documento e aceite os termos.');
      return;
    }
    if (!isImageDataUrl(body.signatureDataUrl, MAX_SIGNATURE_BYTES)) {
      sendError(res, 400, 'Assinatura inválida.');
      return;
    }
    if (body.selfieDataUrl && !isImageDataUrl(body.selfieDataUrl, MAX_SELFIE_BYTES)) {
      sendError(res, 400, 'Selfie inválida ou muito grande.');
      return;
    }

    try {
      const out = await updateRow(
        () => store.findByContractId(contractId),
        store,
        (row) => {
          const contract = row.data.contracts.find((c) => c.id === contractId);
          const signer = contract?.signers?.find((s) => s.token === token);
          if (!contract || !signer) return { error: [404, 'Link inválido.'] };
          if (contract.status !== 'awaiting_signature') {
            return { error: [409, 'Este documento não está aguardando assinatura.'] };
          }
          if (signer.status === 'signed') {
            return { error: [409, 'Você já assinou este documento.'] };
          }
          if (findBlockingSigner(contract, signer)) {
            return { error: [409, 'Aguarde a assinatura da parte anterior.'] };
          }
          if (contract.signatureConfig?.requireSelfie && !body.selfieDataUrl) {
            return { error: [400, 'A selfie é obrigatória para este documento.'] };
          }

          // Server clock is the legal timestamp; browser data is audit context.
          const now = new Date().toISOString();
          const updatedSigner: ContractSigner = {
            ...signer,
            name,
            document,
            status: 'signed',
            viewedAt: signer.viewedAt || now,
            signedAt: now,
            timezone: String(audit.timezone || '').slice(0, 60),
            browser: String(audit.browser || '').slice(0, 60),
            device: String(audit.device || '').slice(0, 60),
            userAgent: String(audit.userAgent || req.header('user-agent') || '').slice(0, 300),
            ipAddress: clientIp(req),
            signatureDataUrl: body.signatureDataUrl,
            selfieDataUrl: body.selfieDataUrl || signer.selfieDataUrl,
            consentAccepted: true,
          };

          let updated: ContractRecord = {
            ...contract,
            signers: contract.signers!.map((s) => (s.token === token ? updatedSigner : s)),
            timeline: [
              ...(contract.timeline || []),
              {
                id: newId('tl'),
                type: 'signed',
                timestamp: now,
                actorName: updatedSigner.name,
                timezone: updatedSigner.timezone,
                browser: updatedSigner.browser,
                device: updatedSigner.device,
              },
            ],
            updatedAt: now,
          };
          updated = finalizeIfAllSigned(updated, now);

          row.data = {
            ...row.data,
            contracts: row.data.contracts.map((c) => (c.id === contractId ? updated : c)),
          };
          return {
            row,
            result: {
              contract: sanitizeForSigner(updated, token),
              signer: updatedSigner,
              allSigned: updated.status === 'signed',
            },
          };
        }
      );
      if ('error' in out) {
        sendError(res, out.error[0], out.error[1]);
        return;
      }
      res.json(out.result);
    } catch (err) {
      console.error('[public:sign:submit]', err);
      sendError(res, 500, 'Erro ao registrar a assinatura.');
    }
  });

  /* ---------------- Public verification ---------------- */

  app.get('/api/public/verify', publicLimiter, async (req, res) => {
    const raw = String(req.query.q || '').trim();
    let q = raw;
    try {
      if (/^https?:\/\//i.test(raw)) q = new URL(raw).searchParams.get('code') || raw;
    } catch {
      q = raw;
    }
    q = q.trim();
    if (!q) {
      res.json({ found: false, authentic: false });
      return;
    }
    try {
      const hit = await store.findByHashOrCode(q);
      const contract = hit?.row.data.contracts.find((c) => c.id === hit.contractId);
      if (!hit || !contract) {
        res.json({ found: false, authentic: false, locale: 'pt-BR' });
        return;
      }
      const computedHash = computeContractSha256(contract);
      // Only someone holding the hash (QR code / PDF) sees the full document.
      const byHash = (contract.documentHash || '').toLowerCase() === q.toLowerCase();
      const authentic =
        contract.status === 'signed' &&
        (!contract.documentHash || contract.documentHash.toLowerCase() === computedHash);
      res.json({
        found: true,
        authentic,
        limited: !byHash,
        contract: sanitizeForVerify(contract, !byHash),
        // Never hand out the hash to someone who only typed the short code:
        // the hash is the "key" that unlocks the full document above.
        computedHash: byHash ? computedHash : undefined,
        company: companyOf(hit.row, contract),
        locale: hit.row.data.locale,
      });
    } catch (err) {
      console.error('[public:verify]', err);
      sendError(res, 500, 'Erro ao verificar o documento.');
    }
  });
}

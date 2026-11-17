import crypto from 'crypto';
import type { ContractRecord } from '../src/types/index.ts';

/**
 * MUST stay identical to buildCanonicalContractPayload in
 * src/utils/cryptoAndDevice.ts, otherwise /verificar will report
 * "not authentic" for hashes computed in the browser.
 */
export function buildCanonicalContractPayload(contract: ContractRecord): string {
  const signersCanonical = (contract.signers || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((s) => ({
      id: s.id,
      name: s.name.trim(),
      document: s.document.trim(),
      signedAt: s.signedAt || '',
      timezone: s.timezone || '',
    }));

  return JSON.stringify({
    code: contract.code,
    title: contract.templateTitle,
    content: contract.renderedContent,
    signers: signersCanonical,
  });
}

export function computeContractSha256(contract: ContractRecord): string {
  return crypto
    .createHash('sha256')
    .update(buildCanonicalContractPayload(contract), 'utf8')
    .digest('hex');
}

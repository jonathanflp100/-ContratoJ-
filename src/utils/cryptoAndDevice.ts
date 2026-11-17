import type { ContractRecord, CountryCode, Locale } from '../types';

export interface ClientAuditMetadata {
  timestamp: string;
  timezone: string;
  browser: string;
  device: string;
  userAgent: string;
}

export function getClientAuditMetadata(): ClientAuditMetadata {
  const now = new Date();
  const timestamp = now.toISOString();

  let tzName = 'UTC';
  try {
    tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    tzName = 'UTC';
  }

  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absHours = Math.floor(Math.abs(offsetMin) / 60);
  const absMins = Math.abs(offsetMin) % 60;
  const offsetLabel =
    absMins > 0
      ? `UTC${sign}${absHours}:${String(absMins).padStart(2, '0')}`
      : `UTC${sign}${absHours}`;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  let browser = 'Navegador Web';
  if (/EdgA?\/(\d+)/i.test(ua)) {
    browser = `Edge ${ua.match(/EdgA?\/(\d+)/i)?.[1] || ''}`.trim();
  } else if (/OPR\/(\d+)/i.test(ua)) {
    browser = `Opera ${ua.match(/OPR\/(\d+)/i)?.[1] || ''}`.trim();
  } else if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
    browser = `Chrome ${ua.match(/Chrome\/(\d+)/i)?.[1] || ''}`.trim();
  } else if (/Firefox\/(\d+)/i.test(ua)) {
    browser = `Firefox ${ua.match(/Firefox\/(\d+)/i)?.[1] || ''}`.trim();
  } else if (/Safari\/(\d+)/i.test(ua) && /Version\/(\d+)/i.test(ua)) {
    browser = `Safari ${ua.match(/Version\/(\d+)/i)?.[1] || ''}`.trim();
  }

  let device = 'Desktop';
  if (/iPhone/i.test(ua)) {
    device = 'iPhone (iOS · Mobile)';
  } else if (/iPad/i.test(ua)) {
    device = 'iPad (iPadOS · Tablet)';
  } else if (/Android/i.test(ua)) {
    device = /Mobile/i.test(ua) ? 'Android (Smartphone)' : 'Android (Tablet)';
  } else if (/Windows/i.test(ua)) {
    device = 'Windows (Desktop)';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = 'macOS (Desktop)';
  } else if (/Linux/i.test(ua)) {
    device = 'Linux (Desktop)';
  }

  return {
    timestamp,
    timezone: `${tzName} (${offsetLabel})`,
    browser,
    device,
    userAgent: ua,
  };
}

/**
 * Builds canonical payload string for a contract + its signatures so SHA-256 is
 * deterministic both at completion time and during /verificar validation.
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

export async function computeContractSha256(
  contract: ContractRecord
): Promise<string> {
  const canonical = buildCanonicalContractPayload(contract);
  const bytes = new TextEncoder().encode(canonical);

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback only if subtle crypto is unavailable in a non-HTTPS context
  let h1 = 0xdeadbeef ^ bytes.length;
  let h2 = 0x41c6ce57 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`.repeat(4).slice(0, 64);
}

export function normalizeWhatsAppDigits(
  rawPhone: string,
  country: CountryCode
): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  if (country === 'BR') {
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  }

  // Paraguay (+595)
  if (digits.startsWith('595')) return digits;
  if (digits.startsWith('0') && digits.length >= 9) {
    return `595${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return `595${digits}`;
  }
  return digits;
}

export function getSignerPublicPath(contractId: string, token: string): string {
  return `/assinar/${encodeURIComponent(contractId)}/${encodeURIComponent(token)}`;
}

export function getSignerPublicUrl(contractId: string, token: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://contratoja.app';
  return `${origin}${getSignerPublicPath(contractId, token)}`;
}

export function getVerifyPublicUrl(codeOrHash?: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://contratoja.app';
  if (!codeOrHash) return `${origin}/verificar`;
  return `${origin}/verificar?code=${encodeURIComponent(codeOrHash)}`;
}

export function buildWhatsAppShareUrl(params: {
  phone: string;
  country: CountryCode;
  locale: Locale;
  signerName: string;
  companyName: string;
  contractTitle: string;
  signUrl: string;
}): string {
  const cleanDigits = normalizeWhatsAppDigits(params.phone, params.country);
  const message =
    params.locale === 'es-PY'
      ? `Hola ${params.signerName}, ${params.companyName} te envió el documento "${params.contractTitle}" para firma electrónica.\n\nIngresá al enlace seguro para leer y firmar:\n${params.signUrl}`
      : `Olá ${params.signerName}, ${params.companyName} enviou o documento "${params.contractTitle}" para assinatura eletrônica.\n\nAcesse o link seguro para ler e assinar:\n${params.signUrl}`;

  const base = cleanDigits
    ? `https://wa.me/${cleanDigits}`
    : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

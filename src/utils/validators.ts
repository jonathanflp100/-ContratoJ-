import type { CountryCode, Locale, TemplateFieldType } from '../types';

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

export function isValidCPF(raw: string): boolean {
  const cpf = digitsOnly(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(cpf[10]);
}

export function isValidCNPJ(raw: string): boolean {
  const cnpj = digitsOnly(raw);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(base[i]) * weights[i];
    }
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cnpj, w1);
  if (d1 !== Number(cnpj[12])) return false;

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d2 = calcDigit(cnpj, w2);
  return d2 === Number(cnpj[13]);
}

export function formatCPF(raw: string): string {
  const d = digitsOnly(raw).slice(0, 11);
  if (d.length !== 11) return raw;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function formatCNPJ(raw: string): string {
  const d = digitsOnly(raw).slice(0, 14);
  if (d.length !== 14) return raw;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

export interface FieldValidationResult {
  valid: boolean;
  message?: string;
}

export function validateFieldValue(
  value: string,
  type: TemplateFieldType,
  country: CountryCode,
  locale: Locale
): FieldValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true };
  }

  const isES = locale === 'es-PY';

  if (type === 'cpf_ci') {
    const digits = digitsOnly(trimmed);
    if (country === 'BR') {
      if (digits.length === 11) {
        return isValidCPF(digits)
          ? { valid: true }
          : {
              valid: false,
              message: isES
                ? 'CPF inválido (dígito verificador incorrecto).'
                : 'CPF inválido (dígito verificador incorreto).',
            };
      }
      if (digits.length === 14) {
        return isValidCNPJ(digits)
          ? { valid: true }
          : {
              valid: false,
              message: isES
                ? 'CNPJ inválido (dígito verificador incorrecto).'
                : 'CNPJ inválido (dígito verificador incorreto).',
            };
      }
      // Also allow RG / numeric ID if not 11 or 14, or warn if clearly incomplete CPF/CNPJ
      if (digits.length < 5) {
        return {
          valid: false,
          message: isES
            ? 'Documento incompleto.'
            : 'Informe um CPF (11 dígitos), CNPJ (14 dígitos) ou RG válido.',
        };
      }
      if (digits.length > 9 && digits.length !== 11 && digits.length !== 14) {
        return {
          valid: false,
          message: isES
            ? 'CPF debe tener 11 dígitos y CNPJ 14 dígitos.'
            : 'CPF deve ter 11 dígitos e CNPJ 14 dígitos.',
        };
      }
      return { valid: true };
    } else {
      // Paraguay: C.I. (6-8 digits) or RUC (6-8 digits + '-' + 1 check digit) or CPF/CNPJ
      if (digits.length === 11 && !trimmed.includes('-')) {
        if (!isValidCPF(digits)) {
          return {
            valid: false,
            message: isES ? 'CPF inválido.' : 'CPF inválido.',
          };
        }
        return { valid: true };
      }
      if (digits.length === 14) {
        if (!isValidCNPJ(digits)) {
          return {
            valid: false,
            message: isES ? 'CNPJ inválido.' : 'CNPJ inválido.',
          };
        }
        return { valid: true };
      }
      if (trimmed.includes('-')) {
        const rucMatch = /^\d{5,9}-\d$/.test(trimmed.replace(/\./g, ''));
        if (!rucMatch) {
          return {
            valid: false,
            message: isES
              ? 'Formato de RUC inválido (ej: 80012345-6).'
              : 'Formato de RUC inválido (ex: 80012345-6).',
          };
        }
        return { valid: true };
      }
      if (digits.length < 6 || digits.length > 9) {
        return {
          valid: false,
          message: isES
            ? 'Cédula o RUC inválido.'
            : 'Cédula de Identidad ou RUC inválido.',
        };
      }
      return { valid: true };
    }
  }

  if (type === 'data') {
    const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    let day = 0;
    let month = 0;
    let year = 0;

    if (brMatch) {
      day = Number(brMatch[1]);
      month = Number(brMatch[2]);
      year = Number(brMatch[3]);
    } else if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
    } else {
      return {
        valid: false,
        message: isES
          ? 'Use el formato DD/MM/AAAA.'
          : 'Use o formato DD/MM/AAAA.',
      };
    }

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return {
        valid: false,
        message: isES ? 'Fecha inválida.' : 'Data inválida.',
      };
    }
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return {
        valid: false,
        message: isES ? 'Fecha inexistente en el calendario.' : 'Data inexistente no calendário.',
      };
    }
    return { valid: true };
  }

  if (type === 'moeda') {
    const hasNumbers = /\d/.test(trimmed);
    if (!hasNumbers) {
      return {
        valid: false,
        message: isES ? 'Informe un monto numérico.' : 'Informe um valor numérico.',
      };
    }
    if (country === 'BR') {
      const ok = /^(R\$\s?)?\d{1,3}(\.\d{3})*(,\d{2})?$|^(R\$\s?)?\d+(,\d{1,2})?$/.test(
        trimmed
      );
      if (!ok) {
        return {
          valid: false,
          message: isES
            ? 'Formato esperado en Reales: R$ 2.500,00'
            : 'Formato esperado: R$ 2.500,00',
        };
      }
    } else {
      const ok = /^(Gs\.?\s?|PYG\s?)?\d{1,3}(\.\d{3})*$|^(Gs\.?\s?|PYG\s?)?\d+$/.test(
        trimmed
      );
      if (!ok) {
        return {
          valid: false,
          message: isES
            ? 'Formato esperado en Guaraníes: Gs. 3.500.000'
            : 'Formato esperado em Guaranis: Gs. 3.500.000',
        };
      }
    }
    return { valid: true };
  }

  return { valid: true };
}

export function formatCurrencyInputValue(
  raw: string,
  country: CountryCode
): string {
  const digits = digitsOnly(raw);
  if (!digits) return '';
  if (country === 'PY') {
    const num = Number(digits);
    return `Gs. ${num.toLocaleString('es-PY')}`;
  }
  const cents = Number(digits) / 100;
  return cents.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateInputValue(raw: string): string {
  const d = digitsOnly(raw).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

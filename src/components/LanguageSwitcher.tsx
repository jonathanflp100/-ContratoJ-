import type { Locale } from '../types';

interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({
  locale,
  onChange,
  variant = 'light',
}: LanguageSwitcherProps) {
  const isDark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label="Selecionar idioma / Seleccionar idioma"
      className={`inline-flex items-center p-1 rounded-lg border ${
        isDark
          ? 'bg-navy-950/60 border-white/15'
          : 'bg-slate-100 border-slate-200'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange('pt-BR')}
        className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          locale === 'pt-BR'
            ? isDark
              ? 'bg-white text-navy-900 shadow-xs'
              : 'bg-white text-navy-900 shadow-xs'
            : isDark
              ? 'text-slate-300 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        PT-BR
      </button>
      <button
        type="button"
        onClick={() => onChange('es-PY')}
        className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          locale === 'es-PY'
            ? isDark
              ? 'bg-white text-navy-900 shadow-xs'
              : 'bg-white text-navy-900 shadow-xs'
            : isDark
              ? 'text-slate-300 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        ES-PY
      </button>
    </div>
  );
}

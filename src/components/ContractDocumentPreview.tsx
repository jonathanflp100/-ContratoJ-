import type { CompanyProfile, Locale } from '../types';

interface ContractDocumentPreviewProps {
  company: CompanyProfile | null;
  renderedContent: string;
  clientName: string;
  clientDocument: string;
  contractCode?: string;
  locale: Locale;
}

export function ContractDocumentPreview({
  company,
  renderedContent,
  clientName,
  clientDocument,
  contractCode,
  locale,
}: ContractDocumentPreviewProps) {
  const brandColor = company?.brandColor || '#0F2544';
  const docIdLabel = company?.country === 'PY' ? 'RUC' : 'CNPJ';
  const initials = (company?.name || 'CJ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="print-only-document bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: brandColor }} />
      <div className="p-6 sm:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5 min-w-0">
            {company?.logoDataUrl ? (
              <img
                src={company.logoDataUrl}
                alt={company.name}
                referrerPolicy="no-referrer"
                className="h-12 w-12 object-contain rounded-lg border border-slate-100 bg-white p-1 shrink-0"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {initials || 'CJ'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {company?.name || 'Empresa'}
              </p>
              <p className="text-xs text-slate-500 tabular-nums truncate">
                {docIdLabel}: {company?.taxId || '—'}
                {company?.phone ? ` · ${company.phone}` : ''}
              </p>
              {company?.address && (
                <p className="text-xs text-slate-500 truncate">{company.address}</p>
              )}
            </div>
          </div>

          {contractCode && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xs text-slate-500">
                {locale === 'es-PY' ? 'Código' : 'Código'}
              </p>
              <p className="text-xs font-mono font-medium text-slate-800 tabular-nums">
                {contractCode}
              </p>
            </div>
          )}
        </header>

        <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-normal">
          {renderedContent}
        </div>

        <footer className="pt-8 mt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div className="h-10 border-b border-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-900">
              {company?.name || 'Empresa'}
            </p>
            <p className="text-xs text-slate-500 tabular-nums">
              {docIdLabel}: {company?.taxId || '—'}
            </p>
          </div>
          <div>
            <div className="h-10 border-b border-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-900">
              {clientName || (locale === 'es-PY' ? 'Cliente' : 'Cliente')}
            </p>
            <p className="text-xs text-slate-500 tabular-nums">
              {clientDocument || '—'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

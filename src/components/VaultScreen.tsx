import { useMemo, useState } from 'react';
import {
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  FileDown,
  FileEdit,
  Home,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import { generateContractPdfA4 } from '../services/contractExporter';
import type {
  CompanyProfile,
  ContractRecord,
  ContractStatus,
  Locale,
  TemplateCategory,
} from '../types';
import { getVerifyPublicUrl } from '../utils/cryptoAndDevice';

interface VaultScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  company: CompanyProfile | null;
  contracts: ContractRecord[];
  onOpenContract: (contract: ContractRecord) => void;
  onOpenVerifyCode: (codeOrHash: string) => void;
}

type PeriodFilter = 'all' | '7d' | '30d' | '90d' | 'custom';

export function VaultScreen({
  t,
  locale,
  company,
  contracts,
  onOpenContract,
  onOpenVerifyCode,
}: VaultScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>('signed');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TemplateCategory>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const categoryLabel = (cat?: TemplateCategory) => {
    switch (cat) {
      case 'locacao':
        return t.templates.catLocacao;
      case 'compra_venda':
        return t.templates.catCompraVenda;
      case 'servicos':
        return t.templates.catServicos;
      case 'recibo':
        return t.templates.catRecibo;
      default:
        return t.templates.catOutros;
    }
  };

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const nowMs = Date.now();

    return contracts
      .filter((c) => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && (c.category || 'outros') !== categoryFilter) {
          return false;
        }

        const refDateStr = c.signedAt || c.createdAt;
        const refMs = new Date(refDateStr).getTime();

        if (periodFilter === '7d' && nowMs - refMs > 7 * 86400000) return false;
        if (periodFilter === '30d' && nowMs - refMs > 30 * 86400000) return false;
        if (periodFilter === '90d' && nowMs - refMs > 90 * 86400000) return false;
        if (periodFilter === 'custom') {
          if (dateFrom) {
            const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
            if (refMs < fromMs) return false;
          }
          if (dateTo) {
            const toMs = new Date(`${dateTo}T23:59:59`).getTime();
            if (refMs > toMs) return false;
          }
        }

        if (!q) return true;

        const propAddress = (
          c.propertyAddress ||
          c.variables?.endereco_imovel ||
          c.variables?.direccion_inmueble ||
          c.variables?.endereco_comprador ||
          ''
        ).toLowerCase();
        const docDigits = c.clientDocument.replace(/\D/g, '');

        return (
          c.clientName.toLowerCase().includes(q) ||
          c.clientDocument.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && docDigits.includes(qDigits)) ||
          propAddress.includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.templateTitle.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.signedAt || b.createdAt).getTime() -
          new Date(a.signedAt || a.createdAt).getTime()
      );
  }, [
    contracts,
    search,
    statusFilter,
    categoryFilter,
    periodFilter,
    dateFrom,
    dateTo,
  ]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'es-PY' ? 'es-PY' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const handleDownloadPdf = async (contract: ContractRecord) => {
    setDownloadingId(contract.id);
    try {
      await generateContractPdfA4({
        company: company || contract.companySnapshot || null,
        contractTitle: contract.templateTitle,
        contractCode: contract.code,
        renderedContent: contract.renderedContent,
        clientName: contract.clientName,
        clientDocument: contract.clientDocument,
        locale,
        signers: contract.signers,
        documentHash: contract.documentHash,
        verificationUrl: getVerifyPublicUrl(contract.documentHash || contract.code),
        completedAt: contract.signedAt,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.vault.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.vault.subtitle}</p>
        </div>

        <div className="text-xs font-semibold text-navy-900 bg-white border border-slate-200 rounded-xl px-3.5 py-2 tabular-nums self-start sm:self-auto">
          {filteredContracts.length} {t.vault.resultsCount}
        </div>
      </div>

      {/* Search & Multi-Filters */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.vault.searchPlaceholder}
            className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              {t.vault.filterStatusLabel}
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | ContractStatus)
              }
              className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
            >
              <option value="signed">{t.dashboard.statusSigned}</option>
              <option value="all">{t.dashboard.filterAll}</option>
              <option value="awaiting_signature">{t.dashboard.statusAwaiting}</option>
              <option value="draft">{t.dashboard.statusDraft}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              {t.vault.filterCategoryLabel}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as 'all' | TemplateCategory)
              }
              className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
            >
              <option value="all">{t.templates.filterAll}</option>
              <option value="locacao">{t.templates.catLocacao}</option>
              <option value="compra_venda">{t.templates.catCompraVenda}</option>
              <option value="servicos">{t.templates.catServicos}</option>
              <option value="recibo">{t.templates.catRecibo}</option>
              <option value="outros">{t.templates.catOutros}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              {t.vault.filterPeriodLabel}
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
            >
              <option value="all">{t.vault.periodAll}</option>
              <option value="7d">{t.vault.period7d}</option>
              <option value="30d">{t.vault.period30d}</option>
              <option value="90d">{t.vault.period90d}</option>
              <option value="custom">{t.vault.periodCustom}</option>
            </select>
          </div>
        </div>

        {periodFilter === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {t.vault.dateFrom}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-xl tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {t.vault.dateTo}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-xl tabular-nums"
              />
            </div>
          </div>
        )}
      </section>

      {/* Vault List */}
      {filteredContracts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <Archive className="h-9 w-9 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-navy-900">
            {t.vault.emptyTitle}
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t.vault.emptyDesc}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {filteredContracts.map((contract) => {
            const propAddress =
              contract.propertyAddress ||
              contract.variables?.endereco_imovel ||
              contract.variables?.direccion_inmueble ||
              contract.variables?.endereco_comprador;

            return (
              <div
                key={contract.id}
                className="p-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <button
                      type="button"
                      onClick={() => onOpenContract(contract)}
                      className="text-base font-semibold text-navy-900 hover:text-emerald-700 text-left truncate cursor-pointer"
                    >
                      {contract.clientName}
                    </button>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      {contract.code}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {contract.clientDocument}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-medium text-navy-900">
                      {categoryLabel(contract.category)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{contract.templateTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {formatDate(contract.signedAt || contract.createdAt)}
                    </span>
                    {contract.createdByName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          {contract.createdByName}
                        </span>
                      </>
                    )}
                  </div>

                  {propAddress && (
                    <p className="text-xs text-slate-600 inline-flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{propAddress}</span>
                    </p>
                  )}

                  {contract.attachmentsPurgedAt && (
                    <p className="text-[11px] font-medium text-slate-500">
                      {t.vault.purgedBadge}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {contract.status === 'signed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 mr-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t.dashboard.statusSigned}</span>
                    </span>
                  ) : contract.status === 'awaiting_signature' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 mr-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t.dashboard.statusAwaiting}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 mr-2">
                      <FileEdit className="h-3.5 w-3.5" />
                      <span>{t.dashboard.statusDraft}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={downloadingId === contract.id}
                    onClick={() => handleDownloadPdf(contract)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-navy-900 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>

                  {contract.status === 'signed' && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenVerifyCode(contract.documentHash || contract.code)
                      }
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>SHA-256</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenContract(contract)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    {t.dashboard.viewContract}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import { extractContractTermsWithAI } from '../services/documentParser';
import type {
  CompanyProfile,
  ContractExpirationInfo,
  ContractRecord,
  Locale,
} from '../types';

interface ExpirationsScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  company: CompanyProfile | null;
  contracts: ContractRecord[];
  onSaveExpirationInfo: (
    contractId: string,
    info: ContractExpirationInfo
  ) => void;
  onRenewContract: (contract: ContractRecord) => void;
  onOpenContract: (contract: ContractRecord) => void;
}

type WindowFilter = 'all' | '7' | '30' | '60';

function computeDaysUntil(ymd?: string): number | null {
  if (!ymd) return null;
  const target = new Date(`${ymd}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

export function ExpirationsScreen({
  t,
  locale,
  company,
  contracts,
  onSaveExpirationInfo,
  onRenewContract,
  onOpenContract,
}: ExpirationsScreenProps) {
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('all');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const country = company?.country || (locale === 'es-PY' ? 'PY' : 'BR');

  const mappedContracts = useMemo(() => {
    return contracts
      .filter(
        (c) =>
          c.expirationInfo &&
          (c.expirationInfo.endDate || c.expirationInfo.adjustmentDate)
      )
      .map((contract) => {
        const endDays = computeDaysUntil(contract.expirationInfo?.endDate);
        const adjDays = computeDaysUntil(contract.expirationInfo?.adjustmentDate);
        const relevantDays =
          endDays !== null && adjDays !== null
            ? Math.min(endDays, adjDays)
            : endDays ?? adjDays ?? 999;
        return { contract, endDays, adjDays, relevantDays };
      })
      .sort((a, b) => a.relevantDays - b.relevantDays);
  }, [contracts]);

  const unmappedContracts = useMemo(
    () =>
      contracts.filter(
        (c) =>
          c.status !== 'draft' &&
          (!c.expirationInfo ||
            (!c.expirationInfo.endDate && !c.expirationInfo.adjustmentDate))
      ),
    [contracts]
  );

  const counts = useMemo(() => {
    let d7 = 0;
    let d30 = 0;
    let d60 = 0;
    mappedContracts.forEach(({ relevantDays }) => {
      if (relevantDays <= 7) d7++;
      if (relevantDays <= 30) d30++;
      if (relevantDays <= 60) d60++;
    });
    return { d7, d30, d60, all: mappedContracts.length };
  }, [mappedContracts]);

  const visibleMapped = useMemo(() => {
    if (windowFilter === 'all') return mappedContracts;
    const limit = Number(windowFilter);
    return mappedContracts.filter((item) => item.relevantDays <= limit);
  }, [mappedContracts, windowFilter]);

  const handleAnalyzeOne = async (contract: ContractRecord) => {
    setErrorMsg(null);
    setAnalyzingId(contract.id);
    try {
      const info = await extractContractTermsWithAI({
        contractText: contract.renderedContent,
        variables: contract.variables,
        country,
        locale,
      });
      onSaveExpirationInfo(contract.id, info);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao analisar vencimento.'
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAnalyzeAllPending = async () => {
    if (unmappedContracts.length === 0) return;
    setErrorMsg(null);
    setIsAnalyzingAll(true);
    try {
      for (const contract of unmappedContracts) {
        const info = await extractContractTermsWithAI({
          contractText: contract.renderedContent,
          variables: contract.variables,
          country,
          locale,
        });
        onSaveExpirationInfo(contract.id, info);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao analisar vencimentos.'
      );
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const formatYmd = (ymd?: string) => {
    if (!ymd) return '—';
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(locale === 'es-PY' ? 'es-PY' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.expirations.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.expirations.subtitle}</p>
        </div>

        {unmappedContracts.length > 0 && (
          <button
            type="button"
            disabled={isAnalyzingAll}
            onClick={handleAnalyzeAllPending}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {isAnalyzingAll ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-emerald-400" />
            )}
            <span>
              {isAnalyzingAll
                ? t.expirations.analyzingBtn
                : `${t.expirations.analyzeAllAiBtn} (${unmappedContracts.length})`}
            </span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-medium text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* 7 / 30 / 60 Day Alert Filter Buckets */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          [
            {
              id: '7' as const,
              label: t.expirations.alert7d,
              count: counts.d7,
              tone: 'border-red-200 bg-red-50/70 text-red-900',
              activeRing: 'ring-2 ring-red-600',
            },
            {
              id: '30' as const,
              label: t.expirations.alert30d,
              count: counts.d30,
              tone: 'border-amber-200 bg-amber-50/70 text-amber-950',
              activeRing: 'ring-2 ring-amber-600',
            },
            {
              id: '60' as const,
              label: t.expirations.alert60d,
              count: counts.d60,
              tone: 'border-blue-200 bg-blue-50/70 text-navy-900',
              activeRing: 'ring-2 ring-navy-900',
            },
            {
              id: 'all' as const,
              label: t.expirations.alertAllUpcoming,
              count: counts.all,
              tone: 'border-slate-200 bg-white text-navy-900',
              activeRing: 'ring-2 ring-emerald-600',
            },
          ] as const
        ).map((bucket) => (
          <button
            key={bucket.id}
            type="button"
            onClick={() => setWindowFilter(bucket.id)}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${bucket.tone} ${
              windowFilter === bucket.id ? bucket.activeRing : 'hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold opacity-85">{bucket.label}</p>
            <p className="text-3xl font-bold tabular-nums mt-2">{bucket.count}</p>
          </button>
        ))}
      </section>

      {/* Upcoming Expirations & Readjustments List */}
      {visibleMapped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <CalendarClock className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-navy-900">
            {t.expirations.noExpirationsTitle}
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t.expirations.noExpirationsDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleMapped.map(({ contract, relevantDays }) => {
            const info = contract.expirationInfo!;
            const isCritical = relevantDays <= 7;
            const isWarning = relevantDays > 7 && relevantDays <= 30;
            const badgeCls = isCritical
              ? 'bg-red-100 text-red-800 border-red-200'
              : isWarning
                ? 'bg-amber-100 text-amber-900 border-amber-200'
                : 'bg-blue-50 text-navy-900 border-blue-200';

            return (
              <div
                key={contract.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold tabular-nums ${badgeCls}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {relevantDays < 0
                          ? t.expirations.expiredLabel
                          : `${relevantDays} ${t.expirations.daysLeftSuffix}`}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenContract(contract)}
                      className="text-base font-semibold text-navy-900 hover:text-emerald-700 truncate cursor-pointer"
                    >
                      {contract.clientName}
                    </button>

                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      {contract.code}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {contract.templateTitle}
                    {contract.propertyAddress ? ` · ${contract.propertyAddress}` : ''}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                      <p className="text-[11px] text-slate-500">
                        {t.expirations.endDateLabel}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-navy-900 tabular-nums mt-0.5">
                        {formatYmd(info.endDate)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                      <p className="text-[11px] text-slate-500">
                        {t.expirations.adjustmentIndexLabel}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-800 mt-0.5 inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>{info.adjustmentIndex || '—'}</span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                      <p className="text-[11px] text-slate-500">
                        {t.expirations.adjustmentDateLabel}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-navy-900 tabular-nums mt-0.5">
                        {formatYmd(info.adjustmentDate)}
                      </p>
                    </div>
                  </div>

                  {info.summary && (
                    <p className="text-xs text-slate-600">{info.summary}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={analyzingId === contract.id}
                    onClick={() => handleAnalyzeOne(contract)}
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {analyzingId === contract.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-navy-900" />
                    )}
                    <span>{t.expirations.analyzeOneBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRenewContract(contract)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{t.expirations.renewBtn}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contracts Without Extracted Dates */}
      {unmappedContracts.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-navy-900">
              {t.expirations.unmappedTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.expirations.unmappedDesc}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {unmappedContracts.map((contract) => (
              <div
                key={contract.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {contract.clientName}{' '}
                    <span className="text-xs font-mono text-slate-400 font-normal">
                      {contract.code}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">{contract.templateTitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={analyzingId === contract.id}
                    onClick={() => handleAnalyzeOne(contract)}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {analyzingId === contract.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    <span>{t.expirations.analyzeOneBtn}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

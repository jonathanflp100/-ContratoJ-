import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  FileEdit,
  FilePlus2,
  FileText,
  Paperclip,
  Scale,
  Search,
  UserCheck,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import type {
  ContractRecord,
  ContractStatus,
  Locale,
  TeamMember,
} from '../types';

interface DashboardScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  credits: number;
  contracts: ContractRecord[];
  activeMember?: TeamMember | null;
  expiringSoonCount?: number;
  pendingApprovalCount?: number;
  onStartNewContract: () => void;
  onGoToCredits: () => void;
  onGoToExpirations?: () => void;
  onGoToTeam?: () => void;
  onOpenContract: (contract: ContractRecord) => void;
  onEditDraft: (contract: ContractRecord) => void;
  onMarkSigned: (contractId: string) => void;
}

export function DashboardScreen({
  t,
  locale,
  credits,
  contracts,
  activeMember,
  expiringSoonCount = 0,
  pendingApprovalCount = 0,
  onStartNewContract,
  onGoToCredits,
  onGoToExpirations,
  onGoToTeam,
  onOpenContract,
  onEditDraft,
  onMarkSigned,
}: DashboardScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const awaitingContracts = useMemo(
    () => contracts.filter((c) => c.status === 'awaiting_signature'),
    [contracts]
  );

  const signedCount = useMemo(
    () => contracts.filter((c) => c.status === 'signed').length,
    [contracts]
  );

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.clientName.toLowerCase().includes(q) ||
        c.templateTitle.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.clientDocument.toLowerCase().includes(q)
      );
    });
  }, [contracts, search, statusFilter]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'es-PY' ? 'es-PY' : 'pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const handleCopyLink = (contract: ContractRecord) => {
    navigator.clipboard?.writeText(contract.signatureLink);
    setCopiedId(contract.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderStatusLabel = (status: ContractStatus) => {
    if (status === 'signed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t.dashboard.statusSigned}</span>
        </span>
      );
    }
    if (status === 'awaiting_signature') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{t.dashboard.statusAwaiting}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <FileEdit className="h-3.5 w-3.5 shrink-0" />
        <span>{t.dashboard.statusDraft}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header + Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.dashboard.welcome}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.dashboard.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onStartNewContract}
          className="min-h-[48px] px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <FilePlus2 className="h-4 w-4 shrink-0" />
          <span>{t.dashboard.newContractBtn}</span>
        </button>
      </div>

      {activeMember?.role === 'corretor' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs font-medium text-blue-900 flex items-center gap-2.5">
          <UserCheck className="h-4 w-4 text-blue-700 shrink-0" />
          <span>
            {activeMember.name} · {t.team.corretorScopedBanner}
          </span>
        </div>
      )}

      {(expiringSoonCount > 0 || pendingApprovalCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expiringSoonCount > 0 && onGoToExpirations && (
            <button
              type="button"
              onClick={onGoToExpirations}
              className="text-left rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-50 p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {t.expirations.title}
                  </p>
                  <p className="text-xs text-amber-900/80 truncate">
                    {t.expirations.alert60d}
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-amber-800 tabular-nums shrink-0">
                {expiringSoonCount}
              </span>
            </button>
          )}

          {pendingApprovalCount > 0 && onGoToTeam && (
            <button
              type="button"
              onClick={onGoToTeam}
              className="text-left rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-navy-900/8 text-navy-900 flex items-center justify-center shrink-0">
                  <Scale className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {t.team.approvalQueueTitle}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {t.contractDetail.legalPending}
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-navy-900 tabular-nums shrink-0">
                {pendingApprovalCount}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Hero Credit Balance + KPI Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-6 bg-navy-900 text-white rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-300">
                {t.dashboard.creditsBalanceLabel}
              </p>
              <div className="flex items-baseline gap-2.5 mt-1.5">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-white">
                  {credits}
                </span>
                <span className="text-sm font-medium text-emerald-400">
                  {credits === 1 ? t.common.creditSingular : t.common.creditsUnit}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onGoToCredits}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/18 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.dashboard.buyMoreCredits}</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 pt-3 border-t border-white/10">
            {t.dashboard.creditsRule}
          </p>
        </div>

        <div className="lg:col-span-6 grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <p className="text-xs font-medium text-slate-500">
              {t.dashboard.statsTotal}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-navy-900 tabular-nums mt-3">
              {contracts.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <p className="text-xs font-medium text-slate-500">
              {t.dashboard.statsAwaiting}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-700 tabular-nums mt-3">
              {awaitingContracts.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <p className="text-xs font-medium text-slate-500">
              {t.dashboard.statsSigned}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums mt-3">
              {signedCount}
            </p>
          </div>
        </div>
      </section>

      {/* Awaiting Signature Queue */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">
            {t.dashboard.awaitingTitle}
          </h2>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {awaitingContracts.length}
          </span>
        </div>

        {awaitingContracts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
            {t.dashboard.awaitingEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {awaitingContracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenContract(contract)}
                      className="text-base font-semibold text-navy-900 hover:text-emerald-700 text-left truncate cursor-pointer"
                    >
                      {contract.clientName}
                    </button>
                    <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                      {contract.code}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="truncate">{contract.templateTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatDate(contract.createdAt)}</span>
                    {contract.signers && contract.signers.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums font-medium text-navy-900">
                          {contract.signers.filter((s) => s.status === 'signed').length}/
                          {contract.signers.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(contract)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    {copiedId === contract.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{t.common.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{t.common.copyLink}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onMarkSigned(contract.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t.dashboard.markSigned}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenContract(contract)}
                    className="ml-auto min-h-[40px] px-3 py-1.5 text-xs font-medium text-navy-900 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {t.dashboard.viewContract}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Contracts List + Filter & Search */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">
            {t.dashboard.recentTitle}
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'all', label: t.dashboard.filterAll },
                  { id: 'draft', label: t.dashboard.filterDraft },
                  { id: 'awaiting_signature', label: t.dashboard.filterAwaiting },
                  { id: 'signed', label: t.dashboard.filterSigned },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-navy-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <FileText className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-navy-900">
              {t.dashboard.recentEmptyTitle}
            </p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t.dashboard.recentEmptyDesc}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onStartNewContract}
                className="min-h-[44px] px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>{t.dashboard.newContractBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        contract.status === 'draft'
                          ? onEditDraft(contract)
                          : onOpenContract(contract)
                      }
                      className="text-sm sm:text-base font-semibold text-navy-900 hover:text-emerald-700 truncate text-left cursor-pointer"
                    >
                      {contract.clientName}
                    </button>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {contract.code}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span>{contract.templateTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatDate(contract.createdAt)}</span>
                    {contract.attachments.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Paperclip className="h-3 w-3" />
                          {contract.attachments.length} {t.dashboard.attachmentsCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  {renderStatusLabel(contract.status)}

                  <button
                    type="button"
                    onClick={() =>
                      contract.status === 'draft'
                        ? onEditDraft(contract)
                        : onOpenContract(contract)
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-navy-900 whitespace-nowrap cursor-pointer"
                  >
                    {contract.status === 'draft'
                      ? t.dashboard.continueDraft
                      : t.dashboard.viewContract}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

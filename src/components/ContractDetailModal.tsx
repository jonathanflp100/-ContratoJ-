import { useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  PenTool,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import {
  generateContractDocx,
  generateContractPdfA4,
} from '../services/contractExporter';
import { extractContractTermsWithAI } from '../services/documentParser';
import type {
  CompanyProfile,
  ContractExpirationInfo,
  ContractRecord,
  ContractTimelineEvent,
  Locale,
  TeamMember,
} from '../types';
import {
  buildWhatsAppShareUrl,
  getSignerPublicPath,
  getSignerPublicUrl,
  getVerifyPublicUrl,
} from '../utils/cryptoAndDevice';
import { ContractDocumentPreview } from './ContractDocumentPreview';

interface ContractDetailModalProps {
  t: TranslationDictionary;
  locale: Locale;
  contract: ContractRecord;
  company: CompanyProfile | null;
  activeMember?: TeamMember | null;
  requireLegalApproval?: boolean;
  onClose: () => void;
  onMarkSigned: (contractId: string) => void;
  onDelete: (contractId: string) => void;
  onOpenSendForSignature: (contract: ContractRecord) => void;
  onOpenPublicPath: (path: string) => void;
  onRequestApproval?: (contractId: string) => void;
  onApproveLegal?: (contractId: string) => void;
  onRejectLegal?: (contractId: string, note: string) => void;
  onSaveExpirationInfo?: (contractId: string, info: ContractExpirationInfo) => void;
  onRenewContract?: (contract: ContractRecord) => void;
}

export function ContractDetailModal({
  t,
  locale,
  contract,
  company,
  activeMember,
  requireLegalApproval,
  onClose,
  onMarkSigned,
  onDelete,
  onOpenSendForSignature,
  onOpenPublicPath,
  onRequestApproval,
  onApproveLegal,
  onRejectLegal,
  onSaveExpirationInfo,
  onRenewContract,
}: ContractDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExtractingExpiration, setIsExtractingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState<string | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const country = company?.country || (locale === 'es-PY' ? 'PY' : 'BR');

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
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
        verificationUrl: getVerifyPublicUrl(
          contract.documentHash || contract.code
        ),
        completedAt: contract.signedAt,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      await generateContractDocx({
        company: company || contract.companySnapshot || null,
        contractTitle: contract.templateTitle,
        contractCode: contract.code,
        renderedContent: contract.renderedContent,
        clientName: contract.clientName,
        clientDocument: contract.clientDocument,
        locale,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([contract.renderedContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contract.code}-${contract.clientName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExtractExpiration = async () => {
    if (!onSaveExpirationInfo) return;
    setIsExtractingExpiration(true);
    setExpirationError(null);
    try {
      const info = await extractContractTermsWithAI({
        contractText: contract.renderedContent,
        variables: contract.variables || {},
        country,
        locale,
      });
      onSaveExpirationInfo(contract.id, info);
    } catch (err) {
      setExpirationError(
        err instanceof Error ? err.message : t.common.loading
      );
    } finally {
      setIsExtractingExpiration(false);
    }
  };

  const formatTimelineLabel = (ev: ContractTimelineEvent): string => {
    switch (ev.type) {
      case 'created':
        return t.contractDetail.timelineCreated;
      case 'approval_requested':
        return t.contractDetail.timelineApprovalRequested;
      case 'approved':
        return `${t.contractDetail.timelineApproved}${ev.actorName ? ` · ${ev.actorName}` : ''}`;
      case 'rejected':
        return `${t.contractDetail.timelineRejected}${ev.detail ? `: ${ev.detail}` : ''}`;
      case 'sent':
        return `${t.contractDetail.timelineSent}${ev.detail ? `: ${ev.detail}` : ''}`;
      case 'viewed':
        return `${t.contractDetail.timelineViewed} ${ev.actorName || ''}`.trim();
      case 'signed':
        return `${t.contractDetail.timelineSigned} ${ev.actorName || ''}`.trim();
      case 'completed':
        return t.contractDetail.timelineCompleted;
      case 'documents_purged':
        return `${t.contractDetail.timelineDocumentsPurged}${ev.detail ? ` (${ev.detail})` : ''}`;
      default:
        return ev.type;
    }
  };

  const canReviewLegal =
    activeMember?.role === 'juridico' || activeMember?.role === 'admin' || !activeMember;
  const showLegalSection =
    Boolean(requireLegalApproval) ||
    (contract.legalApprovalStatus && contract.legalApprovalStatus !== 'not_required');

  const timelineEvents: ContractTimelineEvent[] =
    contract.timeline && contract.timeline.length > 0
      ? contract.timeline
      : [
          {
            id: 'fallback_created',
            type: 'created',
            timestamp: contract.createdAt,
          },
          ...(contract.signedAt
            ? [
                {
                  id: 'fallback_signed',
                  type: 'signed' as const,
                  timestamp: contract.signedAt,
                  actorName: contract.clientName,
                },
              ]
            : []),
        ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-6 overflow-y-auto"
    >
      <div className="bg-slate-50 w-full max-w-4xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Top Header */}
        <div className="no-print bg-white border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              {contract.code}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-navy-900 truncate">
              {contract.clientName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <FileDown className="h-4 w-4 text-emerald-400" />
              <span>{t.contractDetail.downloadFinalPdfBtn}</span>
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadDocx}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-navy-900 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t.contractDetail.downloadDocxBtn}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">.txt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Jurídico Approval Block */}
          {showLegalSection && (
            <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-navy-900 shrink-0" />
                  <h3 className="text-sm font-semibold text-navy-900">
                    {t.contractDetail.legalApprovalTitle}
                  </h3>
                </div>

                {contract.legalApprovalStatus === 'approved' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t.contractDetail.legalApproved}</span>
                  </span>
                ) : contract.legalApprovalStatus === 'rejected' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <XCircle className="h-4 w-4" />
                    <span>{t.contractDetail.legalRejected}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <Clock className="h-4 w-4" />
                    <span>{t.contractDetail.legalPending}</span>
                  </span>
                )}
              </div>

              {(contract.legalApprovedBy || contract.legalApprovalNote) && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 space-y-1">
                  {contract.legalApprovedBy && (
                    <p className="font-medium text-navy-900">
                      {contract.legalApprovedBy}
                      {contract.legalApprovedAt
                        ? ` · ${new Date(contract.legalApprovedAt).toLocaleString(
                            locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                          )}`
                        : ''}
                    </p>
                  )}
                  {contract.legalApprovalNote && (
                    <p className="text-slate-600">{contract.legalApprovalNote}</p>
                  )}
                </div>
              )}

              {contract.status !== 'signed' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onRequestApproval &&
                    contract.legalApprovalStatus !== 'pending_approval' &&
                    contract.legalApprovalStatus !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => onRequestApproval(contract.id)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy-900 cursor-pointer"
                      >
                        {t.contractDetail.requestApprovalBtn}
                      </button>
                    )}

                  {canReviewLegal &&
                    onApproveLegal &&
                    contract.legalApprovalStatus !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          onApproveLegal(contract.id);
                          setShowRejectBox(false);
                        }}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{t.contractDetail.approveNowBtn}</span>
                      </button>
                    )}

                  {canReviewLegal &&
                    onRejectLegal &&
                    contract.legalApprovalStatus !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => setShowRejectBox((v) => !v)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>{t.contractDetail.rejectNowBtn}</span>
                      </button>
                    )}
                </div>
              )}

              {showRejectBox && onRejectLegal && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t.contractDetail.rejectReasonPlaceholder}
                    className="flex-1 min-h-[40px] px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!rejectReason.trim()) return;
                      onRejectLegal(contract.id, rejectReason.trim());
                      setRejectReason('');
                      setShowRejectBox(false);
                    }}
                    className="min-h-[40px] px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {t.team.rejectBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Expiration, Readjustment & Renewal Block */}
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-emerald-700 shrink-0" />
                <h3 className="text-sm font-semibold text-navy-900">
                  {t.contractDetail.expirationSectionTitle}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onSaveExpirationInfo && (
                  <button
                    type="button"
                    disabled={isExtractingExpiration}
                    onClick={handleExtractExpiration}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isExtractingExpiration ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                    )}
                    <span>{t.contractDetail.extractExpirationBtn}</span>
                  </button>
                )}

                {onRenewContract && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRenewContract(contract);
                    }}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{t.contractDetail.renewContractBtn}</span>
                  </button>
                )}
              </div>
            </div>

            {expirationError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{expirationError}</span>
              </div>
            )}

            {contract.expirationInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    {t.expirations.endDateLabel}
                  </p>
                  <p className="text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                    {contract.expirationInfo.endDate
                      ? new Date(
                          `${contract.expirationInfo.endDate}T12:00:00`
                        ).toLocaleDateString(
                          locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                        )
                      : '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    {t.expirations.adjustmentIndexLabel}
                  </p>
                  <p className="text-sm font-bold text-navy-900 mt-0.5">
                    {contract.expirationInfo.adjustmentIndex || '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    {t.expirations.adjustmentDateLabel}
                  </p>
                  <p className="text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                    {contract.expirationInfo.adjustmentDate
                      ? new Date(
                          `${contract.expirationInfo.adjustmentDate}T12:00:00`
                        ).toLocaleDateString(
                          locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                        )
                      : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {t.expirations.unmappedDesc}
              </p>
            )}
          </div>

          {/* Signers & Signature Links */}
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-navy-900">
                  {t.contractDetail.signatureSection}
                </h3>
                {contract.signatureConfig && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {contract.signatureConfig.order === 'sequential'
                      ? t.signatureFlow.orderSequential
                      : t.signatureFlow.orderParallel}
                    {contract.signatureConfig.requireSelfie
                      ? ` · ${t.signatureFlow.requireSelfieLabel}`
                      : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {contract.status !== 'signed' && (
                  <button
                    type="button"
                    onClick={() => onOpenSendForSignature(contract)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{t.contractDetail.sendForSignatureAction}</span>
                  </button>
                )}

                {contract.status === 'awaiting_signature' && (
                  <button
                    type="button"
                    onClick={() => onMarkSigned(contract.id)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t.contractDetail.markAsSignedBtn}</span>
                  </button>
                )}
              </div>
            </div>

            {contract.signers && contract.signers.length > 0 ? (
              <div className="space-y-3">
                {contract.signers.map((signer) => {
                  const signUrl = getSignerPublicUrl(contract.id, signer.token);
                  const signPath = getSignerPublicPath(
                    contract.id,
                    signer.token
                  );
                  const waHref = buildWhatsAppShareUrl({
                    phone: signer.whatsapp,
                    country,
                    locale,
                    signerName: signer.name,
                    companyName: company?.name || 'ContratoJá',
                    contractTitle: contract.templateTitle,
                    signUrl,
                  });

                  return (
                    <div
                      key={signer.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-navy-900">
                            {contract.signatureConfig?.order === 'sequential'
                              ? `${signer.order}. `
                              : ''}
                            {signer.name}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {signer.role ? `${signer.role} · ` : ''}
                            {signer.document}
                            {signer.whatsapp ? ` · ${signer.whatsapp}` : ''}
                          </p>
                        </div>

                        {signer.status === 'signed' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{t.signatureFlow.statusSigned}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{t.signatureFlow.statusPending}</span>
                          </span>
                        )}
                      </div>

                      {signer.status === 'signed' ? (
                        <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                          <span className="tabular-nums">
                            {signer.signedAt
                              ? new Date(signer.signedAt).toLocaleString(
                                  locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                                )
                              : ''}{' '}
                            {signer.timezone ? `· ${signer.timezone}` : ''}
                            {signer.browser ? ` · ${signer.browser}` : ''}
                            {signer.device ? ` · ${signer.device}` : ''}
                          </span>
                          {signer.signatureDataUrl && (
                            <img
                              src={signer.signatureDataUrl}
                              alt={signer.name}
                              className="h-8 w-20 object-contain bg-white border border-slate-200 rounded px-1"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(signer.id, signUrl)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedKey === signer.id ? (
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

                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{t.signatureFlow.sendWhatsappBtn}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => onOpenPublicPath(signPath)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-navy-900 inline-flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>{t.signatureFlow.openSignPageBtn}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <p className="text-xs font-mono text-navy-900 truncate">
                  {contract.signatureLink}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('main', contract.signatureLink)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedKey === 'main' ? (
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
              </div>
            )}

            {/* Verification / SHA-256 Bar */}
            {contract.status === 'signed' && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>{t.contractDetail.certificateShaTitle}</span>
                  </p>
                  {contract.documentHash && (
                    <p className="text-[11px] font-mono text-emerald-800 truncate mt-0.5">
                      {contract.documentHash}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenPublicPath(
                      `/verificar?code=${encodeURIComponent(
                        contract.documentHash || contract.code
                      )}`
                    )
                  }
                  className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{t.contractDetail.verifyOnlineBtn}</span>
                </button>
              </div>
            )}
          </div>

          {/* Contract Timeline */}
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">
              {t.contractDetail.timelineTitle}
            </h3>
            <ol className="space-y-3 border-l-2 border-slate-200 ml-2.5 pl-4">
              {timelineEvents.map((ev) => {
                const Icon =
                  ev.type === 'completed' ||
                  ev.type === 'signed' ||
                  ev.type === 'approved'
                    ? CheckCircle2
                    : ev.type === 'rejected'
                      ? XCircle
                      : ev.type === 'viewed'
                        ? Eye
                        : ev.type === 'sent'
                          ? Send
                          : ev.type === 'documents_purged'
                            ? Trash2
                            : PenTool;
                const iconColor =
                  ev.type === 'completed' ||
                  ev.type === 'signed' ||
                  ev.type === 'approved'
                    ? 'text-emerald-600'
                    : ev.type === 'rejected'
                      ? 'text-red-600'
                      : ev.type === 'viewed'
                        ? 'text-blue-600'
                        : 'text-navy-900';

                return (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[25px] top-0.5 h-4 w-4 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                      <Icon className={`h-2.5 w-2.5 ${iconColor}`} />
                    </span>
                    <p className="text-xs font-semibold text-navy-900">
                      {formatTimelineLabel(ev)}
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                      {new Date(ev.timestamp).toLocaleString(
                        locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                      )}
                      {ev.timezone ? ` · ${ev.timezone}` : ''}
                      {ev.browser ? ` · ${ev.browser}` : ''}
                      {ev.device ? ` · ${ev.device}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Client Attachments */}
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">
              {t.contractDetail.attachmentsTitle}
            </h3>
            {contract.attachmentsPurgedAt ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {t.contractDetail.attachmentsPurgedNotice}
                  </p>
                  <p className="text-[11px] text-emerald-800/80 tabular-nums mt-1">
                    {new Date(contract.attachmentsPurgedAt).toLocaleString(
                      locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                    )}
                  </p>
                </div>
              </div>
            ) : contract.attachments.length === 0 ? (
              <p className="text-xs text-slate-500">{t.contractDetail.noAttachments}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {contract.attachments.map((att) => (
                  <li
                    key={att.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">
                        {att.fileName}
                      </span>
                    </div>
                    <span className="text-slate-500 tabular-nums shrink-0">
                      {Math.max(1, Math.round(att.fileSize / 1024))} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Printable Contract Sheet */}
          <ContractDocumentPreview
            company={company}
            renderedContent={contract.renderedContent}
            clientName={contract.clientName}
            clientDocument={contract.clientDocument}
            contractCode={contract.code}
            locale={locale}
          />

          <div className="no-print flex justify-end">
            <button
              type="button"
              onClick={() => {
                onDelete(contract.id);
                onClose();
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.contractDetail.deleteBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

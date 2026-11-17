import { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import type {
  CompanyProfile,
  ContractRecord,
  CountryCode,
  Locale,
  SigningOrder,
} from '../types';
import {
  buildWhatsAppShareUrl,
  getSignerPublicPath,
  getSignerPublicUrl,
} from '../utils/cryptoAndDevice';

interface SignerDraft {
  id: string;
  role: string;
  name: string;
  document: string;
  whatsapp: string;
}

interface SendForSignatureModalProps {
  t: TranslationDictionary;
  locale: Locale;
  company: CompanyProfile | null;
  contract: ContractRecord;
  initialSigners?: SignerDraft[];
  onClose: () => void;
  onSubmitSend: (payload: {
    signers: Array<{
      role?: string;
      name: string;
      document: string;
      whatsapp: string;
    }>;
    order: SigningOrder;
    requireSelfie: boolean;
  }) => {
    ok: boolean;
    contract?: ContractRecord;
    insufficientCredits?: boolean;
    legalApprovalRequired?: boolean;
  };
  onGoToCredits: () => void;
  onGoToTeam?: () => void;
  onRequestApproval?: (contractId: string) => void;
  onOpenSignPath: (path: string) => void;
  onDone: (updatedContract: ContractRecord) => void;
}

function buildInitialSigners(
  contract: ContractRecord,
  locale: Locale,
  provided?: SignerDraft[]
): SignerDraft[] {
  if (provided && provided.length > 0) return provided;
  if (contract.signers && contract.signers.length > 0) {
    return contract.signers.map((s) => ({
      id: s.id,
      role: s.role || '',
      name: s.name,
      document: s.document,
      whatsapp: s.whatsapp,
    }));
  }
  return [
    {
      id: `draft_sgn_1`,
      role: locale === 'es-PY' ? 'Cliente / Firmante' : 'Cliente / Signatário',
      name: contract.clientName || '',
      document: contract.clientDocument || '',
      whatsapp: contract.clientPhone || '',
    },
  ];
}

export function SendForSignatureModal({
  t,
  locale,
  company,
  contract,
  initialSigners,
  onClose,
  onSubmitSend,
  onGoToCredits,
  onGoToTeam,
  onRequestApproval,
  onOpenSignPath,
  onDone,
}: SendForSignatureModalProps) {
  const country: CountryCode =
    company?.country || (locale === 'es-PY' ? 'PY' : 'BR');

  const [signers, setSigners] = useState<SignerDraft[]>(() =>
    buildInitialSigners(contract, locale, initialSigners)
  );
  const [order, setOrder] = useState<SigningOrder>(
    contract.signatureConfig?.order || 'parallel'
  );
  const [requireSelfie, setRequireSelfie] = useState<boolean>(
    contract.signatureConfig?.requireSelfie ?? false
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [legalApprovalRequired, setLegalApprovalRequired] = useState(false);
  const [approvalRequestedNotice, setApprovalRequestedNotice] = useState(false);
  const [sentContract, setSentContract] = useState<ContractRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddSigner = () => {
    setSigners((prev) => [
      ...prev,
      {
        id: `draft_sgn_${Date.now().toString(36)}`,
        role: '',
        name: '',
        document: '',
        whatsapp: '',
      },
    ]);
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= signers.length) return;
    setSigners((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleConfirmSend = () => {
    const hasInvalid =
      signers.length === 0 ||
      signers.some((s) => !s.name.trim() || !s.document.trim());

    if (hasInvalid) {
      setFormError(t.signatureFlow.validationError);
      return;
    }

    setFormError(null);
    setLegalApprovalRequired(false);
    const res = onSubmitSend({
      signers: signers.map((s) => ({
        role: s.role.trim() || undefined,
        name: s.name.trim(),
        document: s.document.trim(),
        whatsapp: s.whatsapp.trim(),
      })),
      order,
      requireSelfie,
    });

    if (res.legalApprovalRequired) {
      setLegalApprovalRequired(true);
      return;
    }

    if (res.insufficientCredits) {
      setInsufficientCredits(true);
      return;
    }

    if (res.ok && res.contract) {
      setSentContract(res.contract);
    }
  };

  const handleCopy = (signerId: string, url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(signerId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-6 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-navy-900">
              {sentContract
                ? t.signatureFlow.linksReadyTitle
                : t.signatureFlow.modalTitle}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {sentContract
                ? t.signatureFlow.linksReadyDesc
                : t.signatureFlow.modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (sentContract ? onDone(sentContract) : onClose())}
            aria-label={t.common.close}
            className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {!sentContract ? (
            <>
              {/* Signers List */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-navy-900 inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-700" />
                    <span>
                      {t.signatureFlow.signersTitle} ({signers.length})
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSigner}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t.signatureFlow.addSignerBtn}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {signers.map((s, idx) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-navy-900 tabular-nums">
                          {order === 'sequential'
                            ? `${idx + 1}º ${t.signatureFlow.orderStepPrefix}`
                            : `#${idx + 1}`}
                        </span>

                        <div className="flex items-center gap-1">
                          {signers.length > 1 && order === 'sequential' && (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMove(idx, -1)}
                                className="min-h-[32px] min-w-[32px] rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === signers.length - 1}
                                onClick={() => handleMove(idx, 1)}
                                className="min-h-[32px] min-w-[32px] rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {signers.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSigners((prev) =>
                                  prev.filter((item) => item.id !== s.id)
                                )
                              }
                              aria-label={t.common.delete}
                              className="min-h-[32px] min-w-[32px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            {t.signatureFlow.signerNameLabel} *
                          </label>
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) =>
                              setSigners((prev) =>
                                prev.map((item) =>
                                  item.id === s.id
                                    ? { ...item, name: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            {t.signatureFlow.signerDocLabel} *
                          </label>
                          <input
                            type="text"
                            value={s.document}
                            onChange={(e) =>
                              setSigners((prev) =>
                                prev.map((item) =>
                                  item.id === s.id
                                    ? { ...item, document: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            {t.signatureFlow.signerWhatsappLabel}
                          </label>
                          <input
                            type="tel"
                            value={s.whatsapp}
                            placeholder={
                              country === 'PY' ? '+595 981 000 000' : '(11) 99999-0000'
                            }
                            onChange={(e) =>
                              setSigners((prev) =>
                                prev.map((item) =>
                                  item.id === s.id
                                    ? { ...item, whatsapp: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            {t.signatureFlow.signerRoleLabel}
                          </label>
                          <input
                            type="text"
                            value={s.role}
                            onChange={(e) =>
                              setSigners((prev) =>
                                prev.map((item) =>
                                  item.id === s.id
                                    ? { ...item, role: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Order */}
              <section className="space-y-2.5">
                <p className="text-sm font-semibold text-navy-900">
                  {t.signatureFlow.signingOrderLabel}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrder('parallel')}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      order === 'parallel'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-navy-900">
                      {t.signatureFlow.orderParallel}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {t.signatureFlow.orderParallelDesc}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrder('sequential')}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      order === 'sequential'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-navy-900">
                      {t.signatureFlow.orderSequential}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {t.signatureFlow.orderSequentialDesc}
                    </p>
                  </button>
                </div>
              </section>

              {/* Selfie Option */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requireSelfie}
                  onChange={(e) => setRequireSelfie(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 shrink-0 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-navy-900 inline-flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-emerald-700" />
                    <span>{t.signatureFlow.requireSelfieLabel}</span>
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {t.signatureFlow.requireSelfieDesc}
                  </p>
                </div>
              </label>

              {formError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {legalApprovalRequired && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {t.contractDetail.legalPending}
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {t.team.legalGateDesc}
                    </p>
                    {approvalRequestedNotice && (
                      <p className="text-xs font-semibold text-emerald-700 mt-1">
                        {t.contractDetail.timelineApprovalRequested}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onRequestApproval && !approvalRequestedNotice && (
                      <button
                        type="button"
                        onClick={() => {
                          onRequestApproval(contract.id);
                          setApprovalRequestedNotice(true);
                        }}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer"
                      >
                        {t.contractDetail.requestApprovalBtn}
                      </button>
                    )}
                    {onGoToTeam && (
                      <button
                        type="button"
                        onClick={onGoToTeam}
                        className="min-h-[38px] px-4 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-semibold cursor-pointer"
                      >
                        {t.nav.team}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {insufficientCredits && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {t.newContract.noCreditsTitle}
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {t.newContract.noCreditsDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToCredits}
                    className="min-h-[38px] px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {t.newContract.goToCredits}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {(sentContract.signers || []).map((signer) => {
                const signUrl = getSignerPublicUrl(
                  sentContract.id,
                  signer.token
                );
                const signPath = getSignerPublicPath(
                  sentContract.id,
                  signer.token
                );
                const waHref = buildWhatsAppShareUrl({
                  phone: signer.whatsapp,
                  country,
                  locale,
                  signerName: signer.name,
                  companyName: company?.name || 'ContratoJá',
                  contractTitle: sentContract.templateTitle,
                  signUrl,
                });

                return (
                  <div
                    key={signer.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-navy-900">
                          {sentContract.signatureConfig?.order === 'sequential'
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
                      <span className="text-xs font-semibold text-amber-700">
                        {t.signatureFlow.statusPending}
                      </span>
                    </div>

                    <p className="text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 break-all">
                      {signUrl}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(signer.id, signUrl)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === signer.id ? (
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
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{t.signatureFlow.sendWhatsappBtn}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onOpenSignPath(signPath)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-navy-900/20 bg-white hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{t.signatureFlow.openSignPageBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          {!sentContract ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-medium text-slate-700 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{t.signatureFlow.confirmSendBtn}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onDone(sentContract)}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold cursor-pointer"
            >
              {t.signatureFlow.finishDoneBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

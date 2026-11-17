import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  FileDown,
  Lock,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { generateContractPdfA4 } from '../services/contractExporter';
import { storageService } from '../services/storage';
import type { ContractRecord, ContractSigner, Locale } from '../types';
import {
  getClientAuditMetadata,
  getVerifyPublicUrl,
  type ClientAuditMetadata,
} from '../utils/cryptoAndDevice';
import { SignatureCanvas } from './SignatureCanvas';

interface PublicSignScreenProps {
  contractId: string;
  token: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onNavigatePath: (path: string) => void;
  onSnapshotUpdated?: () => void;
}

async function compressImageDataUrl(
  fileOrCanvas: File | HTMLCanvasElement,
  maxWidth = 640
): Promise<string> {
  if (fileOrCanvas instanceof HTMLCanvasElement) {
    return fileOrCanvas.toDataURL('image/jpeg', 0.8);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Read error'));
    reader.readAsDataURL(fileOrCanvas);
  });
}

export function PublicSignScreen({
  contractId,
  token,
  locale,
  onLocaleChange,
  onNavigatePath,
  onSnapshotUpdated,
}: PublicSignScreenProps) {
  const t = translations[locale];

  const [lookup, setLookup] = useState(() =>
    storageService.getPublicContractForSigning(contractId, token)
  );
  const [name, setName] = useState(lookup?.signer.name || '');
  const [documentId, setDocumentId] = useState(lookup?.signer.document || '');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(
    lookup?.signer.selfieDataUrl || null
  );
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Scroll-to-end enforcement
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Live camera selfie modal/panel
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedResult, setCompletedResult] = useState<{
    contract: ContractRecord;
    signer: ContractSigner;
    allSigned: boolean;
    audit: ClientAuditMetadata;
  } | null>(null);

  // Refresh lookup when route changes & log "viewed" event
  useEffect(() => {
    const data = storageService.getPublicContractForSigning(contractId, token);
    setLookup(data);
    if (data) {
      setName(data.signer.name);
      setDocumentId(data.signer.document);
      setSelfieDataUrl(data.signer.selfieDataUrl || null);
      if (data.signer.status === 'pending' && !data.blockedBySigner) {
        storageService.recordSignerView(
          contractId,
          token,
          getClientAuditMetadata()
        );
        onSnapshotUpdated?.();
      }
    }
  }, [contractId, token]);

  // Check if contract fits without scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkScrollable = () => {
      if (el.scrollHeight <= el.clientHeight + 16) {
        setHasScrolledToEnd(true);
        setScrollProgress(100);
      }
    };
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [lookup?.contract.id]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, []);

  const handleContractScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const pct = Math.min(100, Math.round((el.scrollTop / maxScroll) * 100));
    setScrollProgress(pct);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setHasScrolledToEnd(true);
      setScrollProgress(100);
    }
  };

  const handleScrollToEnd = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setHasScrolledToEnd(true);
    setScrollProgress(100);
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startLiveCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.publicSign.cameraPreviewHint);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError(t.publicSign.cameraPreviewHint);
    }
  };

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = await compressImageDataUrl(canvas, 640);
      setSelfieDataUrl(dataUrl);
    }
    stopLiveCamera();
  };

  const handleSelfieFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageDataUrl(file, 640);
      setSelfieDataUrl(compressed);
      setFormError(null);
    } catch {
      setCameraError(t.publicSign.cameraPreviewHint);
    }
  };

  const handleSubmit = async () => {
    if (!lookup) return;
    const requireSelfie = Boolean(lookup.contract.signatureConfig?.requireSelfie);

    if (!hasScrolledToEnd) {
      setFormError(t.publicSign.errorScrollRequired);
      return;
    }
    if (!name.trim() || !documentId.trim() || !consentAccepted) {
      setFormError(t.publicSign.errorFieldsRequired);
      return;
    }
    if (!signatureDataUrl) {
      setFormError(t.publicSign.errorSignatureRequired);
      return;
    }
    if (requireSelfie && !selfieDataUrl) {
      setFormError(t.publicSign.errorSelfieRequired);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const audit = getClientAuditMetadata();
      const res = await storageService.submitSignerSignature(contractId, token, {
        name,
        document: documentId,
        signatureDataUrl,
        selfieDataUrl: selfieDataUrl || undefined,
        consentAccepted: true,
        audit,
      });

      if (res) {
        setCompletedResult({
          contract: res.contract,
          signer: res.signer,
          allSigned: res.allSigned,
          audit,
        });
        onSnapshotUpdated?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSignedPdf = async (contractToPrint: ContractRecord) => {
    const companyMeta = lookup?.company || contractToPrint.companySnapshot || null;
    await generateContractPdfA4({
      company: companyMeta,
      contractTitle: contractToPrint.templateTitle,
      contractCode: contractToPrint.code,
      renderedContent: contractToPrint.renderedContent,
      clientName: contractToPrint.clientName,
      clientDocument: contractToPrint.clientDocument,
      locale,
      signers: contractToPrint.signers,
      documentHash: contractToPrint.documentHash,
      verificationUrl: getVerifyPublicUrl(
        contractToPrint.documentHash || contractToPrint.code
      ),
      completedAt: contractToPrint.signedAt,
    });
  };

  const brandColor = lookup?.company?.brandColor || '#0F2544';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Public Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {lookup?.company?.logoDataUrl ? (
            <img
              src={lookup.company.logoDataUrl}
              alt={lookup.company.name}
              referrerPolicy="no-referrer"
              className="h-9 w-9 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              CJ
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy-900 truncate">
              {lookup?.company?.name || 'ContratoJá'}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium truncate">
              {t.publicSign.pageBadge}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              onLocaleChange(locale === 'pt-BR' ? 'es-PY' : 'pt-BR')
            }
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy-900 cursor-pointer"
          >
            {locale === 'pt-BR' ? 'ES' : 'PT'}
          </button>
          <button
            type="button"
            onClick={() => onNavigatePath('/')}
            className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-navy-900 cursor-pointer"
          >
            {t.publicSign.goHomeBtn}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Not Found */}
        {!lookup && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-navy-900">
              {t.publicSign.notFoundTitle}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {t.publicSign.notFoundDesc}
            </p>
            <button
              type="button"
              onClick={() => onNavigatePath('/')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
            >
              {t.publicSign.goHomeBtn}
            </button>
          </div>
        )}

        {/* Blocked by sequential order */}
        {lookup && lookup.blockedBySigner && !completedResult && (
          <div className="bg-white border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-navy-900">
              {t.publicSign.blockedTitle}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {t.publicSign.blockedDesc}{' '}
              <strong className="text-navy-900">
                {lookup.blockedBySigner.order}. {lookup.blockedBySigner.name}
              </strong>
              .
            </p>
          </div>
        )}

        {/* Already signed prior to opening */}
        {lookup &&
          lookup.signer.status === 'signed' &&
          !completedResult && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-navy-900">
                    {t.publicSign.alreadySignedTitle}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {t.publicSign.alreadySignedDesc}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
                <p>
                  <strong className="text-navy-900">{lookup.signer.name}</strong>{' '}
                  · {lookup.signer.document}
                </p>
                <p className="tabular-nums">
                  {lookup.signer.signedAt
                    ? new Date(lookup.signer.signedAt).toLocaleString(
                        locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                      )
                    : ''}{' '}
                  · {lookup.signer.timezone} · {lookup.signer.browser} ·{' '}
                  {lookup.signer.device}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {lookup.contract.status === 'signed' && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSignedPdf(lookup.contract)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>{t.publicSign.downloadSignedPdfBtn}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onNavigatePath(
                      `/verificar?code=${encodeURIComponent(
                        lookup.contract.documentHash || lookup.contract.code
                      )}`
                    )
                  }
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-navy-900 inline-flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>{t.publicSign.verifyDocumentBtn}</span>
                </button>
              </div>
            </div>
          )}

        {/* Completion Receipt after signing now */}
        {completedResult && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-navy-900">
                  {t.publicSign.successTitle}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {completedResult.allSigned
                    ? t.publicSign.successAllDoneDesc
                    : t.publicSign.successPartialDesc}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-navy-900">
                {t.publicSign.auditCapturedLabel}
              </p>
              <p className="tabular-nums">
                {new Date(completedResult.audit.timestamp).toLocaleString(
                  locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                )}{' '}
                · {completedResult.audit.timezone}
              </p>
              <p>
                {completedResult.audit.browser} · {completedResult.audit.device}
              </p>
              {completedResult.contract.documentHash && (
                <p className="font-mono text-[11px] bg-white border border-slate-200 rounded-lg p-2.5 break-all text-navy-900">
                  SHA-256: {completedResult.contract.documentHash}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {completedResult.allSigned && (
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadSignedPdf(completedResult.contract)
                  }
                  className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="h-4 w-4" />
                  <span>{t.publicSign.downloadSignedPdfBtn}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onNavigatePath(
                    `/verificar?code=${encodeURIComponent(
                      completedResult.contract.documentHash ||
                        completedResult.contract.code
                    )}`
                  )
                }
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-navy-900 inline-flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>{t.publicSign.verifyDocumentBtn}</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Signing Form */}
        {lookup &&
          !lookup.blockedBySigner &&
          lookup.signer.status === 'pending' &&
          !completedResult && (
            <div className="space-y-6">
              {/* Step 1: Read Contract to Bottom */}
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: brandColor }}
                />

                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-navy-900">
                      {lookup.contract.templateTitle}
                    </h1>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {lookup.contract.code} · {t.publicSign.readContractTitle}
                    </p>
                  </div>

                  {!hasScrolledToEnd && (
                    <button
                      type="button"
                      onClick={handleScrollToEnd}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      {t.publicSign.scrollToEndBtn}
                    </button>
                  )}
                </div>

                {/* Reading Progress */}
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 text-xs">
                  <span
                    className={`font-medium inline-flex items-center gap-1.5 ${
                      hasScrolledToEnd ? 'text-emerald-700' : 'text-amber-800'
                    }`}
                  >
                    {hasScrolledToEnd ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {hasScrolledToEnd
                        ? t.publicSign.scrollCompleted
                        : t.publicSign.scrollPrompt}
                    </span>
                  </span>
                  <span className="tabular-nums font-mono text-slate-500 shrink-0">
                    {scrollProgress}%
                  </span>
                </div>

                <div
                  ref={scrollRef}
                  onScroll={handleContractScroll}
                  className="max-h-[380px] overflow-y-auto p-5 sm:p-8 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap bg-white"
                >
                  {lookup.contract.renderedContent}
                </div>
              </section>

              {/* Step 2: Signer Identification, Canvas & Selfie */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
                <h2 className="text-base font-bold text-navy-900">
                  {t.publicSign.signerDataTitle}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t.publicSign.nameLabel} *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t.publicSign.documentLabel} *
                    </label>
                    <input
                      type="text"
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Touch / Mouse Signature Pad */}
                <SignatureCanvas
                  label={t.publicSign.drawSignatureLabel}
                  hint={t.publicSign.drawSignatureHint}
                  clearLabel={t.publicSign.clearSignatureBtn}
                  onChange={setSignatureDataUrl}
                />

                {/* Selfie with Document (Required or Optional) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-900 inline-flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-emerald-700" />
                      <span>
                        {lookup.contract.signatureConfig?.requireSelfie
                          ? t.publicSign.selfieRequiredLabel
                          : t.publicSign.selfieOptionalLabel}
                      </span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    {t.publicSign.cameraPreviewHint}
                  </p>

                  {cameraActive && (
                    <div className="space-y-3">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-w-xs rounded-xl border border-slate-300 bg-slate-900"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={captureFromVideo}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          {t.publicSign.takeSelfieBtn}
                        </button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selfieDataUrl && !cameraActive && (
                    <div className="flex items-center gap-4">
                      <img
                        src={selfieDataUrl}
                        alt="Selfie"
                        className="h-20 w-20 rounded-xl object-cover border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setSelfieDataUrl(null)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        {t.publicSign.retakeSelfieBtn}
                      </button>
                    </div>
                  )}

                  {!selfieDataUrl && !cameraActive && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="min-h-[44px] px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
                        <Camera className="h-4 w-4" />
                        <span>{t.publicSign.takeSelfieBtn}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleSelfieFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={startLiveCamera}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Video className="h-4 w-4" />
                        <span>Webcam</span>
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <p className="text-xs text-amber-800">{cameraError}</p>
                  )}
                </div>

                {/* Li e concordo Checkbox */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-colors select-none ${
                    hasScrolledToEnd
                      ? 'border-slate-200 bg-white cursor-pointer'
                      : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {t.publicSign.consentCheckbox}
                  </span>
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

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? t.publicSign.submittingBtn
                      : t.publicSign.submitSignBtn}
                  </span>
                </button>
              </section>
            </div>
          )}
      </main>
    </div>
  );
}

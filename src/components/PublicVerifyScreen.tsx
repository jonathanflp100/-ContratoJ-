import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  FileDown,
  QrCode,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { generateContractPdfA4 } from '../services/contractExporter';
import { publicApi } from '../services/api';
import { storageService, storageSync } from '../services/storage';
import type { ContractCompanySnapshot, ContractRecord, Locale } from '../types';
import { getVerifyPublicUrl } from '../utils/cryptoAndDevice';

interface PublicVerifyScreenProps {
  initialQuery?: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onNavigatePath: (path: string) => void;
}

interface VerifyState {
  checked: boolean;
  found: boolean;
  authentic: boolean;
  contract?: ContractRecord;
  computedHash?: string;
  company?: ContractCompanySnapshot | null;
  /** Found by short code only: summary without content/hash. */
  limited?: boolean;
}

export function PublicVerifyScreen({
  initialQuery = '',
  locale,
  onLocaleChange,
  onNavigatePath,
}: PublicVerifyScreenProps) {
  const t = translations[locale];
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<VerifyState>({
    checked: false,
    found: false,
    authentic: false,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Camera QR scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanningCamera, setScanningCamera] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const runVerify = async (targetQuery: string) => {
    const clean = targetQuery.trim();
    if (!clean) return;
    let res: {
      found: boolean;
      authentic: boolean;
      contract?: ContractRecord;
      computedHash?: string;
      company?: ContractCompanySnapshot | null;
      limited?: boolean;
    } = { found: false, authentic: false };
    try {
      res = await publicApi.verify(clean);
    } catch (err) {
      console.error(err);
    }
    if (!res.found && storageSync.mode === 'local') {
      // Demo contracts exist only in this browser.
      res = await storageService.verifyContractByCodeOrHash(clean);
    }
    setResult({
      checked: true,
      found: res.found,
      authentic: res.authentic,
      contract: res.contract,
      computedHash: res.computedHash,
      company: res.company,
      limited: res.limited,
    });
    if (res.found && res.authentic && res.contract && !res.limited) {
      const url = getVerifyPublicUrl(
        res.computedHash || res.contract.documentHash || res.contract.code
      );
      try {
        const qr = await QRCode.toDataURL(url, {
          width: 180,
          margin: 1,
          color: { dark: '#0F2544', light: '#FFFFFF' },
        });
        setQrDataUrl(qr);
      } catch {
        setQrDataUrl(null);
      }
    } else {
      setQrDataUrl(null);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runVerify(initialQuery);
    }
  }, [initialQuery]);

  const stopCameraScan = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setScanningCamera(false);
  };

  useEffect(() => {
    return () => stopCameraScan();
  }, []);

  const startCameraScan = async () => {
    setQrError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrError(t.publicVerify.qrError);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setScanningCamera(true);

      const scanFrame = () => {
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 480;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code?.data) {
              setQuery(code.data);
              stopCameraScan();
              runVerify(code.data);
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      };

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      });
    } catch {
      setQrError(t.publicVerify.qrError);
    }
  };

  const handleQrImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setQrError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setQrError(t.publicVerify.qrError);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code?.data) {
          setQuery(code.data);
          runVerify(code.data);
        } else {
          setQrError(t.publicVerify.qrError);
        }
      };
      img.onerror = () => setQrError(t.publicVerify.qrError);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runVerify(query);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-navy-900 text-white flex items-center justify-center font-bold text-xs">
            CJ
          </div>
          <div>
            <p className="text-sm font-bold text-navy-900">ContratoJá</p>
            <p className="text-[11px] text-emerald-700 font-medium">
              {t.publicVerify.navTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onLocaleChange(locale === 'pt-BR' ? 'es-PY' : 'pt-BR')
            }
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
          >
            {locale === 'pt-BR' ? 'ES' : 'PT'}
          </button>
          <button
            type="button"
            onClick={() => onNavigatePath('/')}
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
          >
            {t.publicVerify.backToAppBtn}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-emerald-600 shrink-0" />
            <span>{t.publicVerify.title}</span>
          </h1>
          <p className="text-sm text-slate-600">{t.publicVerify.subtitle}</p>
        </div>

        {/* Verification Search + QR Scanner */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {t.publicVerify.inputLabel}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.publicVerify.inputPlaceholder}
                  className="w-full min-h-[46px] pl-10 pr-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
              <button
                type="submit"
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>{t.publicVerify.verifyBtn}</span>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
            {!scanningCamera ? (
              <button
                type="button"
                onClick={startCameraScan}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-2 cursor-pointer"
              >
                <Camera className="h-4 w-4 text-emerald-700" />
                <span>{t.publicVerify.scanQrCameraBtn}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCameraScan}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>{t.publicVerify.stopCameraBtn}</span>
              </button>
            )}

            <label className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 inline-flex items-center gap-2 cursor-pointer">
              <Upload className="h-4 w-4 text-slate-600" />
              <span>{t.publicVerify.uploadQrImageBtn}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleQrImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {scanningCamera && (
            <div className="pt-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-sm rounded-xl border border-slate-300 bg-slate-900"
              />
            </div>
          )}

          {qrError && (
            <p className="text-xs font-medium text-red-700">{qrError}</p>
          )}
        </section>

        {/* Verification Results */}
        {result.checked && !result.found && (
          <section className="bg-white border border-red-200 rounded-2xl p-6 flex items-start gap-4">
            <AlertCircle className="h-7 w-7 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-red-900">
                {t.publicVerify.notFoundTitle}
              </h2>
              <p className="text-sm text-red-700 mt-1">
                {t.publicVerify.notFoundDesc}
              </p>
            </div>
          </section>
        )}

        {result.checked &&
          result.found &&
          !result.authentic &&
          result.contract && (
            <section className="bg-white border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
              <Clock className="h-7 w-7 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold text-amber-900">
                  {t.publicVerify.pendingBadge}
                </h2>
                <p className="text-sm text-amber-800 mt-1">
                  {t.publicVerify.pendingDesc} ({result.contract.code} ·{' '}
                  {result.contract.templateTitle})
                </p>
              </div>
            </section>
          )}

        {result.checked &&
          result.found &&
          result.authentic &&
          result.contract && (
            <section className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-emerald-50 border-b border-emerald-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-emerald-950">
                      {t.publicVerify.authenticBadge}
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                      {t.publicVerify.authenticDesc}
                    </p>
                  </div>
                </div>

                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="h-20 w-20 rounded-xl border border-emerald-200 bg-white p-1 shrink-0"
                  />
                )}
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">
                      {t.dashboard.templateLabel}
                    </p>
                    <p className="font-semibold text-navy-900 mt-0.5">
                      {result.contract.templateTitle}
                    </p>
                    <p className="text-xs font-mono text-slate-500 tabular-nums mt-0.5">
                      {result.contract.code}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Emissor</p>
                    <p className="font-semibold text-navy-900 mt-0.5">
                      {result.company?.name || 'ContratoJá'}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                      {result.company?.country === 'PY' ? 'RUC' : 'CNPJ'}:{' '}
                      {result.company?.taxId || '—'}
                    </p>
                  </div>
                </div>

                {result.limited && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    {locale === 'es-PY'
                      ? 'Para ver el documento completo y el código SHA-256, escaneá el código QR del PDF firmado.'
                      : 'Para ver o documento completo e o código SHA-256, escaneie o QR code do PDF assinado.'}
                  </p>
                )}

                {/* Hash SHA-256 */}
                {!result.limited && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-navy-900 flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{t.publicVerify.hashLabel}</span>
                  </p>
                  <p className="text-xs font-mono text-slate-700 break-all">
                    {result.computedHash || result.contract.documentHash}
                  </p>
                </div>
                )}

                {/* Signers Audit */}
                {result.contract.signers &&
                  result.contract.signers.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold text-navy-900">
                        {t.publicVerify.signersSectionTitle}
                      </p>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {result.contract.signers.map((s) => (
                          <div
                            key={s.id}
                            className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5 text-xs">
                              <p className="font-bold text-navy-900">
                                {s.name} ·{' '}
                                <span className="font-mono font-normal text-slate-500">
                                  {s.document}
                                </span>
                              </p>
                              <p className="text-slate-600 tabular-nums">
                                {s.signedAt
                                  ? new Date(s.signedAt).toLocaleString(
                                      locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                                    )
                                  : ''}{' '}
                                {s.timezone ? `· ${s.timezone}` : ''}
                              </p>
                              {(s.browser || s.device) && (
                                <p className="text-slate-500">
                                  {s.browser} · {s.device}
                                </p>
                              )}
                            </div>

                            {s.signatureDataUrl && (
                              <img
                                src={s.signatureDataUrl}
                                alt={s.name}
                                className="h-11 w-28 object-contain border border-slate-200 rounded-lg bg-slate-50 px-2 shrink-0"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {!result.limited && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      generateContractPdfA4({
                        company: result.company || null,
                        contractTitle: result.contract!.templateTitle,
                        contractCode: result.contract!.code,
                        renderedContent: result.contract!.renderedContent,
                        clientName: result.contract!.clientName,
                        clientDocument: result.contract!.clientDocument,
                        locale,
                        signers: result.contract!.signers,
                        documentHash:
                          result.computedHash || result.contract!.documentHash,
                        verificationUrl: getVerifyPublicUrl(
                          result.computedHash ||
                            result.contract!.documentHash ||
                            result.contract!.code
                        ),
                        completedAt: result.contract!.signedAt,
                      })
                    }
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>{t.publicVerify.downloadPdfBtn}</span>
                  </button>
                </div>
                )}
              </div>
            </section>
          )}
      </main>
    </div>
  );
}

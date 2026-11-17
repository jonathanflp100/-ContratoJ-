import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Check,
  Download,
  ImagePlus,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import { BRAND_COLOR_OPTIONS } from '../services/storage';
import type {
  CompanyProfile,
  CountryCode,
  Locale,
  UserAccount,
} from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';

interface SettingsScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  user: UserAccount | null;
  company: CompanyProfile | null;
  onSaveCompany: (
    payload: Omit<CompanyProfile, 'id' | 'userId' | 'updatedAt'>
  ) => void;
  onPurgeExpiredDocs?: () => number;
  onExportBackup: () => string;
  onResetDemo: () => void;
  onSignOut: () => void;
}

export function SettingsScreen({
  t,
  locale,
  onLocaleChange,
  user,
  company,
  onSaveCompany,
  onPurgeExpiredDocs,
  onExportBackup,
  onResetDemo,
  onSignOut,
}: SettingsScreenProps) {
  const [name, setName] = useState(company?.name || '');
  const [country, setCountry] = useState<CountryCode>(company?.country || 'BR');
  const [taxId, setTaxId] = useState(company?.taxId || '');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(
    company?.logoDataUrl || null
  );
  const [brandColor, setBrandColor] = useState(
    company?.brandColor || '#0F2544'
  );
  const [address, setAddress] = useState(company?.address || '');
  const [phone, setPhone] = useState(company?.phone || '');
  const [autoDeleteClientDocs, setAutoDeleteClientDocs] = useState<boolean>(
    company?.autoDeleteClientDocs ?? true
  );
  const [documentRetentionDays, setDocumentRetentionDays] = useState<number>(
    company?.documentRetentionDays ?? 90
  );
  const [savedToast, setSavedToast] = useState(false);
  const [purgeCountResult, setPurgeCountResult] = useState<number | null>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const persistSettings = (
    overrideAutoDelete = autoDeleteClientDocs,
    overrideRetentionDays = documentRetentionDays
  ) => {
    onSaveCompany({
      name: name.trim() || company?.name || '',
      country,
      taxId: taxId.trim() || company?.taxId || '',
      logoDataUrl,
      brandColor,
      address: address.trim() || company?.address || '',
      phone: phone.trim() || company?.phone || '',
      onboardingCompleted: true,
      autoDeleteClientDocs: overrideAutoDelete,
      documentRetentionDays: Math.max(1, Number(overrideRetentionDays) || 90),
      requireLegalApproval: company?.requireLegalApproval ?? false,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    persistSettings();
  };

  const handleDownloadBackup = () => {
    const json = onExportBackup();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratoja-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{t.settings.subtitle}</p>
      </div>

      {savedToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium text-emerald-800">
          {t.settings.savedToast}
        </div>
      )}

      {/* Company Settings Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5"
      >
        <h2 className="text-lg font-semibold text-navy-900">
          {t.settings.companySection}
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {(['BR', 'PY'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCountry(c)}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                country === c
                  ? 'bg-navy-900 text-white border-navy-900'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {c === 'BR' ? `${t.common.brasil} (CNPJ)` : `${t.common.paraguay} (RUC)`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.onboarding.companyName}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {country === 'PY' ? t.onboarding.taxIdPY : t.onboarding.taxIdBR}
            </label>
            <input
              type="text"
              required
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.onboarding.phone}
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.onboarding.address}
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            {t.onboarding.logoLabel}
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-14 w-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {logoDataUrl ? (
                <img
                  src={logoDataUrl}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <ImagePlus className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <label className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-2 cursor-pointer">
              <ImagePlus className="h-4 w-4" />
              <span>
                {logoDataUrl ? t.onboarding.logoChange : t.onboarding.logoUpload}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            {logoDataUrl && (
              <button
                type="button"
                onClick={() => setLogoDataUrl(null)}
                className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.onboarding.logoRemove}</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            {t.onboarding.brandColor}
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {BRAND_COLOR_OPTIONS.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                aria-label={swatch.label}
                onClick={() => setBrandColor(swatch.value)}
                className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: swatch.value }}
              >
                {brandColor.toLowerCase() === swatch.value.toLowerCase() && (
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
            <label className="inline-flex items-center gap-2 min-h-[36px] px-3 py-1 rounded-xl border border-slate-300 bg-white cursor-pointer">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-5 w-5 border-0 p-0 bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-700 uppercase">
                {brandColor}
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            {t.common.save}
          </button>
        </div>
      </form>

      {/* Client Document Auto-Retention (LGPD / Ley 6534) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-navy-900">
              {t.settings.retentionSection}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {t.settings.retentionDesc}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoDeleteClientDocs}
            onChange={(e) => {
              const nextVal = e.target.checked;
              setAutoDeleteClientDocs(nextVal);
              persistSettings(nextVal, documentRetentionDays);
            }}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
          />
          <span className="text-sm font-medium text-navy-900">
            {t.settings.retentionToggleLabel}
          </span>
        </label>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <label className="block text-xs font-medium text-slate-700">
              {t.settings.retentionDaysLabel}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={3650}
                value={documentRetentionDays}
                onChange={(e) =>
                  setDocumentRetentionDays(
                    Math.max(1, parseInt(e.target.value || '90', 10))
                  )
                }
                onBlur={() =>
                  persistSettings(autoDeleteClientDocs, documentRetentionDays)
                }
                className="w-24 min-h-[40px] px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              {[
                { days: 30, label: t.settings.retentionPreset30 },
                { days: 90, label: t.settings.retentionPreset90 },
                { days: 180, label: t.settings.retentionPreset180 },
              ].map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => {
                    setDocumentRetentionDays(preset.days);
                    persistSettings(autoDeleteClientDocs, preset.days);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                    documentRetentionDays === preset.days
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {onPurgeExpiredDocs && (
            <button
              type="button"
              onClick={() => {
                persistSettings(autoDeleteClientDocs, documentRetentionDays);
                const count = onPurgeExpiredDocs();
                setPurgeCountResult(count);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 text-slate-600" />
              <span>{t.settings.runPurgeNowBtn}</span>
            </button>
          )}
        </div>

        {purgeCountResult !== null && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800 tabular-nums">
            {purgeCountResult} {t.settings.purgeResultMsg}
          </div>
        )}
      </section>

      {/* Preferences & Language */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-navy-900">
            {t.settings.preferencesSection}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.common.language}</p>
        </div>
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
      </section>

      {/* Account & Local Storage Backup */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-navy-900">
            {t.settings.accountSection}
          </h2>
          <div className="text-sm">
            <p className="text-xs text-slate-500">{t.settings.loggedInAs}</p>
            <p className="font-semibold text-navy-900 mt-0.5">{user?.name}</p>
            <p className="text-xs text-slate-600">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{t.nav.signOut}</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-navy-900">
            {t.settings.dataSection}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t.settings.dataDesc}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{t.settings.exportBackup}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.settings.resetConfirm)) {
                  onResetDemo();
                }
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t.settings.resetDemo}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

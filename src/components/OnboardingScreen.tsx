import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Building2, Check, ImagePlus, Trash2 } from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import { BRAND_COLOR_OPTIONS } from '../services/storage';
import type { CompanyProfile, CountryCode, Locale } from '../types';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';

interface OnboardingScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  initialCompany: CompanyProfile | null;
  onComplete: (payload: Omit<CompanyProfile, 'id' | 'userId' | 'updatedAt'>) => void;
}

export function OnboardingScreen({
  t,
  locale,
  onLocaleChange,
  initialCompany,
  onComplete,
}: OnboardingScreenProps) {
  const [name, setName] = useState(initialCompany?.name || '');
  const [country, setCountry] = useState<CountryCode>(
    initialCompany?.country || (locale === 'es-PY' ? 'PY' : 'BR')
  );
  const [taxId, setTaxId] = useState(initialCompany?.taxId || '');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(
    initialCompany?.logoDataUrl || null
  );
  const [brandColor, setBrandColor] = useState(
    initialCompany?.brandColor || '#0F2544'
  );
  const [address, setAddress] = useState(initialCompany?.address || '');
  const [phone, setPhone] = useState(initialCompany?.phone || '');
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !taxId.trim() || !address.trim() || !phone.trim()) {
      setError(t.common.requiredField);
      return;
    }
    setError(null);
    onComplete({
      name: name.trim(),
      country,
      taxId: taxId.trim(),
      logoDataUrl,
      brandColor,
      address: address.trim(),
      phone: phone.trim(),
      onboardingCompleted: true,
    });
  };

  const docLabel = country === 'PY' ? t.onboarding.taxIdPY : t.onboarding.taxIdBR;
  const docPlaceholder =
    country === 'PY'
      ? t.onboarding.taxIdPlaceholderPY
      : t.onboarding.taxIdPlaceholderBR;
  const phonePlaceholder =
    country === 'PY'
      ? t.onboarding.phonePlaceholderPY
      : t.onboarding.phonePlaceholderBR;

  const initials = (name || 'EM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <BrandMark />
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            {t.onboarding.stepCompany}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.onboarding.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5">
            {t.onboarding.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5"
          >
            {/* Country Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.onboarding.country}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['BR', 'PY'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCountry(c)}
                    className={`min-h-[46px] px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      country === c
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span>{c === 'BR' ? t.common.brasil : t.common.paraguay}</span>
                    <span className="text-xs opacity-80">
                      ({c === 'BR' ? 'CNPJ · R$' : 'RUC · Gs.'})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.onboarding.companyName}
                </label>
                <div className="relative">
                  <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.onboarding.companyNamePlaceholder}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {docLabel}
                </label>
                <input
                  type="text"
                  required
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder={docPlaceholder}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.onboarding.phone}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={phonePlaceholder}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t.onboarding.address}
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.onboarding.addressPlaceholder}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.onboarding.logoLabel}
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-slate-400" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer inline-flex items-center gap-2">
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
                      className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t.onboarding.logoRemove}</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{t.onboarding.logoHint}</p>
            </div>

            {/* Brand Color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.onboarding.brandColor}
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {BRAND_COLOR_OPTIONS.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    aria-label={swatch.label}
                    onClick={() => setBrandColor(swatch.value)}
                    className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                    style={{ backgroundColor: swatch.value }}
                  >
                    {brandColor.toLowerCase() === swatch.value.toLowerCase() && (
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
                <label className="inline-flex items-center gap-2 min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white cursor-pointer">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-700 uppercase">
                    {brandColor}
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {t.onboarding.finishBtn}
            </button>
          </form>

          {/* Live Contract Header Preview */}
          <aside className="lg:col-span-5 space-y-3">
            <p className="text-xs font-medium text-slate-500">
              {t.onboarding.previewTitle}
            </p>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200">
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt="Logo preview"
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 object-contain rounded-lg border border-slate-100 p-1 shrink-0"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: brandColor }}
                    >
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {name || t.onboarding.companyNamePlaceholder}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums truncate">
                      {docLabel}: {taxId || docPlaceholder}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {address || t.onboarding.addressPlaceholder}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-full" />
                  <div className="h-2.5 bg-slate-100 rounded w-11/12" />
                  <div className="h-2.5 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

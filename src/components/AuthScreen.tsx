import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import type { Locale } from '../types';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AuthScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onSignIn: (email: string) => void;
  onSignUp: (name: string, email: string) => void;
  onDemoLogin: () => void;
  onOpenVerify: () => void;
}

export function AuthScreen({
  t,
  locale,
  onLocaleChange,
  onSignIn,
  onSignUp,
  onDemoLogin,
  onOpenVerify,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(t.auth.errorEmailRequired);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.errorPasswordLength);
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        setError(t.auth.errorNameRequired);
        return;
      }
      onSignUp(name.trim(), trimmedEmail);
      return;
    }
    onSignIn(trimmedEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:grid lg:grid-cols-12">
      {/* Left Trustworthy Navy Brand Panel */}
      <section className="lg:col-span-5 bg-navy-900 text-white px-6 py-8 sm:px-10 lg:px-12 lg:py-12 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <BrandMark inverted />
          <div className="lg:hidden">
            <LanguageSwitcher
              locale={locale}
              onChange={onLocaleChange}
              variant="dark"
            />
          </div>
        </div>

        <div className="my-8 lg:my-auto max-w-md space-y-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            {t.auth.tagline}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {t.auth.subtitle}
          </p>

          <ul className="space-y-3 pt-2">
            {[t.auth.feature1, t.auth.feature2, t.auth.feature3].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400 pt-4 border-t border-white/10">
          {t.auth.simulatedNotice}
        </p>
      </section>

      {/* Right Auth Form */}
      <section className="lg:col-span-7 flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="hidden lg:flex justify-end mb-8">
          <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`min-h-[42px] px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.auth.signUpTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`min-h-[42px] px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.auth.signInTab}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t.auth.fullName}
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.auth.fullNamePlaceholder}
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.auth.email}
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] px-4 py-3 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{mode === 'signup' ? t.auth.signUpBtn : t.auth.signInBtn}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {mode === 'signup' && (
                <p className="text-xs text-emerald-700 font-medium text-center">
                  {t.auth.freeCreditsNote}
                </p>
              )}
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full min-h-[46px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {t.auth.demoBtn}
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              {t.auth.demoHint}
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onOpenVerify}
                className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-900 hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>{t.publicVerify.navTitle} (/verificar)</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

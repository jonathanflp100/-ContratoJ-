import { useState, type ReactNode } from 'react';
import {
  Archive,
  BarChart3,
  CalendarClock,
  Coins,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import type {
  AppScreen,
  CompanyProfile,
  Locale,
  TeamMember,
  UserAccount,
} from '../types';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AppShellProps {
  t: TranslationDictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onStartNewContract: () => void;
  company: CompanyProfile | null;
  user: UserAccount | null;
  activeMember?: TeamMember | null;
  expiringAlertCount?: number;
  pendingApprovalCount?: number;
  credits: number;
  onOpenVerify: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

export function AppShell({
  t,
  locale,
  onLocaleChange,
  activeScreen,
  onNavigate,
  onStartNewContract,
  company,
  user,
  activeMember,
  expiringAlertCount = 0,
  pendingApprovalCount = 0,
  credits,
  onOpenVerify,
  onSignOut,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: {
    id: AppScreen;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'vault', label: t.nav.vault, icon: Archive },
    {
      id: 'expirations',
      label: t.nav.expirations,
      icon: CalendarClock,
      badge: expiringAlertCount > 0 ? expiringAlertCount : undefined,
    },
    { id: 'templates', label: t.nav.templates, icon: FileText },
    {
      id: 'team',
      label: t.nav.team,
      icon: Users,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
    },
    { id: 'reports', label: t.nav.reports, icon: BarChart3 },
    { id: 'credits', label: t.nav.credits, icon: Coins },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const mobilePrimaryItems = navItems.slice(0, 4);

  const roleBadgeLabel = activeMember
    ? activeMember.role === 'admin'
      ? t.team.roleAdmin
      : activeMember.role === 'corretor'
        ? t.team.roleCorretor
        : t.team.roleJuridico
    : null;

  const handleMobileNav = (screen: AppScreen) => {
    setMobileMenuOpen(false);
    onNavigate(screen);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-navy-900 text-white border-r border-navy-950">
        <div className="h-16 px-6 flex items-center border-b border-white/10">
          <BrandMark inverted />
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={onStartNewContract}
            className="w-full min-h-[46px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <FilePlus2 className="h-4 w-4 shrink-0" />
            <span>{t.nav.newContract}</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white/12 text-white'
                    : 'text-slate-300 hover:bg-white/6 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : ''}`}
                />
                <span className="truncate">{item.label}</span>
                {item.id === 'credits' && (
                  <span className="ml-auto text-xs font-mono tabular-nums text-emerald-300">
                    {credits}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span className="ml-auto text-xs font-mono font-bold tabular-nums px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenVerify}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap text-slate-300 hover:bg-white/6 hover:text-white cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="truncate">{t.publicVerify.navTitle}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            {company?.logoDataUrl ? (
              <img
                src={company.logoDataUrl}
                alt={company.name}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-lg object-contain bg-white p-1 shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-navy-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {(company?.name || user?.name || 'CJ').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {company?.name || user?.name}
              </p>
              <p className="text-xs text-slate-400 truncate tabular-nums">
                {activeMember && roleBadgeLabel
                  ? `${activeMember.name} · ${roleBadgeLabel}`
                  : `${company?.country === 'PY' ? 'RUC' : 'CNPJ'} ${company?.taxId || '—'}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/8 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <p className="hidden lg:block text-sm font-medium text-slate-600 truncate">
              {company?.name || t.common.appName}
              {activeMember && roleBadgeLabel ? (
                <span className="text-slate-400 font-normal">
                  {' '}
                  · {activeMember.name} ({roleBadgeLabel})
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('credits')}
              className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-navy-900 flex items-center gap-1.5 tabular-nums whitespace-nowrap cursor-pointer"
            >
              <Coins className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {credits}{' '}
                {credits === 1 ? t.common.creditSingular : t.common.creditsUnit}
              </span>
            </button>
            <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Thumb Zone) */}
      <nav
        aria-label="Navegação principal"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center px-1"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMobileNav(item.id)}
              className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-navy-900'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.3 : 1.8} />
              <span className="text-[10px] font-medium leading-none truncate max-w-[64px]">
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            mobileMenuOpen ||
            ['team', 'reports', 'credits', 'settings'].includes(activeScreen)
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-navy-900'
          }`}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium leading-none">
            {t.nav.team}
          </span>
        </button>
      </nav>

      {/* Mobile Drawer Sheet for Team, Reports, Credits, Settings, Verify */}
      {mobileMenuOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-50 bg-slate-950/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-navy-900">
                  {company?.name || user?.name}
                </p>
                {activeMember && roleBadgeLabel && (
                  <p className="text-xs text-slate-500">
                    {activeMember.name} · {roleBadgeLabel}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {navItems.slice(4).map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileNav(item.id)}
                    className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-navy-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenVerify();
                }}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-left text-sm font-medium text-navy-900 flex items-center gap-2.5 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="truncate">{t.publicVerify.navTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartNewContract();
                }}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2.5 cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.nav.newContract}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


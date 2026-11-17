import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AuthScreen } from './components/AuthScreen';
import { ContractDetailModal } from './components/ContractDetailModal';
import { CreditsScreen } from './components/CreditsScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ExpirationsScreen } from './components/ExpirationsScreen';
import { NewContractScreen } from './components/NewContractScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PublicSignScreen } from './components/PublicSignScreen';
import { PublicVerifyScreen } from './components/PublicVerifyScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { SendForSignatureModal } from './components/SendForSignatureModal';
import { SettingsScreen } from './components/SettingsScreen';
import { TeamScreen } from './components/TeamScreen';
import { TemplatesScreen } from './components/TemplatesScreen';
import { VaultScreen } from './components/VaultScreen';
import { translations } from './i18n/translations';
import {
  filterVisibleContractsForMember,
  getActiveTeamMember,
  storageService,
} from './services/storage';
import type {
  AppScreen,
  AppStorageSnapshot,
  ContractRecord,
  ContractTemplate,
  Locale,
} from './types';

function readCurrentRoute(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<AppStorageSnapshot>(() =>
    storageService.getSnapshot()
  );
  const [currentRoute, setCurrentRoute] = useState<string>(() =>
    readCurrentRoute()
  );
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  );
  const [sendModalContract, setSendModalContract] =
    useState<ContractRecord | null>(null);
  const [preselectedTemplate, setPreselectedTemplate] =
    useState<ContractTemplate | null>(null);
  const [editingDraft, setEditingDraft] = useState<ContractRecord | null>(null);
  const [renewingContract, setRenewingContract] =
    useState<ContractRecord | null>(null);

  const locale = snapshot.locale;
  const t = translations[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(readCurrentRoute());
      setSnapshot(storageService.getSnapshot());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPath = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(path);
    setSnapshot(storageService.getSnapshot());
    if (path === '/') {
      setSendModalContract(null);
      setSelectedContractId(null);
    }
  };

  const parsedPublicRoute = useMemo(() => {
    const [pathname, search = ''] = currentRoute.split('?');
    const cleanPath = pathname.replace(/\/+$/, '') || '/';

    const signMatch = cleanPath.match(/^\/assinar\/([^/]+)\/([^/]+)$/);
    if (signMatch) {
      return {
        type: 'sign' as const,
        contractId: decodeURIComponent(signMatch[1]),
        token: decodeURIComponent(signMatch[2]),
      };
    }

    if (cleanPath === '/verificar' || cleanPath.startsWith('/verificar/')) {
      const params = new URLSearchParams(search);
      const pathTail = cleanPath.startsWith('/verificar/')
        ? decodeURIComponent(cleanPath.slice('/verificar/'.length))
        : '';
      return {
        type: 'verify' as const,
        initialQuery: params.get('code') || pathTail || '',
      };
    }

    return null;
  }, [currentRoute]);

  const activeMember = useMemo(
    () => getActiveTeamMember(snapshot),
    [snapshot]
  );

  const visibleContracts = useMemo(
    () =>
      filterVisibleContractsForMember(
        snapshot.contracts,
        snapshot.teamMembers,
        snapshot.activeMemberId
      ),
    [snapshot.contracts, snapshot.teamMembers, snapshot.activeMemberId]
  );

  const expiringSoonCount = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return visibleContracts.filter((c) => {
      const ymd = c.expirationInfo?.endDate || c.expirationInfo?.adjustmentDate;
      if (!ymd) return false;
      const target = new Date(`${ymd}T12:00:00`).getTime();
      if (Number.isNaN(target)) return false;
      const daysLeft = Math.round((target - today.getTime()) / 86400000);
      return daysLeft <= 60;
    }).length;
  }, [visibleContracts]);

  const pendingApprovalCount = useMemo(
    () =>
      snapshot.contracts.filter(
        (c) =>
          c.legalApprovalStatus === 'pending_approval' ||
          c.legalApprovalStatus === 'rejected'
      ).length,
    [snapshot.contracts]
  );

  const handleLocaleChange = (nextLocale: Locale) => {
    setSnapshot(storageService.setLocale(nextLocale));
  };

  // Public Routes (NO LOGIN REQUIRED)
  if (parsedPublicRoute?.type === 'sign') {
    return (
      <PublicSignScreen
        contractId={parsedPublicRoute.contractId}
        token={parsedPublicRoute.token}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        onNavigatePath={navigateToPath}
        onSnapshotUpdated={() => setSnapshot(storageService.getSnapshot())}
      />
    );
  }

  if (parsedPublicRoute?.type === 'verify') {
    return (
      <PublicVerifyScreen
        initialQuery={parsedPublicRoute.initialQuery}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        onNavigatePath={navigateToPath}
      />
    );
  }

  const handleSignIn = (email: string) => {
    const next = storageService.signIn(email);
    setSnapshot(next);
    setActiveScreen('dashboard');
  };

  const handleSignUp = (name: string, email: string) => {
    const next = storageService.signUp(name, email);
    setSnapshot(next);
    setActiveScreen('dashboard');
  };

  const handleDemoLogin = () => {
    const next = storageService.signInDemo(locale);
    setSnapshot(next);
    setActiveScreen('dashboard');
  };

  const handleSignOut = () => {
    setSnapshot(storageService.signOut());
    setSelectedContractId(null);
    setSendModalContract(null);
    setPreselectedTemplate(null);
    setEditingDraft(null);
    setRenewingContract(null);
  };

  const startNewContract = (
    template: ContractTemplate | null = null,
    draft: ContractRecord | null = null,
    renewFrom: ContractRecord | null = null
  ) => {
    setPreselectedTemplate(template);
    setEditingDraft(draft);
    setRenewingContract(renewFrom);
    setActiveScreen('new-contract');
  };

  // 1. Unauthenticated -> Login / Cadastro
  if (!snapshot.user) {
    return (
      <AuthScreen
        t={t}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onDemoLogin={handleDemoLogin}
        onOpenVerify={() => navigateToPath('/verificar')}
      />
    );
  }

  // 2. Onboarding incomplete -> Company setup
  if (!snapshot.company || !snapshot.company.onboardingCompleted) {
    return (
      <OnboardingScreen
        t={t}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        initialCompany={snapshot.company}
        onComplete={(payload) => {
          const next = storageService.saveCompanyProfile(payload);
          setSnapshot(next);
          setActiveScreen('dashboard');
        }}
      />
    );
  }

  const activeContract = selectedContractId
    ? snapshot.contracts.find((c) => c.id === selectedContractId) || null
    : null;

  // 3. Authenticated Workspace
  return (
    <AppShell
      t={t}
      locale={locale}
      onLocaleChange={handleLocaleChange}
      activeScreen={activeScreen}
      onNavigate={(screen) => {
        if (screen !== 'new-contract') {
          setPreselectedTemplate(null);
          setEditingDraft(null);
          setRenewingContract(null);
        }
        setActiveScreen(screen);
      }}
      onStartNewContract={() => startNewContract(null, null, null)}
      company={snapshot.company}
      user={snapshot.user}
      activeMember={activeMember}
      expiringAlertCount={expiringSoonCount}
      pendingApprovalCount={pendingApprovalCount}
      credits={snapshot.credits}
      onOpenVerify={() => navigateToPath('/verificar')}
      onSignOut={handleSignOut}
    >
      {activeScreen === 'dashboard' && (
        <DashboardScreen
          t={t}
          locale={locale}
          credits={snapshot.credits}
          contracts={visibleContracts}
          activeMember={activeMember}
          expiringSoonCount={expiringSoonCount}
          pendingApprovalCount={pendingApprovalCount}
          onStartNewContract={() => startNewContract(null, null, null)}
          onGoToCredits={() => setActiveScreen('credits')}
          onGoToExpirations={() => setActiveScreen('expirations')}
          onGoToTeam={() => setActiveScreen('team')}
          onOpenContract={(contract) => setSelectedContractId(contract.id)}
          onEditDraft={(draft) => startNewContract(null, draft, null)}
          onMarkSigned={(id) =>
            setSnapshot(storageService.markContractSigned(id))
          }
        />
      )}

      {activeScreen === 'vault' && (
        <VaultScreen
          t={t}
          locale={locale}
          company={snapshot.company}
          contracts={visibleContracts}
          onOpenContract={(contract) => setSelectedContractId(contract.id)}
          onOpenVerifyCode={(codeOrHash) =>
            navigateToPath(`/verificar?code=${encodeURIComponent(codeOrHash)}`)
          }
        />
      )}

      {activeScreen === 'expirations' && (
        <ExpirationsScreen
          t={t}
          locale={locale}
          company={snapshot.company}
          contracts={visibleContracts}
          onSaveExpirationInfo={(contractId, info) =>
            setSnapshot(
              storageService.saveContractExpirationInfo(contractId, info)
            )
          }
          onRenewContract={(contract) => {
            const matchedTpl =
              snapshot.templates.find((tpl) => tpl.id === contract.templateId) ||
              null;
            startNewContract(matchedTpl, null, contract);
          }}
          onOpenContract={(contract) => setSelectedContractId(contract.id)}
        />
      )}

      {activeScreen === 'team' && (
        <TeamScreen
          t={t}
          locale={locale}
          members={snapshot.teamMembers || []}
          activeMember={activeMember}
          requireLegalApproval={Boolean(snapshot.company.requireLegalApproval)}
          allContracts={snapshot.contracts}
          onInviteMember={(payload) =>
            setSnapshot(storageService.inviteTeamMember(payload))
          }
          onUpdateRole={(memberId, role) =>
            setSnapshot(storageService.updateTeamMemberRole(memberId, role))
          }
          onRemoveMember={(memberId) =>
            setSnapshot(storageService.removeTeamMember(memberId))
          }
          onSwitchActiveMember={(memberId) =>
            setSnapshot(storageService.switchActiveMember(memberId))
          }
          onToggleLegalGate={(enabled) =>
            setSnapshot(storageService.setRequireLegalApproval(enabled))
          }
          onApproveContract={(contractId) =>
            setSnapshot(storageService.approveContractLegal(contractId))
          }
          onRejectContract={(contractId, note) =>
            setSnapshot(storageService.rejectContractLegal(contractId, note))
          }
          onOpenContract={(contract) => setSelectedContractId(contract.id)}
        />
      )}

      {activeScreen === 'reports' && (
        <ReportsScreen
          t={t}
          locale={locale}
          contracts={visibleContracts}
          transactions={snapshot.transactions}
        />
      )}

      {activeScreen === 'new-contract' && (
        <NewContractScreen
          t={t}
          locale={locale}
          company={snapshot.company}
          templates={snapshot.templates}
          clauseLibrary={snapshot.clauseLibrary || []}
          credits={snapshot.credits}
          initialTemplate={preselectedTemplate}
          editingDraft={editingDraft}
          renewingFromContract={renewingContract}
          onSaveQuickTemplate={(tpl) => {
            const res = storageService.saveTemplate(tpl);
            setSnapshot(res.snapshot);
            return res.template;
          }}
          onSaveContract={(payload) => {
            const res = storageService.saveContract(payload);
            setSnapshot(res.snapshot);
            return {
              contract: res.contract,
              insufficientCredits: res.insufficientCredits,
            };
          }}
          onSaveExpirationInfo={(contractId, info) =>
            setSnapshot(
              storageService.saveContractExpirationInfo(contractId, info)
            )
          }
          onOpenSendForSignatureModal={(contract) => {
            setSendModalContract(contract);
          }}
          onGoToCredits={() => setActiveScreen('credits')}
          onCancel={() => {
            setPreselectedTemplate(null);
            setEditingDraft(null);
            setRenewingContract(null);
            setActiveScreen('dashboard');
          }}
        />
      )}

      {activeScreen === 'templates' && (
        <TemplatesScreen
          t={t}
          locale={locale}
          companyCountry={snapshot.company.country}
          templates={snapshot.templates}
          clauseLibrary={snapshot.clauseLibrary || []}
          onSaveTemplate={(tpl) => {
            const res = storageService.saveTemplate(tpl);
            setSnapshot(res.snapshot);
            return res.template;
          }}
          onShareToLibrary={(payload) => {
            const res = storageService.shareTemplateToLibrary(payload);
            setSnapshot(res.snapshot);
            return { creditsAwarded: res.creditsAwarded };
          }}
          onDeleteTemplate={(id) =>
            setSnapshot(storageService.deleteTemplate(id))
          }
          onUseTemplate={(tpl) => startNewContract(tpl, null, null)}
        />
      )}

      {activeScreen === 'credits' && (
        <CreditsScreen
          t={t}
          locale={locale}
          defaultCountry={snapshot.company.country}
          credits={snapshot.credits}
          transactions={snapshot.transactions}
          onPurchase={(pkg, country, paymentMethod, packageLabel) => {
            setSnapshot(
              storageService.purchaseCredits(
                pkg,
                country,
                paymentMethod,
                packageLabel
              )
            );
          }}
        />
      )}

      {activeScreen === 'settings' && (
        <SettingsScreen
          t={t}
          locale={locale}
          onLocaleChange={handleLocaleChange}
          user={snapshot.user}
          company={snapshot.company}
          onSaveCompany={(payload) =>
            setSnapshot(storageService.saveCompanyProfile(payload))
          }
          onPurgeExpiredDocs={() => {
            const res = storageService.purgeExpiredClientDocuments(false);
            setSnapshot(res.snapshot);
            return res.purgedCount;
          }}
          onExportBackup={() => storageService.exportJsonBackup()}
          onResetDemo={() => {
            setSnapshot(storageService.resetToDemo());
            setActiveScreen('dashboard');
          }}
          onSignOut={handleSignOut}
        />
      )}

      {activeContract && (
        <ContractDetailModal
          t={t}
          locale={locale}
          contract={activeContract}
          company={snapshot.company}
          activeMember={activeMember}
          requireLegalApproval={Boolean(snapshot.company.requireLegalApproval)}
          onClose={() => setSelectedContractId(null)}
          onMarkSigned={(id) =>
            setSnapshot(storageService.markContractSigned(id))
          }
          onDelete={(id) => setSnapshot(storageService.deleteContract(id))}
          onOpenSendForSignature={(contract) => {
            setSelectedContractId(null);
            setSendModalContract(contract);
          }}
          onOpenPublicPath={(path) => {
            setSelectedContractId(null);
            navigateToPath(path);
          }}
          onRequestApproval={(id) =>
            setSnapshot(storageService.requestLegalApproval(id))
          }
          onApproveLegal={(id) =>
            setSnapshot(storageService.approveContractLegal(id))
          }
          onRejectLegal={(id, note) =>
            setSnapshot(storageService.rejectContractLegal(id, note))
          }
          onSaveExpirationInfo={(id, info) =>
            setSnapshot(storageService.saveContractExpirationInfo(id, info))
          }
          onRenewContract={(contract) => {
            const matchedTpl =
              snapshot.templates.find((tpl) => tpl.id === contract.templateId) ||
              null;
            startNewContract(matchedTpl, null, contract);
          }}
        />
      )}

      {sendModalContract && (
        <SendForSignatureModal
          t={t}
          locale={locale}
          company={snapshot.company}
          contract={sendModalContract}
          onClose={() => setSendModalContract(null)}
          onSubmitSend={({ signers, order, requireSelfie }) => {
            const res = storageService.sendContractForSignature({
              contractId: sendModalContract.id,
              signers,
              order,
              requireSelfie,
            });
            setSnapshot(res.snapshot);
            if (res.legalApprovalRequired) {
              return { ok: false, legalApprovalRequired: true };
            }
            if (res.insufficientCredits) {
              return { ok: false, insufficientCredits: true };
            }
            return { ok: true, contract: res.contract };
          }}
          onGoToCredits={() => {
            setSendModalContract(null);
            setActiveScreen('credits');
          }}
          onGoToTeam={() => {
            setSendModalContract(null);
            setActiveScreen('team');
          }}
          onRequestApproval={(contractId) =>
            setSnapshot(storageService.requestLegalApproval(contractId))
          }
          onOpenSignPath={(path) => {
            setSendModalContract(null);
            navigateToPath(path);
          }}
          onDone={() => {
            setSendModalContract(null);
            setPreselectedTemplate(null);
            setEditingDraft(null);
            setRenewingContract(null);
            setActiveScreen('dashboard');
          }}
        />
      )}
    </AppShell>
  );
}


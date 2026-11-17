import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import type { ContractRecord, Locale, TeamMember, TeamRole } from '../types';

interface TeamScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  members: TeamMember[];
  activeMember: TeamMember | null;
  requireLegalApproval: boolean;
  allContracts: ContractRecord[];
  onInviteMember: (payload: {
    name: string;
    email: string;
    role: TeamRole;
  }) => void;
  onUpdateRole: (memberId: string, role: TeamRole) => void;
  onRemoveMember: (memberId: string) => void;
  onSwitchActiveMember: (memberId: string) => void;
  onToggleLegalGate: (enabled: boolean) => void;
  onApproveContract: (contractId: string) => void;
  onRejectContract: (contractId: string, note: string) => void;
  onOpenContract: (contract: ContractRecord) => void;
}

export function TeamScreen({
  t,
  locale,
  members,
  activeMember,
  requireLegalApproval,
  allContracts,
  onInviteMember,
  onUpdateRole,
  onRemoveMember,
  onSwitchActiveMember,
  onToggleLegalGate,
  onApproveContract,
  onRejectContract,
  onOpenContract,
}: TeamScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('corretor');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const roleLabel = (r: TeamRole) => {
    if (r === 'admin') return t.team.roleAdmin;
    if (r === 'juridico') return t.team.roleJuridico;
    return t.team.roleCorretor;
  };

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onInviteMember({ name, email, role });
    setName('');
    setEmail('');
    setRole('corretor');
  };

  const pendingApprovals = allContracts.filter(
    (c) =>
      c.status !== 'signed' &&
      (c.legalApprovalStatus === 'pending_approval' ||
        c.legalApprovalStatus === 'rejected')
  );

  const canReviewLegal =
    !activeMember ||
    activeMember.role === 'admin' ||
    activeMember.role === 'juridico';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
          {t.team.title}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{t.team.subtitle}</p>
      </div>

      {/* Role Cards Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-bold text-navy-900">{t.team.roleAdmin}</p>
          <p className="text-xs text-slate-600">{t.team.roleAdminDesc}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-bold text-emerald-800">
            {t.team.roleCorretor}
          </p>
          <p className="text-xs text-slate-600">{t.team.roleCorretorDesc}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-bold text-navy-900">{t.team.roleJuridico}</p>
          <p className="text-xs text-slate-600">{t.team.roleJuridicoDesc}</p>
        </div>
      </section>

      {/* Legal Approval Gate Toggle */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Scale className="h-5 w-5 text-navy-900 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy-900">
              {t.team.legalGateTitle}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.team.legalGateDesc}
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0 select-none">
          <input
            type="checkbox"
            checked={requireLegalApproval}
            onChange={(e) => onToggleLegalGate(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
          />
          <span className="text-xs font-semibold text-navy-900">
            {requireLegalApproval
              ? locale === 'es-PY'
                ? 'Activado'
                : 'Ativado'
              : locale === 'es-PY'
                ? 'Desactivado'
                : 'Desativado'}
          </span>
        </label>
      </section>

      {/* Legal Approval Queue */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-navy-900 inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>{t.team.approvalQueueTitle}</span>
          </h2>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {pendingApprovals.length}
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <p className="text-sm text-slate-500">{t.team.approvalQueueEmpty}</p>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((contract) => (
              <div
                key={contract.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => onOpenContract(contract)}
                      className="text-sm font-bold text-navy-900 hover:text-emerald-700 text-left cursor-pointer"
                    >
                      {contract.clientName}{' '}
                      <span className="text-xs font-mono font-normal text-slate-500">
                        {contract.code}
                      </span>
                    </button>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {contract.templateTitle}
                      {contract.createdByName ? ` · ${contract.createdByName}` : ''}
                    </p>
                  </div>

                  {contract.legalApprovalStatus === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>{t.contractDetail.legalRejected}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <Scale className="h-3.5 w-3.5" />
                      <span>{t.contractDetail.legalPending}</span>
                    </span>
                  )}
                </div>

                {contract.legalApprovalNote && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {contract.legalApprovalNote}
                  </p>
                )}

                {canReviewLegal && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onApproveContract(contract.id)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t.team.approveBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(contract.id);
                        setRejectReason('');
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>{t.team.rejectBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenContract(contract)}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-navy-900 hover:underline ml-auto cursor-pointer"
                    >
                      {t.dashboard.viewContract}
                    </button>
                  </div>
                )}

                {rejectingId === contract.id && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t.contractDetail.rejectReasonPlaceholder}
                      className="flex-1 min-h-[38px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!rejectReason.trim()) return;
                        onRejectContract(contract.id, rejectReason);
                        setRejectingId(null);
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {t.team.rejectBtn}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite + Members List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleInviteSubmit}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-base font-semibold text-navy-900 inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-700" />
            <span>{t.team.inviteTitle}</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.team.inviteNameLabel}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.team.inviteEmailLabel}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.team.inviteRoleLabel}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            >
              <option value="corretor">{t.team.roleCorretor}</option>
              <option value="juridico">{t.team.roleJuridico}</option>
              <option value="admin">{t.team.roleAdmin}</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            {t.team.inviteBtn}
          </button>
        </form>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-navy-900 inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-navy-900" />
              <span>
                {t.team.membersListTitle} ({members.length})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.team.switchPerspectiveHint}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const isActive = activeMember?.id === m.id;
              return (
                <div
                  key={m.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy-900 truncate">
                        {m.name}
                      </p>
                      {isActive ? (
                        <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          {t.team.activeBadge}
                        </span>
                      ) : (
                        m.status === 'invited' && (
                          <span className="text-[11px] text-amber-700 font-medium">
                            {t.team.invitedBadge}
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{m.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label={t.team.inviteRoleLabel}
                      value={m.role}
                      onChange={(e) =>
                        onUpdateRole(m.id, e.target.value as TeamRole)
                      }
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="admin">{roleLabel('admin')}</option>
                      <option value="corretor">{roleLabel('corretor')}</option>
                      <option value="juridico">{roleLabel('juridico')}</option>
                    </select>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onSwitchActiveMember(m.id)}
                        className="min-h-[36px] px-3 py-1 rounded-lg border border-navy-900/20 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
                      >
                        {t.team.useThisMemberBtn}
                      </button>
                    )}

                    {members.length > 1 && !isActive && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.id)}
                        aria-label={t.common.delete}
                        className="min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

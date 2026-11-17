import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  FileDown,
  FileText,
  Loader2,
  Scale,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import {
  generateContractDocx,
  generateContractPdfA4,
} from '../services/contractExporter';
import {
  reviewContractWithAI,
  type ContractClauseSuggestion,
  type ContractReviewAlert,
} from '../services/documentParser';
import type {
  CompanyProfile,
  ContractTemplate,
  CountryCode,
  Locale,
  SharedClauseItem,
  TemplateField,
} from '../types';

interface ContractReviewStepProps {
  t: TranslationDictionary;
  locale: Locale;
  company: CompanyProfile | null;
  companyCountry: CountryCode;
  template: ContractTemplate;
  templateFields: TemplateField[];
  variablesMap: Record<string, string>;
  credits: number;
  creditAlreadyConsumed: boolean;
  contractCodePreview: string;
  clientName: string;
  clientDocument: string;
  initialCustomBody?: string | null;
  clauseLibrary?: SharedClauseItem[];
  onUpdateVariable: (field: TemplateField, nextValue: string) => void;
  onJumpToFieldInVerification: (fieldKey: string) => void;
  onSaveDraftAndMaybeConsume: (params: {
    renderedContent: string;
    consumeCredit: boolean;
    finalize: boolean;
  }) => { ok: boolean; insufficientCredits?: boolean; code: string };
  onSendForSignature: (renderedContent: string) => void;
  onGoToCredits: () => void;
  onBack: () => void;
}

export function ContractReviewStep({
  t,
  locale,
  company,
  companyCountry,
  template,
  templateFields,
  variablesMap,
  credits,
  creditAlreadyConsumed,
  contractCodePreview,
  clientName,
  clientDocument,
  initialCustomBody = null,
  clauseLibrary = [],
  onUpdateVariable,
  onJumpToFieldInVerification,
  onSaveDraftAndMaybeConsume,
  onSendForSignature,
  onGoToCredits,
  onBack,
}: ContractReviewStepProps) {
  const [editorMode, setEditorMode] = useState<'highlighted' | 'free'>(
    initialCustomBody ? 'free' : 'highlighted'
  );
  // Extra clauses / manual text overrides applied on top of template
  const [customBodyOverride, setCustomBodyOverride] = useState<string | null>(
    initialCustomBody
  );
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null);

  // AI Review state
  const [isReviewingAI, setIsReviewingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ContractReviewAlert[]>([]);
  const [clauseSuggestions, setClauseSuggestions] = useState<
    ContractClauseSuggestion[]
  >([]);
  const [aiExecuted, setAiExecuted] = useState(false);
  const [appliedAlertIds, setAppliedAlertIds] = useState<Set<string>>(
    new Set()
  );
  const [ignoredAlertIds, setIgnoredAlertIds] = useState<Set<string>>(
    new Set()
  );
  const [appliedClauseIds, setAppliedClauseIds] = useState<Set<string>>(
    new Set()
  );
  const [ignoredClauseIds, setIgnoredClauseIds] = useState<Set<string>>(
    new Set()
  );
  const [appliedLibraryIds, setAppliedLibraryIds] = useState<Set<string>>(
    new Set()
  );
  const [ignoredLibraryIds, setIgnoredLibraryIds] = useState<Set<string>>(
    new Set()
  );

  const [exportStatusMsg, setExportStatusMsg] = useState<string | null>(null);
  const [draftToastMsg, setDraftToastMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const mergedSystemVars = useMemo<Record<string, string>>(
    () => ({
      empresa_nome: company?.name || '',
      empresa_documento: company?.taxId || '',
      empresa_endereco: company?.address || '',
      empresa_telefone: company?.phone || '',
      data_hoje: new Date().toLocaleDateString(
        companyCountry === 'PY' ? 'es-PY' : 'pt-BR'
      ),
      ...variablesMap,
    }),
    [company, companyCountry, variablesMap]
  );

  // Build highlighted segments from template.content
  const segments = useMemo(() => {
    const parts: Array<
      { kind: 'text'; value: string } | { kind: 'var'; key: string }
    > = [];
    const regex = /\{\{\s*([a-zA-Z0-9_À-ÿ]+)\s*\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          kind: 'text',
          value: template.content.slice(lastIndex, match.index),
        });
      }
      parts.push({ kind: 'var', key: match[1] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < template.content.length) {
      parts.push({
        kind: 'text',
        value: template.content.slice(lastIndex),
      });
    }
    return parts;
  }, [template.content]);

  const renderedFromTemplate = useMemo(
    () =>
      segments
        .map((seg) => {
          if (seg.kind === 'text') return seg.value;
          const v = mergedSystemVars[seg.key];
          return v && v.trim() ? v : `[${seg.key}]`;
        })
        .join(''),
    [segments, mergedSystemVars]
  );

  const effectiveContractText = customBodyOverride ?? renderedFromTemplate;

  const focusedField = useMemo(
    () => templateFields.find((f) => f.key === focusedFieldKey) || null,
    [templateFields, focusedFieldKey]
  );

  const handleRunAIReview = async () => {
    setAiError(null);
    setIsReviewingAI(true);
    try {
      const result = await reviewContractWithAI({
        contractText: effectiveContractText,
        category: template.category,
        country: companyCountry,
        locale,
        variables: variablesMap,
      });
      setAlerts(result.alerts);
      setClauseSuggestions(result.clauseSuggestions);
      setAppliedAlertIds(new Set());
      setIgnoredAlertIds(new Set());
      setAppliedClauseIds(new Set());
      setIgnoredClauseIds(new Set());
      setAiExecuted(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao revisar com IA.');
    } finally {
      setIsReviewingAI(false);
    }
  };

  const handleApplyAlert = (alert: ContractReviewAlert) => {
    if (
      alert.targetExcerpt &&
      alert.suggestedReplacement &&
      effectiveContractText.includes(alert.targetExcerpt)
    ) {
      const updated = effectiveContractText.replace(
        alert.targetExcerpt,
        alert.suggestedReplacement
      );
      setCustomBodyOverride(updated);
      setEditorMode('free');
      setAppliedAlertIds((prev) => new Set(prev).add(alert.id));
    } else if (alert.suggestedReplacement) {
      setCustomBodyOverride(
        `${effectiveContractText}\n\n${alert.suggestedReplacement}`
      );
      setEditorMode('free');
      setAppliedAlertIds((prev) => new Set(prev).add(alert.id));
    } else {
      // Jump user back to verification table to fix manually
      onBack();
    }
  };

  const handleApplyClause = (clause: ContractClauseSuggestion) => {
    const current = effectiveContractText.trim();
    const insertion = `\n\n${clause.clauseText.trim()}`;
    setCustomBodyOverride(`${current}${insertion}`);
    setEditorMode('free');
    setAppliedClauseIds((prev) => new Set(prev).add(clause.id));
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    setIsExporting(true);
    setExportStatusMsg(null);
    try {
      const saveResult = onSaveDraftAndMaybeConsume({
        renderedContent: effectiveContractText,
        consumeCredit: true,
        finalize: false,
      });

      if (saveResult.insufficientCredits) {
        // Save work silently as draft (0 credits) then open purchase screen
        onSaveDraftAndMaybeConsume({
          renderedContent: effectiveContractText,
          consumeCredit: false,
          finalize: false,
        });
        onGoToCredits();
        return;
      }

      const payload = {
        company,
        contractTitle: template.title,
        contractCode: saveResult.code || contractCodePreview,
        renderedContent: effectiveContractText,
        clientName,
        clientDocument,
        locale,
      };

      if (format === 'pdf') {
        await generateContractPdfA4(payload);
      } else {
        await generateContractDocx(payload);
      }

      setExportStatusMsg(t.newContract.exportSuccessDraft);
    } finally {
      setIsExporting(false);
    }
  };

  const visibleAlerts = alerts.filter((a) => !ignoredAlertIds.has(a.id));
  const visibleClauses = clauseSuggestions.filter(
    (c) => !ignoredClauseIds.has(c.id)
  );

  const matchingLibraryClauses = useMemo(() => {
    return clauseLibrary
      .filter((cl) => !ignoredLibraryIds.has(cl.id))
      .filter(
        (cl) =>
          cl.country === companyCountry &&
          (cl.category === template.category || cl.category === 'servicos')
      )
      .slice(0, 4);
  }, [clauseLibrary, ignoredLibraryIds, companyCountry, template.category]);

  const handleApplyLibraryClause = (clause: SharedClauseItem) => {
    const current = effectiveContractText.trim();
    setCustomBodyOverride(`${current}\n\n${clause.clauseText.trim()}`);
    setEditorMode('free');
    setAppliedLibraryIds((prev) => new Set(prev).add(clause.id));
  };

  const brandColor = company?.brandColor || '#0F2544';
  const docIdLabel = company?.country === 'PY' ? 'RUC' : 'CNPJ';

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-navy-900">
            {t.newContract.previewHeader}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.newContract.exportCostNote} ({t.credits.currentBalance}:{' '}
            <strong className="tabular-nums text-navy-900">{credits}</strong>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunAIReview}
            disabled={isReviewingAI}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isReviewingAI ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-emerald-400" />
            )}
            <span>{t.newContract.aiReviewBtn}</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport('pdf')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            <span>
              {creditAlreadyConsumed
                ? t.newContract.generatePdfBtn.replace(' (-1 crédito)', '')
                : t.newContract.generatePdfBtn}
            </span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport('docx')}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-navy-900 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            <span>
              {creditAlreadyConsumed
                ? t.newContract.exportDocxBtn.replace(' (-1 crédito)', '')
                : t.newContract.exportDocxBtn}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSendForSignature(effectiveContractText)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Send className="h-4 w-4 text-emerald-400" />
            <span>{t.newContract.sendForSignatureBtn}</span>
          </button>
        </div>
      </div>

      {draftToastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium text-emerald-800">
          {draftToastMsg}
        </div>
      )}

      {exportStatusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium text-emerald-800 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{exportStatusMsg}</span>
          </span>
          <button
            type="button"
            onClick={() => onSendForSignature(effectiveContractText)}
            className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{t.newContract.sendForSignatureBtn}</span>
          </button>
        </div>
      )}

      {/* Main Split: Contract Text Editor (left) + AI Review / Field Inspector (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Document Review Editor */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="h-1.5 w-full" style={{ backgroundColor: brandColor }} />

          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setCustomBodyOverride(null);
                  setEditorMode('highlighted');
                }}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer ${
                  editorMode === 'highlighted'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{t.newContract.reviewHighlightedTab}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customBodyOverride === null) {
                    setCustomBodyOverride(renderedFromTemplate);
                  }
                  setEditorMode('free');
                }}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer ${
                  editorMode === 'free'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{t.newContract.reviewFreeEditTab}</span>
              </button>
            </div>

            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {contractCodePreview}
            </span>
          </div>

          {/* Inline Field Quick-Editor Popover when clicking a highlighted value */}
          {editorMode === 'highlighted' && focusedField && (
            <div className="px-4 sm:px-6 py-3.5 bg-navy-900 text-white flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300">
                  {t.newContract.inlineFieldEditTitle} ·{' '}
                  <span className="font-semibold text-white">
                    {focusedField.label}
                  </span>
                </p>
                <input
                  type="text"
                  autoFocus
                  value={variablesMap[focusedField.key] || ''}
                  onChange={(e) =>
                    onUpdateVariable(focusedField, e.target.value)
                  }
                  className="mt-1.5 w-full min-h-[38px] px-3 py-1.5 text-sm bg-white text-slate-900 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:pt-4">
                <button
                  type="button"
                  onClick={() => onJumpToFieldInVerification(focusedField.key)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-medium text-white cursor-pointer"
                >
                  {t.newContract.goToFieldInTable}
                </button>
                <button
                  type="button"
                  onClick={() => setFocusedFieldKey(null)}
                  aria-label={t.common.close}
                  className="min-h-[36px] min-w-[36px] rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Company Header Preview inside Sheet */}
          <div className="p-5 sm:p-8 space-y-5">
            <header className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                {company?.logoDataUrl ? (
                  <img
                    src={company.logoDataUrl}
                    alt={company.name}
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 object-contain rounded-lg border border-slate-100 p-1 shrink-0"
                  />
                ) : (
                  <div
                    className="h-11 w-11 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(company?.name || 'CJ').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {company?.name || 'ContratoJá'}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums truncate">
                    {docIdLabel}: {company?.taxId || '—'}
                    {company?.phone ? ` · ${company.phone}` : ''}
                  </p>
                </div>
              </div>
            </header>

            {editorMode === 'highlighted' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {t.newContract.reviewClickFieldHint}
                </p>
                <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {segments.map((seg, idx) => {
                    if (seg.kind === 'text') {
                      return <span key={idx}>{seg.value}</span>;
                    }
                    const val = mergedSystemVars[seg.key];
                    const isFilled = Boolean(val && val.trim().length > 0);
                    const isUserField = templateFields.some(
                      (f) => f.key === seg.key
                    );
                    const isFocused = focusedFieldKey === seg.key;

                    if (!isUserField) {
                      return (
                        <span key={`${seg.key}_${idx}`} className="font-medium">
                          {val || `[${seg.key}]`}
                        </span>
                      );
                    }

                    return (
                      <button
                        key={`${seg.key}_${idx}`}
                        type="button"
                        onClick={() => setFocusedFieldKey(seg.key)}
                        className={`inline px-1.5 py-0.5 mx-0.5 rounded border-b-2 text-sm font-medium transition-colors cursor-pointer text-left ${
                          isFilled
                            ? 'bg-emerald-50 border-emerald-500 text-navy-900 hover:bg-emerald-100'
                            : 'bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100'
                        } ${isFocused ? 'ring-2 ring-navy-900' : ''}`}
                      >
                        {isFilled ? val : `[${seg.key}]`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <textarea
                rows={18}
                value={effectiveContractText}
                onChange={(e) => setCustomBodyOverride(e.target.value)}
                className="w-full p-4 text-sm leading-relaxed text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            )}
          </div>
        </section>

        {/* Right Column: AI Review Results + Quick Actions */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-navy-900" />
                <h2 className="text-base font-semibold text-navy-900">
                  {t.newContract.aiReviewPanelTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleRunAIReview}
                disabled={isReviewingAI}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer disabled:opacity-50"
              >
                {t.newContract.aiReviewBtn}
              </button>
            </div>

            {isReviewingAI && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-emerald-600 animate-spin shrink-0" />
                <p className="text-xs font-medium text-slate-700">
                  {t.newContract.aiReviewRunning}
                </p>
              </div>
            )}

            {aiError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700"
              >
                {aiError}
              </div>
            )}

            {!aiExecuted && !isReviewingAI && !aiError && (
              <p className="text-xs text-slate-500 leading-relaxed">
                {companyCountry === 'PY'
                  ? 'Hacé clic en "Revisar con IA" para verificar coherencia de fechas, montos, garantes y cláusulas faltantes según la ley paraguaya.'
                  : 'Clique em "Revisar com IA" para verificar inconsistências (datas, valores por extenso, cônjuge de fiador) e cláusulas faltantes conforme a lei brasileira.'}
              </p>
            )}

            {aiExecuted &&
              !isReviewingAI &&
              visibleAlerts.length === 0 &&
              visibleClauses.length === 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{t.newContract.aiReviewEmpty}</span>
                </div>
              )}

            {/* Alerts */}
            {visibleAlerts.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  {t.newContract.aiAlertsTitle} ({visibleAlerts.length})
                </p>
                {visibleAlerts.map((alert) => {
                  const isApplied = appliedAlertIds.has(alert.id);
                  const isHigh = alert.severity === 'alta';

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        isApplied
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : isHigh
                            ? 'bg-red-50/70 border-red-200'
                            : 'bg-amber-50/70 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isHigh ? (
                          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-navy-900">
                            {alert.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {alert.description}
                          </p>
                        </div>
                      </div>

                      {!isApplied ? (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setIgnoredAlertIds((prev) =>
                                new Set(prev).add(alert.id)
                              )
                            }
                            className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-white cursor-pointer"
                          >
                            {t.newContract.ignoreAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyAlert(alert)}
                            className="min-h-[32px] px-3 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            {t.newContract.applyAction}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>{t.newContract.appliedLabel}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Missing Clause Suggestions */}
            {visibleClauses.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700">
                  {t.newContract.aiClausesTitle} ({visibleClauses.length})
                </p>
                {visibleClauses.map((clause) => {
                  const isApplied = appliedClauseIds.has(clause.id);
                  return (
                    <div
                      key={clause.id}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        isApplied
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-navy-900">
                          {clause.title}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {clause.legalBasis}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {clause.reason}
                        </p>
                        <p className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 mt-2 whitespace-pre-wrap">
                          {clause.clauseText}
                        </p>
                      </div>

                      {!isApplied ? (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setIgnoredClauseIds((prev) =>
                                new Set(prev).add(clause.id)
                              )
                            }
                            className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-white cursor-pointer"
                          >
                            {t.newContract.ignoreAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyClause(clause)}
                            className="min-h-[32px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            {t.newContract.applyAction}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>{t.newContract.appliedLabel}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collaborative Clause Library Suggestions */}
          {matchingLibraryClauses.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5">
              <div>
                <h2 className="text-sm font-semibold text-navy-900 inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-700" />
                  <span>{t.clauseLibrary.reviewSectionTitle}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.clauseLibrary.reviewSectionHint}
                </p>
              </div>

              <div className="space-y-2.5">
                {matchingLibraryClauses.map((clause) => {
                  const isApplied = appliedLibraryIds.has(clause.id);
                  return (
                    <div
                      key={clause.id}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        isApplied
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <p className="text-xs font-semibold text-navy-900">
                        {clause.title}
                      </p>
                      {clause.legalBasis && (
                        <p className="text-[11px] font-medium text-emerald-700">
                          {clause.legalBasis}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 whitespace-pre-wrap">
                        {clause.clauseText}
                      </p>

                      {!isApplied ? (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setIgnoredLibraryIds((prev) =>
                                new Set(prev).add(clause.id)
                              )
                            }
                            className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-white cursor-pointer"
                          >
                            {t.newContract.ignoreAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyLibraryClause(clause)}
                            className="min-h-[32px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            {t.clauseLibrary.insertClauseBtn}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>{t.newContract.appliedLabel}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t.common.back}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const res = onSaveDraftAndMaybeConsume({
                  renderedContent: effectiveContractText,
                  consumeCredit: false,
                  finalize: false,
                });
                if (res.ok) {
                  setDraftToastMsg(t.newContract.draftSavedToast);
                  setTimeout(() => setDraftToastMsg(null), 3000);
                }
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
            >
              {t.newContract.saveDraftBtn}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

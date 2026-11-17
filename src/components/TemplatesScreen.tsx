import { useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  FilePlus2,
  FileText,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import {
  analyzeTemplateWithGemini,
  anonymizeTemplateForLibraryWithAI,
  extractTextFromUploadedFile,
} from '../services/documentParser';
import { extractTemplateVariables } from '../services/storage';
import type {
  ContractTemplate,
  CountryCode,
  Locale,
  SharedClauseItem,
  TemplateCategory,
  TemplateField,
} from '../types';
import { TemplateReviewEditor } from './TemplateReviewEditor';

interface TemplatesScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  companyCountry: CountryCode;
  templates: ContractTemplate[];
  clauseLibrary: SharedClauseItem[];
  onSaveTemplate: (
    tpl: Omit<ContractTemplate, 'id' | 'companyId' | 'updatedAt'> & {
      id?: string;
    }
  ) => ContractTemplate;
  onShareToLibrary: (payload: {
    templateId: string;
    clauses: Array<{ title: string; legalBasis?: string; clauseText: string }>;
    category: TemplateCategory;
    country: CountryCode;
  }) => { creditsAwarded: number };
  onDeleteTemplate: (id: string) => void;
  onUseTemplate: (template: ContractTemplate) => void;
}

interface DraftEditorState {
  isEditingExisting: boolean;
  data: {
    id?: string;
    title: string;
    category: TemplateCategory;
    country: CountryCode;
    language: Locale;
    parties: string[];
    fields: TemplateField[];
    content: string;
    isSystemTemplate?: boolean;
    sharedToLibrary?: boolean;
  };
}

export function TemplatesScreen({
  t,
  locale,
  companyCountry,
  templates,
  clauseLibrary,
  onSaveTemplate,
  onShareToLibrary,
  onDeleteTemplate,
  onUseTemplate,
}: TemplatesScreenProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'library'>(
    'templates'
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | TemplateCategory
  >('all');
  const [editorState, setEditorState] = useState<DraftEditorState | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [copiedClauseId, setCopiedClauseId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const categoryLabel = (cat: TemplateCategory) => {
    switch (cat) {
      case 'locacao':
        return t.templates.catLocacao;
      case 'compra_venda':
        return t.templates.catCompraVenda;
      case 'servicos':
        return t.templates.catServicos;
      case 'recibo':
        return t.templates.catRecibo;
      default:
        return t.templates.catOutros;
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        tpl.title.toLowerCase().includes(q) ||
        tpl.content.toLowerCase().includes(q) ||
        tpl.parties.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [templates, search, categoryFilter]);

  const handleUploadTemplateFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setIsAnalyzing(true);

    try {
      const rawText = await extractTextFromUploadedFile(file);
      if (!rawText || rawText.trim().length < 20) {
        throw new Error(
          'Não foi possível extrair texto suficiente deste arquivo. Verifique se o PDF não é apenas uma imagem escaneada.'
        );
      }

      const analysis = await analyzeTemplateWithGemini(
        rawText,
        locale,
        companyCountry
      );

      setEditorState({
        isEditingExisting: false,
        data: {
          title:
            analysis.suggestedTitle ||
            file.name.replace(/\.(docx|pdf|txt|md)$/i, ''),
          category: analysis.suggestedCategory,
          country: companyCountry,
          language: locale,
          parties: analysis.parties,
          fields: analysis.fields,
          content: analysis.templateText,
          isSystemTemplate: false,
        },
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t.templates.uploadErrorTitle;
      setUploadError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openBlankEditor = () => {
    setUploadError(null);
    setEditorState({
      isEditingExisting: false,
      data: {
        title: '',
        category: 'servicos',
        country: companyCountry,
        language: locale,
        parties: ['Contratante', 'Contratado'],
        fields: [
          {
            key: 'nome_cliente',
            label: locale === 'es-PY' ? 'Nombre del cliente' : 'Nome do cliente',
            type: 'texto',
            party: 'contratante',
          },
          {
            key: 'documento_cliente',
            label: locale === 'es-PY' ? 'C.I. / RUC' : 'CPF / CNPJ',
            type: 'cpf_ci',
            party: 'contratante',
          },
          {
            key: 'valor_total',
            label: locale === 'es-PY' ? 'Monto total' : 'Valor total',
            type: 'moeda',
            party: 'contrato',
          },
        ],
        content:
          locale === 'es-PY'
            ? 'CONTRATO PRIVADO\n\nEMPRESA: {{empresa_nome}} (RUC {{empresa_documento}})\nCLIENTE: {{nome_cliente}} (C.I./RUC {{documento_cliente}})\n\nMonto acordado: {{valor_total}}.\n\nSuscripto el {{data_hoje}}.'
            : 'CONTRATO PARTICULAR\n\nCONTRATADA: {{empresa_nome}} (CNPJ {{empresa_documento}})\nCONTRATANTE: {{nome_cliente}} (CPF/CNPJ {{documento_cliente}})\n\nValor ajustado: {{valor_total}}.\n\nEmitido em {{data_hoje}}.',
        isSystemTemplate: false,
      },
    });
  };

  const openEdit = (tpl: ContractTemplate) => {
    setUploadError(null);
    setEditorState({
      isEditingExisting: true,
      data: {
        id: tpl.id,
        title: tpl.title,
        category: tpl.category,
        country: tpl.country,
        language: tpl.language,
        parties: tpl.parties,
        fields: tpl.fields,
        content: tpl.content,
        isSystemTemplate: tpl.isSystemTemplate,
        sharedToLibrary: tpl.sharedToLibrary,
      },
    });
  };

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clauseLibrary.filter((cl) => {
      if (categoryFilter !== 'all' && cl.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        cl.title.toLowerCase().includes(q) ||
        cl.clauseText.toLowerCase().includes(q) ||
        (cl.legalBasis || '').toLowerCase().includes(q)
      );
    });
  }, [clauseLibrary, search, categoryFilter]);

  if (editorState) {
    return (
      <TemplateReviewEditor
        t={t}
        locale={locale}
        defaultCountry={companyCountry}
        initialData={editorState.data}
        isEditingExisting={editorState.isEditingExisting}
        isSavingShare={isSavingShare}
        onSave={async (payload, shareToLibrary) => {
          const savedTpl = onSaveTemplate(payload);
          if (shareToLibrary && !savedTpl.sharedToLibrary) {
            setIsSavingShare(true);
            try {
              const bundle = await anonymizeTemplateForLibraryWithAI({
                templateText: payload.content,
                category: payload.category,
                country: payload.country,
                locale: payload.language,
              });
              const res = onShareToLibrary({
                templateId: savedTpl.id,
                clauses: bundle.clauses,
                category: payload.category,
                country: payload.country,
              });
              if (res.creditsAwarded > 0) {
                setShareToast(t.clauseLibrary.sharedSuccessToast);
                setTimeout(() => setShareToast(null), 5000);
              }
            } catch (err) {
              setUploadError(
                err instanceof Error
                  ? err.message
                  : 'Erro ao anonimizar cláusulas.'
              );
            } finally {
              setIsSavingShare(false);
            }
          }
          setEditorState(null);
        }}
        onCancel={() => setEditorState(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Upload CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.templates.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.templates.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openBlankEditor}
            disabled={isAnalyzing}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-navy-900 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{t.templates.newTemplateBtn}</span>
          </button>

          <label className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs">
            <FileUp className="h-4 w-4 shrink-0" />
            <span>{t.templates.uploadMyTemplateBtn}</span>
            <span className="text-xs font-normal text-emerald-100">
              (.docx / .pdf)
            </span>
            <input
              type="file"
              accept=".docx,.pdf,.txt"
              disabled={isAnalyzing}
              onChange={handleUploadTemplateFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Gemini Processing State */}
      {isAnalyzing && (
        <div className="bg-navy-900 text-white rounded-2xl p-6 flex items-center gap-4">
          <Loader2 className="h-6 w-6 text-emerald-400 animate-spin shrink-0" />
          <div>
            <p className="text-base font-semibold">{t.templates.analyzingTitle}</p>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              {t.templates.analyzingSubtitle}
            </p>
          </div>
        </div>
      )}

      {/* Upload / Gemini Error */}
      {uploadError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">{t.templates.uploadErrorTitle}</p>
            <p className="text-xs text-red-700 mt-0.5">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Templates vs Clause Library Tabs */}
      <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`min-h-[38px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-white text-navy-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>{t.clauseLibrary.tabTemplates}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`min-h-[38px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'library'
              ? 'bg-white text-navy-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="h-4 w-4 text-emerald-700" />
          <span>
            {t.clauseLibrary.tabLibrary} ({clauseLibrary.length})
          </span>
        </button>
      </div>

      {shareToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.templates.searchPlaceholder}
            className="w-full min-h-[42px] pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'all', label: t.templates.filterAll },
              { id: 'locacao', label: t.templates.catLocacao },
              { id: 'compra_venda', label: t.templates.catCompraVenda },
              { id: 'servicos', label: t.templates.catServicos },
              { id: 'recibo', label: t.templates.catRecibo },
              { id: 'outros', label: t.templates.catOutros },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white text-navy-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid OR Clause Library */}
      {activeTab === 'library' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-navy-900">
              {t.clauseLibrary.libraryTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {t.clauseLibrary.librarySubtitle}
            </p>
          </div>

          {filteredLibrary.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
              {t.clauseLibrary.libraryEmpty}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLibrary.map((clause) => (
                <div
                  key={clause.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {categoryLabel(clause.category)} · {clause.country}
                      </span>
                      {clause.legalBasis && (
                        <span className="font-medium text-emerald-700 truncate">
                          {clause.legalBasis}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-navy-900">
                      {clause.title}
                    </h3>
                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                      {clause.clauseText}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(clause.clauseText);
                        setCopiedClauseId(clause.id);
                        setTimeout(() => setCopiedClauseId(null), 2000);
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedClauseId === clause.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{t.common.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{t.common.copyLink.replace(' link', '').replace(' enlace', '')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <FileText className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-navy-900">
            {t.templates.emptyTitle}
          </p>
          <p className="text-sm text-slate-500">{t.templates.emptyDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => {
            const varsCount =
              tpl.fields?.length || extractTemplateVariables(tpl.content).length;
            return (
              <div
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {categoryLabel(tpl.category)} · {tpl.country} ·{' '}
                      <span className="tabular-nums">
                        {varsCount} {t.newContract.variablesDetected}
                      </span>
                    </span>

                    {tpl.isSystemTemplate && (
                      <span className="text-xs font-semibold text-emerald-700">
                        {t.templates.systemBadge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-navy-900">
                    {tpl.title}
                  </h3>

                  {tpl.parties && tpl.parties.length > 0 && (
                    <p className="text-xs text-slate-600">
                      {tpl.parties.join(' · ')}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-line">
                    {tpl.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(tpl)}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{t.common.edit}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSaveTemplate({
                          title: `${tpl.title} ${t.templates.copySuffix}`,
                          category: tpl.category,
                          country: tpl.country,
                          language: tpl.language,
                          parties: tpl.parties,
                          fields: tpl.fields,
                          content: tpl.content,
                          isSystemTemplate: false,
                        })
                      }
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {t.common.duplicate}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.templates.deleteConfirm)) {
                          onDeleteTemplate(tpl.id);
                        }
                      }}
                      aria-label={t.common.delete}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUseTemplate(tpl)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                    <span>{t.templates.useTemplateBtn}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

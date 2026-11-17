import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Edit3,
  Eye,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import { sanitizeFieldKey } from '../services/documentParser';
import { extractTemplateVariables } from '../services/storage';
import type {
  ContractTemplate,
  CountryCode,
  Locale,
  TemplateCategory,
  TemplateField,
  TemplateFieldType,
} from '../types';

interface TemplateReviewEditorProps {
  t: TranslationDictionary;
  locale: Locale;
  defaultCountry: CountryCode;
  initialData: {
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
  isEditingExisting: boolean;
  isSavingShare?: boolean;
  onSave: (
    tpl: Omit<ContractTemplate, 'id' | 'companyId' | 'updatedAt'> & {
      id?: string;
    },
    shareToLibrary: boolean
  ) => void;
  onCancel: () => void;
}

const PARTY_COLOR_STYLES = [
  'bg-blue-100 text-navy-900 border-blue-300',
  'bg-emerald-100 text-emerald-950 border-emerald-300',
  'bg-amber-100 text-amber-950 border-amber-300',
  'bg-indigo-100 text-indigo-950 border-indigo-300',
  'bg-rose-100 text-rose-950 border-rose-300',
  'bg-teal-100 text-teal-950 border-teal-300',
];

function getPartyColorClass(party: string, allParties: string[]): string {
  const norm = party.trim().toLowerCase();
  const idx = allParties.findIndex((p) => p.toLowerCase() === norm);
  const hash =
    idx >= 0
      ? idx
      : norm.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PARTY_COLOR_STYLES[Math.abs(hash) % PARTY_COLOR_STYLES.length];
}

export function TemplateReviewEditor({
  t,
  defaultCountry,
  initialData,
  isEditingExisting,
  isSavingShare = false,
  onSave,
  onCancel,
}: TemplateReviewEditorProps) {
  const [title, setTitle] = useState(initialData.title);
  const [category, setCategory] = useState<TemplateCategory>(
    initialData.category
  );
  const [country, setCountry] = useState<CountryCode>(
    initialData.country || defaultCountry
  );
  const [language, setLanguage] = useState<Locale>(initialData.language);
  const [partiesInput, setPartiesInput] = useState(
    initialData.parties.join(', ')
  );
  const [content, setContent] = useState(initialData.content);
  const [fields, setFields] = useState<TemplateField[]>(initialData.fields);
  const [shareToLibrary, setShareToLibrary] = useState(false);

  const [viewMode, setViewMode] = useState<'highlighted' | 'edit'>(
    'highlighted'
  );
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(
    initialData.fields[0]?.key || null
  );
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<{
    key: string;
    label: string;
    type: TemplateFieldType;
    party: string;
  } | null>(null);

  // Selection -> Turn into field
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [newFieldForm, setNewFieldForm] = useState<{
    open: boolean;
    label: string;
    key: string;
    type: TemplateFieldType;
    party: string;
  }>({
    open: false,
    label: '',
    key: '',
    type: 'texto',
    party: initialData.parties[0]?.toLowerCase() || 'contrato',
  });

  const parsedParties = useMemo(
    () =>
      partiesInput
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    [partiesInput]
  );

  // Sync any {{var}} typed directly in content so fields list never goes stale
  const syncedFields = useMemo(() => {
    const tokensInText = extractTemplateVariables(content);
    const map = new Map(fields.map((f) => [f.key, f]));
    const result: TemplateField[] = [];
    for (const f of fields) {
      if (tokensInText.includes(f.key)) {
        result.push(f);
      }
    }
    for (const tok of tokensInText) {
      if (!map.has(tok)) {
        result.push({
          key: tok,
          label: tok.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: 'texto',
          party: 'contrato',
        });
      }
    }
    return result;
  }, [content, fields]);

  const fieldLookup = useMemo(
    () => new Map(syncedFields.map((f) => [f.key, f])),
    [syncedFields]
  );

  const uniquePartiesForColors = useMemo(() => {
    const set = new Set<string>(parsedParties.map((p) => p.toLowerCase()));
    syncedFields.forEach((f) => set.add(f.party.toLowerCase()));
    return Array.from(set);
  }, [parsedParties, syncedFields]);

  // Split content into plain text and {{variable}} segments for highlighted preview
  const segments = useMemo(() => {
    const parts: Array<
      { kind: 'text'; value: string } | { kind: 'var'; key: string }
    > = [];
    const regex = /\{\{\s*([a-zA-Z0-9_À-ÿ]+)\s*\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          kind: 'text',
          value: content.slice(lastIndex, match.index),
        });
      }
      parts.push({ kind: 'var', key: match[1] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push({ kind: 'text', value: content.slice(lastIndex) });
    }
    return parts;
  }, [content]);

  const handleTextareaSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (end > start) {
      const selected = content.slice(start, end).trim();
      if (selected.length >= 2 && !selected.includes('{{')) {
        const autoKey = sanitizeFieldKey(selected) || 'novo_campo';
        setSelectionRange({ start, end, text: content.slice(start, end) });
        setNewFieldForm({
          open: true,
          label: selected.slice(0, 40),
          key: autoKey,
          type: 'texto',
          party: parsedParties[0]?.toLowerCase() || 'contrato',
        });
      }
    }
  };

  const handleHighlightedTextMouseUp = () => {
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() || '';
    if (selectedText.length >= 2 && !selectedText.includes('{{')) {
      const idx = content.indexOf(selectedText);
      if (idx !== -1) {
        const autoKey = sanitizeFieldKey(selectedText) || 'novo_campo';
        setSelectionRange({
          start: idx,
          end: idx + selectedText.length,
          text: selectedText,
        });
        setNewFieldForm({
          open: true,
          label: selectedText.slice(0, 40),
          key: autoKey,
          type: 'texto',
          party: parsedParties[0]?.toLowerCase() || 'contrato',
        });
      }
    }
  };

  const applyNewField = () => {
    const cleanKey = sanitizeFieldKey(
      newFieldForm.key || newFieldForm.label || 'novo_campo'
    );
    if (!cleanKey) return;

    const token = `{{${cleanKey}}}`;
    if (selectionRange) {
      const before = content.slice(0, selectionRange.start);
      const after = content.slice(selectionRange.end);
      setContent(`${before}${token}${after}`);
    } else {
      setContent((prev) => `${prev}${prev.endsWith('\n') ? '' : ' '}${token}`);
    }

    setFields((prev) => {
      const without = prev.filter((f) => f.key !== cleanKey);
      return [
        ...without,
        {
          key: cleanKey,
          label: newFieldForm.label.trim() || cleanKey,
          type: newFieldForm.type,
          party: newFieldForm.party.trim().toLowerCase() || 'contrato',
        },
      ];
    });

    setSelectedFieldKey(cleanKey);
    setSelectionRange(null);
    setNewFieldForm((prev) => ({ ...prev, open: false, label: '', key: '' }));
  };

  const startRenameField = (field: TemplateField) => {
    setEditingFieldKey(field.key);
    setRenameDraft({ ...field });
  };

  const commitRenameField = () => {
    if (!editingFieldKey || !renameDraft) return;
    const oldKey = editingFieldKey;
    const nextKey = sanitizeFieldKey(renameDraft.key) || oldKey;

    if (nextKey !== oldKey) {
      const escaped = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'g');
      setContent((prev) => prev.replace(regex, `{{${nextKey}}}`));
    }

    setFields((prev) => {
      const updated = prev.filter((f) => f.key !== oldKey && f.key !== nextKey);
      updated.push({
        key: nextKey,
        label: renameDraft.label.trim() || nextKey,
        type: renameDraft.type,
        party: renameDraft.party.trim().toLowerCase() || 'contrato',
      });
      return updated;
    });

    setSelectedFieldKey(nextKey);
    setEditingFieldKey(null);
    setRenameDraft(null);
  };

  const removeField = (field: TemplateField) => {
    const escaped = field.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'g');
    setContent((prev) => prev.replace(regex, field.label || field.key));
    setFields((prev) => prev.filter((f) => f.key !== field.key));
    if (selectedFieldKey === field.key) {
      setSelectedFieldKey(null);
    }
  };

  const typeLabel = (type: TemplateFieldType) => {
    switch (type) {
      case 'cpf_ci':
        return t.templates.typeCpfCi;
      case 'data':
        return t.templates.typeData;
      case 'moeda':
        return t.templates.typeMoeda;
      case 'numero':
        return t.templates.typeNumero;
      case 'endereco':
        return t.templates.typeEndereco;
      default:
        return t.templates.typeTexto;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(
      {
        id: initialData.id,
        title: title.trim(),
        category,
        country,
        language,
        parties:
          parsedParties.length > 0 ? parsedParties : ['Contratante', 'Contratado'],
        fields: syncedFields,
        content: content.trim(),
        isSystemTemplate: initialData.isSystemTemplate,
        sharedToLibrary: initialData.sharedToLibrary,
      },
      shareToLibrary
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.common.back}
            className="min-h-[42px] min-w-[42px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
              {isEditingExisting
                ? t.templates.reviewTitleEdit
                : t.templates.reviewTitleNew}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {t.templates.reviewSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSavingShare}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={isSavingShare}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
          >
            {isSavingShare
              ? t.clauseLibrary.anonymizingNotice
              : t.templates.saveTemplateBtn}
          </button>
        </div>
      </div>

      {/* Clause Library Anonymous Sharing Banner */}
      <section className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5">
        {initialData.sharedToLibrary ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-800">
            <Check className="h-4 w-4 shrink-0" />
            <span>{t.clauseLibrary.alreadySharedBadge}</span>
          </div>
        ) : (
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={shareToLibrary}
              onChange={(e) => setShareToLibrary(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-600 shrink-0 cursor-pointer"
            />
            <div>
              <p className="text-sm font-semibold text-navy-900">
                {t.clauseLibrary.shareCheckboxLabel}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {t.clauseLibrary.shareCheckboxDesc}
              </p>
            </div>
          </label>
        )}
      </section>

      {/* Metadata Form */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {t.templates.templateName}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[42px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {t.templates.category}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          >
            <option value="locacao">{t.templates.catLocacao}</option>
            <option value="compra_venda">{t.templates.catCompraVenda}</option>
            <option value="servicos">{t.templates.catServicos}</option>
            <option value="recibo">{t.templates.catRecibo}</option>
            <option value="outros">{t.templates.catOutros}</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {t.templates.country}
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          >
            <option value="BR">{t.common.brasil}</option>
            <option value="PY">{t.common.paraguay}</option>
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {t.templates.templateLanguage}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Locale)}
            className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="es-PY">Español (PY)</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-12">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {t.templates.partiesLabel}
          </label>
          <input
            type="text"
            value={partiesInput}
            onChange={(e) => setPartiesInput(e.target.value)}
            placeholder={t.templates.partiesPlaceholder}
            className="w-full min-h-[42px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>
      </section>

      {/* Selection -> Turn into field Modal/Bar */}
      {newFieldForm.open && (
        <div className="bg-navy-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold">
                {selectionRange
                  ? `${t.templates.selectionActionTitle}: "${selectionRange.text.slice(0, 45)}${selectionRange.text.length > 45 ? '...' : ''}"`
                  : t.templates.addManualField}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectionRange(null);
                setNewFieldForm((p) => ({ ...p, open: false }));
              }}
              className="text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              {t.common.cancel}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {t.templates.fieldLabelLabel}
              </label>
              <input
                type="text"
                value={newFieldForm.label}
                onChange={(e) =>
                  setNewFieldForm((p) => ({
                    ...p,
                    label: e.target.value,
                    key: sanitizeFieldKey(e.target.value) || p.key,
                  }))
                }
                className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-white text-slate-900 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {t.templates.fieldKeyLabel}
              </label>
              <input
                type="text"
                value={newFieldForm.key}
                onChange={(e) =>
                  setNewFieldForm((p) => ({ ...p, key: e.target.value }))
                }
                className="w-full min-h-[38px] px-3 py-1.5 text-xs font-mono bg-white text-slate-900 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {t.templates.fieldTypeLabel}
              </label>
              <select
                value={newFieldForm.type}
                onChange={(e) =>
                  setNewFieldForm((p) => ({
                    ...p,
                    type: e.target.value as TemplateFieldType,
                  }))
                }
                className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-white text-slate-900 rounded-lg"
              >
                <option value="texto">{t.templates.typeTexto}</option>
                <option value="cpf_ci">{t.templates.typeCpfCi}</option>
                <option value="data">{t.templates.typeData}</option>
                <option value="moeda">{t.templates.typeMoeda}</option>
                <option value="numero">{t.templates.typeNumero}</option>
                <option value="endereco">{t.templates.typeEndereco}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                {t.templates.fieldPartyLabel}
              </label>
              <input
                type="text"
                value={newFieldForm.party}
                onChange={(e) =>
                  setNewFieldForm((p) => ({ ...p, party: e.target.value }))
                }
                list="template-parties-list"
                className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-white text-slate-900 rounded-lg"
              />
              <datalist id="template-parties-list">
                {parsedParties.map((p) => (
                  <option key={p} value={p.toLowerCase()} />
                ))}
                <option value="contrato" />
              </datalist>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={applyNewField}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{t.templates.turnSelectionIntoField}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Split: Document Review & Fields Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Document Preview / Editor */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('highlighted')}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'highlighted'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{t.templates.highlightedViewTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{t.templates.rawEditTab}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectionRange(null);
                setNewFieldForm({
                  open: true,
                  label: '',
                  key: '',
                  type: 'texto',
                  party: parsedParties[0]?.toLowerCase() || 'contrato',
                });
              }}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t.templates.addManualField}</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            <p className="text-xs text-slate-500">{t.templates.selectionHint}</p>

            {viewMode === 'highlighted' ? (
              <div
                onMouseUp={handleHighlightedTextMouseUp}
                onTouchEnd={handleHighlightedTextMouseUp}
                className="min-h-[380px] p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/40 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap select-text"
              >
                {segments.map((seg, idx) => {
                  if (seg.kind === 'text') {
                    return <span key={idx}>{seg.value}</span>;
                  }
                  const meta = fieldLookup.get(seg.key);
                  const party = meta?.party || 'contrato';
                  const colorCls = getPartyColorClass(
                    party,
                    uniquePartiesForColors
                  );
                  const isFocused = selectedFieldKey === seg.key;

                  return (
                    <button
                      key={`${seg.key}_${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedFieldKey(seg.key);
                        if (meta) startRenameField(meta);
                      }}
                      title={`${meta?.label || seg.key} · ${party}`}
                      className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md border text-xs font-mono font-medium transition-transform cursor-pointer ${colorCls} ${
                        isFocused ? 'ring-2 ring-navy-900' : ''
                      }`}
                    >
                      {`{{${seg.key}}}`}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={handleTextareaSelection}
                onMouseUp={handleTextareaSelection}
                onKeyUp={handleTextareaSelection}
                className="w-full p-4 text-sm leading-relaxed border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-sans"
              />
            )}

            <p className="text-xs text-slate-500">{t.templates.contentHelp}</p>
          </div>
        </section>

        {/* Right: Fields Panel */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-navy-900">
              {t.templates.fieldsPanelTitle}
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {syncedFields.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {syncedFields.map((field) => {
              const colorCls = getPartyColorClass(
                field.party,
                uniquePartiesForColors
              );
              const isEditingThis = editingFieldKey === field.key;
              const isSelected = selectedFieldKey === field.key;

              return (
                <div
                  key={field.key}
                  className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                    isSelected
                      ? 'border-navy-900 bg-slate-50/70'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {isEditingThis && renameDraft ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            {t.templates.fieldLabelLabel}
                          </label>
                          <input
                            type="text"
                            value={renameDraft.label}
                            onChange={(e) =>
                              setRenameDraft({
                                ...renameDraft,
                                label: e.target.value,
                              })
                            }
                            className="w-full min-h-[36px] px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            {t.templates.fieldKeyLabel}
                          </label>
                          <input
                            type="text"
                            value={renameDraft.key}
                            onChange={(e) =>
                              setRenameDraft({
                                ...renameDraft,
                                key: e.target.value,
                              })
                            }
                            className="w-full min-h-[36px] px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            {t.templates.fieldTypeLabel}
                          </label>
                          <select
                            value={renameDraft.type}
                            onChange={(e) =>
                              setRenameDraft({
                                ...renameDraft,
                                type: e.target.value as TemplateFieldType,
                              })
                            }
                            className="w-full min-h-[36px] px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="texto">{t.templates.typeTexto}</option>
                            <option value="cpf_ci">{t.templates.typeCpfCi}</option>
                            <option value="data">{t.templates.typeData}</option>
                            <option value="moeda">{t.templates.typeMoeda}</option>
                            <option value="numero">{t.templates.typeNumero}</option>
                            <option value="endereco">
                              {t.templates.typeEndereco}
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            {t.templates.fieldPartyLabel}
                          </label>
                          <input
                            type="text"
                            value={renameDraft.party}
                            onChange={(e) =>
                              setRenameDraft({
                                ...renameDraft,
                                party: e.target.value,
                              })
                            }
                            className="w-full min-h-[36px] px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFieldKey(null);
                            setRenameDraft(null);
                          }}
                          className="min-h-[32px] px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {t.common.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={commitRenameField}
                          className="min-h-[32px] px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          {t.common.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedFieldKey(field.key)}
                            className="text-sm font-semibold text-navy-900 text-left truncate block cursor-pointer"
                          >
                            {field.label}
                          </button>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded border text-[11px] font-mono ${colorCls}`}
                            >
                              {`{{${field.key}}}`}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {typeLabel(field.type)} · {field.party}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startRenameField(field)}
                            title={t.templates.renameFieldBtn}
                            className="min-h-[32px] px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 cursor-pointer"
                          >
                            {t.templates.renameFieldBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeField(field)}
                            aria-label={t.templates.removeFieldBtn}
                            className="min-h-[32px] min-w-[32px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </form>
  );
}

import { useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Paperclip,
  Printer,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import {
  extractContractTermsWithAI,
  extractFieldsFromDocuments,
  prepareFileForMultimodal,
  type ExtractionConfidence,
} from '../services/documentParser';
import {
  extractTemplateVariables,
  renderContractTemplate,
} from '../services/storage';
import type {
  ClientDocumentAttachment,
  CompanyProfile,
  ContractExpirationInfo,
  ContractRecord,
  ContractTemplate,
  CountryCode,
  Locale,
  SharedClauseItem,
  TemplateCategory,
  TemplateField,
} from '../types';
import {
  formatCurrencyInputValue,
  formatDateInputValue,
  validateFieldValue,
} from '../utils/validators';
import { ContractDocumentPreview } from './ContractDocumentPreview';
import { ContractReviewStep } from './ContractReviewStep';

interface NewContractScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  company: CompanyProfile | null;
  templates: ContractTemplate[];
  clauseLibrary?: SharedClauseItem[];
  credits: number;
  initialTemplate?: ContractTemplate | null;
  editingDraft?: ContractRecord | null;
  renewingFromContract?: ContractRecord | null;
  onSaveQuickTemplate: (tpl: {
    title: string;
    category: ContractTemplate['category'];
    country: CountryCode;
    language: Locale;
    parties: string[];
    fields: TemplateField[];
    content: string;
  }) => ContractTemplate;
  onSaveContract: (payload: {
    id?: string;
    templateId: string;
    templateTitle: string;
    category?: TemplateCategory;
    clientName: string;
    clientDocument: string;
    clientEmail: string;
    clientPhone: string;
    propertyAddress?: string;
    variables: Record<string, string>;
    renderedContent: string;
    attachments: ClientDocumentAttachment[];
    finalize: boolean;
    consumeCreditOnDraft?: boolean;
    renewedFromContractId?: string;
  }) => { contract: ContractRecord; insufficientCredits?: boolean };
  onSaveExpirationInfo?: (
    contractId: string,
    info: ContractExpirationInfo
  ) => void;
  onOpenSendForSignatureModal: (contract: ContractRecord) => void;
  onGoToCredits: () => void;
  onCancel: () => void;
}

type DocTypeKey =
  | 'identity'
  | 'cpf'
  | 'address'
  | 'marriage'
  | 'deed'
  | 'other';

interface PartyUploadedDoc {
  id: string;
  party: string;
  docType: DocTypeKey;
  docTypeLabel: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  base64Data: string;
  previewUrl?: string;
}

interface FieldState {
  value: string;
  source: string;
  confidence: ExtractionConfidence;
  isDocumentField: boolean;
}

const SYSTEM_VARS = new Set([
  'empresa_nome',
  'empresa_documento',
  'empresa_endereco',
  'empresa_telefone',
  'data_hoje',
]);

function humanizeVariable(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizePartyName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isLikelyDealTerm(field: TemplateField): boolean {
  const p = normalizePartyName(field.party);
  if (p === 'contrato' || p === 'acordo' || p === 'geral') return true;
  if (field.type === 'moeda') return true;
  const k = field.key.toLowerCase();
  return (
    k.includes('valor') ||
    k.includes('monto') ||
    k.includes('aluguel') ||
    k.includes('canon') ||
    k.includes('prazo') ||
    k.includes('plazo') ||
    k.includes('vencimento') ||
    k.includes('dia_pago') ||
    k.includes('forma_pagamento') ||
    k.includes('descricao_servico') ||
    k.includes('descripcion_servicio') ||
    k.includes('referente')
  );
}

export function NewContractScreen({
  t,
  locale,
  company,
  templates,
  clauseLibrary = [],
  credits,
  initialTemplate,
  editingDraft,
  renewingFromContract,
  onSaveQuickTemplate,
  onSaveContract,
  onSaveExpirationInfo,
  onOpenSendForSignatureModal,
  onGoToCredits,
  onCancel,
}: NewContractScreenProps) {
  const companyCountry: CountryCode =
    company?.country || (locale === 'es-PY' ? 'PY' : 'BR');

  const sourceRecord = editingDraft || renewingFromContract || null;

  const defaultTemplate = sourceRecord
    ? templates.find((tpl) => tpl.id === sourceRecord.templateId) ||
      templates[0] ||
      null
    : initialTemplate || templates[0] || null;

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(
    sourceRecord ? 3 : initialTemplate ? 2 : 1
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    defaultTemplate?.id || ''
  );

  // Quick inline template creation
  const [showQuickForm, setShowQuickForm] = useState(templates.length === 0);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState(
    locale === 'es-PY'
      ? 'CONTRATO DE PRESTACIÓN DE SERVICIOS\n\nEntre {{empresa_nome}} (RUC {{empresa_documento}}) y {{nome_cliente}} (C.I./RUC {{documento_cliente}}), se acuerda el servicio de {{descripcion_servicio}} por el monto de {{monto_total}}, a iniciarse el {{fecha_inicio}}.\n\nFecha: {{data_hoje}}.'
      : 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nEntre {{empresa_nome}} (CNPJ {{empresa_documento}}) e {{nome_cliente}} (CPF/CNPJ {{documento_cliente}}), fica ajustado o serviço de {{descricao_servico}} no valor de {{valor_total}}, com início em {{data_inicio}}.\n\nData: {{data_hoje}}.'
  );

  // Step 2: LGPD consent + per-party uploads
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [lgpdAlert, setLgpdAlert] = useState(false);
  const [partyDocType, setPartyDocType] = useState<Record<string, DocTypeKey>>(
    {}
  );
  const [uploadedDocs, setUploadedDocs] = useState<PartyUploadedDoc[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Step 3 & 4: Field values, confidence & source
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(
    () => {
      if (!sourceRecord) return {};
      const init: Record<string, FieldState> = {};
      Object.entries(sourceRecord.variables || {}).forEach(([k, v]) => {
        init[k] = {
          value: v,
          source: t.newContract.sourceManual,
          confidence: v ? 'alto' : 'nao_encontrado',
          isDocumentField: true,
        };
      });
      return init;
    }
  );
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [focusedVerificationKey, setFocusedVerificationKey] = useState<
    string | null
  >(null);

  // Step 4: One-question-per-screen index
  const [questionIdx, setQuestionIdx] = useState(0);

  // Step 5: Draft/Finalization & Credit Tracking
  const [activeDraftMeta, setActiveDraftMeta] = useState<{
    id?: string;
    code?: string;
    creditConsumed: boolean;
  }>(() => ({
    id: editingDraft?.id,
    code: editingDraft?.code,
    creditConsumed: Boolean(editingDraft?.creditConsumed),
  }));
  const [finalizedContract, setFinalizedContract] =
    useState<ContractRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // All editable fields derived from selected template
  const templateFields = useMemo<TemplateField[]>(() => {
    if (!selectedTemplate) return [];
    const tokens = extractTemplateVariables(selectedTemplate.content).filter(
      (k) => !SYSTEM_VARS.has(k)
    );
    const metaMap = new Map(
      (selectedTemplate.fields || []).map((f) => [f.key, f])
    );

    return tokens.map((key) => {
      const existing = metaMap.get(key);
      if (existing) return existing;
      return {
        key,
        label: humanizeVariable(key),
        type: 'texto',
        party: 'contrato',
      };
    });
  }, [selectedTemplate]);

  // Parties for upload areas (exclude generic 'contrato')
  const uploadParties = useMemo(() => {
    if (!selectedTemplate) return [];
    const list: string[] = [];
    const seen = new Set<string>();

    (selectedTemplate.parties || []).forEach((p) => {
      const norm = normalizePartyName(p);
      if (norm && norm !== 'contrato' && !seen.has(norm)) {
        seen.add(norm);
        list.push(p);
      }
    });

    templateFields.forEach((f) => {
      const norm = normalizePartyName(f.party);
      if (norm && norm !== 'contrato' && !seen.has(norm)) {
        seen.add(norm);
        list.push(
          f.party.charAt(0).toUpperCase() + f.party.slice(1)
        );
      }
    });

    if (list.length === 0) {
      list.push(locale === 'es-PY' ? 'Cliente' : 'Cliente');
    }
    return list;
  }, [selectedTemplate, templateFields, locale]);

  // Document fields vs Deal questions
  const documentFields = useMemo(
    () =>
      templateFields.filter((f) => {
        const st = fieldStates[f.key];
        if (st && st.isDocumentField === false) return false;
        if (!st && isLikelyDealTerm(f)) return false;
        return !isLikelyDealTerm(f);
      }),
    [templateFields, fieldStates]
  );

  const dealQuestionFields = useMemo(
    () =>
      templateFields.filter((f) => {
        const st = fieldStates[f.key];
        if (st && st.isDocumentField === false) return true;
        return isLikelyDealTerm(f);
      }),
    [templateFields, fieldStates]
  );

  // Group document fields by party for Step 3 verification table
  const groupedDocFields = useMemo(() => {
    const groups = new Map<string, { label: string; fields: TemplateField[] }>();

    const findPartyDisplay = (rawParty: string) => {
      const norm = normalizePartyName(rawParty);
      const match = uploadParties.find((p) => normalizePartyName(p) === norm);
      return match || rawParty.charAt(0).toUpperCase() + rawParty.slice(1);
    };

    const listToGroup =
      documentFields.length > 0 ? documentFields : templateFields;

    listToGroup.forEach((field) => {
      const norm = normalizePartyName(field.party || 'cliente');
      const display = findPartyDisplay(field.party || 'cliente');
      const existing = groups.get(norm);
      if (existing) {
        existing.fields.push(field);
      } else {
        groups.set(norm, { label: display, fields: [field] });
      }
    });

    return Array.from(groups.values());
  }, [documentFields, templateFields, uploadParties]);

  const variablesMap = useMemo(() => {
    const map: Record<string, string> = {};
    templateFields.forEach((f) => {
      map[f.key] = fieldStates[f.key]?.value || '';
    });
    return map;
  }, [templateFields, fieldStates]);

  const initialCustomBody = useMemo(() => {
    if (!editingDraft || !selectedTemplate) return null;
    const standardRendered = renderContractTemplate(
      selectedTemplate.content,
      editingDraft.variables || {},
      company
    );
    return editingDraft.renderedContent &&
      editingDraft.renderedContent.trim() !== standardRendered.trim()
      ? editingDraft.renderedContent
      : null;
  }, [editingDraft, selectedTemplate, company]);

  const docTypeOptions: Array<{ key: DocTypeKey; label: string }> = [
    { key: 'identity', label: t.newContract.docTypeIdentity },
    { key: 'cpf', label: t.newContract.docTypeCpf },
    { key: 'address', label: t.newContract.docTypeAddress },
    { key: 'marriage', label: t.newContract.docTypeMarriage },
    { key: 'deed', label: t.newContract.docTypeDeed },
    { key: 'other', label: t.newContract.docTypeOther },
  ];

  const getDocTypeLabel = (k: DocTypeKey) =>
    docTypeOptions.find((o) => o.key === k)?.label || t.newContract.docTypeOther;

  const handleUseQuickTemplate = () => {
    if (!quickTitle.trim() || !quickContent.trim()) return;
    const detected = extractTemplateVariables(quickContent).filter(
      (k) => !SYSTEM_VARS.has(k)
    );
    const created = onSaveQuickTemplate({
      title: quickTitle.trim(),
      category: 'outros',
      country: companyCountry,
      language: locale,
      parties: ['Contratante', 'Contratado'],
      fields: detected.map((key) => ({
        key,
        label: humanizeVariable(key),
        type: 'texto',
        party: key.includes('cliente') ? 'contratante' : 'contrato',
      })),
      content: quickContent.trim(),
    });
    setSelectedTemplateId(created.id);
    setShowQuickForm(false);
    setStep(2);
  };

  const handlePartyFileUpload = async (
    party: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;

    if (!lgpdAccepted) {
      setLgpdAlert(true);
      return;
    }

    const docType = partyDocType[party] || 'identity';
    const docTypeLabel = getDocTypeLabel(docType);

    for (const file of Array.from(files)) {
      try {
        const prepared = await prepareFileForMultimodal(file);
        const docItem: PartyUploadedDoc = {
          id: `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          party,
          docType,
          docTypeLabel,
          fileName: file.name,
          fileType: file.type || prepared.mimeType,
          fileSize: file.size,
          mimeType: prepared.mimeType,
          base64Data: prepared.base64Data,
          previewUrl: prepared.previewUrl,
        };
        setUploadedDocs((prev) => [...prev, docItem]);
      } catch (err) {
        setExtractError(
          err instanceof Error ? err.message : t.newContract.extractErrorTitle
        );
      }
    }
  };

  const handleAnalyzeDocuments = async () => {
    if (!lgpdAccepted) {
      setLgpdAlert(true);
      return;
    }
    if (uploadedDocs.length === 0) {
      handleSkipDocuments();
      return;
    }

    setExtractError(null);
    setIsExtracting(true);

    try {
      const extractions = await extractFieldsFromDocuments({
        documents: uploadedDocs.map((d) => ({
          party: d.party,
          docType: d.docTypeLabel,
          fileName: d.fileName,
          mimeType: d.mimeType,
          base64Data: d.base64Data,
        })),
        fields: templateFields,
        country: companyCountry,
        locale,
      });

      const nextStates: Record<string, FieldState> = {};
      const byKey = new Map(extractions.map((item) => [item.key, item]));

      templateFields.forEach((f) => {
        const ex = byKey.get(f.key);
        if (ex) {
          const val = (ex.value || '').trim();
          nextStates[f.key] = {
            value: val,
            source: ex.source || '',
            confidence: val ? ex.confidence : 'nao_encontrado',
            isDocumentField: ex.isDocumentField && !isLikelyDealTerm(f),
          };
        } else {
          nextStates[f.key] = {
            value: '',
            source: '',
            confidence: 'nao_encontrado',
            isDocumentField: !isLikelyDealTerm(f),
          };
        }
      });

      setFieldStates(nextStates);
      setStep(3);
    } catch (err: unknown) {
      setExtractError(
        err instanceof Error ? err.message : t.newContract.extractErrorTitle
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSkipDocuments = () => {
    const nextStates: Record<string, FieldState> = {};
    templateFields.forEach((f) => {
      const prev = fieldStates[f.key];
      nextStates[f.key] = prev || {
        value: '',
        source: t.newContract.sourceManual,
        confidence: 'nao_encontrado',
        isDocumentField: !isLikelyDealTerm(f),
      };
    });
    setFieldStates(nextStates);
    setStep(3);
  };

  const updateFieldValue = (field: TemplateField, rawValue: string) => {
    let nextVal = rawValue;
    if (field.type === 'data') {
      // Allow smooth typing of DD/MM/AAAA
      const prevVal = fieldStates[field.key]?.value || '';
      if (rawValue.length >= prevVal.length && /^\d+$/.test(rawValue.replace(/\//g, ''))) {
        nextVal = formatDateInputValue(rawValue);
      }
    }

    setFieldStates((prev) => ({
      ...prev,
      [field.key]: {
        value: nextVal,
        source: prev[field.key]?.source || t.newContract.sourceManual,
        confidence: nextVal.trim() ? 'alto' : 'nao_encontrado',
        isDocumentField:
          prev[field.key]?.isDocumentField ?? !isLikelyDealTerm(field),
      },
    }));
    setValidationAlert(null);
  };

  const getFieldValidation = (field: TemplateField) => {
    const val = fieldStates[field.key]?.value || '';
    return validateFieldValue(val, field.type, companyCountry, locale);
  };

  const verificationStats = useMemo(() => {
    const list = documentFields.length > 0 ? documentFields : templateFields;
    let low = 0;
    let missing = 0;
    list.forEach((f) => {
      const st = fieldStates[f.key];
      if (!st || st.confidence === 'nao_encontrado' || !st.value.trim()) {
        missing++;
      } else if (st.confidence === 'baixo') {
        low++;
      }
    });
    return { low, missing };
  }, [documentFields, templateFields, fieldStates]);

  const handleProceedFromVerification = () => {
    const list = documentFields.length > 0 ? documentFields : templateFields;
    const hasInvalid = list.some((f) => !getFieldValidation(f).valid);
    if (hasInvalid) {
      setValidationAlert(t.newContract.fixValidationBeforeNext);
      return;
    }
    setValidationAlert(null);
    setQuestionIdx(0);
    setStep(4);
  };

  const currentQuestionField = dealQuestionFields[questionIdx] || null;

  const handleNextQuestion = () => {
    if (currentQuestionField && !getFieldValidation(currentQuestionField).valid) {
      setValidationAlert(t.newContract.fixValidationBeforeNext);
      return;
    }
    setValidationAlert(null);
    if (questionIdx < dealQuestionFields.length - 1) {
      setQuestionIdx((i) => i + 1);
    } else {
      setStep(5);
    }
  };

  const inferPrimaryClientMeta = () => {
    const nameField =
      templateFields.find((f) => {
        const k = f.key.toLowerCase();
        const p = normalizePartyName(f.party);
        return (
          (k.includes('nome') || k.includes('nombre')) &&
          p !== 'locador' &&
          p !== 'vendedor' &&
          p !== 'contratado'
        );
      }) ||
      templateFields.find(
        (f) =>
          f.key.toLowerCase().includes('nome') ||
          f.key.toLowerCase().includes('nombre')
      );

    const docField =
      templateFields.find(
        (f) =>
          f.type === 'cpf_ci' &&
          normalizePartyName(f.party) !== 'locador' &&
          normalizePartyName(f.party) !== 'vendedor'
      ) || templateFields.find((f) => f.type === 'cpf_ci');

    const emailField = templateFields.find((f) =>
      f.key.toLowerCase().includes('email') ||
      f.key.toLowerCase().includes('correo')
    );
    const phoneField = templateFields.find((f) =>
      f.key.toLowerCase().includes('telefone') ||
      f.key.toLowerCase().includes('telefono')
    );

    return {
      clientName:
        (nameField ? variablesMap[nameField.key] : '') ||
        uploadParties[0] ||
        'Cliente',
      clientDocument: (docField ? variablesMap[docField.key] : '') || '',
      clientEmail: (emailField ? variablesMap[emailField.key] : '') || '',
      clientPhone: (phoneField ? variablesMap[phoneField.key] : '') || '',
    };
  };

  const handleSaveDraftOrFinalize = (params: {
    renderedContent: string;
    consumeCredit: boolean;
    finalize: boolean;
  }): {
    ok: boolean;
    insufficientCredits?: boolean;
    code: string;
    contract?: ContractRecord;
  } => {
    if (!selectedTemplate) {
      return { ok: false, code: '' };
    }
    const meta = inferPrimaryClientMeta();
    const attachments: ClientDocumentAttachment[] = uploadedDocs.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
      docCategory:
        d.docType === 'address'
          ? 'address_proof'
          : d.docType === 'cpf'
            ? 'tax_id'
            : d.docType === 'identity'
              ? 'identity'
              : 'other',
      previewUrl: d.previewUrl,
      uploadedAt: new Date().toISOString(),
    }));

    const propAddr =
      variablesMap.endereco_imovel ||
      variablesMap.direccion_inmueble ||
      variablesMap.endereco_comprador ||
      sourceRecord?.propertyAddress;

    const res = onSaveContract({
      id: activeDraftMeta.id,
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.title,
      category: selectedTemplate.category,
      clientName: meta.clientName,
      clientDocument: meta.clientDocument,
      clientEmail: meta.clientEmail,
      clientPhone: meta.clientPhone,
      propertyAddress: propAddr,
      variables: variablesMap,
      renderedContent: params.renderedContent,
      attachments:
        attachments.length > 0 ? attachments : editingDraft?.attachments || [],
      finalize: params.finalize,
      consumeCreditOnDraft: params.consumeCredit,
      renewedFromContractId: renewingFromContract?.id,
    });

    if (res.insufficientCredits) {
      return {
        ok: false,
        insufficientCredits: true,
        code: activeDraftMeta.code || '',
      };
    }

    setActiveDraftMeta({
      id: res.contract.id,
      code: res.contract.code,
      creditConsumed: res.contract.creditConsumed,
    });

    if (params.consumeCredit || params.finalize) {
      // Background extraction of expiration date, adjustment index (IGP-M/IPCA/IPC), and adjustment date
      if (!res.contract.expirationInfo && onSaveExpirationInfo) {
        extractContractTermsWithAI({
          contractText: params.renderedContent,
          variables: variablesMap,
          country: companyCountry,
          locale,
        })
          .then((info) => {
            if (info.endDate || info.adjustmentDate || info.adjustmentIndex) {
              onSaveExpirationInfo(res.contract.id, info);
            }
          })
          .catch(() => {
            // Non-blocking background enrichment
          });
      }
    }

    if (params.finalize) {
      setFinalizedContract(res.contract);
    }

    return {
      ok: true,
      code: res.contract.code,
      contract: res.contract,
    };
  };

  // Finalized Confirmation View
  if (finalizedContract) {
    return (
      <div className="space-y-6">
        <div className="no-print bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy-900">
                {t.newContract.finalizedTitle}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {t.newContract.finalizedDesc}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                {t.newContract.signatureLinkLabel}
              </p>
              <p className="text-sm font-mono text-navy-900 truncate mt-0.5">
                {finalizedContract.signatureLink}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(finalizedContract.signatureLink);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-navy-900 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{t.common.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{t.common.copyLink}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{t.common.printPdf}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
            >
              {t.newContract.backToDashboard}
            </button>
          </div>
        </div>

        <ContractDocumentPreview
          company={company}
          renderedContent={finalizedContract.renderedContent}
          clientName={finalizedContract.clientName}
          clientDocument={finalizedContract.clientDocument}
          contractCode={finalizedContract.code}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + 5-step Stepper */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.common.back}
            className="min-h-[42px] min-w-[42px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
              {t.newContract.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {t.newContract.subtitle}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
          {(
            [
              { num: 1, label: t.newContract.step1 },
              { num: 2, label: t.newContract.step2 },
              { num: 3, label: t.newContract.step3 },
              { num: 4, label: t.newContract.step4 },
              { num: 5, label: t.newContract.step5 },
            ] as const
          ).map((s) => (
            <button
              key={s.num}
              type="button"
              disabled={s.num > 1 && !selectedTemplate}
              onClick={() => setStep(s.num)}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                step === s.num
                  ? 'bg-white text-navy-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Choose Template */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-navy-900">
              {t.newContract.chooseTemplate}
            </h2>
            <button
              type="button"
              onClick={() => setShowQuickForm((v) => !v)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy-900 cursor-pointer"
            >
              {showQuickForm ? t.common.cancel : t.newContract.createQuickTemplate}
            </button>
          </div>

          {showQuickForm && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.newContract.quickTemplateTitle}
                </label>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.newContract.quickTemplateBody}
                </label>
                <textarea
                  rows={5}
                  value={quickContent}
                  onChange={(e) => setQuickContent(e.target.value)}
                  className="w-full p-3.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={handleUseQuickTemplate}
                className="min-h-[44px] px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-xl cursor-pointer"
              >
                {t.newContract.useQuickTemplate}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              const varsCount = extractTemplateVariables(tpl.content).filter(
                (k) => !SYSTEM_VARS.has(k)
              ).length;

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setStep(2);
                  }}
                  className={`text-left bg-white rounded-2xl p-5 border transition-colors flex flex-col justify-between gap-4 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-600/15'
                      : 'border-slate-200 hover:border-navy-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 text-navy-900 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {tpl.country} · {varsCount} {t.newContract.variablesDetected}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-navy-900">
                      {tpl.title}
                    </h3>
                    {tpl.parties && tpl.parties.length > 0 && (
                      <p className="text-xs text-slate-600">
                        {tpl.parties.join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {tpl.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <span>{t.common.continue}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: LGPD / Ley 6534 Consent + Per-Party Document Upload & Camera */}
      {step === 2 && selectedTemplate && (
        <div className="space-y-6">
          {/* Mandatory LGPD / Ley 6534 Authorization Checkbox */}
          <section
            className={`rounded-2xl p-5 border transition-colors ${
              lgpdAccepted
                ? 'bg-emerald-50/70 border-emerald-200'
                : lgpdAlert
                  ? 'bg-red-50 border-red-300'
                  : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  lgpdAccepted ? 'text-emerald-700' : 'text-navy-900'
                }`}
              />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-semibold text-navy-900">
                  {t.newContract.lgpdTitle}
                </p>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lgpdAccepted}
                    onChange={(e) => {
                      setLgpdAccepted(e.target.checked);
                      if (e.target.checked) setLgpdAlert(false);
                    }}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {t.newContract.lgpdCheckbox}
                  </span>
                </label>
                <p className="text-xs text-slate-500">{t.newContract.lgpdHint}</p>
                {lgpdAlert && !lgpdAccepted && (
                  <p role="alert" className="text-xs font-semibold text-red-700">
                    {t.newContract.lgpdRequiredAlert}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Per-Party Upload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {uploadParties.map((party) => {
              const docsForParty = uploadedDocs.filter((d) => d.party === party);
              const selectedDocType = partyDocType[party] || 'identity';

              return (
                <section
                  key={party}
                  className={`bg-white border border-slate-200 rounded-2xl p-5 space-y-4 ${
                    !lgpdAccepted ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-navy-900">{party}</h2>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {docsForParty.length} arq.
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {t.newContract.partyUploadDesc}
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {t.newContract.docTypeLabel}
                    </label>
                    <select
                      value={selectedDocType}
                      disabled={!lgpdAccepted}
                      onChange={(e) =>
                        setPartyDocType((prev) => ({
                          ...prev,
                          [party]: e.target.value as DocTypeKey,
                        }))
                      }
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl disabled:bg-slate-100"
                    >
                      {docTypeOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Standard Photo / PDF Picker */}
                    <label
                      onClick={() => {
                        if (!lgpdAccepted) setLgpdAlert(true);
                      }}
                      className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        lgpdAccepted
                          ? 'border-navy-900 bg-navy-900 hover:bg-navy-800 text-white cursor-pointer'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Upload className="h-4 w-4 shrink-0" />
                      <span>{t.newContract.uploadFileBtn}</span>
                      <input
                        type="file"
                        multiple
                        disabled={!lgpdAccepted || isExtracting}
                        accept="image/*,.pdf"
                        onChange={(e) => handlePartyFileUpload(party, e)}
                        className="hidden"
                      />
                    </label>

                    {/* Mobile Camera Capture */}
                    <label
                      onClick={() => {
                        if (!lgpdAccepted) setLgpdAlert(true);
                      }}
                      className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        lgpdAccepted
                          ? 'border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 cursor-pointer'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Camera className="h-4 w-4 shrink-0" />
                      <span>{t.newContract.useCameraBtn}</span>
                      <input
                        type="file"
                        disabled={!lgpdAccepted || isExtracting}
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePartyFileUpload(party, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {docsForParty.length > 0 && (
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {docsForParty.map((doc) => (
                        <li
                          key={doc.id}
                          className="p-2.5 bg-slate-50/50 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {doc.previewUrl ? (
                              <img
                                src={doc.previewUrl}
                                alt={doc.fileName}
                                referrerPolicy="no-referrer"
                                className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <Paperclip className="h-4 w-4 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {doc.fileName}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {doc.docTypeLabel}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setUploadedDocs((prev) =>
                                prev.filter((item) => item.id !== doc.id)
                              )
                            }
                            aria-label={t.common.delete}
                            className="min-h-[34px] min-w-[34px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          {isExtracting && (
            <div className="bg-navy-900 text-white rounded-2xl p-6 flex items-center gap-4">
              <Loader2 className="h-6 w-6 text-emerald-400 animate-spin shrink-0" />
              <div>
                <p className="text-base font-semibold">
                  {t.newContract.analyzingDocsTitle}
                </p>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  {t.newContract.analyzingDocsDesc}
                </p>
              </div>
            </div>
          )}

          {extractError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800"
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">{t.newContract.extractErrorTitle}</p>
                <p className="text-xs text-red-700 mt-0.5">{extractError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
            >
              {t.common.back}
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isExtracting}
                onClick={handleSkipDocuments}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-navy-900 cursor-pointer disabled:opacity-50"
              >
                {t.newContract.skipDocsBtn}
              </button>

              <button
                type="button"
                disabled={isExtracting || uploadedDocs.length === 0}
                onClick={handleAnalyzeDocuments}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{t.newContract.analyzeDocsBtn}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Verification Table per Party (Yellow = Low Confidence, Red = Missing) */}
      {step === 3 && selectedTemplate && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">
                {t.newContract.verifyTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {t.newContract.verifySubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-medium tabular-nums">
              {verificationStats.low > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>
                    {verificationStats.low} {t.newContract.summaryLowWarning}
                  </span>
                </span>
              )}
              {verificationStats.missing > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span>
                    {verificationStats.missing}{' '}
                    {t.newContract.summaryMissingWarning}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {groupedDocFields.map((group) => (
              <section
                key={group.label}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-navy-900">
                    {group.label}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {group.fields.length}
                  </span>
                </div>

                {/* Desktop Table / Mobile Stacked Rows */}
                <div className="divide-y divide-slate-100">
                  {group.fields.map((field) => {
                    const st = fieldStates[field.key] || {
                      value: '',
                      source: t.newContract.sourceManual,
                      confidence: 'nao_encontrado' as ExtractionConfidence,
                      isDocumentField: true,
                    };
                    const isMissing =
                      st.confidence === 'nao_encontrado' || !st.value.trim();
                    const isLow = !isMissing && st.confidence === 'baixo';
                    const validation = getFieldValidation(field);

                    const rowHighlight = isMissing
                      ? 'bg-red-50/80'
                      : isLow
                        ? 'bg-amber-50/80'
                        : 'bg-white';

                    const isFieldFocused = focusedVerificationKey === field.key;

                    return (
                      <div
                        key={field.key}
                        data-field-key={field.key}
                        className={`p-4 sm:px-5 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:items-center ${rowHighlight} ${
                          isFieldFocused ? 'ring-2 ring-inset ring-navy-900' : ''
                        }`}
                      >
                        <div className="lg:col-span-3">
                          <p className="text-xs font-semibold text-navy-900">
                            {field.label}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            {`{{${field.key}}}`}
                          </p>
                        </div>

                        <div className="lg:col-span-5 space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus={isFieldFocused}
                              value={st.value}
                              onChange={(e) => {
                                if (isFieldFocused) {
                                  setFocusedVerificationKey(null);
                                }
                                updateFieldValue(field, e.target.value);
                              }}
                              placeholder={
                                field.type === 'data'
                                  ? 'DD/MM/AAAA'
                                  : field.type === 'moeda'
                                    ? companyCountry === 'PY'
                                      ? 'Gs. 3.500.000'
                                      : 'R$ 2.500,00'
                                    : ''
                              }
                              className={`w-full min-h-[42px] px-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 ${
                                !validation.valid
                                  ? 'border-red-500 focus:ring-red-500/20'
                                  : isMissing
                                    ? 'border-red-300 focus:ring-red-500/20'
                                    : isLow
                                      ? 'border-amber-300 focus:ring-amber-500/20'
                                      : 'border-slate-300 focus:ring-emerald-600/20 focus:border-emerald-600'
                              } ${
                                field.type === 'cpf_ci' ||
                                field.type === 'data' ||
                                field.type === 'moeda'
                                  ? 'tabular-nums'
                                  : ''
                              }`}
                            />
                            {field.type === 'moeda' && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateFieldValue(
                                    field,
                                    formatCurrencyInputValue(
                                      st.value,
                                      companyCountry
                                    )
                                  )
                                }
                                className="min-h-[42px] px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-navy-900 shrink-0 cursor-pointer"
                              >
                                {companyCountry === 'PY' ? 'Gs.' : 'R$'}
                              </button>
                            )}
                          </div>
                          {!validation.valid && validation.message && (
                            <p className="text-xs font-medium text-red-700">
                              {validation.message}
                            </p>
                          )}
                        </div>

                        <div className="lg:col-span-2 text-xs text-slate-600 truncate">
                          <span className="lg:hidden font-medium text-slate-400 mr-1">
                            {t.newContract.tableSourceCol}:
                          </span>
                          {st.source || '—'}
                        </div>

                        <div className="lg:col-span-2 flex items-center lg:justify-end">
                          {isMissing ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{t.newContract.confMissing}</span>
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>{t.newContract.confLow}</span>
                            </span>
                          ) : st.confidence === 'medio' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>{t.newContract.confMedium}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>{t.newContract.confHigh}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {validationAlert && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              {validationAlert}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
            >
              {t.common.back}
            </button>
            <button
              type="button"
              onClick={handleProceedFromVerification}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{t.newContract.proceedToQuestionsBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Deal Terms — One Question Per Screen */}
      {step === 4 && selectedTemplate && (
        <div className="max-w-xl mx-auto py-4 space-y-6">
          {dealQuestionFields.length === 0 || !currentQuestionField ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold text-navy-900">
                {t.newContract.noDealQuestionsTitle}
              </h2>
              <p className="text-sm text-slate-600">
                {t.newContract.noDealQuestionsDesc}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  {t.common.back}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
                >
                  {t.newContract.questionFinishBtn}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 tabular-nums">
                  <span>{t.newContract.questionsTitle}</span>
                  <span>
                    {t.newContract.questionProgress} {questionIdx + 1} /{' '}
                    {dealQuestionFields.length}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-transform"
                    style={{
                      width: `${Math.round(((questionIdx + 1) / dealQuestionFields.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {t.newContract.questionsSubtitle}
                </p>
                <label className="block text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
                  {currentQuestionField.label}
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={fieldStates[currentQuestionField.key]?.value || ''}
                    onChange={(e) =>
                      updateFieldValue(currentQuestionField, e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNextQuestion();
                      }
                    }}
                    placeholder={
                      currentQuestionField.type === 'moeda'
                        ? companyCountry === 'PY'
                          ? 'Gs. 3.800.000'
                          : 'R$ 3.500,00'
                        : currentQuestionField.type === 'data'
                          ? 'DD/MM/AAAA'
                          : ''
                    }
                    className="w-full min-h-[50px] px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 tabular-nums"
                  />

                  {currentQuestionField.type === 'moeda' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateFieldValue(
                          currentQuestionField,
                          formatCurrencyInputValue(
                            fieldStates[currentQuestionField.key]?.value || '',
                            companyCountry
                          )
                        )
                      }
                      className="min-h-[50px] px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-navy-900 shrink-0 cursor-pointer"
                    >
                      {companyCountry === 'PY' ? 'Gs.' : 'R$'}
                    </button>
                  )}
                </div>

                {(() => {
                  const valRes = getFieldValidation(currentQuestionField);
                  if (!valRes.valid && valRes.message) {
                    return (
                      <p className="text-xs font-medium text-red-700">
                        {valRes.message}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {validationAlert && (
                <p className="text-xs font-medium text-red-700">
                  {validationAlert}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setValidationAlert(null);
                    if (questionIdx > 0) {
                      setQuestionIdx((i) => i - 1);
                    } else {
                      setStep(3);
                    }
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  {t.newContract.questionPrevBtn}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValidationAlert(null);
                      if (questionIdx < dealQuestionFields.length - 1) {
                        setQuestionIdx((i) => i + 1);
                      } else {
                        setStep(5);
                      }
                    }}
                    className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {t.newContract.questionSkipBtn}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>
                      {questionIdx < dealQuestionFields.length - 1
                        ? t.newContract.questionNextBtn
                        : t.newContract.questionFinishBtn}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Review Editor, AI Review, A4 PDF & DOCX Export */}
      {step === 5 && selectedTemplate && (() => {
        const meta = inferPrimaryClientMeta();
        return (
          <ContractReviewStep
            t={t}
            locale={locale}
            company={company}
            companyCountry={companyCountry}
            template={selectedTemplate}
            templateFields={templateFields}
            variablesMap={variablesMap}
            credits={credits}
            creditAlreadyConsumed={activeDraftMeta.creditConsumed}
            contractCodePreview={
              activeDraftMeta.code || `CJ-${new Date().getFullYear()}-NOVO`
            }
            clientName={meta.clientName}
            clientDocument={meta.clientDocument}
            initialCustomBody={initialCustomBody}
            clauseLibrary={clauseLibrary}
            onUpdateVariable={updateFieldValue}
            onJumpToFieldInVerification={(fieldKey) => {
              const dealIdx = dealQuestionFields.findIndex(
                (f) => f.key === fieldKey
              );
              const inDocTable = groupedDocFields.some((g) =>
                g.fields.some((f) => f.key === fieldKey)
              );
              if (inDocTable || dealIdx === -1) {
                setFocusedVerificationKey(fieldKey);
                setStep(3);
              } else {
                setQuestionIdx(dealIdx);
                setStep(4);
              }
            }}
            onSaveDraftAndMaybeConsume={handleSaveDraftOrFinalize}
            onSendForSignature={(bodyText) => {
              const saved = handleSaveDraftOrFinalize({
                renderedContent: bodyText,
                consumeCredit: false,
                finalize: false,
              });
              if (saved.ok && saved.contract) {
                onOpenSendForSignatureModal(saved.contract);
              }
            }}
            onGoToCredits={onGoToCredits}
            onBack={() => setStep(3)}
          />
        );
      })()}
    </div>
  );
}

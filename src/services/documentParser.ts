import { jsonAuthHeaders } from './api';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  ContractExpirationInfo,
  CountryCode,
  Locale,
  TemplateAnalysisResult,
  TemplateCategory,
  TemplateField,
  TemplateFieldType,
} from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromUploadedFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return (result.value || '').trim();
  }

  if (lower.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pagesText: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      let lastY: number | null = null;
      let pageLine = '';

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const transform = 'transform' in item ? item.transform : null;
        const currentY = transform ? transform[5] : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
          pageLine += '\n';
        } else if (pageLine.length > 0 && !pageLine.endsWith('\n') && !pageLine.endsWith(' ')) {
          pageLine += ' ';
        }
        pageLine += item.str;
        lastY = currentY;
      }
      pagesText.push(pageLine.trim());
    }

    return pagesText.filter(Boolean).join('\n\n').trim();
  }

  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    return (await file.text()).trim();
  }

  throw new Error('Formato não suportado. Envie um arquivo .docx ou .pdf.');
}

const VALID_CATEGORIES = new Set<TemplateCategory>([
  'locacao',
  'compra_venda',
  'servicos',
  'recibo',
  'outros',
]);

const VALID_FIELD_TYPES = new Set<TemplateFieldType>([
  'texto',
  'cpf_ci',
  'data',
  'moeda',
  'numero',
  'endereco',
]);

export function sanitizeFieldKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export async function analyzeTemplateWithGemini(
  rawText: string,
  locale: Locale,
  country: CountryCode
): Promise<TemplateAnalysisResult> {
  const response = await fetch('/api/templates/analyze', {
    method: 'POST',
    headers: await jsonAuthHeaders(),
    body: JSON.stringify({ rawText, locale, country }),
  });

  const data = (await response.json()) as Partial<TemplateAnalysisResult> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || 'Falha ao analisar o documento com Gemini.');
  }

  const category: TemplateCategory = VALID_CATEGORIES.has(
    data.suggestedCategory as TemplateCategory
  )
    ? (data.suggestedCategory as TemplateCategory)
    : 'outros';

  const seenKeys = new Set<string>();
  const fields: TemplateField[] = [];
  for (const f of data.fields || []) {
    const key = sanitizeFieldKey(f.key || f.label || 'campo');
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    fields.push({
      key,
      label: f.label || key,
      type: VALID_FIELD_TYPES.has(f.type) ? f.type : 'texto',
      party: (f.party || 'contrato').trim().toLowerCase(),
    });
  }

  return {
    suggestedTitle: (data.suggestedTitle || '').trim() || 'Modelo importado',
    suggestedCategory: category,
    parties:
      Array.isArray(data.parties) && data.parties.length > 0
        ? data.parties.map((p) => String(p).trim()).filter(Boolean)
        : ['Contratante', 'Contratado'],
    templateText: (data.templateText || rawText).trim(),
    fields,
  };
}

export type ExtractionConfidence = 'alto' | 'medio' | 'baixo' | 'nao_encontrado';

export interface DocumentExtractionItem {
  key: string;
  value: string;
  source: string;
  confidence: ExtractionConfidence;
  isDocumentField: boolean;
}

export async function prepareFileForMultimodal(
  file: File
): Promise<{ mimeType: string; base64Data: string; previewUrl?: string }> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return {
      mimeType: 'application/pdf',
      base64Data: btoa(binary),
    };
  }

  // Image: compress/resize if needed so mobile camera photos stay fast & under payload limits
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const base64 = dataUrl.split(',')[1] || '';
          resolve({
            mimeType: file.type || 'image/jpeg',
            base64Data: base64,
            previewUrl: dataUrl,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          mimeType: 'image/jpeg',
          base64Data: compressedUrl.split(',')[1] || '',
          previewUrl: compressedUrl,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export async function extractFieldsFromDocuments(params: {
  documents: Array<{
    party: string;
    docType: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
  }>;
  fields: TemplateField[];
  country: CountryCode;
  locale: Locale;
}): Promise<DocumentExtractionItem[]> {
  const response = await fetch('/api/contracts/extract-documents', {
    method: 'POST',
    headers: await jsonAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as {
    extractions?: DocumentExtractionItem[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao analisar documentos com Gemini.');
  }

  return Array.isArray(data.extractions) ? data.extractions : [];
}

export interface ContractReviewAlert {
  id: string;
  severity: 'alta' | 'media' | 'baixa';
  title: string;
  description: string;
  targetExcerpt: string;
  suggestedReplacement: string;
}

export interface ContractClauseSuggestion {
  id: string;
  title: string;
  legalBasis: string;
  reason: string;
  clauseText: string;
}

export interface ContractReviewResult {
  alerts: ContractReviewAlert[];
  clauseSuggestions: ContractClauseSuggestion[];
}

export async function reviewContractWithAI(params: {
  contractText: string;
  category: string;
  country: CountryCode;
  locale: Locale;
  variables: Record<string, string>;
}): Promise<ContractReviewResult> {
  const response = await fetch('/api/contracts/review', {
    method: 'POST',
    headers: await jsonAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as Partial<ContractReviewResult> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao revisar contrato com IA.');
  }

  return {
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
    clauseSuggestions: Array.isArray(data.clauseSuggestions)
      ? data.clauseSuggestions
      : [],
  };
}

export async function extractContractTermsWithAI(params: {
  contractText: string;
  variables: Record<string, string>;
  country: CountryCode;
  locale: Locale;
}): Promise<ContractExpirationInfo> {
  const response = await fetch('/api/contracts/extract-terms', {
    method: 'POST',
    headers: await jsonAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as Partial<ContractExpirationInfo> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao extrair vencimento e reajuste.');
  }

  return {
    endDate: data.endDate || undefined,
    adjustmentIndex: data.adjustmentIndex || undefined,
    adjustmentDate: data.adjustmentDate || undefined,
    summary: data.summary || undefined,
    extractedAt: new Date().toISOString(),
  };
}

export interface AnonymizedClauseBundle {
  anonymizedFullText: string;
  clauses: Array<{
    title: string;
    legalBasis: string;
    clauseText: string;
  }>;
}

export async function anonymizeTemplateForLibraryWithAI(params: {
  templateText: string;
  category: TemplateCategory;
  country: CountryCode;
  locale: Locale;
}): Promise<AnonymizedClauseBundle> {
  const response = await fetch('/api/templates/anonymize-clauses', {
    method: 'POST',
    headers: await jsonAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as Partial<AnonymizedClauseBundle> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || 'Erro ao anonimizar cláusulas para a biblioteca.'
    );
  }

  return {
    anonymizedFullText: data.anonymizedFullText || '',
    clauses: Array.isArray(data.clauses) ? data.clauses : [],
  };
}



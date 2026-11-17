export type Locale = 'pt-BR' | 'es-PY';

export type CountryCode = 'BR' | 'PY';

export type AppScreen =
  | 'dashboard'
  | 'new-contract'
  | 'vault'
  | 'expirations'
  | 'templates'
  | 'team'
  | 'reports'
  | 'credits'
  | 'settings';

export type TeamRole = 'admin' | 'corretor' | 'juridico';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: 'active' | 'invited';
  invitedAt: string;
}

export type LegalApprovalStatus =
  | 'not_required'
  | 'pending_approval'
  | 'approved'
  | 'rejected';

export interface ContractExpirationInfo {
  endDate?: string; // YYYY-MM-DD
  adjustmentIndex?: string; // IGP-M, IPCA, IPC, etc.
  adjustmentDate?: string; // YYYY-MM-DD
  summary?: string;
  extractedAt?: string;
}

export interface SharedClauseItem {
  id: string;
  title: string;
  category: TemplateCategory;
  country: CountryCode;
  legalBasis?: string;
  clauseText: string;
  sharedAt: string;
}

export type ContractStatus = 'draft' | 'awaiting_signature' | 'signed';

export type TemplateCategory =
  | 'locacao'
  | 'compra_venda'
  | 'servicos'
  | 'recibo'
  | 'outros';

export type TemplateFieldType =
  | 'texto'
  | 'cpf_ci'
  | 'data'
  | 'moeda'
  | 'numero'
  | 'endereco';

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  party: string;
}

export interface TemplateAnalysisResult {
  suggestedTitle: string;
  suggestedCategory: TemplateCategory;
  parties: string[];
  templateText: string;
  fields: TemplateField[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CompanyProfile {
  id: string;
  userId: string;
  name: string;
  country: CountryCode;
  taxId: string; // CNPJ (BR) or RUC (PY)
  logoDataUrl: string | null;
  brandColor: string;
  address: string;
  phone: string;
  onboardingCompleted: boolean;
  documentRetentionDays?: number; // Default 90 days after signing
  autoDeleteClientDocs?: boolean;
  requireLegalApproval?: boolean;
  updatedAt: string;
}

export interface ContractTemplate {
  id: string;
  companyId: string;
  title: string;
  category: TemplateCategory;
  country: CountryCode;
  language: Locale;
  parties: string[];
  fields: TemplateField[];
  content: string; // Contains {{placeholder}} tokens
  isSystemTemplate?: boolean;
  sharedToLibrary?: boolean;
  updatedAt: string;
}

export interface ClientDocumentAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  docCategory: 'identity' | 'address_proof' | 'tax_id' | 'other';
  previewUrl?: string; // DataURL for images when small enough
  extractedHint?: string;
  uploadedAt: string;
}

export type SigningOrder = 'parallel' | 'sequential';

export interface ContractSigner {
  id: string;
  token: string;
  order: number; // 1-based order
  role?: string;
  name: string;
  document: string;
  whatsapp: string;
  status: 'pending' | 'signed';
  viewedAt?: string;
  signedAt?: string;
  timezone?: string;
  browser?: string;
  device?: string;
  userAgent?: string;
  signatureDataUrl?: string;
  selfieDataUrl?: string;
  consentAccepted?: boolean;
}

export interface ContractSignatureConfig {
  order: SigningOrder;
  requireSelfie: boolean;
  sentAt: string;
}

export type ContractTimelineEventType =
  | 'created'
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'completed'
  | 'documents_purged';

export interface ContractTimelineEvent {
  id: string;
  type: ContractTimelineEventType;
  timestamp: string;
  actorName?: string;
  detail?: string;
  timezone?: string;
  browser?: string;
  device?: string;
}

export interface ContractCompanySnapshot {
  name: string;
  country: CountryCode;
  taxId: string;
  logoDataUrl: string | null;
  brandColor: string;
  address: string;
  phone: string;
}

export interface ContractRecord {
  id: string;
  code: string; // e.g., CJ-2026-004
  companyId: string;
  companySnapshot?: ContractCompanySnapshot;
  templateId: string;
  templateTitle: string;
  category?: TemplateCategory;
  clientName: string;
  clientDocument: string; // CPF/CNPJ or CI/RUC
  clientEmail: string;
  clientPhone: string;
  propertyAddress?: string;
  variables: Record<string, string>;
  renderedContent: string;
  attachments: ClientDocumentAttachment[];
  attachmentsPurgedAt?: string;
  status: ContractStatus;
  creditConsumed: boolean;
  signatureLink: string;
  signatureConfig?: ContractSignatureConfig;
  signers?: ContractSigner[];
  timeline?: ContractTimelineEvent[];
  documentHash?: string; // SHA-256 hex digest computed via Web Crypto
  createdByUserId?: string;
  createdByName?: string;
  legalApprovalStatus?: LegalApprovalStatus;
  legalApprovedBy?: string;
  legalApprovedAt?: string;
  legalApprovalNote?: string;
  expirationInfo?: ContractExpirationInfo;
  renewedFromContractId?: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
}

export interface CreditTransaction {
  id: string;
  companyId: string;
  type: 'bonus' | 'purchase' | 'usage';
  amount: number; // positive for add, negative for usage
  description: string;
  packageId?: string;
  priceDisplay?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface CreditPackage {
  id: 'avulso' | 'profissional';
  credits: number;
  isMonthly: boolean;
  priceBRL: number;
  pricePYG: number;
}

export interface AppStorageSnapshot {
  user: UserAccount | null;
  company: CompanyProfile | null;
  locale: Locale;
  credits: number;
  templates: ContractTemplate[];
  contracts: ContractRecord[];
  transactions: CreditTransaction[];
  teamMembers?: TeamMember[];
  activeMemberId?: string | null;
  clauseLibrary?: SharedClauseItem[];
}

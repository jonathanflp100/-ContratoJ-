import type {
  AppStorageSnapshot,
  CompanyProfile,
  ContractCompanySnapshot,
  ContractExpirationInfo,
  ContractRecord,
  ContractSigner,
  ContractStatus,
  ContractTemplate,
  ContractTimelineEvent,
  CountryCode,
  CreditPackage,
  CreditTransaction,
  LegalApprovalStatus,
  Locale,
  SharedClauseItem,
  SigningOrder,
  TeamMember,
  TeamRole,
  TemplateCategory,
  TemplateField,
  UserAccount,
} from '../types';
import { ApiError, workspaceApi } from './api';
import {
  computeContractSha256,
  getSignerPublicUrl,
  type ClientAuditMetadata,
} from '../utils/cryptoAndDevice';

/**
 * Storage abstraction layer (localStorage).
 * Designed with clean domain methods so each service can be swapped
 * directly to Supabase client queries (`supabase.from(...)` / `supabase.auth`)
 * without changing UI components.
 */

const STORAGE_KEY = 'contratoja_app_state_v2';
const LEGACY_STORAGE_KEY = 'contratoja_app_state_v1';

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'avulso',
    credits: 10,
    isMonthly: false,
    priceBRL: 79.9,
    pricePYG: 115000,
  },
  {
    id: 'profissional',
    credits: 30,
    isMonthly: true,
    priceBRL: 179.9,
    pricePYG: 260000,
  },
];

export const BRAND_COLOR_OPTIONS = [
  { label: 'Azul Marinho', value: '#0F2544' },
  { label: 'Verde Esmeralda', value: '#047857' },
  { label: 'Azul Royal', value: '#1D4ED8' },
  { label: 'Grafite Executivo', value: '#1E293B' },
  { label: 'Vinho Jurídico', value: '#7F1D1D' },
  { label: 'Ouro Sóbrio', value: '#92400E' },
];

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomHex(4)}`;
}

/** 128-bit secret: the signing link is the only "password" a signer has. */
function generateSignerToken(): string {
  return randomHex(16);
}

function toCompanySnapshot(
  company: CompanyProfile | null
): ContractCompanySnapshot | undefined {
  if (!company) return undefined;
  return {
    name: company.name,
    country: company.country,
    taxId: company.taxId,
    logoDataUrl: company.logoDataUrl,
    brandColor: company.brandColor,
    address: company.address,
    phone: company.phone,
  };
}

export function extractTemplateVariables(content: string): string[] {
  const regex = /\{\{\s*([a-zA-Z0-9_À-ÿ]+)\s*\}\}/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export function renderContractTemplate(
  templateContent: string,
  variables: Record<string, string>,
  company: CompanyProfile | null
): string {
  let rendered = templateContent;
  const mergedVars: Record<string, string> = {
    empresa_nome: company?.name || '',
    empresa_documento: company?.taxId || '',
    empresa_endereco: company?.address || '',
    empresa_telefone: company?.phone || '',
    data_hoje: new Date().toLocaleDateString(company?.country === 'PY' ? 'es-PY' : 'pt-BR'),
    ...variables,
  };

  rendered = rendered.replace(/\{\{\s*([a-zA-Z0-9_À-ÿ]+)\s*\}\}/g, (_, key: string) => {
    const val = mergedVars[key];
    return val && val.trim().length > 0 ? val : `[${key}]`;
  });

  return rendered;
}

export function formatCurrency(amount: number, country: CountryCode): string {
  if (country === 'PY') {
    return `Gs. ${Math.round(amount).toLocaleString('es-PY')}`;
  }
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function buildSeedTemplates(
  companyId: string,
  country: CountryCode = 'BR'
): ContractTemplate[] {
  const now = new Date().toISOString();

  if (country === 'PY') {
    return [
      {
        id: 'tpl_sys_locacao_py',
        companyId,
        title: 'Alquiler Residencial',
        category: 'locacao',
        country: 'PY',
        language: 'es-PY',
        parties: ['Locador', 'Locatario'],
        isSystemTemplate: true,
        updatedAt: now,
        fields: [
          { key: 'nome_cliente', label: 'Nombre del Locatario', type: 'texto', party: 'locatario' },
          { key: 'documento_cliente', label: 'C.I. / RUC del Locatario', type: 'cpf_ci', party: 'locatario' },
          { key: 'email_cliente', label: 'Correo del Locatario', type: 'texto', party: 'locatario' },
          { key: 'telefone_cliente', label: 'Teléfono del Locatario', type: 'texto', party: 'locatario' },
          { key: 'direccion_inmueble', label: 'Dirección del inmueble', type: 'endereco', party: 'contrato' },
          { key: 'plazo_meses', label: 'Plazo (meses)', type: 'numero', party: 'contrato' },
          { key: 'fecha_inicio', label: 'Fecha de inicio', type: 'data', party: 'contrato' },
          { key: 'monto_mensual', label: 'Canon mensual', type: 'moeda', party: 'contrato' },
          { key: 'dia_pago', label: 'Día límite de pago', type: 'numero', party: 'contrato' },
        ],
        content: `CONTRATO PRIVADO DE ALQUILER DE INMUEBLE

LOCADORA / ADMINISTRADORA: {{empresa_nome}}, con RUC Nº {{empresa_documento}}, domicilio comercial en {{empresa_endereco}}, teléfono {{empresa_telefone}}.

LOCATARIO/A: {{nome_cliente}}, titular de Cédula de Identidad / RUC Nº {{documento_cliente}}, correo {{email_cliente}}, teléfono {{telefone_cliente}}.

PRIMERA (OBJETO): La parte locadora entrega en locación el inmueble ubicado en {{direccion_inmueble}}, para uso exclusivo de vivienda familiar.

SEGUNDA (PLAZO): El plazo de vigencia será de {{plazo_meses}} meses, a contar desde el {{fecha_inicio}}.

TERCERA (PRECIO Y PAGO): El canon mensual queda fijado en {{monto_mensual}}, pagadero por mes adelantado del 1 al {{dia_pago}} de cada mes.

CUARTA (JURISDICCIÓN): Para cualquier divergencia derivada del presente contrato, las partes se someten a la jurisdicción de los juzgados ordinarios de la República del Paraguay.

En fe de conformidad, se suscribe en fecha {{data_hoje}}.`,
      },
      {
        id: 'tpl_sys_servicos_py',
        companyId,
        title: 'Prestación de Servicios Profesionales',
        category: 'servicos',
        country: 'PY',
        language: 'es-PY',
        parties: ['Contratante', 'Contratado'],
        isSystemTemplate: true,
        updatedAt: now,
        fields: [
          { key: 'nome_cliente', label: 'Nombre / Razón social del Contratante', type: 'texto', party: 'contratante' },
          { key: 'documento_cliente', label: 'C.I. / RUC del Contratante', type: 'cpf_ci', party: 'contratante' },
          { key: 'email_cliente', label: 'Correo del Contratante', type: 'texto', party: 'contratante' },
          { key: 'telefone_cliente', label: 'Teléfono del Contratante', type: 'texto', party: 'contratante' },
          { key: 'descripcion_servicio', label: 'Descripción del servicio', type: 'texto', party: 'contrato' },
          { key: 'monto_total', label: 'Honorarios totales', type: 'moeda', party: 'contrato' },
          { key: 'forma_pago', label: 'Forma de pago', type: 'texto', party: 'contrato' },
          { key: 'fecha_inicio', label: 'Fecha de inicio', type: 'data', party: 'contrato' },
          { key: 'fecha_entrega', label: 'Fecha estimada de entrega', type: 'data', party: 'contrato' },
        ],
        content: `CONTRATO DE PRESTACIÓN DE SERVICIOS

PRESTADOR: {{empresa_nome}}, RUC Nº {{empresa_documento}}, con oficina en {{empresa_endereco}}, teléfono {{empresa_telefone}}.

CONTRATANTE: {{nome_cliente}}, C.I. / RUC Nº {{documento_cliente}}, correo {{email_cliente}}, contacto {{telefone_cliente}}.

CLÁUSULA 1 - ALCANCE: El PRESTADOR se compromete a ejecutar a favor del CONTRATANTE los servicios de: {{descripcion_servicio}}.

CLÁUSULA 2 - HONORARIOS: Los honorarios profesionales pactados ascienden a {{monto_total}}, abonados mediante {{forma_pago}}.

CLÁUSULA 3 - PLAZO: El servicio inicia el {{fecha_inicio}} con plazo estimado de entrega el {{fecha_entrega}}.

Suscripto el {{data_hoje}}.`,
      },
      {
        id: 'tpl_sys_compra_venda_py',
        companyId,
        title: 'Compraventa de Bien Mueble',
        category: 'compra_venda',
        country: 'PY',
        language: 'es-PY',
        parties: ['Vendedor', 'Comprador'],
        isSystemTemplate: true,
        updatedAt: now,
        fields: [
          { key: 'nome_cliente', label: 'Nombre del Comprador', type: 'texto', party: 'comprador' },
          { key: 'documento_cliente', label: 'C.I. / RUC del Comprador', type: 'cpf_ci', party: 'comprador' },
          { key: 'endereco_comprador', label: 'Domicilio del Comprador', type: 'endereco', party: 'comprador' },
          { key: 'descricao_bem', label: 'Descripción detallada del bien', type: 'texto', party: 'contrato' },
          { key: 'valor_venda', label: 'Precio total de venta', type: 'moeda', party: 'contrato' },
          { key: 'forma_pagamento', label: 'Condiciones de pago', type: 'texto', party: 'contrato' },
          { key: 'data_entrega', label: 'Fecha de entrega del bien', type: 'data', party: 'contrato' },
        ],
        content: `CONTRATO PRIVADO DE COMPRAVENTA DE BIEN MUEBLE

VENDEDOR: {{empresa_nome}}, RUC Nº {{empresa_documento}}, con domicilio en {{empresa_endereco}}, teléfono {{empresa_telefone}}.

COMPRADOR: {{nome_cliente}}, C.I. / RUC Nº {{documento_cliente}}, domiciliado en {{endereco_comprador}}.

PRIMERA (OBJETO): El VENDEDOR transfiere en propiedad al COMPRADOR el siguiente bien mueble: {{descricao_bem}}, libre de gravámenes y embargos.

SEGUNDA (PRECIO Y FORMA DE PAGO): El precio total convenido es de {{valor_venda}}, a ser abonado mediante {{forma_pagamento}}.

TERCERA (ENTREGA): La entrega material del bien se realiza en fecha {{data_entrega}}, asumiendo el COMPRADOR la responsabilidad desde ese acto.

Firmado en dos ejemplares de un mismo tenor en fecha {{data_hoje}}.`,
      },
      {
        id: 'tpl_sys_recibo_py',
        companyId,
        title: 'Recibo de Pago',
        category: 'recibo',
        country: 'PY',
        language: 'es-PY',
        parties: ['Pagador', 'Receptor'],
        isSystemTemplate: true,
        updatedAt: now,
        fields: [
          { key: 'nome_cliente', label: 'Nombre de quien paga', type: 'texto', party: 'pagador' },
          { key: 'documento_cliente', label: 'C.I. / RUC del pagador', type: 'cpf_ci', party: 'pagador' },
          { key: 'valor_recebido', label: 'Monto recibido', type: 'moeda', party: 'contrato' },
          { key: 'referente_a', label: 'En concepto de', type: 'texto', party: 'contrato' },
          { key: 'forma_pagamento', label: 'Medio de pago', type: 'texto', party: 'contrato' },
          { key: 'data_pagamento', label: 'Fecha del pago', type: 'data', party: 'contrato' },
        ],
        content: `RECIBO OFICIAL DE PAGO

EMISOR / RECEPTOR: {{empresa_nome}}, RUC Nº {{empresa_documento}}, domicilio en {{empresa_endereco}}, teléfono {{empresa_telefone}}.

Recibimos de {{nome_cliente}}, titular de C.I. / RUC Nº {{documento_cliente}}, la suma de {{valor_recebido}}, en concepto de: {{referente_a}}.

El pago fue efectuado mediante {{forma_pagamento}} en fecha {{data_pagamento}}, otorgando por el presente la más amplia y formal carta de pago por dicho importe.

Emitido el {{data_hoje}}.`,
      },
    ];
  }

  return [
    {
      id: 'tpl_sys_locacao_br',
      companyId,
      title: 'Locação Residencial',
      category: 'locacao',
      country: 'BR',
      language: 'pt-BR',
      parties: ['Locador', 'Locatário'],
      isSystemTemplate: true,
      updatedAt: now,
      fields: [
        { key: 'nome_cliente', label: 'Nome do Locatário', type: 'texto', party: 'locatario' },
        { key: 'documento_cliente', label: 'CPF / CNPJ do Locatário', type: 'cpf_ci', party: 'locatario' },
        { key: 'email_cliente', label: 'E-mail do Locatário', type: 'texto', party: 'locatario' },
        { key: 'telefone_cliente', label: 'Telefone do Locatário', type: 'texto', party: 'locatario' },
        { key: 'endereco_imovel', label: 'Endereço do imóvel', type: 'endereco', party: 'contrato' },
        { key: 'prazo_meses', label: 'Prazo (meses)', type: 'numero', party: 'contrato' },
        { key: 'data_inicio', label: 'Data de início', type: 'data', party: 'contrato' },
        { key: 'valor_mensal', label: 'Valor do aluguel mensal', type: 'moeda', party: 'contrato' },
        { key: 'dia_vencimento', label: 'Dia de vencimento', type: 'numero', party: 'contrato' },
      ],
      content: `CONTRATO DE LOCAÇÃO RESIDENCIAL

LOCADORA (INTERMEDIADORA): {{empresa_nome}}, inscrita no CNPJ sob nº {{empresa_documento}}, com sede em {{empresa_endereco}}, telefone {{empresa_telefone}}.

LOCATÁRIO(A): {{nome_cliente}}, portador(a) do documento {{documento_cliente}}, e-mail {{email_cliente}}, telefone {{telefone_cliente}}, residente em {{endereco_imovel}}.

CLÁUSULA 1ª - DO OBJETO
O objeto do presente contrato é a locação do imóvel situado em {{endereco_imovel}}, destinado exclusivamente para fins residenciais.

CLÁUSULA 2ª - DO PRAZO
A locação terá o prazo determinado de {{prazo_meses}} meses, iniciando-se em {{data_inicio}}.

CLÁUSULA 3ª - DO VALOR E PAGAMENTO
O aluguel mensal ajustado é de {{valor_mensal}}, com vencimento todo dia {{dia_vencimento}} de cada mês, mediante transferência ou boleto emitido pela administradora.

CLÁUSULA 4ª - DAS OBRIGAÇÕES E FORO
As partes comprometem-se a zelar pela conservação do imóvel e elegem o foro da comarca local para dirimir quaisquer dúvidas oriundas deste instrumento.

Emitido em {{data_hoje}}.`,
    },
    {
      id: 'tpl_sys_servicos_br',
      companyId,
      title: 'Prestação de Serviços Profissionais',
      category: 'servicos',
      country: 'BR',
      language: 'pt-BR',
      parties: ['Contratante', 'Contratado'],
      isSystemTemplate: true,
      updatedAt: now,
      fields: [
        { key: 'nome_cliente', label: 'Nome / Razão social do Contratante', type: 'texto', party: 'contratante' },
        { key: 'documento_cliente', label: 'CPF / CNPJ do Contratante', type: 'cpf_ci', party: 'contratante' },
        { key: 'email_cliente', label: 'E-mail do Contratante', type: 'texto', party: 'contratante' },
        { key: 'telefone_cliente', label: 'Telefone do Contratante', type: 'texto', party: 'contratante' },
        { key: 'descricao_servico', label: 'Descrição dos serviços', type: 'texto', party: 'contrato' },
        { key: 'data_inicio', label: 'Data de início', type: 'data', party: 'contrato' },
        { key: 'data_entrega', label: 'Previsão de entrega', type: 'data', party: 'contrato' },
        { key: 'valor_total', label: 'Valor total dos honorários', type: 'moeda', party: 'contrato' },
        { key: 'forma_pagamento', label: 'Forma de pagamento', type: 'texto', party: 'contrato' },
      ],
      content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATADA: {{empresa_nome}}, inscrita no CNPJ {{empresa_documento}}, situada em {{empresa_endereco}}, contato {{empresa_telefone}}.

CONTRATANTE: {{nome_cliente}}, documento {{documento_cliente}}, e-mail {{email_cliente}}, telefone {{telefone_cliente}}.

1. OBJETO DOS SERVIÇOS
A CONTRATADA prestará ao CONTRATANTE os seguintes serviços especializados: {{descricao_servico}}.

2. PRAZO DE EXECUÇÃO
Os trabalhos terão início em {{data_inicio}} com entrega estimada para {{data_entrega}}.

3. HONORÁRIOS E FORMA DE PAGAMENTO
Pelos serviços prestados, o CONTRATANTE pagará o valor total de {{valor_total}}, na forma {{forma_pagamento}}.

4. CONFIDENCIALIDADE
Ambas as partes comprometem-se a manter sigilo sobre documentos, dados cadastrais e informações comerciais trocadas durante a vigência deste contrato.

Firmado em {{data_hoje}}.`,
    },
    {
      id: 'tpl_sys_compra_venda_br',
      companyId,
      title: 'Compra e Venda de Bem Móvel',
      category: 'compra_venda',
      country: 'BR',
      language: 'pt-BR',
      parties: ['Vendedor', 'Comprador'],
      isSystemTemplate: true,
      updatedAt: now,
      fields: [
        { key: 'nome_cliente', label: 'Nome do Comprador', type: 'texto', party: 'comprador' },
        { key: 'documento_cliente', label: 'CPF / CNPJ do Comprador', type: 'cpf_ci', party: 'comprador' },
        { key: 'endereco_comprador', label: 'Endereço do Comprador', type: 'endereco', party: 'comprador' },
        { key: 'descricao_bem', label: 'Descrição do bem (marca, modelo, série)', type: 'texto', party: 'contrato' },
        { key: 'valor_venda', label: 'Valor total da venda', type: 'moeda', party: 'contrato' },
        { key: 'forma_pagamento', label: 'Condições de pagamento', type: 'texto', party: 'contrato' },
        { key: 'data_entrega', label: 'Data de entrega do bem', type: 'data', party: 'contrato' },
      ],
      content: `CONTRATO PARTICULAR DE COMPRA E VENDA DE BEM MÓVEL

VENDEDOR(A): {{empresa_nome}}, inscrita no CNPJ {{empresa_documento}}, com sede em {{empresa_endereco}}, telefone {{empresa_telefone}}.

COMPRADOR(A): {{nome_cliente}}, inscrito(a) no CPF/CNPJ sob nº {{documento_cliente}}, residente em {{endereco_comprador}}.

CLÁUSULA 1ª - DO OBJETO
O VENDEDOR vende e transfere ao COMPRADOR a propriedade do seguinte bem móvel: {{descricao_bem}}, livre e desembaraçado de quaisquer ônus ou dívidas.

CLÁUSULA 2ª - DO PREÇO E PAGAMENTO
O preço certo e ajustado é de {{valor_venda}}, que será pago da seguinte forma: {{forma_pagamento}}.

CLÁUSULA 3ª - DA TRADIÇÃO E RESPONSABILIDADE
A entrega do bem ocorrerá em {{data_entrega}}, passando a correr por conta do COMPRADOR todos os riscos e despesas a partir desta data.

E por estarem justos e contratados, assinam o presente instrumento em {{data_hoje}}.`,
    },
    {
      id: 'tpl_sys_recibo_br',
      companyId,
      title: 'Recibo de Pagamento',
      category: 'recibo',
      country: 'BR',
      language: 'pt-BR',
      parties: ['Pagador', 'Recebedor'],
      isSystemTemplate: true,
      updatedAt: now,
      fields: [
        { key: 'nome_cliente', label: 'Nome do Pagador', type: 'texto', party: 'pagador' },
        { key: 'documento_cliente', label: 'CPF / CNPJ do Pagador', type: 'cpf_ci', party: 'pagador' },
        { key: 'valor_recebido', label: 'Valor recebido', type: 'moeda', party: 'contrato' },
        { key: 'referente_a', label: 'Referente a', type: 'texto', party: 'contrato' },
        { key: 'forma_pagamento', label: 'Forma de pagamento', type: 'texto', party: 'contrato' },
        { key: 'data_pagamento', label: 'Data do recebimento', type: 'data', party: 'contrato' },
      ],
      content: `RECIBO DE PAGAMENTO

RECEBEDOR: {{empresa_nome}}, CNPJ {{empresa_documento}}, endereço {{empresa_endereco}}, telefone {{empresa_telefone}}.

Recebi de {{nome_cliente}}, inscrito(a) no CPF/CNPJ sob nº {{documento_cliente}}, a importância de {{valor_recebido}}, referente a: {{referente_a}}.

Pagamento realizado via {{forma_pagamento}} na data de {{data_pagamento}}, dando plena e geral quitação pelo valor descrito neste recibo.

Emitido em {{data_hoje}}.`,
    },
  ];
}

function mapLegacyCategory(cat: string): TemplateCategory {
  if (cat === 'locacao' || cat === 'real_estate') return 'locacao';
  if (cat === 'servicos' || cat === 'services') return 'servicos';
  if (cat === 'compra_venda' || cat === 'commercial') return 'compra_venda';
  if (cat === 'recibo') return 'recibo';
  return 'outros';
}

function normalizeTemplate(
  raw: Partial<ContractTemplate> & { id: string; title: string; content: string },
  companyId: string,
  fallbackCountry: CountryCode
): ContractTemplate {
  const vars = extractTemplateVariables(raw.content);
  const existingFields = Array.isArray(raw.fields) ? raw.fields : [];
  const existingMap = new Map(existingFields.map((f) => [f.key, f]));
  const fields: TemplateField[] =
    existingFields.length > 0
      ? existingFields
      : vars.map((key) => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: 'texto',
          party: 'contrato',
        }));

  // Ensure every {{var}} present in content has a field entry
  for (const key of vars) {
    if (!existingMap.has(key) && existingFields.length > 0) {
      fields.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'texto',
        party: 'contrato',
      });
    }
  }

  return {
    id: raw.id,
    companyId: raw.companyId || companyId,
    title: raw.title,
    category: mapLegacyCategory(String(raw.category || 'outros')),
    country: raw.country || fallbackCountry,
    language: raw.language || (fallbackCountry === 'PY' ? 'es-PY' : 'pt-BR'),
    parties:
      Array.isArray(raw.parties) && raw.parties.length > 0
        ? raw.parties
        : ['Contratante', 'Contratado'],
    fields,
    content: raw.content,
    isSystemTemplate: Boolean(raw.isSystemTemplate),
    sharedToLibrary: Boolean(raw.sharedToLibrary),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function toYmdOffset(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return d.toISOString().slice(0, 10);
}

export function buildSeedClauseLibrary(
  country: CountryCode = 'BR'
): SharedClauseItem[] {
  const now = new Date().toISOString();
  if (country === 'PY') {
    return [
      {
        id: 'cl_seed_py_1',
        title: 'Reajuste anual del canon locativo (IPC)',
        category: 'locacao',
        country: 'PY',
        legalBasis: 'Código Civil Paraguayo · Libre contratación',
        clauseText:
          'CLÁUSULA DE REAJUSTE: Cumplidos cada 12 (doce) meses de vigencia, el canon locativo mensual será reajustado automáticamente conforme a la variación acumulada del Índice de Precios al Consumidor (IPC) publicado por el Banco Central del Paraguay.',
        sharedAt: now,
      },
      {
        id: 'cl_seed_py_2',
        title: 'Protección de datos personales (Ley 6534/2020)',
        category: 'servicos',
        country: 'PY',
        legalBasis: 'Ley Nº 6534/2020 de Protección de Datos Personales Crediticios',
        clauseText:
          'CLÁUSULA DE PROTECCIÓN DE DATOS: Las partes declaran conocer y respetar lo dispuesto en la Ley Nº 6534/2020, comprometiéndose a tratar los datos personales y documentos de respaldo exclusivamente para la ejecución del presente contrato y su resguardo legal.',
        sharedAt: now,
      },
      {
        id: 'cl_seed_py_3',
        title: 'Mora automática e interés compensatorio',
        category: 'locacao',
        country: 'PY',
        legalBasis: 'Código Civil Paraguayo · Art. 424 y 475',
        clauseText:
          'CLÁUSULA DE MORA: La falta de pago en la fecha pactada producirá la mora automática de pleno derecho sin necesidad de interpelación previa, devengando un recargo administrativo del 2% mensual sobre el saldo vencido.',
        sharedAt: now,
      },
      {
        id: 'cl_seed_py_4',
        title: 'Garantía de evicción y vicios ocultos en bien mueble',
        category: 'compra_venda',
        country: 'PY',
        legalBasis: 'Código Civil Paraguayo · Art. 1759 y ss.',
        clauseText:
          'CLÁUSULA DE SANEAMIENTO: El vendedor responde por evicción y por los vicios ocultos que afecten el normal funcionamiento del bien entregado, disponiendo el comprador de un plazo de 30 días corridos desde la recepción para efectuar el reclamo fehaciente.',
        sharedAt: now,
      },
    ];
  }

  return [
    {
      id: 'cl_seed_br_1',
      title: 'Reajuste anual pelo IPCA ou IGP-M (Lei do Inquilinato)',
      category: 'locacao',
      country: 'BR',
      legalBasis: 'Lei nº 8.245/1991 · Art. 17 e 18',
      clauseText:
        'CLÁUSULA DE REAJUSTE ANUAL: O valor do aluguel mensal será reajustado a cada período de 12 (doze) meses de vigência, mediante aplicação da variação acumulada do índice oficial pactuado (IPCA/IBGE ou IGP-M/FGV), ou outro índice oficial que venha a substituí-lo.',
      sharedAt: now,
    },
    {
      id: 'cl_seed_br_2',
      title: 'Vistoria inicial e devolução do imóvel nas mesmas condições',
      category: 'locacao',
      country: 'BR',
      legalBasis: 'Lei nº 8.245/1991 · Art. 22 e 23',
      clauseText:
        'CLÁUSULA DE VISTORIA E CONSERVAÇÃO: Integra o presente contrato o Laudo de Vistoria assinado pelas partes, obrigando-se a parte locatária a restituir o imóvel ao término da locação no mesmo estado de conservação e pintura em que o recebeu, salvo desgaste natural do uso.',
      sharedAt: now,
    },
    {
      id: 'cl_seed_br_3',
      title: 'Tratamento de dados pessoais e sigilo (LGPD)',
      category: 'servicos',
      country: 'BR',
      legalBasis: 'Lei nº 13.709/2018 (LGPD)',
      clauseText:
        'CLÁUSULA DE PROTEÇÃO DE DADOS (LGPD): As partes comprometem-se a cumprir integralmente a Lei nº 13.709/2018, utilizando documentos pessoais e informações cadastrais exclusivamente para a execução e cumprimento das obrigações legais deste instrumento.',
      sharedAt: now,
    },
    {
      id: 'cl_seed_br_4',
      title: 'Multa rescisória proporcional ao prazo restante',
      category: 'locacao',
      country: 'BR',
      legalBasis: 'Lei nº 8.245/1991 · Art. 4º',
      clauseText:
        'CLÁUSULA DE RESCISÃO ANTECIPADA: Em caso de devolução antecipada do imóvel antes do término do prazo ajustado, incidirá multa compensatória equivalente a 3 (três) aluguéis vigentes, calculada de forma estritamente proporcional ao período contratual restante.',
      sharedAt: now,
    },
    {
      id: 'cl_seed_br_5',
      title: 'Ausência de vínculo trabalhista na prestação de serviços',
      category: 'servicos',
      country: 'BR',
      legalBasis: 'Código Civil · Art. 593 e ss.',
      clauseText:
        'CLÁUSULA DE AUTONOMIA TÉCNICA: A execução dos serviços dar-se-á com plena autonomia técnica e operacional da parte contratada, inexistindo subordinação jurídica ou vínculo empregatício entre as partes ou seus prepostos.',
      sharedAt: now,
    },
    {
      id: 'cl_seed_br_6',
      title: 'Garantia contra vícios ocultos e gravames',
      category: 'compra_venda',
      country: 'BR',
      legalBasis: 'Código Civil · Art. 441 e 447',
      clauseText:
        'CLÁUSULA DE EVICÇÃO E GARANTIA: A parte vendedora declara que o bem objeto da venda encontra-se livre e desembaraçado de quaisquer ônus, dívidas ou restrições judiciais, respondendo pela evicção e por eventuais vícios redibitórios nos termos da lei.',
      sharedAt: now,
    },
  ];
}

function purgeExpiredAttachmentsInContracts(
  contracts: ContractRecord[],
  retentionDays: number,
  autoDelete: boolean
): { contracts: ContractRecord[]; purgedCount: number } {
  if (!autoDelete || retentionDays <= 0) {
    return { contracts, purgedCount: 0 };
  }
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const thresholdMs = retentionDays * 86400000;
  let purgedCount = 0;

  const nextContracts = contracts.map((contract) => {
    if (
      contract.status !== 'signed' ||
      !contract.signedAt ||
      contract.attachmentsPurgedAt ||
      !contract.attachments ||
      contract.attachments.length === 0
    ) {
      return contract;
    }

    const signedMs = new Date(contract.signedAt).getTime();
    if (Number.isNaN(signedMs) || nowMs - signedMs < thresholdMs) {
      return contract;
    }

    purgedCount += contract.attachments.length;
    const nextTimeline: ContractTimelineEvent[] = [
      ...(contract.timeline || []),
      {
        id: generateId('tl'),
        type: 'documents_purged',
        timestamp: nowIso,
        detail: `${contract.attachments.length} doc(s) · ${retentionDays}d`,
      },
    ];

    return {
      ...contract,
      attachments: [],
      attachmentsPurgedAt: nowIso,
      timeline: nextTimeline,
      updatedAt: nowIso,
    };
  });

  return { contracts: nextContracts, purgedCount };
}

export function getActiveTeamMember(
  snapshot: Pick<AppStorageSnapshot, 'user' | 'teamMembers' | 'activeMemberId'>
): TeamMember | null {
  const members = snapshot.teamMembers || [];
  if (members.length === 0) return null;
  if (snapshot.activeMemberId) {
    const found = members.find((m) => m.id === snapshot.activeMemberId);
    if (found) return found;
  }
  return members.find((m) => m.role === 'admin') || members[0] || null;
}

export function filterVisibleContractsForMember(
  contracts: ContractRecord[],
  teamMembers?: TeamMember[],
  activeMemberId?: string | null
): ContractRecord[] {
  const members = teamMembers || [];
  if (members.length === 0) return contracts;
  const active =
    (activeMemberId ? members.find((m) => m.id === activeMemberId) : null) ||
    members.find((m) => m.role === 'admin') ||
    members[0];

  if (!active || active.role !== 'corretor') {
    return contracts;
  }

  return contracts.filter(
    (c) =>
      c.createdByUserId === active.id ||
      (c.createdByName &&
        c.createdByName.toLowerCase() === active.name.toLowerCase())
  );
}

function getDefaultSnapshot(): AppStorageSnapshot {
  const savedLocale = (typeof window !== 'undefined' && localStorage.getItem('contratoja_locale')) as Locale | null;
  return {
    user: null,
    company: null,
    locale: savedLocale === 'es-PY' ? 'es-PY' : 'pt-BR',
    credits: 2,
    templates: [],
    contracts: [],
    transactions: [],
    teamMembers: [],
    activeMemberId: null,
    clauseLibrary: [],
  };
}

/**
 * Fills defaults, seeds system templates and purges expired client uploads.
 * Used both for server snapshots and for the local demo copy.
 */
function normalizeSnapshot(parsed: AppStorageSnapshot): {
  snapshot: AppStorageSnapshot;
  changed: boolean;
} {
  const country: CountryCode =
    parsed.company?.country || (parsed.locale === 'es-PY' ? 'PY' : 'BR');
  const companyId = parsed.company?.id || 'cmp_local';

  let templates = (parsed.templates || []).map((t) =>
    normalizeTemplate(t, companyId, country)
  );

  // Ensure the 4 ContratoJá system templates exist on upgrade from v1
  if (parsed.user && !templates.some((t) => t.isSystemTemplate)) {
    const seeds = buildSeedTemplates(companyId, country);
    templates = [...templates, ...seeds];
  }

  const company = parsed.company
    ? {
        ...parsed.company,
        documentRetentionDays: parsed.company.documentRetentionDays ?? 90,
        autoDeleteClientDocs: parsed.company.autoDeleteClientDocs ?? true,
        requireLegalApproval: parsed.company.requireLegalApproval ?? false,
      }
    : null;

  const teamMembers: TeamMember[] =
    Array.isArray(parsed.teamMembers) && parsed.teamMembers.length > 0
      ? parsed.teamMembers
      : parsed.user
        ? [
            {
              id: parsed.user.id,
              name: parsed.user.name,
              email: parsed.user.email,
              role: 'admin',
              status: 'active',
              invitedAt: parsed.user.createdAt,
            },
          ]
        : [];

  const clauseLibrary: SharedClauseItem[] =
    Array.isArray(parsed.clauseLibrary) && parsed.clauseLibrary.length > 0
      ? parsed.clauseLibrary
      : buildSeedClauseLibrary(country);

  const retentionDays = company?.documentRetentionDays ?? 90;
  const autoDelete = company?.autoDeleteClientDocs ?? true;
  const { contracts: purgedContracts, purgedCount } =
    purgeExpiredAttachmentsInContracts(
      parsed.contracts || [],
      retentionDays,
      autoDelete
    );

  const nextSnapshot: AppStorageSnapshot = {
    ...getDefaultSnapshot(),
    ...parsed,
    company,
    templates,
    contracts: purgedContracts,
    teamMembers,
    activeMemberId:
      parsed.activeMemberId || teamMembers[0]?.id || null,
    clauseLibrary,
  };

  return { snapshot: nextSnapshot, changed: purgedCount > 0 };
}

/* ------------------------------------------------------------------ */
/* In-memory state + server sync                                       */
/* ------------------------------------------------------------------ */
/*
 * "remote" mode (logged-in account): the server (Supabase) is the source of
 * truth. Every write updates memory immediately (UI stays synchronous) and is
 * pushed to PUT /api/workspace a moment later. Nothing big is stored in
 * localStorage anymore (it only holds ~5 MB and selfies/signatures blew it).
 *
 * "local" mode: only for the offline demo account (signInDemo).
 */

type SyncMode = 'local' | 'remote';
export type SyncStatus = 'idle' | 'saving' | 'offline' | 'error';
export type SyncEvent =
  | { type: 'snapshot'; snapshot: AppStorageSnapshot }
  | { type: 'status'; status: SyncStatus; message?: string }
  | { type: 'insufficient_credits' };

let syncMode: SyncMode = 'local';
let memory: AppStorageSnapshot | null = null;
let localRevision = 0;
let syncedRevision = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;
let retryDelay = 2000;
const listeners = new Set<(ev: SyncEvent) => void>();

function emit(ev: SyncEvent) {
  listeners.forEach((fn) => {
    try {
      fn(ev);
    } catch (err) {
      console.error(err);
    }
  });
}

function readLocalDemo(): AppStorageSnapshot {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return getDefaultSnapshot();
    const { snapshot, changed } = normalizeSnapshot(JSON.parse(raw) as AppStorageSnapshot);
    if (changed) writeLocalDemo(snapshot);
    return snapshot;
  } catch {
    return getDefaultSnapshot();
  }
}

function writeLocalDemo(snapshot: AppStorageSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    // Quota exceeded: keep working from memory instead of crashing the app.
    console.warn('[storage] localStorage cheio; dados do demo ficam só nesta aba.', err);
  }
}

function readSnapshot(): AppStorageSnapshot {
  if (!memory) {
    memory = syncMode === 'local' ? readLocalDemo() : getDefaultSnapshot();
  }
  return memory;
}

function writeSnapshot(snapshot: AppStorageSnapshot): void {
  memory = snapshot;
  try {
    localStorage.setItem('contratoja_locale', snapshot.locale);
  } catch {
    /* ignore */
  }
  if (syncMode === 'local') {
    writeLocalDemo(snapshot);
    return;
  }
  localRevision += 1;
  scheduleSync(600);
}

function scheduleSync(delay: number) {
  if (syncMode !== 'remote') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void runSync();
  }, delay);
}

async function runSync(): Promise<void> {
  if (syncMode !== 'remote' || !memory) return;
  if (inflight) {
    await inflight;
    if (localRevision !== syncedRevision) scheduleSync(50);
    return;
  }
  if (localRevision === syncedRevision) return;

  const sentRevision = localRevision;
  const sent = memory;
  emit({ type: 'status', status: 'saving' });

  inflight = (async () => {
    try {
      const server = await workspaceApi.save(sent);
      retryDelay = 2000;
      syncedRevision = Math.max(syncedRevision, sentRevision);
      if (syncMode !== 'remote') return;
      if (localRevision === sentRevision) {
        // Nothing changed meanwhile: adopt the server view (credits, signatures…)
        memory = normalizeSnapshot(server).snapshot;
        emit({ type: 'snapshot', snapshot: memory });
      } else if (memory) {
        // User kept editing: keep local edits, but trust server credits.
        memory = { ...memory, credits: server.credits, transactions: server.transactions };
        emit({ type: 'snapshot', snapshot: memory });
      }
      emit({ type: 'status', status: 'idle' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'insufficient_credits') {
        const serverSnap = err.body.snapshot as AppStorageSnapshot | null;
        syncedRevision = localRevision;
        if (serverSnap) {
          memory = normalizeSnapshot(serverSnap).snapshot;
          emit({ type: 'snapshot', snapshot: memory });
        }
        emit({ type: 'insufficient_credits' });
        emit({ type: 'status', status: 'idle' });
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        emit({ type: 'status', status: 'error', message: 'session' });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: 'status', status: 'offline', message });
      retryDelay = Math.min(retryDelay * 2, 30000);
      scheduleSync(retryDelay);
    }
  })();

  try {
    await inflight;
  } finally {
    inflight = null;
  }
  if (localRevision !== syncedRevision) scheduleSync(50);
}

export const storageSync = {
  get mode(): SyncMode {
    return syncMode;
  },

  /** Logged-in account: start from the server snapshot (or empty). */
  enterRemote(serverSnapshot: AppStorageSnapshot | null): AppStorageSnapshot {
    syncMode = 'remote';
    localRevision = 0;
    syncedRevision = 0;
    retryDelay = 2000;
    if (serverSnapshot) {
      const { snapshot, changed } = normalizeSnapshot(serverSnapshot);
      memory = snapshot;
      if (changed) {
        localRevision = 1;
        scheduleSync(600);
      }
    } else {
      memory = getDefaultSnapshot();
    }
    return memory;
  },

  /** Back to the offline demo / logged-out state. */
  enterLocal(): AppStorageSnapshot {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = null;
    syncMode = 'local';
    memory = null;
    localRevision = 0;
    syncedRevision = 0;
    return readSnapshot();
  },

  /** Pull the latest server state (e.g. a client just signed). */
  async refresh(): Promise<void> {
    if (syncMode !== 'remote' || inflight || localRevision !== syncedRevision) return;
    try {
      const server = await workspaceApi.load();
      if (!server || syncMode !== 'remote' || localRevision !== syncedRevision) return;
      memory = normalizeSnapshot(server).snapshot;
      emit({ type: 'snapshot', snapshot: memory });
    } catch {
      /* next poll will retry */
    }
  },

  /** Wait until local edits reached the server. */
  async flush(): Promise<void> {
    if (syncMode !== 'remote') return;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    await runSync();
    if (inflight) await inflight;
  },

  hasPendingChanges(): boolean {
    return syncMode === 'remote' && localRevision !== syncedRevision;
  },

  /** Apply credits/ledger coming from a server-only operation (purchase). */
  applyServerCredits(server: AppStorageSnapshot): AppStorageSnapshot {
    const current = readSnapshot();
    memory = { ...current, credits: server.credits, transactions: server.transactions };
    emit({ type: 'snapshot', snapshot: memory });
    return memory;
  },

  subscribe(fn: (ev: SyncEvent) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const storageService = {
  getSnapshot(): AppStorageSnapshot {
    return readSnapshot();
  },

  setLocale(locale: Locale): AppStorageSnapshot {
    const snap = readSnapshot();
    const updated: AppStorageSnapshot = { ...snap, locale };
    writeSnapshot(updated);
    return updated;
  },

  signUp(name: string, email: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const userId = generateId('usr');
    const companyId = generateId('cmp');
    const now = new Date().toISOString();
    const country: CountryCode = snap.locale === 'es-PY' ? 'PY' : 'BR';

    const user: UserAccount = {
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: now,
    };

    const company: CompanyProfile = {
      id: companyId,
      userId,
      name: '',
      country,
      taxId: '',
      logoDataUrl: null,
      brandColor: '#0F2544',
      address: '',
      phone: '',
      onboardingCompleted: false,
      documentRetentionDays: 90,
      autoDeleteClientDocs: true,
      requireLegalApproval: false,
      updatedAt: now,
    };

    const welcomeTx: CreditTransaction = {
      id: generateId('tx'),
      companyId,
      type: 'bonus',
      amount: 2,
      description:
        snap.locale === 'es-PY'
          ? 'Bono de bienvenida (2 créditos gratis)'
          : 'Bônus de boas-vindas (2 créditos grátis)',
      createdAt: now,
    };

    const adminMember: TeamMember = {
      id: userId,
      name: user.name,
      email: user.email,
      role: 'admin',
      status: 'active',
      invitedAt: now,
    };

    const updated: AppStorageSnapshot = {
      ...snap,
      user,
      company,
      credits: 2,
      templates: buildSeedTemplates(companyId, country),
      contracts: [],
      transactions: [welcomeTx],
      teamMembers: [adminMember],
      activeMemberId: adminMember.id,
      clauseLibrary: buildSeedClauseLibrary(country),
    };

    writeSnapshot(updated);
    return updated;
  },

  signIn(email: string): AppStorageSnapshot {
    const snap = readSnapshot();
    if (snap.user && snap.user.email.toLowerCase() === email.trim().toLowerCase()) {
      return snap;
    }
    const displayName = email.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
    return this.signUp(formattedName || 'Usuário', email);
  },

  signInDemo(locale?: Locale): AppStorageSnapshot {
    const current = readSnapshot();
    const activeLocale = locale ?? current.locale;
    const isPY = activeLocale === 'es-PY';
    const country: CountryCode = isPY ? 'PY' : 'BR';
    const userId = 'usr_demo_01';
    const companyId = 'cmp_demo_01';
    const now = Date.now();

    const user: UserAccount = {
      id: userId,
      name: isPY ? 'Mateo Benítez' : 'Mariana Costa',
      email: isPY ? 'mateo@guaranipropiedades.com.py' : 'mariana@horizonteimoveis.com.br',
      createdAt: new Date(now - 86400000 * 10).toISOString(),
    };

    const company: CompanyProfile = {
      id: companyId,
      userId,
      name: isPY ? 'Guaraní Propiedades S.A.' : 'Horizonte Imóveis & Gestão',
      country,
      taxId: isPY ? '80045912-3' : '28.419.630/0001-12',
      logoDataUrl: null,
      brandColor: '#0F2544',
      address: isPY
        ? 'Av. Mariscal López 2450, Villa Morra — Asunción'
        : 'Av. Brigadeiro Faria Lima, 1850, Conj. 64 — São Paulo/SP',
      phone: isPY ? '+595 981 440 210' : '(11) 98420-3100',
      onboardingCompleted: true,
      documentRetentionDays: 90,
      autoDeleteClientDocs: true,
      requireLegalApproval: false,
      updatedAt: new Date(now - 86400000 * 5).toISOString(),
    };

    const teamMembers: TeamMember[] = [
      {
        id: userId,
        name: user.name,
        email: user.email,
        role: 'admin',
        status: 'active',
        invitedAt: new Date(now - 86400000 * 10).toISOString(),
      },
      {
        id: 'usr_demo_corretor',
        name: isPY ? 'Lucas Ferreira' : 'Thiago Mendes',
        email: isPY ? 'lucas@guaranipropiedades.com.py' : 'thiago@horizonteimoveis.com.br',
        role: 'corretor',
        status: 'active',
        invitedAt: new Date(now - 86400000 * 8).toISOString(),
      },
      {
        id: 'usr_demo_juridico',
        name: isPY ? 'Dra. Sofía Ayala' : 'Dra. Beatriz Nogueira',
        email: isPY ? 'juridico@guaranipropiedades.com.py' : 'juridico@horizonteimoveis.com.br',
        role: 'juridico',
        status: 'active',
        invitedAt: new Date(now - 86400000 * 8).toISOString(),
      },
    ];

    const templates = buildSeedTemplates(companyId, country);

    const sampleContracts: ContractRecord[] = [
      {
        id: 'ctr_demo_01',
        code: 'CJ-2026-001',
        companyId,
        templateId: isPY ? 'tpl_sys_locacao_py' : 'tpl_sys_locacao_br',
        templateTitle: isPY ? 'Alquiler Residencial' : 'Locação Residencial',
        category: 'locacao',
        clientName: isPY ? 'Camila Villalba Ríos' : 'Rafael Henrique Almeida',
        clientDocument: isPY ? '4.512.890' : '384.910.228-40',
        clientEmail: isPY ? 'camila.villalba@correo.py' : 'rafael.almeida@email.com',
        clientPhone: isPY ? '+595 971 215 800' : '(11) 97234-8812',
        propertyAddress: isPY
          ? 'Calle Senador Long 840, Depto 4B — Asunción'
          : 'Rua dos Pinheiros, 912, Apto 74 — São Paulo/SP',
        variables: isPY
          ? {
              nome_cliente: 'Camila Villalba Ríos',
              documento_cliente: '4.512.890',
              email_cliente: 'camila.villalba@correo.py',
              telefone_cliente: '+595 971 215 800',
              direccion_inmueble: 'Calle Senador Long 840, Depto 4B — Asunción',
              plazo_meses: '12',
              fecha_inicio: '01/12/2026',
              monto_mensual: 'Gs. 3.800.000',
              dia_pago: '5',
            }
          : {
              nome_cliente: 'Rafael Henrique Almeida',
              documento_cliente: '384.910.228-40',
              email_cliente: 'rafael.almeida@email.com',
              telefone_cliente: '(11) 97234-8812',
              endereco_imovel: 'Rua dos Pinheiros, 912, Apto 74 — São Paulo/SP',
              prazo_meses: '30',
              data_inicio: '01/12/2026',
              valor_mensal: 'R$ 3.650,00',
              dia_vencimento: '5',
            },
        renderedContent: '',
        attachments: [
          {
            id: 'att_demo_1',
            fileName: isPY ? 'cedula_camila_villalba.pdf' : 'cnh_rafael_almeida.pdf',
            fileType: 'application/pdf',
            fileSize: 428100,
            docCategory: 'identity',
            uploadedAt: new Date(now - 86400000 * 2).toISOString(),
          },
          {
            id: 'att_demo_2',
            fileName: isPY ? 'comprobante_ande.jpg' : 'comprovante_residencia.jpg',
            fileType: 'image/jpeg',
            fileSize: 312000,
            docCategory: 'address_proof',
            uploadedAt: new Date(now - 86400000 * 2).toISOString(),
          },
        ],
        status: 'awaiting_signature',
        creditConsumed: true,
        signatureLink: getSignerPublicUrl('ctr_demo_01', 'demo_sign_01'),
        companySnapshot: toCompanySnapshot(company),
        createdByUserId: 'usr_demo_corretor',
        createdByName: teamMembers[1].name,
        legalApprovalStatus: 'approved',
        legalApprovedBy: teamMembers[2].name,
        legalApprovedAt: new Date(now - 86400000 * 2 - 1800000).toISOString(),
        expirationInfo: {
          endDate: toYmdOffset(24),
          adjustmentIndex: isPY ? 'IPC (BCP)' : 'IGP-M',
          adjustmentDate: toYmdOffset(24),
          summary: isPY
            ? 'Alquiler residencial con reajuste anual por IPC.'
            : 'Locação residencial com reajuste anual pelo IGP-M.',
          extractedAt: new Date(now - 86400000 * 2).toISOString(),
        },
        signatureConfig: {
          order: 'parallel',
          requireSelfie: false,
          sentAt: new Date(now - 86400000 * 2).toISOString(),
        },
        signers: [
          {
            id: 'sgn_demo_01',
            token: 'demo_sign_01',
            order: 1,
            role: isPY ? 'Locatario' : 'Locatário',
            name: isPY ? 'Camila Villalba Ríos' : 'Rafael Henrique Almeida',
            document: isPY ? '4.512.890' : '384.910.228-40',
            whatsapp: isPY ? '+595 971 215 800' : '(11) 97234-8812',
            status: 'pending',
          },
        ],
        timeline: [
          {
            id: 'tl_demo_1a',
            type: 'created',
            timestamp: new Date(now - 86400000 * 2 - 3600000).toISOString(),
            actorName: teamMembers[1].name,
          },
          {
            id: 'tl_demo_1b',
            type: 'sent',
            timestamp: new Date(now - 86400000 * 2).toISOString(),
            actorName: teamMembers[1].name,
            detail: isPY ? 'Camila Villalba Ríos' : 'Rafael Henrique Almeida',
          },
        ],
        createdAt: new Date(now - 86400000 * 2).toISOString(),
        updatedAt: new Date(now - 86400000 * 2).toISOString(),
      },
      {
        id: 'ctr_demo_02',
        code: 'CJ-2026-002',
        companyId,
        templateId: isPY ? 'tpl_sys_servicos_py' : 'tpl_sys_servicos_br',
        templateTitle: isPY ? 'Prestación de Servicios Profesionales' : 'Prestação de Serviços Profissionais',
        category: 'servicos',
        clientName: isPY ? 'Estudio Jurídico del Este' : 'Construtora Vértice Ltda',
        clientDocument: isPY ? '80091234-1' : '19.740.112/0001-55',
        clientEmail: isPY ? 'admin@estudiodeleste.com.py' : 'financeiro@vertice.com.br',
        clientPhone: isPY ? '+595 983 551 900' : '(11) 99104-5520',
        variables: isPY
          ? {
              nome_cliente: 'Estudio Jurídico del Este',
              documento_cliente: '80091234-1',
              email_cliente: 'admin@estudiodeleste.com.py',
              telefone_cliente: '+595 983 551 900',
              descripcion_servicio: 'Asesoría de administración inmobiliaria y gestión documental',
              monto_total: 'Gs. 5.200.000',
              forma_pago: 'Transferencia bancaria 50% inicio / 50% entrega',
              fecha_inicio: '10/11/2026',
              fecha_entrega: '10/12/2026',
            }
          : {
              nome_cliente: 'Construtora Vértice Ltda',
              documento_cliente: '19.740.112/0001-55',
              email_cliente: 'financeiro@vertice.com.br',
              telefone_cliente: '(11) 99104-5520',
              descricao_servico: 'Intermediação comercial e gestão de carteira locatícia',
              data_inicio: '10/11/2026',
              data_entrega: '10/12/2026',
              valor_total: 'R$ 4.800,00',
              forma_pagamento: 'PIX em 2 parcelas',
            },
        renderedContent: '',
        attachments: [
          {
            id: 'att_demo_3',
            fileName: isPY ? 'constancia_ruc_estudio.pdf' : 'cartao_cnpj_vertice.pdf',
            fileType: 'application/pdf',
            fileSize: 215400,
            docCategory: 'tax_id',
            uploadedAt: new Date(now - 86400000 * 4).toISOString(),
          },
        ],
        status: 'signed',
        creditConsumed: true,
        signatureLink: getSignerPublicUrl('ctr_demo_02', 'demo_sign_02'),
        companySnapshot: toCompanySnapshot(company),
        createdByUserId: userId,
        createdByName: user.name,
        legalApprovalStatus: 'approved',
        legalApprovedBy: teamMembers[2].name,
        legalApprovedAt: new Date(now - 86400000 * 4).toISOString(),
        expirationInfo: {
          endDate: toYmdOffset(5),
          adjustmentIndex: isPY ? 'IPC' : 'IPCA',
          adjustmentDate: toYmdOffset(5),
          summary: isPY
            ? 'Vencimiento próximo (5 días) · Renovable por igual período.'
            : 'Término próximo (5 dias) · Reajuste anual pelo IPCA em renovação.',
          extractedAt: new Date(now - 86400000 * 3).toISOString(),
        },
        signatureConfig: {
          order: 'parallel',
          requireSelfie: false,
          sentAt: new Date(now - 86400000 * 4).toISOString(),
        },
        signers: [
          {
            id: 'sgn_demo_02',
            token: 'demo_sign_02',
            order: 1,
            role: 'Contratante',
            name: isPY ? 'Estudio Jurídico del Este' : 'Construtora Vértice Ltda',
            document: isPY ? '80091234-1' : '19.740.112/0001-55',
            whatsapp: isPY ? '+595 983 551 900' : '(11) 99104-5520',
            status: 'signed',
            viewedAt: new Date(now - 86400000 * 3 - 600000).toISOString(),
            signedAt: new Date(now - 86400000 * 3).toISOString(),
            timezone: isPY ? 'America/Asuncion (UTC-3)' : 'America/Sao_Paulo (UTC-3)',
            browser: 'Chrome 131',
            device: 'Windows (Desktop)',
            consentAccepted: true,
          },
        ],
        timeline: [
          {
            id: 'tl_demo_2a',
            type: 'created',
            timestamp: new Date(now - 86400000 * 4 - 3600000).toISOString(),
            actorName: user.name,
          },
          {
            id: 'tl_demo_2b',
            type: 'sent',
            timestamp: new Date(now - 86400000 * 4).toISOString(),
            actorName: user.name,
            detail: isPY ? 'Estudio Jurídico del Este' : 'Construtora Vértice Ltda',
          },
          {
            id: 'tl_demo_2c',
            type: 'viewed',
            timestamp: new Date(now - 86400000 * 3 - 600000).toISOString(),
            actorName: isPY ? 'Estudio Jurídico del Este' : 'Construtora Vértice Ltda',
            browser: 'Chrome 131',
            device: 'Windows (Desktop)',
          },
          {
            id: 'tl_demo_2d',
            type: 'signed',
            timestamp: new Date(now - 86400000 * 3).toISOString(),
            actorName: isPY ? 'Estudio Jurídico del Este' : 'Construtora Vértice Ltda',
            timezone: isPY ? 'America/Asuncion (UTC-3)' : 'America/Sao_Paulo (UTC-3)',
            browser: 'Chrome 131',
            device: 'Windows (Desktop)',
          },
          {
            id: 'tl_demo_2e',
            type: 'completed',
            timestamp: new Date(now - 86400000 * 3).toISOString(),
          },
        ],
        createdAt: new Date(now - 86400000 * 4).toISOString(),
        updatedAt: new Date(now - 86400000 * 3).toISOString(),
        signedAt: new Date(now - 86400000 * 3).toISOString(),
      },
      {
        id: 'ctr_demo_03',
        code: 'CJ-2026-003',
        companyId,
        templateId: isPY ? 'tpl_sys_locacao_py' : 'tpl_sys_locacao_br',
        templateTitle: isPY ? 'Alquiler Residencial' : 'Locação Residencial',
        category: 'locacao',
        clientName: isPY ? 'Diego Giménez Duarte' : 'Fernanda Oliveira Santos',
        clientDocument: isPY ? '3.982.410' : '492.318.770-15',
        clientEmail: isPY ? 'diego.gimenez@correo.py' : 'fernanda.santos@email.com',
        clientPhone: isPY ? '+595 981 710 320' : '(11) 96512-4090',
        propertyAddress: isPY
          ? 'Av. España 1420, Casa 2 — Asunción'
          : 'Alameda Santos, 415, Apto 112 — São Paulo/SP',
        variables: isPY
          ? {
              nome_cliente: 'Diego Giménez Duarte',
              documento_cliente: '3.982.410',
              email_cliente: 'diego.gimenez@correo.py',
              telefone_cliente: '+595 981 710 320',
              direccion_inmueble: 'Av. España 1420, Casa 2 — Asunción',
              plazo_meses: '24',
              fecha_inicio: '15/10/2026',
              monto_mensual: 'Gs. 4.500.000',
              dia_pago: '10',
            }
          : {
              nome_cliente: 'Fernanda Oliveira Santos',
              documento_cliente: '492.318.770-15',
              email_cliente: 'fernanda.santos@email.com',
              telefone_cliente: '(11) 96512-4090',
              endereco_imovel: 'Alameda Santos, 415, Apto 112 — São Paulo/SP',
              prazo_meses: '24',
              data_inicio: '15/10/2026',
              valor_mensal: 'R$ 4.200,00',
              dia_vencimento: '10',
            },
        renderedContent: '',
        attachments: [],
        status: 'signed',
        creditConsumed: true,
        signatureLink: getSignerPublicUrl('ctr_demo_03', 'demo_sign_03'),
        companySnapshot: toCompanySnapshot(company),
        createdByUserId: 'usr_demo_corretor',
        createdByName: teamMembers[1].name,
        legalApprovalStatus: 'approved',
        legalApprovedBy: teamMembers[2].name,
        legalApprovedAt: new Date(now - 86400000 * 35).toISOString(),
        expirationInfo: {
          endDate: toYmdOffset(51),
          adjustmentIndex: isPY ? 'IPC' : 'IGP-M',
          adjustmentDate: toYmdOffset(51),
          summary: isPY
            ? 'Alquiler residencial con vencimiento en 51 días.'
            : 'Locação residencial com reajuste pelo IGP-M em 51 dias.',
          extractedAt: new Date(now - 86400000 * 33).toISOString(),
        },
        signatureConfig: {
          order: 'parallel',
          requireSelfie: false,
          sentAt: new Date(now - 86400000 * 35).toISOString(),
        },
        signers: [
          {
            id: 'sgn_demo_03',
            token: 'demo_sign_03',
            order: 1,
            role: isPY ? 'Locatario' : 'Locatário',
            name: isPY ? 'Diego Giménez Duarte' : 'Fernanda Oliveira Santos',
            document: isPY ? '3.982.410' : '492.318.770-15',
            whatsapp: isPY ? '+595 981 710 320' : '(11) 96512-4090',
            status: 'signed',
            viewedAt: new Date(now - 86400000 * 34 - 14400000).toISOString(),
            signedAt: new Date(now - 86400000 * 34).toISOString(),
            timezone: isPY ? 'America/Asuncion (UTC-3)' : 'America/Sao_Paulo (UTC-3)',
            browser: 'Safari 18',
            device: 'iPhone (Mobile)',
            consentAccepted: true,
          },
        ],
        timeline: [
          {
            id: 'tl_demo_3a',
            type: 'created',
            timestamp: new Date(now - 86400000 * 35 - 7200000).toISOString(),
            actorName: teamMembers[1].name,
          },
          {
            id: 'tl_demo_3b',
            type: 'sent',
            timestamp: new Date(now - 86400000 * 35).toISOString(),
            actorName: teamMembers[1].name,
            detail: isPY ? 'Diego Giménez Duarte' : 'Fernanda Oliveira Santos',
          },
          {
            id: 'tl_demo_3c',
            type: 'signed',
            timestamp: new Date(now - 86400000 * 34).toISOString(),
            actorName: isPY ? 'Diego Giménez Duarte' : 'Fernanda Oliveira Santos',
            timezone: isPY ? 'America/Asuncion (UTC-3)' : 'America/Sao_Paulo (UTC-3)',
            browser: 'Safari 18',
            device: 'iPhone (Mobile)',
          },
          {
            id: 'tl_demo_3d',
            type: 'completed',
            timestamp: new Date(now - 86400000 * 34).toISOString(),
          },
        ],
        createdAt: new Date(now - 86400000 * 35).toISOString(),
        updatedAt: new Date(now - 86400000 * 34).toISOString(),
        signedAt: new Date(now - 86400000 * 34).toISOString(),
      },
      {
        id: 'ctr_demo_04',
        code: 'CJ-2026-004',
        companyId,
        templateId: isPY ? 'tpl_sys_compra_venda_py' : 'tpl_sys_compra_venda_br',
        templateTitle: isPY ? 'Compraventa de Bien Mueble' : 'Compra e Venda de Bem Móvel',
        category: 'compra_venda',
        clientName: isPY ? 'Transportes Chaco S.R.L.' : 'Logística Paulista Ltda',
        clientDocument: isPY ? '80102938-4' : '41.209.540/0001-08',
        clientEmail: isPY ? 'compras@chaco.com.py' : 'juridico@logisticapaulista.com.br',
        clientPhone: isPY ? '+595 982 301 440' : '(11) 98331-2090',
        variables: isPY
          ? {
              nome_cliente: 'Transportes Chaco S.R.L.',
              documento_cliente: '80102938-4',
              endereco_comprador: 'Ruta Transchaco Km 14 — Mariano Roque Alonso',
              descricao_bem: 'Generador eléctrico industrial 45 kVA',
              valor_venda: 'Gs. 42.000.000',
              forma_pagamento: '50% seña y 50% contra entrega',
              data_entrega: '25/11/2026',
            }
          : {
              nome_cliente: 'Logística Paulista Ltda',
              documento_cliente: '41.209.540/0001-08',
              endereco_comprador: 'Av. Marginal Tietê, 3100 — São Paulo/SP',
              descricao_bem: 'Empilhadeira elétrica retrátil 2,5 toneladas',
              valor_venda: 'R$ 58.000,00',
              forma_pagamento: 'TED à vista na entrega',
              data_entrega: '25/11/2026',
            },
        renderedContent: '',
        attachments: [],
        status: 'draft',
        creditConsumed: false,
        signatureLink: 'https://contratoja.app/assinar/CJ-2026-004',
        companySnapshot: toCompanySnapshot(company),
        createdByUserId: 'usr_demo_corretor',
        createdByName: teamMembers[1].name,
        legalApprovalStatus: 'pending_approval',
        timeline: [
          {
            id: 'tl_demo_4a',
            type: 'created',
            timestamp: new Date(now - 86400000).toISOString(),
            actorName: teamMembers[1].name,
          },
          {
            id: 'tl_demo_4b',
            type: 'approval_requested',
            timestamp: new Date(now - 86400000 + 1800000).toISOString(),
            actorName: teamMembers[1].name,
          },
        ],
        createdAt: new Date(now - 86400000).toISOString(),
        updatedAt: new Date(now - 86400000).toISOString(),
      },
    ];

    for (const c of sampleContracts) {
      const tpl = templates.find((t) => t.id === c.templateId);
      if (tpl) {
        c.renderedContent = renderContractTemplate(tpl.content, c.variables, company);
      }
    }

    const transactions: CreditTransaction[] = [
      {
        id: 'tx_demo_1',
        companyId,
        type: 'bonus',
        amount: 2,
        description: isPY ? 'Bono de bienvenida (2 créditos gratis)' : 'Bônus de boas-vindas (2 créditos grátis)',
        createdAt: new Date(now - 86400000 * 38).toISOString(),
      },
      {
        id: 'tx_demo_2',
        companyId,
        type: 'purchase',
        amount: 10,
        description: isPY ? 'Paquete Suelto (10 contratos)' : 'Pacote Avulso (10 contratos)',
        packageId: 'avulso',
        priceDisplay: isPY ? 'Gs. 115.000' : 'R$ 79,90',
        paymentMethod: isPY ? 'Transferencia PY' : 'PIX',
        createdAt: new Date(now - 86400000 * 36).toISOString(),
      },
      {
        id: 'tx_demo_3',
        companyId,
        type: 'usage',
        amount: -1,
        description: 'CJ-2026-003',
        createdAt: new Date(now - 86400000 * 35).toISOString(),
      },
      {
        id: 'tx_demo_4',
        companyId,
        type: 'usage',
        amount: -1,
        description: 'CJ-2026-002',
        createdAt: new Date(now - 86400000 * 4).toISOString(),
      },
      {
        id: 'tx_demo_5',
        companyId,
        type: 'usage',
        amount: -1,
        description: 'CJ-2026-001',
        createdAt: new Date(now - 86400000 * 2).toISOString(),
      },
    ];

    const updated: AppStorageSnapshot = {
      user,
      company,
      locale: activeLocale,
      credits: 9,
      templates,
      contracts: sampleContracts,
      transactions,
      teamMembers,
      activeMemberId: teamMembers[0].id,
      clauseLibrary: buildSeedClauseLibrary(country),
    };

    writeSnapshot(updated);
    return updated;
  },

  signOut(): AppStorageSnapshot {
    const snap = readSnapshot();
    const updated: AppStorageSnapshot = {
      ...snap,
      user: null,
    };
    writeSnapshot(updated);
    return updated;
  },

  saveCompanyProfile(
    payload: Omit<CompanyProfile, 'id' | 'userId' | 'updatedAt'>
  ): AppStorageSnapshot {
    const snap = readSnapshot();
    const companyId = snap.company?.id || generateId('cmp');
    const userId = snap.user?.id || 'usr_local';

    const company: CompanyProfile = {
      ...snap.company,
      ...payload,
      id: companyId,
      userId,
      documentRetentionDays:
        payload.documentRetentionDays ??
        snap.company?.documentRetentionDays ??
        90,
      autoDeleteClientDocs:
        payload.autoDeleteClientDocs ??
        snap.company?.autoDeleteClientDocs ??
        true,
      requireLegalApproval:
        payload.requireLegalApproval ??
        snap.company?.requireLegalApproval ??
        false,
      updatedAt: new Date().toISOString(),
    };

    const templates =
      snap.templates.length > 0
        ? snap.templates
        : buildSeedTemplates(companyId, payload.country);

    const updated: AppStorageSnapshot = {
      ...snap,
      company,
      templates,
    };
    writeSnapshot(updated);
    return updated;
  },

  saveTemplate(
    tpl: Omit<ContractTemplate, 'id' | 'companyId' | 'updatedAt'> & { id?: string }
  ): { snapshot: AppStorageSnapshot; template: ContractTemplate } {
    const snap = readSnapshot();
    const companyId = snap.company?.id || 'cmp_local';
    const now = new Date().toISOString();

    let savedTemplate: ContractTemplate;
    let nextTemplates: ContractTemplate[];

    if (tpl.id) {
      const prev = snap.templates.find((t) => t.id === tpl.id);
      savedTemplate = {
        id: tpl.id,
        companyId,
        title: tpl.title,
        category: tpl.category,
        country: tpl.country,
        language: tpl.language,
        parties: tpl.parties,
        fields: tpl.fields,
        content: tpl.content,
        isSystemTemplate: tpl.isSystemTemplate,
        sharedToLibrary: tpl.sharedToLibrary ?? prev?.sharedToLibrary ?? false,
        updatedAt: now,
      };
      nextTemplates = snap.templates.map((t) => (t.id === tpl.id ? savedTemplate : t));
    } else {
      savedTemplate = {
        id: generateId('tpl'),
        companyId,
        title: tpl.title,
        category: tpl.category,
        country: tpl.country,
        language: tpl.language,
        parties: tpl.parties,
        fields: tpl.fields,
        content: tpl.content,
        isSystemTemplate: Boolean(tpl.isSystemTemplate),
        sharedToLibrary: Boolean(tpl.sharedToLibrary),
        updatedAt: now,
      };
      nextTemplates = [savedTemplate, ...snap.templates];
    }

    const updated = { ...snap, templates: nextTemplates };
    writeSnapshot(updated);
    return { snapshot: updated, template: savedTemplate };
  },

  deleteTemplate(templateId: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const updated: AppStorageSnapshot = {
      ...snap,
      templates: snap.templates.filter((t) => t.id !== templateId),
    };
    writeSnapshot(updated);
    return updated;
  },

  saveContract(payload: {
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
    attachments: ContractRecord['attachments'];
    finalize: boolean;
    consumeCreditOnDraft?: boolean;
    expirationInfo?: ContractExpirationInfo;
    renewedFromContractId?: string;
  }): { snapshot: AppStorageSnapshot; contract: ContractRecord; insufficientCredits?: boolean } {
    const snap = readSnapshot();
    const companyId = snap.company?.id || 'cmp_local';
    const now = new Date().toISOString();
    const activeMember = getActiveTeamMember(snap);

    const existing = payload.id ? snap.contracts.find((c) => c.id === payload.id) : undefined;
    const alreadyConsumed = existing?.creditConsumed ?? false;
    const willConsume = payload.finalize || Boolean(payload.consumeCreditOnDraft);
    const needsCredit = willConsume && !alreadyConsumed;

    if (needsCredit && snap.credits < 1) {
      return {
        snapshot: snap,
        contract: existing as ContractRecord,
        insufficientCredits: true,
      };
    }

    const nextNumber = snap.contracts.length + 1;
    const code =
      existing?.code || `CJ-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`;
    const status: ContractStatus = payload.finalize
      ? existing?.status === 'signed'
        ? 'signed'
        : 'awaiting_signature'
      : 'draft';

    const matchedTpl = snap.templates.find((t) => t.id === payload.templateId);
    const inferredCategory = payload.category || existing?.category || matchedTpl?.category;
    const inferredAddress =
      payload.propertyAddress ||
      existing?.propertyAddress ||
      payload.variables.endereco_imovel ||
      payload.variables.direccion_inmueble ||
      payload.variables.endereco ||
      undefined;

    const requireApproval = Boolean(snap.company?.requireLegalApproval);
    const initialApprovalStatus: LegalApprovalStatus =
      existing?.legalApprovalStatus ||
      (requireApproval ? 'pending_approval' : 'not_required');

    const contractId = existing?.id || generateId('ctr');
    const existingTimeline: ContractTimelineEvent[] = existing?.timeline
      ? [...existing.timeline]
      : [
          {
            id: generateId('tl'),
            type: 'created',
            timestamp: existing?.createdAt || now,
            actorName: activeMember?.name || snap.user?.name,
          },
        ];

    const contract: ContractRecord = {
      id: contractId,
      code,
      companyId,
      companySnapshot: existing?.companySnapshot || toCompanySnapshot(snap.company),
      templateId: payload.templateId,
      templateTitle: payload.templateTitle,
      category: inferredCategory,
      clientName: payload.clientName,
      clientDocument: payload.clientDocument,
      clientEmail: payload.clientEmail,
      clientPhone: payload.clientPhone,
      propertyAddress: inferredAddress,
      variables: payload.variables,
      renderedContent: payload.renderedContent,
      attachments: payload.attachments,
      attachmentsPurgedAt: existing?.attachmentsPurgedAt,
      status,
      creditConsumed: alreadyConsumed || willConsume,
      signatureLink: existing?.signatureLink || `https://contratoja.app/assinar/${code}`,
      signatureConfig: existing?.signatureConfig,
      signers: existing?.signers,
      timeline: existingTimeline,
      documentHash: existing?.documentHash,
      createdByUserId: existing?.createdByUserId || activeMember?.id || snap.user?.id,
      createdByName: existing?.createdByName || activeMember?.name || snap.user?.name,
      legalApprovalStatus: initialApprovalStatus,
      legalApprovedBy: existing?.legalApprovedBy,
      legalApprovedAt: existing?.legalApprovedAt,
      legalApprovalNote: existing?.legalApprovalNote,
      expirationInfo: payload.expirationInfo || existing?.expirationInfo,
      renewedFromContractId: payload.renewedFromContractId || existing?.renewedFromContractId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      signedAt: existing?.signedAt,
    };

    const contracts = existing
      ? snap.contracts.map((c) => (c.id === existing.id ? contract : c))
      : [contract, ...snap.contracts];

    let credits = snap.credits;
    let transactions = snap.transactions;

    if (needsCredit) {
      credits = Math.max(0, snap.credits - 1);
      const usageTx: CreditTransaction = {
        id: generateId('tx'),
        companyId,
        type: 'usage',
        amount: -1,
        description: `${contract.code} · ${contract.clientName}`,
        createdAt: now,
      };
      transactions = [usageTx, ...snap.transactions];
    }

    const updated: AppStorageSnapshot = {
      ...snap,
      credits,
      contracts,
      transactions,
    };
    writeSnapshot(updated);
    return { snapshot: updated, contract };
  },

  sendContractForSignature(payload: {
    contractId: string;
    signers: Array<{
      role?: string;
      name: string;
      document: string;
      whatsapp: string;
    }>;
    order: SigningOrder;
    requireSelfie: boolean;
  }): {
    snapshot: AppStorageSnapshot;
    contract: ContractRecord;
    insufficientCredits?: boolean;
    legalApprovalRequired?: boolean;
  } {
    const snap = readSnapshot();
    const existing = snap.contracts.find((c) => c.id === payload.contractId);
    if (!existing) {
      throw new Error('Contrato não encontrado.');
    }

    if (
      snap.company?.requireLegalApproval &&
      existing.legalApprovalStatus !== 'approved'
    ) {
      return {
        snapshot: snap,
        contract: existing,
        legalApprovalRequired: true,
      };
    }

    const needsCredit = !existing.creditConsumed;
    if (needsCredit && snap.credits < 1) {
      return {
        snapshot: snap,
        contract: existing,
        insufficientCredits: true,
      };
    }

    const now = new Date().toISOString();
    const companyId = snap.company?.id || existing.companyId;
    const newSigners: ContractSigner[] = payload.signers.map((s, idx) => ({
      id: generateId('sgn'),
      token: generateSignerToken(),
      order: idx + 1,
      role: s.role?.trim() || undefined,
      name: s.name.trim(),
      document: s.document.trim(),
      whatsapp: s.whatsapp.trim(),
      status: 'pending',
    }));

    const existingTimeline: ContractTimelineEvent[] = existing.timeline
      ? [...existing.timeline]
      : [
          {
            id: generateId('tl'),
            type: 'created',
            timestamp: existing.createdAt,
            actorName: snap.user?.name,
          },
        ];

    existingTimeline.push({
      id: generateId('tl'),
      type: 'sent',
      timestamp: now,
      actorName: snap.user?.name,
      detail: newSigners.map((s) => s.name).join(', '),
    });

    const updatedContract: ContractRecord = {
      ...existing,
      companySnapshot: toCompanySnapshot(snap.company) || existing.companySnapshot,
      status: 'awaiting_signature',
      creditConsumed: true,
      signatureLink:
        newSigners.length > 0
          ? getSignerPublicUrl(existing.id, newSigners[0].token)
          : existing.signatureLink,
      signatureConfig: {
        order: payload.order,
        requireSelfie: payload.requireSelfie,
        sentAt: now,
      },
      signers: newSigners,
      timeline: existingTimeline,
      updatedAt: now,
    };

    let credits = snap.credits;
    let transactions = snap.transactions;

    if (needsCredit) {
      credits = Math.max(0, snap.credits - 1);
      transactions = [
        {
          id: generateId('tx'),
          companyId,
          type: 'usage',
          amount: -1,
          description: `${updatedContract.code} · ${updatedContract.clientName}`,
          createdAt: now,
        },
        ...snap.transactions,
      ];
    }

    const updated: AppStorageSnapshot = {
      ...snap,
      credits,
      contracts: snap.contracts.map((c) =>
        c.id === updatedContract.id ? updatedContract : c
      ),
      transactions,
    };
    writeSnapshot(updated);
    return { snapshot: updated, contract: updatedContract };
  },

  getPublicContractForSigning(
    contractId: string,
    token: string
  ): {
    contract: ContractRecord;
    signer: ContractSigner;
    company: ContractCompanySnapshot | null;
    blockedBySigner: ContractSigner | null;
    locale: Locale;
  } | null {
    const snap = readSnapshot();
    const contract = snap.contracts.find((c) => c.id === contractId);
    if (!contract || !contract.signers) return null;
    const signer = contract.signers.find((s) => s.token === token);
    if (!signer) return null;

    let blockedBySigner: ContractSigner | null = null;
    if (
      contract.signatureConfig?.order === 'sequential' &&
      signer.status === 'pending'
    ) {
      const priorPending = contract.signers
        .slice()
        .sort((a, b) => a.order - b.order)
        .find((s) => s.order < signer.order && s.status !== 'signed');
      if (priorPending) {
        blockedBySigner = priorPending;
      }
    }

    const company =
      contract.companySnapshot || toCompanySnapshot(snap.company) || null;

    return {
      contract,
      signer,
      company,
      blockedBySigner,
      locale: snap.locale,
    };
  },

  recordSignerView(
    contractId: string,
    token: string,
    audit: ClientAuditMetadata
  ): AppStorageSnapshot | null {
    const snap = readSnapshot();
    const contract = snap.contracts.find((c) => c.id === contractId);
    if (!contract || !contract.signers) return null;
    const signer = contract.signers.find((s) => s.token === token);
    if (!signer || signer.viewedAt) return snap;

    const updatedSigners = contract.signers.map((s) =>
      s.token === token ? { ...s, viewedAt: audit.timestamp } : s
    );
    const nextTimeline: ContractTimelineEvent[] = [
      ...(contract.timeline || []),
      {
        id: generateId('tl'),
        type: 'viewed',
        timestamp: audit.timestamp,
        actorName: signer.name,
        timezone: audit.timezone,
        browser: audit.browser,
        device: audit.device,
      },
    ];

    const updatedContract: ContractRecord = {
      ...contract,
      signers: updatedSigners,
      timeline: nextTimeline,
      updatedAt: audit.timestamp,
    };

    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) =>
        c.id === contractId ? updatedContract : c
      ),
    };
    writeSnapshot(updated);
    return updated;
  },

  async submitSignerSignature(
    contractId: string,
    token: string,
    payload: {
      name: string;
      document: string;
      signatureDataUrl: string;
      selfieDataUrl?: string;
      consentAccepted: boolean;
      audit: ClientAuditMetadata;
    }
  ): Promise<{
    snapshot: AppStorageSnapshot;
    contract: ContractRecord;
    signer: ContractSigner;
    allSigned: boolean;
  } | null> {
    const snap = readSnapshot();
    const contract = snap.contracts.find((c) => c.id === contractId);
    if (!contract || !contract.signers) return null;
    const targetSigner = contract.signers.find((s) => s.token === token);
    if (!targetSigner) return null;

    const updatedSigner: ContractSigner = {
      ...targetSigner,
      name: payload.name.trim(),
      document: payload.document.trim(),
      status: 'signed',
      viewedAt: targetSigner.viewedAt || payload.audit.timestamp,
      signedAt: payload.audit.timestamp,
      timezone: payload.audit.timezone,
      browser: payload.audit.browser,
      device: payload.audit.device,
      userAgent: payload.audit.userAgent,
      signatureDataUrl: payload.signatureDataUrl,
      selfieDataUrl: payload.selfieDataUrl || targetSigner.selfieDataUrl,
      consentAccepted: payload.consentAccepted,
    };

    const updatedSigners = contract.signers.map((s) =>
      s.token === token ? updatedSigner : s
    );
    const allSigned = updatedSigners.every((s) => s.status === 'signed');

    const nextTimeline: ContractTimelineEvent[] = [
      ...(contract.timeline || []),
      {
        id: generateId('tl'),
        type: 'signed',
        timestamp: payload.audit.timestamp,
        actorName: updatedSigner.name,
        timezone: payload.audit.timezone,
        browser: payload.audit.browser,
        device: payload.audit.device,
      },
    ];

    let updatedContract: ContractRecord = {
      ...contract,
      signers: updatedSigners,
      timeline: nextTimeline,
      status: allSigned ? 'signed' : 'awaiting_signature',
      signedAt: allSigned ? payload.audit.timestamp : contract.signedAt,
      updatedAt: payload.audit.timestamp,
    };

    if (allSigned) {
      const hash = await computeContractSha256(updatedContract);
      updatedContract = {
        ...updatedContract,
        documentHash: hash,
        timeline: [
          ...nextTimeline,
          {
            id: generateId('tl'),
            type: 'completed',
            timestamp: payload.audit.timestamp,
            detail: hash,
          },
        ],
      };
    }

    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) =>
        c.id === contractId ? updatedContract : c
      ),
    };
    writeSnapshot(updated);

    return {
      snapshot: updated,
      contract: updatedContract,
      signer: updatedSigner,
      allSigned,
    };
  },

  async verifyContractByCodeOrHash(rawQuery: string): Promise<{
    found: boolean;
    authentic: boolean;
    contract?: ContractRecord;
    computedHash?: string;
    company?: ContractCompanySnapshot | null;
    locale: Locale;
  }> {
    const snap = readSnapshot();
    const q = rawQuery.trim();
    if (!q) {
      return { found: false, authentic: false, locale: snap.locale };
    }

    // Support pasting full verify URL (e.g. https://.../verificar?code=...)
    let searchToken = q;
    try {
      if (q.startsWith('http://') || q.startsWith('https://')) {
        const parsed = new URL(q);
        searchToken = parsed.searchParams.get('code') || q;
      }
    } catch {
      searchToken = q;
    }

    const norm = searchToken.trim().toLowerCase();
    const contract = snap.contracts.find(
      (c) =>
        c.code.toLowerCase() === norm ||
        c.id.toLowerCase() === norm ||
        (c.documentHash && c.documentHash.toLowerCase() === norm)
    );

    if (!contract) {
      return { found: false, authentic: false, locale: snap.locale };
    }

    const computedHash = await computeContractSha256(contract);
    const company =
      contract.companySnapshot || toCompanySnapshot(snap.company) || null;

    if (contract.status !== 'signed') {
      return {
        found: true,
        authentic: false,
        contract,
        computedHash,
        company,
        locale: snap.locale,
      };
    }

    const hashMatches = contract.documentHash
      ? contract.documentHash.toLowerCase() === computedHash.toLowerCase()
      : true;

    return {
      found: true,
      authentic: hashMatches,
      contract: contract.documentHash
        ? contract
        : { ...contract, documentHash: computedHash },
      computedHash,
      company,
      locale: snap.locale,
    };
  },

  markContractSigned(contractId: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const now = new Date().toISOString();
    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) => {
        if (c.id !== contractId) return c;
        const nextSigners = c.signers?.map((s) =>
          s.status === 'signed'
            ? s
            : { ...s, status: 'signed' as const, signedAt: now }
        );
        const nextTimeline: ContractTimelineEvent[] = [
          ...(c.timeline || []),
          {
            id: generateId('tl'),
            type: 'signed',
            timestamp: now,
            actorName: c.clientName,
          },
          {
            id: generateId('tl'),
            type: 'completed',
            timestamp: now,
          },
        ];
        return {
          ...c,
          signers: nextSigners,
          timeline: nextTimeline,
          status: 'signed',
          signedAt: now,
          updatedAt: now,
        };
      }),
    };
    writeSnapshot(updated);
    return updated;
  },

  deleteContract(contractId: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.filter((c) => c.id !== contractId),
    };
    writeSnapshot(updated);
    return updated;
  },

  purchaseCredits(
    pkg: CreditPackage,
    country: CountryCode,
    paymentMethod: string,
    packageLabel: string
  ): AppStorageSnapshot {
    const snap = readSnapshot();
    const companyId = snap.company?.id || 'cmp_local';
    const price = country === 'PY' ? pkg.pricePYG : pkg.priceBRL;
    const tx: CreditTransaction = {
      id: generateId('tx'),
      companyId,
      type: 'purchase',
      amount: pkg.credits,
      description: `${packageLabel} (+${pkg.credits})`,
      packageId: pkg.id,
      priceDisplay: formatCurrency(price, country),
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    const updated: AppStorageSnapshot = {
      ...snap,
      credits: snap.credits + pkg.credits,
      transactions: [tx, ...snap.transactions],
    };
    writeSnapshot(updated);
    return updated;
  },

  resetToDemo(): AppStorageSnapshot {
    const snap = readSnapshot();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return this.signInDemo(snap.locale);
  },

  exportJsonBackup(): string {
    return JSON.stringify(readSnapshot(), null, 2);
  },

  // --- Profissional Plan: Team & Legal Approval ---

  inviteTeamMember(payload: {
    name: string;
    email: string;
    role: TeamRole;
  }): AppStorageSnapshot {
    const snap = readSnapshot();
    const now = new Date().toISOString();
    const member: TeamMember = {
      id: generateId('mbr'),
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      role: payload.role,
      status: 'invited',
      invitedAt: now,
    };
    const updated: AppStorageSnapshot = {
      ...snap,
      teamMembers: [...(snap.teamMembers || []), member],
    };
    writeSnapshot(updated);
    return updated;
  },

  updateTeamMemberRole(memberId: string, role: TeamRole): AppStorageSnapshot {
    const snap = readSnapshot();
    const updated: AppStorageSnapshot = {
      ...snap,
      teamMembers: (snap.teamMembers || []).map((m) =>
        m.id === memberId ? { ...m, role } : m
      ),
    };
    writeSnapshot(updated);
    return updated;
  },

  removeTeamMember(memberId: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const remaining = (snap.teamMembers || []).filter((m) => m.id !== memberId);
    const nextActive =
      snap.activeMemberId === memberId ? remaining[0]?.id || null : snap.activeMemberId;
    const updated: AppStorageSnapshot = {
      ...snap,
      teamMembers: remaining,
      activeMemberId: nextActive,
    };
    writeSnapshot(updated);
    return updated;
  },

  switchActiveMember(memberId: string | null): AppStorageSnapshot {
    const snap = readSnapshot();
    const target = memberId
      ? (snap.teamMembers || []).find((m) => m.id === memberId)
      : null;
    const updated: AppStorageSnapshot = {
      ...snap,
      activeMemberId: target ? target.id : null,
      teamMembers: (snap.teamMembers || []).map((m) =>
        target && m.id === target.id ? { ...m, status: 'active' } : m
      ),
    };
    writeSnapshot(updated);
    return updated;
  },

  setRequireLegalApproval(enabled: boolean): AppStorageSnapshot {
    const snap = readSnapshot();
    if (!snap.company) return snap;
    const updated: AppStorageSnapshot = {
      ...snap,
      company: {
        ...snap.company,
        requireLegalApproval: enabled,
        updatedAt: new Date().toISOString(),
      },
    };
    writeSnapshot(updated);
    return updated;
  },

  requestLegalApproval(contractId: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const now = new Date().toISOString();
    const actor = getActiveTeamMember(snap)?.name || snap.user?.name;
    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) => {
        if (c.id !== contractId) return c;
        return {
          ...c,
          legalApprovalStatus: 'pending_approval',
          legalApprovalNote: undefined,
          timeline: [
            ...(c.timeline || []),
            {
              id: generateId('tl'),
              type: 'approval_requested',
              timestamp: now,
              actorName: actor,
            },
          ],
          updatedAt: now,
        };
      }),
    };
    writeSnapshot(updated);
    return updated;
  },

  approveContractLegal(contractId: string, note?: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const now = new Date().toISOString();
    const actor = getActiveTeamMember(snap)?.name || snap.user?.name;
    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) => {
        if (c.id !== contractId) return c;
        return {
          ...c,
          legalApprovalStatus: 'approved',
          legalApprovedBy: actor,
          legalApprovedAt: now,
          legalApprovalNote: note?.trim() || undefined,
          timeline: [
            ...(c.timeline || []),
            {
              id: generateId('tl'),
              type: 'approved',
              timestamp: now,
              actorName: actor,
              detail: note?.trim() || undefined,
            },
          ],
          updatedAt: now,
        };
      }),
    };
    writeSnapshot(updated);
    return updated;
  },

  rejectContractLegal(contractId: string, note: string): AppStorageSnapshot {
    const snap = readSnapshot();
    const now = new Date().toISOString();
    const actor = getActiveTeamMember(snap)?.name || snap.user?.name;
    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) => {
        if (c.id !== contractId) return c;
        return {
          ...c,
          legalApprovalStatus: 'rejected',
          legalApprovedBy: actor,
          legalApprovedAt: now,
          legalApprovalNote: note.trim(),
          timeline: [
            ...(c.timeline || []),
            {
              id: generateId('tl'),
              type: 'rejected',
              timestamp: now,
              actorName: actor,
              detail: note.trim(),
            },
          ],
          updatedAt: now,
        };
      }),
    };
    writeSnapshot(updated);
    return updated;
  },

  // --- Profissional Plan: Expirations & Renewal ---

  saveContractExpirationInfo(
    contractId: string,
    info: ContractExpirationInfo
  ): AppStorageSnapshot {
    const snap = readSnapshot();
    const updated: AppStorageSnapshot = {
      ...snap,
      contracts: snap.contracts.map((c) =>
        c.id === contractId
          ? { ...c, expirationInfo: info, updatedAt: new Date().toISOString() }
          : c
      ),
    };
    writeSnapshot(updated);
    return updated;
  },

  // --- Profissional Plan: Anonymized Clause Library (+2 Credits) ---

  shareTemplateToLibrary(payload: {
    templateId: string;
    clauses: Array<{ title: string; legalBasis?: string; clauseText: string }>;
    category: TemplateCategory;
    country: CountryCode;
  }): { snapshot: AppStorageSnapshot; creditsAwarded: number } {
    const snap = readSnapshot();
    const now = new Date().toISOString();
    const companyId = snap.company?.id || 'cmp_local';
    const existingTpl = snap.templates.find((t) => t.id === payload.templateId);
    const alreadyShared = Boolean(existingTpl?.sharedToLibrary);

    const newClauses: SharedClauseItem[] = payload.clauses
      .filter((c) => c.clauseText && c.clauseText.trim().length > 15)
      .map((c) => ({
        id: generateId('cl'),
        title: c.title.trim(),
        category: payload.category,
        country: payload.country,
        legalBasis: c.legalBasis?.trim() || undefined,
        clauseText: c.clauseText.trim(),
        sharedAt: now,
      }));

    const creditsAwarded = alreadyShared ? 0 : 2;
    const nextTransactions =
      creditsAwarded > 0
        ? [
            {
              id: generateId('tx'),
              companyId,
              type: 'bonus' as const,
              amount: creditsAwarded,
              description:
                snap.locale === 'es-PY'
                  ? `Contribución anónima a biblioteca (${existingTpl?.title || 'Plantilla'})`
                  : `Compartilhamento anônimo na biblioteca (${existingTpl?.title || 'Modelo'})`,
              createdAt: now,
            },
            ...snap.transactions,
          ]
        : snap.transactions;

    const updated: AppStorageSnapshot = {
      ...snap,
      credits: snap.credits + creditsAwarded,
      transactions: nextTransactions,
      templates: snap.templates.map((t) =>
        t.id === payload.templateId ? { ...t, sharedToLibrary: true } : t
      ),
      clauseLibrary: [...newClauses, ...(snap.clauseLibrary || [])],
    };

    writeSnapshot(updated);
    return { snapshot: updated, creditsAwarded };
  },

  // --- Profissional Plan: Retention Purge ---

  purgeExpiredClientDocuments(
    immediateSignedPurge = false
  ): { snapshot: AppStorageSnapshot; purgedCount: number } {
    const snap = readSnapshot();
    const retentionDays = snap.company?.documentRetentionDays ?? 90;
    const autoDelete = snap.company?.autoDeleteClientDocs ?? true;

    const { contracts, purgedCount } = purgeExpiredAttachmentsInContracts(
      snap.contracts,
      immediateSignedPurge ? 0.000001 : retentionDays,
      immediateSignedPurge ? true : autoDelete
    );

    if (purgedCount === 0) {
      return { snapshot: snap, purgedCount: 0 };
    }

    const updated: AppStorageSnapshot = {
      ...snap,
      contracts,
    };
    writeSnapshot(updated);
    return { snapshot: updated, purgedCount };
  },
};

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.post('/api/templates/analyze', async (req, res) => {
    try {
      const { rawText, locale, country } = req.body as {
        rawText?: string;
        locale?: string;
        country?: string;
      };

      if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 20) {
        res.status(400).json({
          error: 'O texto do documento está vazio ou muito curto para análise.',
        });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = `Você é um especialista jurídico em automação de contratos para empresas do Brasil (pt-BR) e Paraguai (es-PY).
Sua tarefa é analisar o texto bruto de um contrato ou recibo enviado pelo usuário, identificar TODOS os dados variáveis (nomes de pessoas ou empresas, CPFs, CNPJs, RUC, Cédulas de Identidade / RG, endereços completos, valores monetários, datas, prazos, números de matrícula/placa/chassi, descrições específicas de objeto/serviço, formas de pagamento, dias de vencimento, cidades/comarcas) e convertê-lo em um modelo reutilizável.

REGRAS OBRIGATÓRIAS:
1. No campo "templateText", preserve a redação e estrutura original do documento, substituindo cada trecho variável identificado por {{nome_do_campo}} em snake_case sem acentos (ex: {{nome_locador}}, {{cpf_locatario}}, {{valor_aluguel}}, {{data_inicio}}, {{endereco_imovel}}).
2. Se o mesmo dado aparecer repetido no texto (por exemplo, o nome do locatário em mais de uma cláusula), use exatamente o mesmo {{nome_do_campo}}.
3. Caso o documento já contenha lacunas como "______", "[NOME]", "(valor)", transforme essas lacunas em {{nome_do_campo}} adequados ao contexto.
4. Para cada campo criado em {{...}}, retorne um item em "fields" com:
   - "key": exatamente o identificador usado dentro de {{...}} (apenas letras minúsculas, números e underscore).
   - "label": rótulo claro no idioma do documento (${locale === 'es-PY' ? 'Español' : 'Português'}).
   - "type": deve ser EXATAMENTE um destes valores: "texto", "cpf_ci", "data", "moeda", "numero", "endereco".
   - "party": a qual parte ou contexto pertence (ex: "locador", "locatario", "fiador", "contratante", "contratado", "comprador", "vendedor", "pagador", "recebedor", "contrato").
5. Sugira um título curto ("suggestedTitle"), uma categoria ("suggestedCategory": exatamente "locacao", "compra_venda", "servicos", "recibo" ou "outros") e a lista legível das partes envolvidas ("parties", ex: ["Locador", "Locatário"]).
6. País padrão de contexto: ${country === 'PY' ? 'Paraguai (RUC, C.I., Guaraníes)' : 'Brasil (CPF/CNPJ, RG, Reais)'}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analise o documento abaixo e extraia o modelo parametrizado em JSON:\n\n${rawText.slice(0, 60000)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedTitle: {
                type: Type.STRING,
                description: 'Título sugerido para o modelo de contrato.',
              },
              suggestedCategory: {
                type: Type.STRING,
                description:
                  'Uma das categorias: locacao, compra_venda, servicos, recibo, outros.',
              },
              parties: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista das partes envolvidas no documento.',
              },
              templateText: {
                type: Type.STRING,
                description:
                  'Texto completo do contrato com todas as variáveis substituídas por {{nome_do_campo}}.',
              },
              fields: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: {
                      type: Type.STRING,
                      description: 'Identificador snake_case sem chaves.',
                    },
                    label: {
                      type: Type.STRING,
                      description: 'Rótulo amigável do campo.',
                    },
                    type: {
                      type: Type.STRING,
                      description:
                        'Um de: texto, cpf_ci, data, moeda, numero, endereco.',
                    },
                    party: {
                      type: Type.STRING,
                      description:
                        'Parte a que pertence (locador, locatario, fiador, contratante, contratado, comprador, vendedor, contrato, etc.).',
                    },
                  },
                  required: ['key', 'label', 'type', 'party'],
                },
              },
            },
            required: [
              'suggestedTitle',
              'suggestedCategory',
              'parties',
              'templateText',
              'fields',
            ],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      res.json(parsed);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao processar modelo com Gemini.';
      console.error('Gemini template analyze error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/contracts/extract-documents', async (req, res) => {
    try {
      const { documents, fields, country, locale } = req.body as {
        documents?: Array<{
          party: string;
          docType: string;
          fileName: string;
          mimeType: string;
          base64Data: string;
        }>;
        fields?: Array<{
          key: string;
          label: string;
          type: string;
          party: string;
        }>;
        country?: string;
        locale?: string;
      };

      if (!Array.isArray(fields) || fields.length === 0) {
        res.status(400).json({ error: 'Lista de campos do modelo não informada.' });
        return;
      }

      if (!Array.isArray(documents) || documents.length === 0) {
        res.status(400).json({ error: 'Nenhum documento enviado para leitura.' });
        return;
      }

      const ai = getGeminiClient();

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      documents.forEach((doc, idx) => {
        parts.push({
          text: `DOCUMENTO ${idx + 1}: Parte="${doc.party}", Tipo="${doc.docType}", Arquivo="${doc.fileName}"`,
        });
        parts.push({
          inlineData: {
            mimeType: doc.mimeType,
            data: doc.base64Data,
          },
        });
      });

      const fieldsSpec = fields
        .map(
          (f) =>
            `- key: "${f.key}" | rotulo: "${f.label}" | tipo: "${f.type}" | parte: "${f.party}"`
        )
        .join('\n');

      parts.push({
        text: `Analise TODOS os documentos enviados acima e extraia os valores correspondentes aos campos do contrato abaixo.
Contexto do país: ${country === 'PY' ? 'Paraguai (Cédula de Identidad, RUC, datas DD/MM/AAAA, moeda Gs.)' : 'Brasil (RG, CNH, CPF, CNPJ, datas DD/MM/AAAA, moeda R$)'}.
Idioma da resposta: ${locale === 'es-PY' ? 'Español' : 'Português'}.

CAMPOS DO MODELO:
${fieldsSpec}

INSTRUÇÕES IMPORTANTES:
1. Retorne um item em "extractions" para CADA campo listado acima (mantendo exatamente o mesmo "key").
2. Respeite a parte ("parte") de cada documento: dados de um documento enviado para o "Locatário" devem preencher os campos do "Locatário", não os do "Locador" ou "Fiador".
3. Para "source": informe o nome amigável do documento onde o dado foi encontrado (ex: "CNH · Locatário (arquivo.jpg)" ou "Matrícula do Imóvel"). Se não estiver em nenhum documento, informe "".
4. Para "confidence": use EXATAMENTE "alto", "medio", "baixo" ou "nao_encontrado":
   - "alto": texto perfeitamente legível e inequívoco no documento.
   - "medio": provável ou parcialmente inferido (ex: foto com leve desfoque).
   - "baixo": leitura incerta, borrada ou ambígua — exige conferência manual.
   - "nao_encontrado": dado não aparece em nenhum documento enviado (ou é condição negocial como valor do aluguel, prazo, dia de vencimento).
5. Para "isDocumentField": true se o campo normalmente vem de documentos pessoais/imobiliários (nome, CPF/CNPJ/CI/RUC, RG, endereço, estado civil, matrícula), ou false se for condição comercial/negocial que nunca está nos documentos pessoais (ex: valor_mensal, valor_total, prazo_meses, dia_vencimento, data_inicio, forma_pagamento, descricao_servico).
6. Formate datas como DD/MM/AAAA e documentos (CPF/CNPJ) com pontuação padrão quando legíveis.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING },
                    source: { type: Type.STRING },
                    confidence: {
                      type: Type.STRING,
                      description: 'alto, medio, baixo ou nao_encontrado',
                    },
                    isDocumentField: { type: Type.BOOLEAN },
                  },
                  required: [
                    'key',
                    'value',
                    'source',
                    'confidence',
                    'isDocumentField',
                  ],
                },
              },
            },
            required: ['extractions'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao extrair dados dos documentos com Gemini.';
      console.error('Gemini document extract error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/contracts/review', async (req, res) => {
    try {
      const { contractText, category, country, locale, variables } = req.body as {
        contractText?: string;
        category?: string;
        country?: string;
        locale?: string;
        variables?: Record<string, string>;
      };

      if (!contractText || contractText.trim().length < 20) {
        res.status(400).json({
          error: 'O texto do contrato está vazio para revisão.',
        });
        return;
      }

      const ai = getGeminiClient();

      const legalContext =
        country === 'PY'
          ? 'Legislação da República del Paraguay (Código Civil Paraguayo, Ley de Locaciones, Ley 6534, requisitos de RUC/Cédula e concordancia conyugal cuando corresponda).'
          : 'Legislação Brasileira (Código Civil Brasileiro, Lei do Inquilinato nº 8.245/91 quando locação, Código de Defesa do Consumidor quando aplicável, outorga uxória/marital de fiador art. 1.647 CC, LGPD).';

      const systemInstruction = `Você é um revisor jurídico sênior especializado em contratos comerciais, imobiliários e de prestação de serviços no ${country === 'PY' ? 'Paraguai' : 'Brasil'}.
Contexto legal: ${legalContext}
Idioma da resposta: ${locale === 'es-PY' ? 'Español (Paraguay)' : 'Português (Brasil)'}.

Analise o contrato preenchido e os dados informados procurando:
1. ALERTAS DE INCONSISTÊNCIA OU ERROS ("alerts"):
   - Datas incoerentes (ex: data de início posterior à data de entrega/término, prazos contraditórios).
   - Valor numérico divergente do valor por extenso.
   - Nomes, CPFs/CNPJs/RUCs/C.I. divergentes entre qualificação e corpo, ou campos ainda com [colchetes] sem preenchimento.
   - Fiador sem cônjuge / outorga uxória informada (quando houver fiador/garante).
   - Qualificação incompleta de partes (falta endereço, documento ou forma de pagamento).
   Para cada alerta, informe:
   - "id": identificador curto único.
   - "severity": "alta" | "media" | "baixa".
   - "title": título curto e claro do problema.
   - "description": explicação objetiva de como corrigir.
   - "targetExcerpt": trecho exato do contrato onde ocorre o problema (ou "" se for ausência geral).
   - "suggestedReplacement": sugestão pronta de substituição para o trecho (ou "" se depender de dado manual do usuário).

2. SUGESTÕES DE CLÁUSULAS FALTANTES ("clauseSuggestions") conforme a lei do país e categoria ("${category || 'outros'}"):
   - Ex.: cláusula de multa moratória e juros, rescisão antecipada e aviso prévio, vistoria do imóvel, proteção de dados (LGPD / Ley 6534), foro de eleição, reajuste anual (IGP-M/IPCA no BR ou IPC no PY).
   - Só sugira cláusulas que REALMENTE não existam no texto enviado.
   Para cada sugestão:
   - "id": identificador curto único.
   - "title": título da cláusula sugerida.
   - "legalBasis": base legal resumida (ex: "Art. 4º da Lei 8.245/91" ou "Código Civil Paraguayo").
   - "reason": por que é importante incluir.
   - "clauseText": texto completo da cláusula numerada/redigida pronto para ser inserido no contrato.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `DADOS PREENCHIDOS:\n${JSON.stringify(variables || {}, null, 2)}\n\nTEXTO DO CONTRATO:\n${contractText.slice(0, 60000)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    severity: {
                      type: Type.STRING,
                      description: 'alta, media ou baixa',
                    },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    targetExcerpt: { type: Type.STRING },
                    suggestedReplacement: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'severity',
                    'title',
                    'description',
                    'targetExcerpt',
                    'suggestedReplacement',
                  ],
                },
              },
              clauseSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    legalBasis: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    clauseText: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'title',
                    'legalBasis',
                    'reason',
                    'clauseText',
                  ],
                },
              },
            },
            required: ['alerts', 'clauseSuggestions'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao revisar contrato com Gemini.';
      console.error('Gemini contract review error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/contracts/extract-terms', async (req, res) => {
    try {
      const { contractText, variables, country, locale } = req.body as {
        contractText?: string;
        variables?: Record<string, string>;
        country?: string;
        locale?: string;
      };

      if (!contractText || contractText.trim().length < 20) {
        res.status(400).json({ error: 'Texto do contrato insuficiente.' });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = `Você é um analista jurídico especializado em gestão de vigência e reajustes contratuais (${country === 'PY' ? 'Paraguai' : 'Brasil'}).
Analise o texto do contrato e os dados preenchidos para extrair:
1. "endDate": data exata de término / vencimento do contrato no formato ISO "YYYY-MM-DD". Se houver data de início + prazo em meses/anos (ex: 12 ou 30 meses), CALCULE a data final exata em YYYY-MM-DD. Se não houver prazo definido (ex: recibo avulso), retorne "".
2. "adjustmentIndex": índice de reajuste previsto (ex: "IGP-M", "IPCA", "INPC", "IPC", "Salário Mínimo" ou "" se não houver previsão).
3. "adjustmentDate": próxima data prevista para reajuste anual no formato "YYYY-MM-DD" (geralmente 12 meses após a data de início se houver previsão de reajuste ou se for contrato de locação/serviços contínuo). Retorne "" se não aplicável.
4. "summary": resumo curto em 1 frase no idioma ${locale === 'es-PY' ? 'Español' : 'Português'} explicando a vigência e regra de reajuste encontrada.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `VARIÁVEIS:\n${JSON.stringify(variables || {}, null, 2)}\n\nCONTRATO:\n${contractText.slice(0, 40000)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              endDate: { type: Type.STRING },
              adjustmentIndex: { type: Type.STRING },
              adjustmentDate: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: ['endDate', 'adjustmentIndex', 'adjustmentDate', 'summary'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao extrair vigência e reajuste com Gemini.';
      console.error('Gemini extract terms error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/templates/anonymize-clauses', async (req, res) => {
    try {
      const { templateText, category, country, locale } = req.body as {
        templateText?: string;
        category?: string;
        country?: string;
        locale?: string;
      };

      if (!templateText || templateText.trim().length < 20) {
        res.status(400).json({ error: 'Texto do modelo muito curto.' });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = `Você é um especialista em privacidade jurídica (LGPD / Ley 6534) e curadoria de cláusulas contratuais.
Receba um modelo de contrato de categoria "${category || 'outros'}" (${country === 'PY' ? 'Paraguai' : 'Brasil'}) e extraia de 2 a 5 cláusulas jurídicas úteis e reutilizáveis para a Biblioteca Pública ContratoJá.

REGRAS CRÍTICAS DE ANONIMIZAÇÃO:
1. REMOVA COMPLETAMENTE qualquer nome de pessoa ou empresa, CPF, CNPJ, RUC, C.I., RG, endereço completo, cidade específica, telefone, e-mail ou valor monetário real.
2. Caso exista qualquer dado específico remanescente, substitua por termos neutros ou placeholders genéricos (ex: {{nome_parte}}, {{valor_ajustado}}, {{prazo_meses}}).
3. NÃO inclua cabeçalhos de qualificação das partes — extraia apenas cláusulas substantivas (ex: Multa e Juros, Reajuste IGP-M/IPCA, Vistoria, Rescisão, Confidencialidade, Foro, Garantia).
4. Idioma: ${locale === 'es-PY' ? 'Español (Paraguay)' : 'Português (Brasil)'}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extraia e anonimize as cláusulas deste modelo:\n\n${templateText.slice(0, 45000)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              anonymizedFullText: {
                type: Type.STRING,
                description:
                  'Texto completo do modelo com todos os dados pessoais removidos/anonimizados.',
              },
              clauses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    legalBasis: { type: Type.STRING },
                    clauseText: { type: Type.STRING },
                  },
                  required: ['title', 'legalBasis', 'clauseText'],
                },
              },
            },
            required: ['anonymizedFullText', 'clauses'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao anonimizar cláusulas com Gemini.';
      console.error('Gemini anonymize clauses error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ContratoJá server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type {
  CompanyProfile,
  ContractCompanySnapshot,
  ContractSigner,
  Locale,
} from '../types';
import { getVerifyPublicUrl } from '../utils/cryptoAndDevice';

export interface ContractExportInput {
  company: CompanyProfile | ContractCompanySnapshot | null;
  contractTitle: string;
  contractCode: string;
  renderedContent: string;
  clientName: string;
  clientDocument: string;
  locale: Locale;
  signers?: ContractSigner[];
  documentHash?: string;
  verificationUrl?: string;
  completedAt?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return [15, 37, 68];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return [15, 37, 68];
  }
  return [r, g, b];
}

function formatLocationDateLine(
  company: CompanyProfile | ContractCompanySnapshot | null,
  locale: Locale
): string {
  const dateStr = new Date().toLocaleDateString(
    locale === 'es-PY' ? 'es-PY' : 'pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' }
  );
  const rawAddr = company?.address || '';
  const cityMatch = rawAddr.split('—').pop()?.trim() || '';
  if (cityMatch && cityMatch.length < 40) {
    return `${cityMatch}, ${dateStr}.`;
  }
  return dateStr;
}

/**
 * Ensures clauses in the exported document are cleanly numbered when they are
 * body paragraphs/clauses without existing numbering.
 */
function structureParagraphsWithNumberedClauses(rawText: string): Array<{
  text: string;
  isHeading: boolean;
}> {
  const blocks = rawText
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  let clauseCounter = 0;
  return blocks.map((block, index) => {
    const firstLine = block.split('\n')[0]?.trim() || '';
    const isAllCapsTitle =
      index === 0 &&
      firstLine.length <= 90 &&
      firstLine === firstLine.toUpperCase();

    if (isAllCapsTitle) {
      return { text: block, isHeading: true };
    }

    const alreadyNumbered =
      /^(CLÁUSULA|CLAUSULA|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|\d+[ª°.)\-])/i.test(
        firstLine
      );

    // Keep party identification paragraphs unnumbered; number substantive clauses
    const isPartyIntro =
      index <= 2 &&
      /^(LOCADOR|LOCAT[ÁA]RIO|CONTRATANTE|CONTRATADA|PRESTADOR|VENDEDOR|COMPRADOR|EMISOR|RECEBEDOR|FIADOR|ENTRE\b)/i.test(
        firstLine
      );

    if (alreadyNumbered || isPartyIntro) {
      return {
        text: block,
        isHeading: /^(CLÁUSULA|CLAUSULA)/i.test(firstLine),
      };
    }

    // If short closing line ("Emitido em ..."), don't force a clause number
    if (
      index === blocks.length - 1 &&
      block.length < 120 &&
      /(emitido|firmado|suscripto|fecha|data)/i.test(firstLine)
    ) {
      return { text: block, isHeading: false };
    }

    clauseCounter += 1;
    return {
      text: `${clauseCounter}. ${block}`,
      isHeading: false,
    };
  });
}

async function loadImageAsPngDataUrl(
  dataUrl: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 200;
      canvas.height = img.height || 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: img.width || 200,
        height: img.height || 200,
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function generateContractPdfA4(
  input: ContractExportInput
): Promise<void> {
  const {
    company,
    contractTitle,
    contractCode,
    renderedContent,
    clientName,
    clientDocument,
    locale,
  } = input;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;
  const footerReserved = 20;
  const maxContentY = pageHeight - footerReserved;
  const brandHex = company?.brandColor || '#0F2544';
  const [r, g, b] = hexToRgb(brandHex);
  const docIdLabel = company?.country === 'PY' ? 'RUC' : 'CNPJ';

  // Top brand color bar
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 4, 'F');

  let cursorY = 14;

  // Header with Company Logo & Info
  let textStartX = marginX;
  if (company?.logoDataUrl) {
    const pngLogo = await loadImageAsPngDataUrl(company.logoDataUrl);
    if (pngLogo) {
      const maxH = 14;
      const maxW = 24;
      const ratio = Math.min(maxW / pngLogo.width, maxH / pngLogo.height);
      const drawW = pngLogo.width * ratio;
      const drawH = pngLogo.height * ratio;
      doc.addImage(pngLogo.dataUrl, 'PNG', marginX, cursorY - 2, drawW, drawH);
      textStartX = marginX + drawW + 5;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(r, g, b);
  doc.text(company?.name || 'ContratoJá', textStartX, cursorY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const infoLine = `${docIdLabel}: ${company?.taxId || '—'}${company?.phone ? ` · ${company.phone}` : ''}`;
  doc.text(infoLine, textStartX, cursorY + 7);
  if (company?.address) {
    const addrWrapped = doc.splitTextToSize(
      company.address,
      pageWidth - marginX - textStartX - 28
    );
    doc.text(addrWrapped, textStartX, cursorY + 11.5);
  }

  // Contract code on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(contractCode, pageWidth - marginX, cursorY + 2, { align: 'right' });

  cursorY += 19;
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 9;

  // Body Clauses
  const structured = structureParagraphsWithNumberedClauses(renderedContent);

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > maxContentY) {
      doc.addPage();
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, pageWidth, 2.5, 'F');
      cursorY = 18;
    }
  };

  for (const item of structured) {
    if (item.isHeading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
    }

    const lines = doc.splitTextToSize(item.text, contentWidth) as string[];
    const lineHeight = item.isHeading ? 5.6 : 5.0;
    ensureSpace(lines.length * lineHeight + 4);

    lines.forEach((line) => {
      if (cursorY + lineHeight > maxContentY) {
        doc.addPage();
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, pageWidth, 2.5, 'F');
        cursorY = 18;
      }
      doc.text(line, marginX, cursorY);
      cursorY += lineHeight;
    });

    cursorY += 3.5;
  }

  // Location & Date + Signatures
  const activeSigners = (input.signers || []).filter(
    (s) => s.status === 'signed' || Boolean(s.signatureDataUrl)
  );
  const allSigners = input.signers || [];

  ensureSpace(58);
  cursorY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(formatLocationDateLine(company, locale), marginX, cursorY);
  cursorY += 14;

  const sigColW = (contentWidth - 14) / 2;

  if (allSigners.length > 0) {
    // Draw company block + all signers in 2-column grid
    const sigEntries: Array<{
      name: string;
      docText: string;
      signatureDataUrl?: string;
      signedAt?: string;
    }> = [
      {
        name: company?.name || 'Empresa',
        docText: `${docIdLabel}: ${company?.taxId || '—'}`,
      },
      ...allSigners.map((s) => ({
        name: s.name,
        docText: s.document || '—',
        signatureDataUrl: s.signatureDataUrl,
        signedAt: s.signedAt,
      })),
    ];

    for (let i = 0; i < sigEntries.length; i += 2) {
      ensureSpace(34);
      const rowY = cursorY;
      const pair = [sigEntries[i], sigEntries[i + 1]].filter(Boolean);

      for (let col = 0; col < pair.length; col++) {
        const entry = pair[col];
        const colX = col === 0 ? marginX : marginX + sigColW + 14;

        if (entry.signatureDataUrl) {
          try {
            doc.addImage(
              entry.signatureDataUrl,
              'PNG',
              colX + 4,
              rowY - 2,
              42,
              14
            );
          } catch {
            // Skip invalid image safely
          }
        }

        const lineY = rowY + 14;
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.35);
        doc.line(colX, lineY, colX + sigColW, lineY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(entry.name.slice(0, 42), colX, lineY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(entry.docText, colX, lineY + 8.5);

        if (entry.signedAt) {
          const dt = new Date(entry.signedAt).toLocaleString(
            locale === 'es-PY' ? 'es-PY' : 'pt-BR'
          );
          doc.setFontSize(7);
          doc.setTextColor(5, 150, 105);
          doc.text(
            `${locale === 'es-PY' ? 'Firmado' : 'Assinado'}: ${dt}`,
            colX,
            lineY + 12.2
          );
        }
      }

      cursorY += 32;
    }
  } else {
    cursorY += 6;
    const leftSigX = marginX;
    const rightSigX = marginX + sigColW + 14;

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.35);
    doc.line(leftSigX, cursorY, leftSigX + sigColW, cursorY);
    doc.line(rightSigX, cursorY, rightSigX + sigColW, cursorY);

    cursorY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(company?.name || 'Empresa', leftSigX, cursorY);
    doc.text(clientName || 'Cliente', rightSigX, cursorY);

    cursorY += 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(`${docIdLabel}: ${company?.taxId || '—'}`, leftSigX, cursorY);
    doc.text(clientDocument || '—', rightSigX, cursorY);
  }

  // Dedicated Page: Comprovante de Assinatura Eletrônica (SHA-256 + QR Code + Signers Audit)
  const shouldIncludeCertificate =
    Boolean(input.documentHash) ||
    (allSigners.length > 0 && activeSigners.length === allSigners.length);

  if (shouldIncludeCertificate) {
    doc.addPage();
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 4, 'F');

    let certY = 18;
    const isPY = locale === 'es-PY';
    const certTitle = isPY
      ? 'COMPROBANTE DE FIRMA ELECTRÓNICA'
      : 'COMPROVANTE DE ASSINATURA ELETRÔNICA';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(r, g, b);
    doc.text(certTitle, marginX, certY);

    certY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      isPY
        ? 'Registro criptográfico de autenticidad e integridad documental (ContratoJá)'
        : 'Registro criptográfico de autenticidade e integridade documental (ContratoJá)',
      marginX,
      certY
    );

    certY += 5;
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(marginX, certY, pageWidth - marginX, certY);
    certY += 8;

    const hashValue = input.documentHash || contractCode;
    const verifyUrl =
      input.verificationUrl || getVerifyPublicUrl(hashValue);

    // Top Summary Box + QR Code
    let qrDataUrl: string | null = null;
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#0F2544', light: '#FFFFFF' },
      });
    } catch {
      qrDataUrl = null;
    }

    const boxHeight = 38;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, certY, contentWidth, boxHeight, 2, 2, 'FD');

    const textColWidth = qrDataUrl ? contentWidth - 40 : contentWidth - 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${contractTitle} · ${contractCode}`, marginX + 4, certY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const completedStr = input.completedAt
      ? new Date(input.completedAt).toLocaleString(isPY ? 'es-PY' : 'pt-BR')
      : new Date().toLocaleString(isPY ? 'es-PY' : 'pt-BR');
    doc.text(
      `${isPY ? 'Finalizado el' : 'Concluído em'}: ${completedStr}`,
      marginX + 4,
      certY + 12.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text('Hash SHA-256 (Web Crypto):', marginX + 4, certY + 18.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    const hashLines = doc.splitTextToSize(hashValue, textColWidth) as string[];
    doc.text(hashLines, marginX + 4, certY + 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(5, 150, 105);
    const urlLines = doc.splitTextToSize(verifyUrl, textColWidth) as string[];
    doc.text(urlLines.slice(0, 2), marginX + 4, certY + 31);

    if (qrDataUrl) {
      doc.addImage(
        qrDataUrl,
        'PNG',
        pageWidth - marginX - 33,
        certY + 3,
        30,
        30
      );
    }

    certY += boxHeight + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isPY ? 'Registro de Firmantes' : 'Registro dos Signatários',
      marginX,
      certY
    );
    certY += 6;

    const signersForCert =
      allSigners.length > 0
        ? allSigners
        : [
            {
              id: 'client',
              token: '',
              order: 1,
              name: clientName,
              document: clientDocument,
              whatsapp: '',
              status: 'signed' as const,
              signedAt: input.completedAt,
            },
          ];

    for (const s of signersForCert) {
      if (certY + 34 > maxContentY) {
        doc.addPage();
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, pageWidth, 2.5, 'F');
        certY = 18;
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(marginX, certY, contentWidth, 28, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${s.order}. ${s.name}`, marginX + 4, certY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${isPY ? 'Documento' : 'Documento'}: ${s.document || '—'}${s.whatsapp ? ` · WhatsApp: ${s.whatsapp}` : ''}`,
        marginX + 4,
        certY + 11.5
      );

      const signedTime = s.signedAt
        ? new Date(s.signedAt).toLocaleString(isPY ? 'es-PY' : 'pt-BR')
        : '—';
      doc.text(
        `${isPY ? 'Fecha/Hora' : 'Data/Hora'}: ${signedTime} · ${isPY ? 'Huso' : 'Fuso'}: ${s.timezone || '—'}`,
        marginX + 4,
        certY + 16.5
      );
      doc.text(
        `${isPY ? 'Navegador' : 'Navegador'}: ${s.browser || '—'} · ${isPY ? 'Dispositivo' : 'Dispositivo'}: ${s.device || '—'}`,
        marginX + 4,
        certY + 21.5
      );

      if (s.signatureDataUrl) {
        try {
          doc.addImage(
            s.signatureDataUrl,
            'PNG',
            pageWidth - marginX - 36,
            certY + 6,
            32,
            13
          );
        } catch {
          // Ignore invalid image
        }
      }

      certY += 32;
    }
  }

  // Page X of Y Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${contractTitle} · ${contractCode}`, marginX, pageHeight - 9);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 9,
      { align: 'right' }
    );
  }

  const safeSlug = (clientName || contractTitle || 'contrato')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

  doc.save(`${contractCode}-${safeSlug}.pdf`);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function generateContractDocx(
  input: ContractExportInput
): Promise<void> {
  const {
    company,
    contractTitle,
    contractCode,
    renderedContent,
    clientName,
    clientDocument,
    locale,
  } = input;

  const brandHex = (company?.brandColor || '#0F2544').replace('#', '');
  const docIdLabel = company?.country === 'PY' ? 'RUC' : 'CNPJ';
  const structured = structureParagraphsWithNumberedClauses(renderedContent);

  const headerChildren: Paragraph[] = [];

  if (company?.logoDataUrl) {
    const pngLogo = await loadImageAsPngDataUrl(company.logoDataUrl);
    if (pngLogo) {
      const bytes = dataUrlToUint8Array(pngLogo.dataUrl);
      if (bytes) {
        const ratio = Math.min(80 / pngLogo.width, 44 / pngLogo.height);
        headerChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bytes,
                transformation: {
                  width: Math.round(pngLogo.width * ratio),
                  height: Math.round(pngLogo.height * ratio),
                },
                type: 'png',
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: company?.name || 'ContratoJá',
          bold: true,
          size: 24,
          color: brandHex,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${docIdLabel}: ${company?.taxId || '—'}${company?.phone ? ` · ${company.phone}` : ''}${company?.address ? ` · ${company.address}` : ''}`,
          size: 17,
          color: '475569',
          font: 'Calibri',
        }),
      ],
      border: {
        bottom: {
          color: brandHex,
          space: 6,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
      spacing: { after: 200 },
    })
  );

  const bodyParagraphs: Array<Paragraph | Table> = structured.map(
    (item) =>
      new Paragraph({
        children: [
          new TextRun({
            text: item.text,
            bold: item.isHeading,
            size: item.isHeading ? 23 : 21,
            color: item.isHeading ? '0F172A' : '1E293B',
            font: 'Calibri',
          }),
        ],
        spacing: {
          after: 160,
          line: 276,
        },
      })
  );

  bodyParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: formatLocationDateLine(company, locale),
          size: 21,
          color: '1E293B',
          font: 'Calibri',
        }),
      ],
      spacing: { before: 240, after: 480 },
    })
  );

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 46, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '64748B' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 20 },
                children: [
                  new TextRun({
                    text: company?.name || 'Empresa',
                    bold: true,
                    size: 19,
                    color: '0F172A',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${docIdLabel}: ${company?.taxId || '—'}`,
                    size: 17,
                    color: '475569',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph('')],
          }),
          new TableCell({
            width: { size: 46, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '64748B' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 20 },
                children: [
                  new TextRun({
                    text: clientName || 'Cliente',
                    bold: true,
                    size: 19,
                    color: '0F172A',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: clientDocument || '—',
                    size: 17,
                    color: '475569',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  bodyParagraphs.push(signatureTable);

  const docxDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips
              height: 16838, // A4 height in twips
            },
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${contractTitle} · ${contractCode}   |   Página `,
                    size: 16,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '64748B',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        },
        children: bodyParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(docxDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeSlug = (clientName || contractTitle || 'contrato')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  a.href = url;
  a.download = `${contractCode}-${safeSlug}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

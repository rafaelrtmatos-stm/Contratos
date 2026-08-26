import jsPDF from 'jspdf';
import * as mammoth from 'mammoth';
import { supabase } from './supabaseClient';
import { downloadTemplateWithCache } from './supabaseTemplateStorage';
import { getCustomWordTemplate, CustomTemplateKey } from './docxProcessor';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

/**
 * Converte HTML gerado pelo Mammoth a partir de um DOCX em um PDF
 * formatado com jsPDF, servindo como fallback garantido 100% offline/client-side.
 */
export async function convertHtmlToPdfFallback(
  htmlContent: string,
  documentTitle: string = 'Modelo de Contrato'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin + 10;

  // Cria um elemento temporário para parsear a estrutura do HTML do Mammoth
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
  const body = htmlDoc.body;

  // Cabeçalho institucional do modelo
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('CENTRAL DE MODELOS — DOCUMENTO DE REFERÊNCIA', pageWidth / 2, margin - 2, { align: 'center' });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, margin + 2, pageWidth - margin, margin + 2);

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin + 8;
      // Linha sutil no topo das páginas seguintes
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, margin + 2, pageWidth - margin, margin + 2);
    }
  };

  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';

      if (!text && tagName !== 'hr' && tagName !== 'br') return;

      if (tagName === 'h1') {
        checkPageBreak(16);
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42); // slate-900
        const lines = doc.splitTextToSize(text.toUpperCase(), contentWidth);
        doc.text(lines, pageWidth / 2, y, { align: 'center' });
        y += lines.length * 6 + 4;
      } else if (tagName === 'h2') {
        checkPageBreak(12);
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59); // slate-800
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5.2 + 3;
      } else if (tagName === 'h3' || tagName === 'h4') {
        checkPageBreak(10);
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // slate-700
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 4.8 + 2.5;
      } else if (tagName === 'p') {
        checkPageBreak(8);
        const isCentered = el.style?.textAlign === 'center' || text.startsWith('CLÁUSULA') || text.startsWith('CONTRATO');
        const isBold = el.querySelector('strong') !== null && el.children.length === 1;

        doc.setFont('times', isBold ? 'bold' : 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 30);

        const lines = doc.splitTextToSize(text, contentWidth);
        if (isCentered && lines.length <= 2) {
          doc.text(lines, pageWidth / 2, y, { align: 'center' });
        } else {
          doc.text(lines, margin, y);
        }
        y += lines.length * 4.6 + 3.2;
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items = el.querySelectorAll('li');
        items.forEach((item, index) => {
          const itemText = item.textContent?.trim() || '';
          if (!itemText) return;
          checkPageBreak(7);
          doc.setFont('times', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 30, 30);
          const prefix = tagName === 'ol' ? `${index + 1}. ` : '• ';
          const fullText = `${prefix}${itemText}`;
          const lines = doc.splitTextToSize(fullText, contentWidth - 4);
          doc.text(lines, margin + 4, y);
          y += lines.length * 4.5 + 2;
        });
      } else if (tagName === 'table') {
        const rows = el.querySelectorAll('tr');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('th, td');
          if (cells.length === 0) return;
          checkPageBreak(8);
          const colWidth = contentWidth / cells.length;
          cells.forEach((cell, cIdx) => {
            const cellText = cell.textContent?.trim() || '';
            const isHeader = cell.tagName.toLowerCase() === 'th';
            doc.setFont('times', isHeader ? 'bold' : 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 30, 30);
            const lines = doc.splitTextToSize(cellText, colWidth - 2);
            doc.text(lines, margin + cIdx * colWidth + 1, y);
          });
          y += 6;
        });
        y += 2;
      } else if (tagName === 'hr') {
        checkPageBreak(5);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      }
    }
  };

  // Processa todos os filhos do corpo do documento
  Array.from(body.children).forEach(processNode);

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      `Página ${i} de ${totalPages} — Modelo: ${documentTitle}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

/**
 * Converte um buffer de arquivo .docx em Blob de PDF.
 * Tenta primeiro via Edge Function (alta fidelidade iLoveAPI); caso indisponível,
 * usa o conversor client-side integrado (Mammoth + jsPDF).
 */
export async function convertDocxArrayBufferToPdfBlob(
  docxBuffer: ArrayBuffer,
  filename: string = 'modelo.docx'
): Promise<Blob> {
  const safeFilename = filename.replace(/[^\w.\-]/g, '_');

  // 1) Tentativa primária: Edge Function convert-docx-to-pdf
  try {
    await supabase.auth.getSession();
    const docxBase64 = arrayBufferToBase64(docxBuffer);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('convert-docx-to-pdf', {
          body: { docxBase64, filename: safeFilename },
        });

        if (!error && data?.pdfBase64) {
          return base64ToBlob(data.pdfBase64, 'application/pdf');
        }

        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600));
        }
      } catch (invErr) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
  } catch (err) {
    console.warn('Edge Function convert-docx-to-pdf não disponível, usando conversor local:', err);
  }

  // 2) Fallback robusto no navegador: Mammoth HTML -> jsPDF
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: docxBuffer });
    const cleanTitle = filename.replace(/\.docx$/i, '').replace(/_/g, ' ');
    return await convertHtmlToPdfFallback(result.value, cleanTitle);
  } catch (fallbackErr: any) {
    throw new Error(`Falha ao converter modelo Word para PDF: ${fallbackErr.message || 'Erro de renderização'}`);
  }
}

/**
 * Baixa um modelo oficial do Storage do Supabase convertido para PDF.
 */
export async function downloadOfficialTemplateAsPdf(arquivoNome: string): Promise<void> {
  const { sucesso, blob, erro } = await downloadTemplateWithCache(arquivoNome);
  if (!sucesso || !blob) {
    throw new Error(erro || `Arquivo "${arquivoNome}" não encontrado no storage.`);
  }

  const arrayBuffer = await blob.arrayBuffer();
  const pdfBlob = await convertDocxArrayBufferToPdfBlob(arrayBuffer, arquivoNome);

  const pdfFileName = arquivoNome.replace(/\.docx$/i, '.pdf');
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Baixa o modelo personalizado ativo do usuário convertido para PDF.
 */
export async function downloadCustomTemplateAsPdf(
  templateKey: CustomTemplateKey,
  displayName: string = 'modelo_personalizado'
): Promise<void> {
  const templateBuffer = await getCustomWordTemplate(templateKey);
  if (!templateBuffer) {
    throw new Error(`Nenhum modelo personalizado encontrado para ${templateKey}.`);
  }

  const pdfBlob = await convertDocxArrayBufferToPdfBlob(templateBuffer, `${displayName}.docx`);
  const pdfFileName = `${displayName.replace(/\.docx$/i, '')}.pdf`;

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

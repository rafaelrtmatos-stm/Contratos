// Carimbo digital de assinatura eletrônica desenhado no PDF final (jsPDF).
// Utiliza a renderização de altíssima fidelidade em PNG (renderSignatureStampPng)
// com o layout institucional idêntico à tela e ao Word: painel azul com linhas decorativas,
// medalhão circular "ASSINADO ELETRONICAMENTE", dados completos do cliente,
// blocos HASH e ID, rodapé de integridade e QR Code de validação.

import { renderSignatureStampPng } from './signatureStampImage';

export interface PdfStampData {
  signerName: string;
  cpfCnpj: string;
  roleLabel?: string;
  dateStr: string;
  timeStr: string;
  signatureId: string;
  hash: string;
  validationUrl: string;
}

// Proporção física: 33% da largura da página A4 (210mm * 0.33 = ~70mm) e altura proporcional (3.158:1 = ~22.2mm)
export const STAMP_WIDTH = 70;
export const STAMP_HEIGHT = 22.2;

/** Desenha um carimbo digital completo centralizado na largura da página; retorna o novo Y. */
export async function drawDigitalSignatureStamp(
  doc: any,
  yStart: number,
  pageW: number,
  data: PdfStampData
): Promise<number> {
  const y0 = yStart + 2;
  const w = Math.round(pageW * 0.33); // 33% exato da largura da página
  const h = parseFloat((w / 3.158).toFixed(1)); // Altura proporcional
  const x0 = (pageW - w) / 2;

  try {
    const stampResult = await renderSignatureStampPng({
      signerName: data.signerName,
      cpfCnpj: data.cpfCnpj,
      roleLabel: data.roleLabel || 'CONTRATADO',
      dateStr: data.dateStr,
      timeStr: data.timeStr,
      signatureId: data.signatureId,
      hash: data.hash,
      validationUrl: data.validationUrl,
    });

    // Insere o PNG de altíssima definição no documento PDF
    doc.addImage(stampResult.bytes, 'PNG', x0, y0, w, h, undefined, 'FAST');
  } catch (err) {
    console.error('Erro ao renderizar selo PNG no PDF:', err);
    // Fallback: moldura básica
    doc.setDrawColor(0, 33, 77);
    doc.setLineWidth(0.35);
    doc.roundedRect(x0, y0, w, h, 2, 2, 'D');
  }

  return y0 + h + 4;
}

/** Bloco compacto "pendente" (sem carimbo) para signatários que ainda não assinaram. */
export function drawPendingStampNote(doc: any, y: number, x: number, label: string): number {
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`[Pendente de Autenticação Digital${label ? ' - ' + label : ''}]`, x, y);
  doc.setTextColor(30, 30, 30);
  return y;
}

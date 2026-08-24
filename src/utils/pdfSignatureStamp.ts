// Carimbo digital de assinatura eletrônica desenhado no PDF final (jsPDF).
// Mesmo layout/paleta usado no CRM (drawDigitalSignatureStamp em contratoPdf.ts):
// painel institucional azul à esquerda, identificação do assinante, data/hora/ID,
// integridade verificada, hash SHA-256, documento protegido e QR Code de validação.

export interface PdfStampData {
  signerName: string;
  cpfCnpj: string;
  dateStr: string;
  timeStr: string;
  signatureId: string;
  hash: string;
  validationUrl: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const STAMP_COLORS = {
  azulPrincipal: hexToRgb('#0D376B'),
  azulSecundario: hexToRgb('#164A82'),
  verdeValidacao: hexToRgb('#18A544'),
  cinzaTexto: hexToRgb('#3F4D63'),
  branco: hexToRgb('#FFFFFF'),
};

function drawShieldCheck(doc: any, cx: number, cy: number, r: number, shieldRgb: number[], checkRgb: number[], lw = 0.45) {
  doc.setFillColor(shieldRgb[0], shieldRgb[1], shieldRgb[2]);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(checkRgb[0], checkRgb[1], checkRgb[2]);
  doc.setLineWidth(lw);
  doc.line(cx - r * 0.45, cy, cx - r * 0.1, cy + r * 0.4);
  doc.line(cx - r * 0.1, cy + r * 0.4, cx + r * 0.5, cy - r * 0.35);
}

function drawLockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.4) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.roundedRect(cx - size / 2, cy - size * 0.1, size, size * 0.7, size * 0.06, size * 0.06, 'D');
  doc.circle(cx, cy - size * 0.35, size * 0.32, 'D');
}

function drawCalendarIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.35) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.roundedRect(cx - size / 2, cy - size / 2, size, size, size * 0.06, size * 0.06, 'D');
  doc.line(cx - size / 2, cy - size * 0.15, cx + size / 2, cy - size * 0.15);
}

function drawClockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.35) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.circle(cx, cy, size / 2, 'D');
  doc.line(cx, cy, cx, cy - size * 0.32);
  doc.line(cx, cy, cx + size * 0.25, cy);
}

function drawFingerprintIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.3) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.ellipse(cx, cy, size * 0.5, size * 0.42, 'D');
  doc.ellipse(cx, cy, size * 0.32, size * 0.27, 'D');
  doc.ellipse(cx, cy, size * 0.14, size * 0.12, 'D');
}

function drawAvatarIcon(doc: any, cx: number, cy: number, r: number) {
  doc.setFillColor(...STAMP_COLORS.azulSecundario);
  doc.circle(cx, cy, r, 'F');
  doc.setFillColor(...STAMP_COLORS.branco);
  doc.circle(cx, cy - r * 0.32, r * 0.32, 'F');
  doc.ellipse(cx, cy + r * 0.55, r * 0.5, r * 0.32, 'F');
}

async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(text, { margin: 0, width: 480, color: { dark: '#0D376B', light: '#FFFFFF' } });
  } catch (e) {
    console.warn('Falha ao gerar QR Code do carimbo:', e);
    return null;
  }
}

const PX_TO_MM = 25.4 / 96;
const REFERENCE_WIDTH = 700 * PX_TO_MM;
const STAMP_WIDTH = 70; // mm — 7cm, igual ao carimbo oficial
const STAMP_SCALE = STAMP_WIDTH / REFERENCE_WIDTH;
const QR_SIZE = 156 * PX_TO_MM * STAMP_SCALE;
export const STAMP_HEIGHT = (180 * PX_TO_MM + 5) * STAMP_SCALE;

/** Desenha um carimbo digital completo centralizado na largura da página; retorna o novo Y. */
export async function drawDigitalSignatureStamp(
  doc: any,
  yStart: number,
  pageW: number,
  data: PdfStampData
): Promise<number> {
  const u = (n: number) => n * STAMP_SCALE;

  const y0 = yStart + u(1.5);
  const w = STAMP_WIDTH;
  const x0 = (pageW - w) / 2;
  const h = STAMP_HEIGHT;

  doc.setFillColor(...STAMP_COLORS.branco);
  doc.setDrawColor(...STAMP_COLORS.azulPrincipal);
  doc.setLineWidth(u(0.55));
  doc.roundedRect(x0, y0, w, h, u(2.5), u(2.5), 'FD');

  const painelW = u(34);
  doc.setFillColor(...STAMP_COLORS.azulPrincipal);
  doc.rect(x0 + u(0.6), y0 + u(0.6), painelW - u(0.6), h - u(1.2), 'F');

  const painelCx = x0 + u(0.6) + (painelW - u(0.6)) / 2;
  drawShieldCheck(doc, painelCx, y0 + u(7.5), u(4.2), STAMP_COLORS.branco, STAMP_COLORS.verdeValidacao);

  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(8));
  doc.text('ASSINADO', painelCx, y0 + u(14.5), { align: 'center' });
  doc.setFontSize(u(6));
  doc.text('ELETRONICAMENTE', painelCx, y0 + u(17.8), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(5.2));
  doc.text('COM VALIDADE JURÍDICA', painelCx, y0 + u(21), { align: 'center' });

  doc.setDrawColor(...STAMP_COLORS.branco);
  doc.setLineWidth(u(0.15));
  doc.line(x0 + u(4), y0 + u(24), x0 + painelW - u(4), y0 + u(24));

  doc.setFontSize(u(6));
  doc.text('MP 2.200-2/2001', painelCx, y0 + u(27.6), { align: 'center' });
  doc.text('LEI 14.063/2020', painelCx, y0 + u(32), { align: 'center' });

  const qrSize = QR_SIZE;
  const contentX = x0 + painelW + u(4);
  const contentRight = x0 + w - qrSize - u(5);
  const contentW = contentRight - contentX;

  drawAvatarIcon(doc, contentX + u(3.2), y0 + u(7), u(3.2));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5.5));
  doc.text('ASSINANTE', contentX + u(8), y0 + u(4.5));
  doc.setFontSize(u(8.2));
  const nomeWrapped = doc.splitTextToSize(data.signerName, contentW - u(8));
  doc.text(nomeWrapped[0], contentX + u(8), y0 + u(8.2));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(6.5));
  doc.text(data.cpfCnpj, contentX + u(8), y0 + u(11.8));

  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(u(0.15));
  doc.line(contentX, y0 + u(14.5), contentRight, y0 + u(14.5));

  const colW = contentW / 3;
  const iconY = y0 + u(19);
  const labelY = y0 + u(22.2);
  const valueY = y0 + u(25.4);

  drawCalendarIcon(doc, contentX + u(2.2), iconY, u(3), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.8));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DATA', contentX + u(5), labelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(6.3));
  doc.setTextColor(30, 34, 44);
  doc.text(data.dateStr, contentX + u(5), valueY);

  drawClockIcon(doc, contentX + colW + u(2.2), iconY, u(3), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.8));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HORA', contentX + colW + u(5), labelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(6.3));
  doc.setTextColor(30, 34, 44);
  doc.text(data.timeStr, contentX + colW + u(5), valueY);

  drawFingerprintIcon(doc, contentX + colW * 2 + u(2.2), iconY, u(3.4), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.8));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('ID DA ASSINATURA', contentX + colW * 2 + u(5), labelY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(u(5.6));
  doc.setTextColor(30, 34, 44);
  doc.text(data.signatureId, contentX + colW * 2 + u(5), valueY);

  doc.setDrawColor(220, 224, 232);
  doc.line(contentX, y0 + u(27.5), contentRight, y0 + u(27.5));

  drawShieldCheck(doc, contentX + u(2.2), y0 + u(31), u(2.4), STAMP_COLORS.verdeValidacao, STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(6.6));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('INTEGRIDADE DO DOCUMENTO', contentX + u(6), y0 + u(30.2));
  doc.setTextColor(...STAMP_COLORS.verdeValidacao);
  doc.setFontSize(u(6.6));
  doc.text('VERIFICADA', contentX + u(6), y0 + u(33.6));

  doc.setFillColor(...STAMP_COLORS.azulSecundario);
  doc.circle(contentX + u(2.2), y0 + u(37.2), u(2.2), 'F');
  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5));
  doc.text('#', contentX + u(2.2), y0 + u(38), { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5.6));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HASH SHA-256', contentX + u(6), y0 + u(36.3));
  doc.setFont('courier', 'normal');
  doc.setTextColor(60, 64, 74);
  const hashMaxWidth = contentRight - (contentX + u(6));
  let hashFontSize = u(5.8);
  doc.setFontSize(hashFontSize);
  let hashLines: string[] = doc.splitTextToSize(data.hash, hashMaxWidth);
  while (hashLines.length > 2 && hashFontSize > u(4)) {
    hashFontSize -= u(0.2);
    doc.setFontSize(hashFontSize);
    hashLines = doc.splitTextToSize(data.hash, hashMaxWidth);
  }
  if (hashLines.length <= 1) {
    doc.text(hashLines[0] || data.hash, contentX + u(6), y0 + u(39.7));
  } else {
    doc.text(hashLines[0], contentX + u(6), y0 + u(38.8));
    doc.text(hashLines[1], contentX + u(6), y0 + u(41.2));
  }

  drawLockIcon(doc, contentX + u(2.2), y0 + u(43), u(3), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5.6));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DOCUMENTO PROTEGIDO', contentX + u(6), y0 + u(42));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(5.1));
  doc.setTextColor(120, 126, 138);
  doc.text('Contra alterações após a assinatura', contentX + u(6), y0 + u(44.9));

  const qrX = x0 + w - qrSize - u(3);
  const qrY = y0 + u(3);
  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(u(0.2));
  doc.roundedRect(qrX - u(1), qrY - u(1), qrSize + u(2), qrSize + u(2), u(1), u(1), 'D');
  const qrDataUrl = await generateQrDataUrl(data.validationUrl);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.3));
  doc.setTextColor(...STAMP_COLORS.azulPrincipal);
  doc.text('VALIDAR DOCUMENTO', qrX + qrSize / 2, qrY + qrSize + u(3), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(3.8));
  doc.setTextColor(140, 146, 158);
  doc.text('Escaneie o QR Code', qrX + qrSize / 2, qrY + qrSize + u(5.8), { align: 'center' });

  return y0 + h + u(3);
}

/** Bloco compacto "pendente" (sem carimbo) para signatários que ainda não assinaram. */
export function drawPendingStampNote(doc: any, y: number, x: number, label: string): number {
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`[Pendente de Autenticação Digital${label ? ' - ' + label : ''}]`, x, y);
  doc.setTextColor(30, 30, 30);
  return y;
}

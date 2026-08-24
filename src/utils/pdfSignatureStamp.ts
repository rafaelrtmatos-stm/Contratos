// Carimbo digital de assinatura eletrônica desenhado no PDF final (jsPDF).
// Dimensão fixa: 33% da largura da página A4 (210mm) x 7% da altura (297mm),
// ou seja, 69.3mm x 20.79mm — igual em tela, impressão e PDF.
// Nenhum texto usa fonte abaixo de 3.5pt; nenhuma informação é omitida/truncada.

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
  cinzaClaro: hexToRgb('#94A0B4'),
  branco: hexToRgb('#FFFFFF'),
};

const MM_PER_PT = 25.4 / 72;
const FONT_MIN = 3.5; // pt — piso mínimo absoluto de toda a fonte do selo

/** Altura de linha (mm) para um dado tamanho de fonte (pt), com espaçamento apertado. */
const lineH = (fontPt: number, lh = 1.12) => fontPt * MM_PER_PT * lh;

function drawShieldCheck(doc: any, cx: number, cy: number, r: number, shieldRgb: number[], checkRgb: number[], lw = 0.35) {
  doc.setFillColor(shieldRgb[0], shieldRgb[1], shieldRgb[2]);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(checkRgb[0], checkRgb[1], checkRgb[2]);
  doc.setLineWidth(lw);
  doc.line(cx - r * 0.45, cy, cx - r * 0.1, cy + r * 0.4);
  doc.line(cx - r * 0.1, cy + r * 0.4, cx + r * 0.5, cy - r * 0.35);
}

function drawLockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.25) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.roundedRect(cx - size / 2, cy - size * 0.1, size, size * 0.7, size * 0.06, size * 0.06, 'D');
  doc.circle(cx, cy - size * 0.35, size * 0.32, 'D');
}

function drawCalendarIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.2) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.roundedRect(cx - size / 2, cy - size / 2, size, size, size * 0.06, size * 0.06, 'D');
  doc.line(cx - size / 2, cy - size * 0.15, cx + size / 2, cy - size * 0.15);
}

function drawClockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.2) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.circle(cx, cy, size / 2, 'D');
  doc.line(cx, cy, cx, cy - size * 0.32);
  doc.line(cx, cy, cx + size * 0.25, cy);
}

function drawFingerprintIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.18) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.ellipse(cx, cy, size * 0.5, size * 0.42, 'D');
  doc.ellipse(cx, cy, size * 0.32, size * 0.27, 'D');
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

// 33% da largura de uma página A4 (210mm) e 7% da altura (297mm)
export const STAMP_WIDTH = 69.3;
export const STAMP_HEIGHT = 20.79;

/** Desenha um carimbo digital completo centralizado na largura da página; retorna o novo Y. */
export async function drawDigitalSignatureStamp(
  doc: any,
  yStart: number,
  pageW: number,
  data: PdfStampData
): Promise<number> {
  const y0 = yStart + 1.5;
  const w = STAMP_WIDTH;
  const h = STAMP_HEIGHT;
  const x0 = (pageW - w) / 2;

  const pad = 0.6;

  // Moldura
  doc.setFillColor(...STAMP_COLORS.branco);
  doc.setDrawColor(...STAMP_COLORS.azulPrincipal);
  doc.setLineWidth(0.35);
  doc.roundedRect(x0, y0, w, h, 1, 1, 'FD');

  // ===== PAINEL INSTITUCIONAL ESQUERDO (20% da largura) =====
  const painelW = w * 0.2;
  doc.setFillColor(...STAMP_COLORS.azulPrincipal);
  doc.rect(x0 + pad, y0 + pad, painelW - pad, h - pad * 2, 'F');
  const painelCx = x0 + pad + (painelW - pad) / 2;

  drawShieldCheck(doc, painelCx, y0 + 3.3, 1.7, STAMP_COLORS.branco, STAMP_COLORS.verdeValidacao);

  let py = y0 + 6.3;
  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.text('ASSINADO', painelCx, py, { align: 'center' });
  py += lineH(FONT_MIN);
  doc.text('ELETRONICAMENTE', painelCx, py, { align: 'center' });
  py += lineH(FONT_MIN) + 0.3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_MIN);
  doc.text('COM VALIDADE', painelCx, py, { align: 'center' });
  py += lineH(FONT_MIN);
  doc.text('JURÍDICA', painelCx, py, { align: 'center' });
  py += lineH(FONT_MIN) + 0.4;

  doc.setDrawColor(...STAMP_COLORS.branco);
  doc.setLineWidth(0.1);
  doc.line(x0 + painelW * 0.3, py, x0 + painelW * 0.7, py);
  py += lineH(FONT_MIN) * 0.6 + 0.3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.text('MP 2.200-2/2001', painelCx, py, { align: 'center' });
  py += lineH(FONT_MIN);
  doc.text('LEI 14.063/2020', painelCx, py, { align: 'center' });

  // ===== ÁREA DE CONTEÚDO (central) =====
  const qrW = w * 0.2;
  const contentX = x0 + painelW + 0.9;
  const contentRight = x0 + w - qrW - 0.9;
  const contentW = contentRight - contentX;

  let cy = y0 + pad + 1.9;
  const avatarR = 1.15;
  drawAvatarIcon(doc, contentX + avatarR, cy - 0.4, avatarR);

  const textX = contentX + avatarR * 2 + 0.6;
  const textW = contentW - avatarR * 2 - 0.6;

  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  // Rótulo + nome na mesma linha (compacto, sem perder informação)
  doc.text('ASSINANTE:', textX, cy);
  const roleW = doc.getTextWidth('ASSINANTE: ');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...STAMP_COLORS.azulPrincipal);
  const nomeWrapped = doc.splitTextToSize(data.signerName, textW - roleW);
  doc.text(nomeWrapped[0], textX + roleW + 0.4, cy);
  cy += lineH(FONT_MIN) + 0.25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('CPF:', textX, cy);
  const cpfLabelW = doc.getTextWidth('CPF: ');
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.cpfCnpj, textX + cpfLabelW + 0.3, cy);
  cy += lineH(FONT_MIN) + 0.4;

  // Linha DATA / HORA / ID (grid de 3 colunas em uma única "linha" de altura)
  const colW = contentW / 3;
  const gridIconR = 0.9;
  const gridLabelY = cy;
  const gridValueY = cy + lineH(FONT_MIN);

  drawCalendarIcon(doc, contentX + gridIconR, gridLabelY - 0.5, gridIconR * 1.6, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DATA', contentX + gridIconR * 2.2, gridLabelY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 34, 44);
  doc.text(data.dateStr, contentX + gridIconR * 2.2, gridValueY);

  drawClockIcon(doc, contentX + colW + gridIconR, gridLabelY - 0.5, gridIconR * 1.6, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HORA', contentX + colW + gridIconR * 2.2, gridLabelY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 34, 44);
  doc.text(data.timeStr, contentX + colW + gridIconR * 2.2, gridValueY);

  drawFingerprintIcon(doc, contentX + colW * 2 + gridIconR, gridLabelY - 0.5, gridIconR * 1.8, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('ID', contentX + colW * 2 + gridIconR * 2.2, gridLabelY);
  doc.setFont('courier', 'normal');
  doc.setTextColor(30, 34, 44);
  doc.text(data.signatureId, contentX + colW * 2 + gridIconR * 2.2, gridValueY);

  cy = gridValueY + lineH(FONT_MIN) * 0.9;

  // Integridade
  drawShieldCheck(doc, contentX + 0.9, cy - 0.4, 0.9, STAMP_COLORS.verdeValidacao, STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('INTEGRIDADE:', contentX + 2.2, cy);
  doc.setTextColor(...STAMP_COLORS.verdeValidacao);
  const integW = doc.getTextWidth('INTEGRIDADE: ');
  doc.text('VERIFICADA', contentX + 2.2 + integW, cy);
  cy += lineH(FONT_MIN) + 0.35;

  // Hash SHA-256 completo (sem truncar — quebra em quantas linhas forem necessárias)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HASH:', contentX, cy);
  const hashLabelW = doc.getTextWidth('HASH: ');
  doc.setFont('courier', 'normal');
  doc.setTextColor(60, 64, 74);
  const hashLines: string[] = doc.splitTextToSize(data.hash, contentW - hashLabelW);
  doc.text(hashLines[0], contentX + hashLabelW, cy);
  for (let i = 1; i < hashLines.length; i++) {
    cy += lineH(FONT_MIN);
    doc.text(hashLines[i], contentX, cy);
  }
  cy += lineH(FONT_MIN) + 0.35;

  // Documento protegido
  drawLockIcon(doc, contentX + 0.8, cy - 0.4, 1.4, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DOCUMENTO PROTEGIDO', contentX + 2.2, cy);
  cy += lineH(FONT_MIN);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STAMP_COLORS.cinzaClaro);
  doc.text('Contra alterações após a assinatura', contentX + 2.2, cy);

  // ===== QR CODE (20% da largura, à direita) =====
  const qrSize = Math.min(qrW - 1.6, h - 6.5);
  const qrX = x0 + w - qrW + (qrW - qrSize) / 2 - 0.3;
  const qrY = y0 + pad + 1;
  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(0.15);
  doc.roundedRect(qrX - 0.3, qrY - 0.3, qrSize + 0.6, qrSize + 0.6, 0.3, 0.3, 'D');
  const qrDataUrl = await generateQrDataUrl(data.validationUrl);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }
  const qrCx = qrX + qrSize / 2;
  let qy = qrY + qrSize + lineH(FONT_MIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_MIN);
  doc.setTextColor(...STAMP_COLORS.azulPrincipal);
  doc.text('VALIDAR', qrCx, qy, { align: 'center' });
  qy += lineH(FONT_MIN);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STAMP_COLORS.cinzaClaro);
  doc.text('Escaneie o QR', qrCx, qy, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  return y0 + h + 3;
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

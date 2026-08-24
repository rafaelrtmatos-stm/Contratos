// Renderiza o carimbo de assinatura digital como imagem PNG (mesmo layout/paleta
// usado na prévia em tela - DigitalSignatureStamp.tsx - e no PDF gerado via jsPDF -
// pdfSignatureStamp.ts), para poder ser embutido como imagem real dentro do DOCX.
//
// Sem isso, o DOCX (convertido depois para PDF via iLoveAPI) só tinha o carimbo
// em texto simples (nome, cargo, data e hash), sem o selo visual (painel azul,
// QR Code, ícones).
//
// Dimensão: 33% da largura da página A4 (210mm) de largura; altura proporcional
// ao próprio desenho (mantém a razão de aspecto do canvas, não um valor fixo).

import QRCode from 'qrcode';

export interface StampImageData {
  signerName: string;
  cpfCnpj: string;
  roleLabel: string;
  dateStr: string;
  timeStr: string;
  signatureId: string;
  hash: string;
  validationUrl: string;
}

export interface StampImageResult {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

const SCALE = 16; // px por mm — resolução do canvas (fixa a nitidez do PNG)
const STAMP_WIDTH_MM = 69.3; // 33% de 210mm (A4)
const STAMP_HEIGHT_MM = 20.79; // 7% de 297mm — define a proporção do desenho

// Conversão correta pt -> px do canvas (1pt = 25.4/72 mm; canvas usa SCALE px/mm).
// Sem essa conversão, usar o valor "em mm" direto como tamanho de fonte deixa o
// texto ~2.8x maior do que deveria (foi o que causou a fonte "estourada").
const PT_TO_PX = (pt: number) => pt * (25.4 / 72) * SCALE;

const FONT_PT = 3.2; // tamanho único de fonte do selo, conforme solicitado
const FONT_PX = Math.round(PT_TO_PX(FONT_PT));
const FONT_PX_SMALL = Math.round(PT_TO_PX(FONT_PT - 0.3)); // ID/hash, campos mais apertados
const LINE_MM = (FONT_PT * 1.3) * (25.4 / 72); // altura de linha proporcional à fonte, em mm

const COLORS = {
  azulPrincipal: '#0D376B',
  azulSecundario: '#164A82',
  verde: '#18A544',
  cinzaTexto: '#3F4D63',
  cinzaClaro: '#94A0B4',
  branco: '#FFFFFF',
  textoForte: '#1E222C',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Gera o PNG do carimbo de assinatura digital. */
export async function renderSignatureStampPng(data: StampImageData): Promise<StampImageResult> {
  const w = Math.round(STAMP_WIDTH_MM * SCALE);
  const h = Math.round(STAMP_HEIGHT_MM * SCALE);
  const mm = SCALE;
  const lh = LINE_MM * mm; // altura de linha em px

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D não suportado.');

  // Moldura
  ctx.fillStyle = COLORS.branco;
  roundRect(ctx, 1, 1, w - 2, h - 2, 6);
  ctx.fill();
  ctx.strokeStyle = COLORS.azulPrincipal;
  ctx.lineWidth = 1.6;
  roundRect(ctx, 1, 1, w - 2, h - 2, 6);
  ctx.stroke();

  // ===== PAINEL ESQUERDO (20%) =====
  const painelW = w * 0.2;
  ctx.fillStyle = COLORS.azulPrincipal;
  ctx.fillRect(3, 3, painelW - 3, h - 6);
  const painelCx = 3 + (painelW - 3) / 2;

  // Selo/check
  const checkCy = 3 + 3.3 * mm;
  const checkR = 1.7 * mm;
  ctx.fillStyle = COLORS.branco;
  ctx.beginPath();
  ctx.arc(painelCx, checkCy, checkR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.verde;
  ctx.lineWidth = checkR * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(painelCx - checkR * 0.45, checkCy);
  ctx.lineTo(painelCx - checkR * 0.1, checkCy + checkR * 0.4);
  ctx.lineTo(painelCx + checkR * 0.5, checkCy - checkR * 0.35);
  ctx.stroke();

  let py = checkCy + checkR + lh * 0.9;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.branco;
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillText('ASSINADO', painelCx, py);
  py += lh;
  ctx.fillText('ELETRONICAMENTE', painelCx, py);
  py += lh * 1.1;
  ctx.font = `normal ${FONT_PX}px Arial`;
  ctx.fillText('COM VALIDADE', painelCx, py);
  py += lh;
  ctx.fillText('JURÍDICA', painelCx, py);
  py += lh * 0.7;

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = mm * 0.08;
  ctx.beginPath();
  ctx.moveTo(3 + painelW * 0.3, py);
  ctx.lineTo(3 + painelW * 0.7, py);
  ctx.stroke();
  py += lh;

  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillText('MP 2.200-2/2001', painelCx, py);
  py += lh;
  ctx.fillText('LEI 14.063/2020', painelCx, py);

  // ===== ÁREA DE CONTEÚDO CENTRAL =====
  const qrW = w * 0.2;
  const contentX = painelW + 3 * mm * 0.3;
  const contentRight = w - qrW - 3 * mm * 0.3;
  const contentW = contentRight - contentX;

  let cy = 3 + 3.3 * mm;

  // avatar
  const avatarR = 1.15 * mm;
  ctx.fillStyle = COLORS.azulSecundario;
  ctx.beginPath();
  ctx.arc(contentX + avatarR, cy - 0.4 * mm, avatarR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.branco;
  ctx.beginPath();
  ctx.arc(contentX + avatarR, cy - 0.4 * mm - avatarR * 0.32, avatarR * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(contentX + avatarR, cy - 0.4 * mm + avatarR * 0.55, avatarR * 0.5, avatarR * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  const textX = contentX + avatarR * 2 + 0.6 * mm;
  ctx.textAlign = 'left';
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaTexto;
  const roleLabelTxt = `${data.roleLabel || 'ASSINANTE'}: `;
  ctx.fillText(roleLabelTxt, textX, cy);
  const roleW = ctx.measureText(roleLabelTxt).width;
  ctx.fillStyle = COLORS.azulPrincipal;
  ctx.fillText(data.signerName, textX + roleW, cy);
  cy += lh;

  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaTexto;
  const gx0 = textX - avatarR * 2 - 0.6 * mm;
  ctx.fillText('CPF: ', gx0, cy);
  const cpfLabelW = ctx.measureText('CPF: ').width;
  ctx.font = `bold ${FONT_PX}px Courier New`;
  ctx.fillStyle = COLORS.textoForte;
  ctx.fillText(data.cpfCnpj, gx0 + cpfLabelW, cy);
  cy += lh * 1.2;

  // Grid DATA / HORA / ID
  const colW = contentW / 3;
  const gx = contentX - avatarR * 2 - 0.6 * mm;
  const gridLabelY = cy;
  const gridValueY = cy + lh;

  const drawGridCol = (label: string, value: string, colX: number) => {
    ctx.font = `bold ${FONT_PX}px Arial`;
    ctx.fillStyle = COLORS.cinzaTexto;
    ctx.fillText(label, colX, gridLabelY);
    ctx.font = `normal ${FONT_PX}px Arial`;
    ctx.fillStyle = '#1E222C';
    ctx.fillText(value, colX, gridValueY);
  };
  drawGridCol('DATA', data.dateStr, gx);
  drawGridCol('HORA', data.timeStr, gx + colW);
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaTexto;
  ctx.fillText('ID', gx + colW * 2, gridLabelY);
  ctx.font = `normal ${FONT_PX_SMALL}px Courier New`;
  ctx.fillStyle = '#1E222C';
  ctx.fillText(data.signatureId, gx + colW * 2, gridValueY);

  cy = gridValueY + lh;

  // Integridade
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaTexto;
  ctx.fillText('INTEGRIDADE: ', gx, cy);
  const integW = ctx.measureText('INTEGRIDADE: ').width;
  ctx.fillStyle = COLORS.verde;
  ctx.fillText('VERIFICADA', gx + integW, cy);
  cy += lh;

  // Hash completo, quebrando linha se necessário
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaTexto;
  ctx.fillText('HASH: ', gx, cy);
  const hashLabelW = ctx.measureText('HASH: ').width;
  ctx.font = `normal ${FONT_PX_SMALL}px Courier New`;
  ctx.fillStyle = '#3C404A';
  const maxHashW = contentW - hashLabelW;
  let hashLine = data.hash;
  if (ctx.measureText(hashLine).width > maxHashW) {
    while (hashLine.length > 4 && ctx.measureText(hashLine).width > maxHashW) {
      hashLine = hashLine.slice(0, -1);
    }
  }
  ctx.fillText(hashLine, gx + hashLabelW, cy);
  cy += lh;

  // Documento protegido
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaTexto;
  ctx.fillText('DOCUMENTO PROTEGIDO', gx, cy);
  cy += lh * 0.95;
  ctx.font = `normal ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaClaro;
  ctx.fillText('Contra alterações após a assinatura', gx, cy);

  // ===== QR CODE (20% à direita) =====
  const qrSize = Math.min(qrW - 1.6 * mm, h - 6.5 * mm);
  const qrX = w - qrW + (qrW - qrSize) / 2 - 0.3 * mm;
  const qrY = 3 + mm;

  ctx.strokeStyle = '#DCE0E8';
  ctx.lineWidth = 1;
  roundRect(ctx, qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3);
  ctx.stroke();

  try {
    const qrDataUrl = await QRCode.toDataURL(data.validationUrl, {
      margin: 0,
      width: 480,
      color: { dark: '#0D376B', light: '#FFFFFF' },
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {
    // Se o QR falhar, o selo segue sem ele — não interrompe a geração do documento.
  }

  const qrCx = qrX + qrSize / 2;
  let qy = qrY + qrSize + lh;
  ctx.textAlign = 'center';
  ctx.font = `bold ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.azulPrincipal;
  ctx.fillText('VALIDAR', qrCx, qy);
  qy += lh * 0.9;
  ctx.font = `normal ${FONT_PX}px Arial`;
  ctx.fillStyle = COLORS.cinzaClaro;
  ctx.fillText('Escaneie o QR', qrCx, qy);

  const dataUrl = canvas.toDataURL('image/png');
  return { bytes: dataUrlToUint8Array(dataUrl), widthPx: w, heightPx: h };
}

// Renderiza o carimbo de assinatura digital como imagem PNG de altíssima resolução (Ultra HD / 300 DPI)
// rigorosamente fiel ao design institucional com acabamento em ouro metálico nobre e azul marinho:
// Moldura dourada, painel geométrico poligonal, medalhão "ASSINADO ELETRONICAMENTE" com escudo e check,
// avatar biométrico com ondas de radar, blocos HASH e ID dourados, barra escura de metadados, fita dourada de leis e QR Code com moldura dupla dourada.

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

// Resolução Ultra HD (2460 x 780 px - proporção 3.15:1) para máxima nitidez e legibilidade
const CANVAS_WIDTH = 2460;
const CANVAS_HEIGHT = 780;

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

/**
 * Desenha texto ao longo de um arco circular com medição precisa de cada caractere
 * para evitar qualquer sobreposição, texto cortado ou ilegível.
 */
function drawTextAlongArc(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngleRad: number,
  isTop: boolean
) {
  const chars = Array.from(text);
  const letterSpacing = 8;
  const charWidths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = charWidths.reduce((a, b) => a + b, 0) + (chars.length - 1) * letterSpacing;
  const totalAngle = totalWidth / radius;

  let currentAngle = isTop ? centerAngleRad - totalAngle / 2 : centerAngleRad + totalAngle / 2;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const charWidth = charWidths[i];
    const halfCharAngle = charWidth / 2 / radius;

    const angle = isTop ? currentAngle + halfCharAngle : currentAngle - halfCharAngle;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (isTop ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(char, 0, 0);
    ctx.restore();

    if (isTop) {
      currentAngle += (charWidth + letterSpacing) / radius;
    } else {
      currentAngle -= (charWidth + letterSpacing) / radius;
    }
  }
  ctx.restore();
}

/** Desenha uma estrela de 5 pontas perfeita */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes = 5, outerRadius = 12, innerRadius = 6) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/** Gera o PNG de altíssima definição (Ultra HD) do carimbo de assinatura digital */
export async function renderSignatureStampPng(data: StampImageData): Promise<StampImageResult> {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D não suportado.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Moldura Externa com Gradiente Dourado Metálico Nobre
  const outerBorderGrad = ctx.createLinearGradient(0, 0, w, h);
  outerBorderGrad.addColorStop(0, '#c59a3f');
  outerBorderGrad.addColorStop(0.3, '#f9ea9a');
  outerBorderGrad.addColorStop(0.6, '#d4af37');
  outerBorderGrad.addColorStop(1, '#b3832f');

  ctx.fillStyle = outerBorderGrad;
  roundRect(ctx, 4, 4, w - 8, h - 8, 42);
  ctx.fill();

  // 2. Fundo Geral Branco Interno
  const innerMargin = 12;
  const innerW = w - innerMargin * 2;
  const innerH = h - innerMargin * 2;

  ctx.save();
  roundRect(ctx, innerMargin, innerMargin, innerW, innerH, 34);
  ctx.clip();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(innerMargin, innerMargin, innerW, innerH);

  // ================= 3. FAIXA ESQUERDA AZUL MARINHO COM PADRÃO POLIGONAL =================
  const leftPanelW = Math.round(w * 0.28);
  ctx.fillStyle = '#071224';
  ctx.fillRect(innerMargin, innerMargin, leftPanelW, innerH);

  // Malha Poligonal / Nós de Constelação
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.25)';
  ctx.lineWidth = 2.5;

  const nodes = [
    { x: innerMargin + 40, y: 80 },
    { x: innerMargin + 160, y: 120 },
    { x: innerMargin + 280, y: 60 },
    { x: innerMargin + 420, y: 150 },
    { x: innerMargin + 560, y: 80 },
    { x: innerMargin + 640, y: 220 },
    { x: innerMargin + 500, y: 340 },
    { x: innerMargin + 320, y: 260 },
    { x: innerMargin + 100, y: 240 },
    { x: innerMargin + 80, y: 450 },
    { x: innerMargin + 250, y: 520 },
    { x: innerMargin + 460, y: 480 },
    { x: innerMargin + 620, y: 560 },
    { x: innerMargin + 520, y: 700 },
    { x: innerMargin + 280, y: 680 },
    { x: innerMargin + 90, y: 650 },
  ];

  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0],
    [1, 7], [2, 7], [3, 6], [8, 9], [7, 10], [6, 11], [5, 12],
    [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 9],
    [10, 14], [11, 13]
  ];

  ctx.beginPath();
  edges.forEach(([i, j]) => {
    if (nodes[i] && nodes[j]) {
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[j].x, nodes[j].y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = '#93C5FD';
  nodes.forEach((n) => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // ================= 4. MEDALHÃO CIRCULAR DOURADO "ASSINADO ELETRONICAMENTE" =================
  const medalCenterX = innerMargin + leftPanelW / 2;
  const medalCenterY = 320;
  const medalR = 250;

  // Gradiente do Medalhão
  const medalGrad = ctx.createLinearGradient(medalCenterX - medalR, medalCenterY - medalR, medalCenterX + medalR, medalCenterY + medalR);
  medalGrad.addColorStop(0, '#e5c158');
  medalGrad.addColorStop(0.35, '#faea9e');
  medalGrad.addColorStop(0.7, '#c59837');
  medalGrad.addColorStop(1, '#8f6418');

  // Disco Externo Dourado
  ctx.fillStyle = medalGrad;
  ctx.beginPath();
  ctx.arc(medalCenterX, medalCenterY, medalR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#6b4c10';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Linhas circulares escuras decorativas
  ctx.strokeStyle = '#071224';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(medalCenterX, medalCenterY, medalR - 15, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(medalCenterX, medalCenterY, medalR - 95, 0, Math.PI * 2);
  ctx.stroke();

  // Texto "ASSINADO" no arco superior
  ctx.fillStyle = '#071224';
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  drawTextAlongArc(ctx, 'ASSINADO', medalCenterX, medalCenterY, medalR - 55, -Math.PI / 2, true);

  // Texto "ELETRONICAMENTE" no arco inferior
  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  drawTextAlongArc(ctx, 'ELETRONICAMENTE', medalCenterX, medalCenterY, medalR - 55, Math.PI / 2, false);

  // Estrelas pretas decorativas nas laterais (2 de cada lado separando os arcos superior e inferior)
  ctx.fillStyle = '#071224';
  // Lado Esquerdo
  drawStar(ctx, medalCenterX - medalR + 56, medalCenterY - 32, 5, 13, 6.5);
  drawStar(ctx, medalCenterX - medalR + 56, medalCenterY + 32, 5, 13, 6.5);
  // Lado Direito
  drawStar(ctx, medalCenterX + medalR - 56, medalCenterY - 32, 5, 13, 6.5);
  drawStar(ctx, medalCenterX + medalR - 56, medalCenterY + 32, 5, 13, 6.5);

  // Miolo Central Azul Marinho
  ctx.fillStyle = '#071224';
  ctx.beginPath();
  ctx.arc(medalCenterX, medalCenterY, medalR - 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = medalGrad;
  ctx.lineWidth = 5;
  ctx.stroke();

  // ================= ESCUDO HERÁLDICO MILITAR CLÁSSICO (FIEL À IMAGEM DE REFERÊNCIA) =================
  const shieldHalfW = 76;
  const shieldTopY = medalCenterY - 82;
  const shieldShoulderY = medalCenterY - 66;
  const shieldMidY = medalCenterY - 6;
  const shieldBottomY = medalCenterY + 88;

  const shieldGrad = ctx.createLinearGradient(medalCenterX - shieldHalfW, shieldTopY, medalCenterX + shieldHalfW, shieldBottomY);
  shieldGrad.addColorStop(0, '#faea9e');
  shieldGrad.addColorStop(0.45, '#d8ab43');
  shieldGrad.addColorStop(1, '#966d1a');

  // Desenho do Contorno do Escudo
  ctx.fillStyle = '#071224';
  ctx.strokeStyle = shieldGrad;
  ctx.lineWidth = 14;
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  // Ponto central superior
  ctx.moveTo(medalCenterX, shieldTopY);
  // Curva suave descendo até o ombro direito
  ctx.bezierCurveTo(medalCenterX + shieldHalfW * 0.45, shieldTopY + 4, medalCenterX + shieldHalfW * 0.85, shieldShoulderY - 2, medalCenterX + shieldHalfW, shieldShoulderY);
  // Lateral direita descendo
  ctx.lineTo(medalCenterX + shieldHalfW, shieldMidY);
  // Curva fechando até a ponta inferior
  ctx.bezierCurveTo(medalCenterX + shieldHalfW, shieldBottomY - 35, medalCenterX + shieldHalfW * 0.45, shieldBottomY - 10, medalCenterX, shieldBottomY);
  // Curva subindo pelo lado esquerdo
  ctx.bezierCurveTo(medalCenterX - shieldHalfW * 0.45, shieldBottomY - 10, medalCenterX - shieldHalfW, shieldBottomY - 35, medalCenterX - shieldHalfW, shieldMidY);
  // Lateral esquerda subindo
  ctx.lineTo(medalCenterX - shieldHalfW, shieldShoulderY);
  // Curva até o centro superior
  ctx.bezierCurveTo(medalCenterX - shieldHalfW * 0.85, shieldShoulderY - 2, medalCenterX - shieldHalfW * 0.45, shieldTopY + 4, medalCenterX, shieldTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Linha interna dourada sutil dentro do escudo
  ctx.strokeStyle = '#d8ab43';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(medalCenterX, shieldTopY + 12);
  ctx.bezierCurveTo(medalCenterX + shieldHalfW * 0.4, shieldTopY + 15, medalCenterX + shieldHalfW * 0.75, shieldShoulderY + 8, medalCenterX + shieldHalfW - 10, shieldShoulderY + 10);
  ctx.lineTo(medalCenterX + shieldHalfW - 10, shieldMidY);
  ctx.bezierCurveTo(medalCenterX + shieldHalfW - 10, shieldBottomY - 42, medalCenterX + shieldHalfW * 0.4, shieldBottomY - 20, medalCenterX, shieldBottomY - 12);
  ctx.bezierCurveTo(medalCenterX - shieldHalfW * 0.4, shieldBottomY - 20, medalCenterX - shieldHalfW + 10, shieldBottomY - 42, medalCenterX - shieldHalfW + 10, shieldMidY);
  ctx.lineTo(medalCenterX - shieldHalfW + 10, shieldShoulderY + 10);
  ctx.bezierCurveTo(medalCenterX - shieldHalfW * 0.75, shieldShoulderY + 8, medalCenterX - shieldHalfW * 0.4, shieldTopY + 15, medalCenterX, shieldTopY + 12);
  ctx.closePath();
  ctx.stroke();

  // Check (✓) branco espesso e nítido
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(medalCenterX - 36, medalCenterY + 2);
  ctx.lineTo(medalCenterX - 8, medalCenterY + 30);
  ctx.lineTo(medalCenterX + 38, medalCenterY - 26);
  ctx.stroke();

  // ================= 5. RODAPÉ DO PAINEL ESQUERDO (BADGE AMPLIADO "COM VALIDADE JURÍDICA") =================
  // O badge tem 460px de largura (ligeiramente maior que os 400px de diâmetro do medalhão circular)
  const badgeW = 450;
  const badgeH = 56;
  const badgeX = medalCenterX - badgeW / 2;
  const badgeY = 612;

  ctx.fillStyle = '#0B1B36';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 28);
  ctx.fill();

  ctx.strokeStyle = 'rgba(229, 193, 88, 0.75)';
  ctx.lineWidth = 3;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 28);
  ctx.stroke();

  // Ícone de Cadeado Dourado
  const lockCx = badgeX + 38;
  const lockCy = badgeY + badgeH / 2;

  ctx.fillStyle = '#F3E5AB';
  roundRect(ctx, lockCx - 15, lockCy - 15, 30, 30, 7);
  ctx.fill();

  ctx.fillStyle = '#7A5310';
  roundRect(ctx, lockCx - 9, lockCy - 5, 18, 14, 2.5);
  ctx.fill();
  ctx.strokeStyle = '#7A5310';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lockCx, lockCy - 5, 6, Math.PI, 0);
  ctx.stroke();

  // Texto "COM VALIDADE JURÍDICA"
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FAEA9E';
  ctx.font = '900 27px system-ui, -apple-system, sans-serif';
  ctx.fillText('COM VALIDADE JURÍDICA', lockCx + 26, lockCy + 1);

  // ================= 6. ÁREA CENTRAL =================
  const qrPanelW = Math.round(w * 0.235);
  const centerX = innerMargin + leftPanelW + 35;
  const centerRight = w - innerMargin - qrPanelW - 25;
  const centerW = centerRight - centerX;

  // --- Topo: Avatar Biométrica com Ondas de Radar + Rótulo + Nome + CPF Mascarado ---
  const avatarCx = centerX + 55;
  const avatarCy = 85;

  // Ondas circulares de radar/biometria em azul
  ctx.strokeStyle = 'rgba(30, 64, 175, 0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, 50, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(30, 64, 175, 0.8)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, 40, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Silhueta da cabeça e ombros
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy - 10, 11, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy + 22, 19, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Textos do Signatário
  const textStartX = avatarCx + 70;
  const roleLabelUpper = (data.roleLabel || 'CONTRATADO').toUpperCase().replace(/:$/, '');

  // Formatação do CPF/CNPJ com metade oculta (mascaramento de privacidade)
  const formatDocMask = (doc: string): string => {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.***.***-${clean.slice(9, 11)}`;
    }
    if (clean.length === 14) {
      return `${clean.slice(0, 2)}.***.***/${clean.slice(8, 12)}-**`;
    }
    if (doc.length > 6) {
      return `${doc.slice(0, 3)}***${doc.slice(-2)}`;
    }
    return doc;
  };
  const maskedDoc = formatDocMask(data.cpfCnpj || '');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#475569';
  ctx.font = '800 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${roleLabelUpper}:`, textStartX, 30);

  ctx.fillStyle = '#071224';
  ctx.font = '900 54px system-ui, -apple-system, sans-serif';
  const nameUpper = (data.signerName || 'ASSINANTE').toUpperCase();
  ctx.fillText(nameUpper, textStartX, 62);

  ctx.fillStyle = '#334155';
  ctx.font = '700 32px system-ui, -apple-system, sans-serif';
  ctx.fillText('CPF: ', textStartX, 126);
  const cpfLabelW = ctx.measureText('CPF: ').width;
  ctx.font = '900 34px monospace';
  ctx.fillStyle = '#071224';
  ctx.fillText(maskedDoc, textStartX + cpfLabelW, 124);

  // Linha horizontal separadora fina
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX, 185);
  ctx.lineTo(centerRight, 185);
  ctx.stroke();

  // --- Meio: Blocos HASH e ID lado a lado com Ícones Dourados ---
  const midY = 205;
  const halfW = centerW / 2;

  // Bloco HASH Ampliado
  const hashIconCx = centerX + 40;
  const hashIconCy = midY + 45;

  ctx.fillStyle = 'rgba(254, 243, 199, 0.7)';
  ctx.beginPath();
  ctx.arc(hashIconCx, hashIconCy, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#C59837';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#A1751D';
  ctx.font = '900 46px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('#', hashIconCx, hashIconCy);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#071224';
  ctx.font = '900 34px system-ui, -apple-system, sans-serif';
  ctx.fillText('HASH SHA-256:', hashIconCx + 52, midY + 2);

  const cleanHash = (data.hash || '6E9123492480C2859CCF3CCD66GA7EDBBP0AB504CFB01C995B323F9C1').toUpperCase();
  const shortHash = (cleanHash.length > 18 ? cleanHash.slice(0, 18) : cleanHash) + '...';

  ctx.fillStyle = '#071224';
  ctx.font = '900 44px monospace';
  ctx.fillText(shortHash, hashIconCx + 52, midY + 48);

  // Linha vertical separadora entre HASH e ID
  const dividerMidX = centerX + halfW - 10;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(dividerMidX, midY);
  ctx.lineTo(dividerMidX, midY + 130);
  ctx.stroke();

  // Bloco ID
  const idStartX = dividerMidX + 30;
  const idIconCx = idStartX + 40;
  const idIconCy = midY + 45;

  ctx.fillStyle = 'rgba(254, 243, 199, 0.7)';
  ctx.beginPath();
  ctx.arc(idIconCx, idIconCy, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#C59837';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Ícone de Cartão ID Dourado
  ctx.fillStyle = '#A1751D';
  roundRect(ctx, idIconCx - 20, idIconCy - 14, 40, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, idIconCx - 16, idIconCy - 9, 12, 17, 2);
  ctx.fill();
  ctx.fillRect(idIconCx + 1, idIconCy - 7, 13, 4);
  ctx.fillRect(idIconCx + 1, idIconCy + 1, 13, 4);

  ctx.fillStyle = '#071224';
  ctx.font = '900 34px system-ui, -apple-system, sans-serif';
  ctx.fillText('ID:', idIconCx + 52, midY + 2);

  const cleanId = data.signatureId || '6E91-2349-2480-C269';
  ctx.fillStyle = '#071224';
  ctx.font = '900 44px monospace';
  ctx.fillText(cleanId, idIconCx + 52, midY + 48);

  // --- Faixa Escura de Metadados e Integridade (Fundo Azul Marinho com Ícones Dourados) ---
  const metaBarY = 385;
  const metaBarH = 180;

  ctx.fillStyle = '#071224';
  roundRect(ctx, centerX, metaBarY, centerW, metaBarH, 18);
  ctx.fill();

  const colMetaW = centerW / 4;

  // 1. DATA
  const mCol1X = centerX + 20;
  ctx.fillStyle = '#E5C158';
  // Ícone Calendário
  roundRect(ctx, mCol1X, metaBarY + 50, 48, 48, 10);
  ctx.fill();
  ctx.fillStyle = '#071224';
  ctx.fillRect(mCol1X + 10, metaBarY + 68, 28, 22);
  ctx.fillStyle = '#E5C158';
  ctx.fillRect(mCol1X + 14, metaBarY + 72, 6, 6);
  ctx.fillRect(mCol1X + 26, metaBarY + 72, 6, 6);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('DATA', mCol1X + 62, metaBarY + 45);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.dateStr, mCol1X + 62, metaBarY + 80);

  // Divisória 1
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX + colMetaW, metaBarY + 25);
  ctx.lineTo(centerX + colMetaW, metaBarY + metaBarH - 25);
  ctx.stroke();

  // 2. HORA
  const mCol2X = centerX + colMetaW + 20;
  ctx.fillStyle = '#E5C158';
  ctx.beginPath();
  ctx.arc(mCol2X + 24, metaBarY + 74, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#071224';
  ctx.beginPath();
  ctx.arc(mCol2X + 24, metaBarY + 74, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E5C158';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(mCol2X + 24, metaBarY + 62);
  ctx.lineTo(mCol2X + 24, metaBarY + 74);
  ctx.lineTo(mCol2X + 34, metaBarY + 74);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('HORA', mCol2X + 62, metaBarY + 45);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.timeStr, mCol2X + 62, metaBarY + 80);

  // Divisória 2
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX + colMetaW * 2, metaBarY + 25);
  ctx.lineTo(centerX + colMetaW * 2, metaBarY + metaBarH - 25);
  ctx.stroke();

  // 3. INTEGRIDADE VERIFICADA
  const mCol3X = centerX + colMetaW * 2 + 20;
  ctx.fillStyle = '#E5C158';
  ctx.beginPath();
  ctx.moveTo(mCol3X + 24, metaBarY + 50);
  ctx.lineTo(mCol3X + 44, metaBarY + 58);
  ctx.lineTo(mCol3X + 24, metaBarY + 98);
  ctx.lineTo(mCol3X + 4, metaBarY + 58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#071224';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(mCol3X + 12, metaBarY + 72);
  ctx.lineTo(mCol3X + 20, metaBarY + 80);
  ctx.lineTo(mCol3X + 34, metaBarY + 64);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 21px system-ui, -apple-system, sans-serif';
  ctx.fillText('INTEGRIDADE:', mCol3X + 58, metaBarY + 45);
  ctx.fillStyle = '#E5C158';
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('VERIFICADA', mCol3X + 58, metaBarY + 80);

  // Divisória 3
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX + colMetaW * 3, metaBarY + 25);
  ctx.lineTo(centerX + colMetaW * 3, metaBarY + metaBarH - 25);
  ctx.stroke();

  // 4. DOCUMENTO PROTEGIDO
  const mCol4X = centerX + colMetaW * 3 + 20;
  ctx.fillStyle = '#E5C158';
  roundRect(ctx, mCol4X, metaBarY + 50, 40, 50, 6);
  ctx.fill();
  ctx.fillStyle = '#071224';
  roundRect(ctx, mCol4X + 10, metaBarY + 65, 20, 16, 4);
  ctx.fill();
  ctx.strokeStyle = '#071224';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(mCol4X + 20, metaBarY + 65, 6, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('DOCUMENTO', mCol4X + 54, metaBarY + 38);
  ctx.fillText('PROTEGIDO', mCol4X + 54, metaBarY + 64);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('Contra alterações', mCol4X + 54, metaBarY + 98);
  ctx.fillText('após a assinatura', mCol4X + 54, metaBarY + 120);

  // --- Faixa Dourada de Referências Legais no Rodapé Central ---
  const goldRibbonY = metaBarY + metaBarH + 20;
  const goldRibbonH = 46;

  const ribbonGrad = ctx.createLinearGradient(centerX, goldRibbonY, centerX + centerW, goldRibbonY);
  ribbonGrad.addColorStop(0, '#d8ab43');
  ribbonGrad.addColorStop(0.5, '#f7e599');
  ribbonGrad.addColorStop(1, '#c59837');

  ctx.fillStyle = ribbonGrad;
  roundRect(ctx, centerX, goldRibbonY, centerW, goldRibbonH, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#071224';
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('REFERÊNCIAS LEGAIS DE VALIDADE JURÍDICA MP 2.200-2/2001 LEI 14.063/2020', centerX + centerW / 2, goldRibbonY + 12);

  // ================= 7. LADO DIREITO - QR CODE COM MOLDURA DOURADA DUPLA (TOTALMENTE CENTRALIZADO VERTICALMENTE) =================
  const qrStartX = w - innerMargin - qrPanelW;

  // Linha vertical divisória à esquerda do painel QR
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(qrStartX - 10, innerMargin + 20);
  ctx.lineTo(qrStartX - 10, innerH - 20);
  ctx.stroke();

  const qrCenterColX = qrStartX + qrPanelW / 2;
  const qrBlockCenterY = innerH / 2; // 360px

  // Moldura Dourada Dupla do QR Code Expandido (+20% ampliado)
  const qrFrameW = 490;
  const qrFrameH = 490;
  const qrFrameX = qrCenterColX - qrFrameW / 2;
  const qrFrameY = 125;

  // Título "VALIDAR" no Topo do Bloco QR posicionado mais acima com destaque
  ctx.textAlign = 'center';
  ctx.fillStyle = '#071224';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText('VALIDAR', qrCenterColX, qrFrameY - 48);

  // Borda Externa Dourada
  ctx.strokeStyle = '#D8AB43';
  ctx.lineWidth = 5.5;
  roundRect(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 22);
  ctx.stroke();

  // Borda Interna Dourada Fina
  ctx.strokeStyle = '#E5C158';
  ctx.lineWidth = 2.5;
  roundRect(ctx, qrFrameX + 8, qrFrameY + 8, qrFrameW - 16, qrFrameH - 16, 16);
  ctx.stroke();

  // QR Code de Altíssima Resolução preenchendo a moldura com margem de respiro interna (+20% de tamanho)
  const qrSize = 445;
  const qrX = qrFrameX + (qrFrameW - qrSize) / 2;
  const qrY = qrFrameY + (qrFrameH - qrSize) / 2;

  try {
    const qrDataUrl = await QRCode.toDataURL(data.validationUrl, {
      margin: 1,
      width: 800,
      color: { dark: '#071224', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch (err) {
    console.error('Erro ao gerar QR Code para canvas:', err);
  }

  // Instrução Inferior de Validação em 3 Linhas bem legíveis e destacadas
  ctx.fillStyle = '#334155';
  ctx.font = '800 23.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('Escaneie o QR Code', qrCenterColX, qrFrameY + qrFrameH + 32);
  ctx.fillText('para verificar a validade', qrCenterColX, qrFrameY + qrFrameH + 58);
  ctx.fillText('deste documento', qrCenterColX, qrFrameY + qrFrameH + 84);

  ctx.restore(); // Fim do clip interno

  const dataUrl = canvas.toDataURL('image/png');
  return { bytes: dataUrlToUint8Array(dataUrl), widthPx: w, heightPx: h };
}

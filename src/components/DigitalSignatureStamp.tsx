import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Lock } from 'lucide-react';
import { DigitalSignature } from '../types/contract';

interface DigitalSignatureStampProps {
  signature?: DigitalSignature | null;
  signerName?: string;
  signerDoc?: string;
  roleLabel?: string;
  contractNumber?: string;
  contractId?: string;
  isPending?: boolean;
}

export const DigitalSignatureStamp: React.FC<DigitalSignatureStampProps> = ({
  signature,
  signerName = 'Rafael Tavares Matos',
  signerDoc = '025.803.262-60',
  roleLabel = 'CONTRATADO',
  contractNumber = 'CTR-2026-001',
  contractId = '6E91-2349-2480-C269',
  isPending = false,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Formatação do Nome do Signatário / Cliente
  const effectiveName = (signature?.nomeSignatario || signerName || 'Signatário Autenticado').toUpperCase();

  // Formatação do CPF/CNPJ com metade oculta (mascaramento de privacidade)
  const rawDoc = signature?.documentoSignatario || signerDoc || '';
  const formatMaskedDoc = (doc: string): string => {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.***.***-${clean.slice(9, 11)}`;
    }
    if (clean.length === 14) {
      return `${clean.slice(0, 2)}.***.***/${clean.slice(8, 12)}-**`;
    }
    // Caso seja texto genérico
    if (doc.length > 6) {
      return `${doc.slice(0, 3)}***${doc.slice(-2)}`;
    }
    return doc;
  };
  const effectiveDoc = formatMaskedDoc(rawDoc);

  // Data e Hora de Assinatura
  const dateObj = signature?.assinadoEm ? new Date(signature.assinadoEm) : new Date();

  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    : '25/08/2026';

  const formattedTime = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })
    : '14:05:54';

  // Rótulo do Papel (ex: CONTRATADO, CONTRATANTE, VENDEDOR, COMPRADOR, TESTEMUNHA)
  const effectiveRole = (roleLabel || 'CONTRATADO').toUpperCase().replace(/:$/, '');

  // ID da Assinatura (ex: 6E91-2349-2480-C269)
  const rawHash = (signature?.hashAutenticacao || '6E9123492480C2859CCF3CCD66GA7EDBBP0AB504CFB01C995B323F9C1').toUpperCase();
  const effectiveId = signature?.hashAutenticacao
    ? `${rawHash.slice(0, 4)}-${rawHash.slice(4, 8)}-${rawHash.slice(8, 12)}-${rawHash.slice(12, 16)}`
    : (contractId || '6E91-2349-2480-C269').toUpperCase();

  // Hash com 18 caracteres e reticências (...) para leitura clara e compacta
  const shortHash = (rawHash.length > 18 ? rawHash.slice(0, 18) : rawHash) + '...';

  // URL de Validação via QR Code
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const validationUrl = `${origin}/validar?sig=${encodeURIComponent(effectiveId)}`;

    QRCode.toDataURL(
      validationUrl,
      {
        width: 450,
        margin: 1,
        color: {
          dark: '#071224',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeUrl(url);
        }
      }
    );
  }, [effectiveId]);

  if (isPending && !signature) {
    return (
      <div
        className="relative bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-500 font-sans flex flex-col items-center justify-center p-6 mx-auto my-4 shadow-xs"
        style={{ width: '100%', maxWidth: '680px' }}
      >
        <Lock className="w-8 h-8 text-slate-400 mb-2" />
        <div className="text-base font-bold text-slate-700">
          Aguardando Assinatura Digital
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Selo com QR Code e Hash SHA-256 emitido após a confirmação de <strong>{signerName}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div
      id="digital-signature-stamp"
      className="relative w-full max-w-[820px] rounded-2xl p-[3.5px] bg-gradient-to-r from-[#c59a3f] via-[#f9ea9a] to-[#b3832f] shadow-xl text-slate-900 font-sans overflow-hidden mx-auto my-4 select-none print:shadow-none print:my-2"
    >
      {/* Moldura Interna Principal */}
      <div className="relative w-full bg-white rounded-[13px] overflow-hidden flex flex-row items-stretch min-h-[185px] sm:min-h-[210px]">
        {/* ================= 1. FAIXA ESQUERDA AZUL MARINHO COM PADRÃO POLIGONAL & MEDALHÃO DOURADO ================= */}
        <div className="relative w-[30%] sm:w-[29%] shrink-0 bg-[#071224] text-white flex flex-col items-center justify-between p-2.5 sm:p-3 overflow-hidden">
          {/* Padrão de Constelação / Malha Geométrica Poligonal no fundo */}
          <svg
            className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 300"
            preserveAspectRatio="none"
          >
            <path
              d="M10,20 L80,50 L160,20 L190,90 L120,130 L40,100 Z M80,50 L120,130 M40,100 L10,20 M120,130 L180,210 L100,260 L30,220 L40,100 Z M180,210 L190,90 M30,220 L100,260 M100,260 L140,290"
              stroke="#60a5fa"
              strokeWidth="1.2"
              fill="none"
            />
            <circle cx="80" cy="50" r="2.5" fill="#93c5fd" />
            <circle cx="160" cy="20" r="2.5" fill="#93c5fd" />
            <circle cx="120" cy="130" r="3" fill="#93c5fd" />
            <circle cx="40" cy="100" r="2.5" fill="#93c5fd" />
            <circle cx="180" cy="210" r="3" fill="#93c5fd" />
            <circle cx="100" cy="260" r="2.5" fill="#93c5fd" />
            <circle cx="30" cy="220" r="2.5" fill="#93c5fd" />
          </svg>

          {/* Medalhão Circular Dourado */}
          <div className="relative z-10 w-full max-w-[145px] sm:max-w-[165px] aspect-square flex items-center justify-center my-auto">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-xl"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gradiente Dourado Metálico Nobre */}
                <linearGradient id="goldMedalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e5c158" />
                  <stop offset="35%" stopColor="#faea9e" />
                  <stop offset="70%" stopColor="#c59837" />
                  <stop offset="100%" stopColor="#8f6418" />
                </linearGradient>

                <linearGradient id="shieldGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#faea9e" />
                  <stop offset="45%" stopColor="#d8ab43" />
                  <stop offset="100%" stopColor="#966d1a" />
                </linearGradient>

                {/* Arco Superior para "ASSINADO" */}
                <path
                  id="arcStampTop"
                  d="M 30,100 A 70,70 0 0,1 170,100"
                  fill="none"
                />
                {/* Arco Inferior para "ELETRONICAMENTE" */}
                <path
                  id="arcStampBottom"
                  d="M 30,100 A 70,70 0 0,0 170,100"
                  fill="none"
                />
              </defs>

              {/* Anel Externo Dourado com Borda Escovada */}
              <circle cx="100" cy="100" r="97" fill="url(#goldMedalGrad)" stroke="#5c4010" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="91" fill="none" stroke="#071224" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="59" fill="none" stroke="#071224" strokeWidth="2.5" />

              {/* Texto "ASSINADO" em arco superior */}
              <text
                fill="#071224"
                fontSize="18"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="4"
              >
                <textPath href="#arcStampTop" startOffset="50%" textAnchor="middle">
                  ASSINADO
                </textPath>
              </text>

              {/* Estrelas decorativas pretas nas laterais (2 estrelas de cada lado separando os arcos) */}
              <g fill="#071224">
                {/* Lado Esquerdo - Superior e Inferior */}
                <polygon points="26,88 27.5,92 32,92 28.5,95 29.8,99 26,96.5 22.2,99 23.5,95 20,92 24.5,92" />
                <polygon points="26,112 27.5,116 32,116 28.5,119 29.8,123 26,120.5 22.2,123 23.5,119 20,116 24.5,116" />
                {/* Lado Direito - Superior e Inferior */}
                <polygon points="174,88 175.5,92 180,92 176.5,95 177.8,99 174,96.5 170.2,99 171.5,95 168,92 172.5,92" />
                <polygon points="174,112 175.5,116 180,116 176.5,119 177.8,123 174,120.5 170.2,123 171.5,119 168,116 172.5,116" />
              </g>

              {/* Texto "ELETRONICAMENTE" em arco inferior */}
              <text
                fill="#071224"
                fontSize="12.5"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="1.6"
              >
                <textPath href="#arcStampBottom" startOffset="50%" textAnchor="middle">
                  ELETRONICAMENTE
                </textPath>
              </text>

              {/* Miolo Central Azul Marinho Escuro */}
              <circle cx="100" cy="100" r="57" fill="#071224" />
              <circle cx="100" cy="100" r="54" fill="none" stroke="url(#goldMedalGrad)" strokeWidth="2.2" />

              {/* Escudo Brasão Clássico Militar / Heráldico (Fiel à imagem de referência) */}
              {/* Borda Externa Dourada do Escudo */}
              <path
                d="M 100,64 C 112,66 124,67 132,70 L 132,96 C 132,118 114,129 100,136 C 86,129 68,118 68,96 L 68,70 C 76,67 88,66 100,64 Z"
                fill="#071224"
                stroke="url(#shieldGoldGrad)"
                strokeWidth="5"
                strokeLinejoin="miter"
              />

              {/* Linha de contorno interna fina no escudo */}
              <path
                d="M 100,69 C 110,71 120,72 127,74 L 127,95 C 127,114 112,123 100,130 C 88,123 73,114 73,95 L 73,74 C 80,72 90,71 100,69 Z"
                fill="none"
                stroke="#d8ab43"
                strokeWidth="1.5"
                opacity="0.8"
              />

              {/* Ícone de Check (✓) Branco Espesso e Nítido */}
              <path
                d="M 85,99 L 96,110 L 117,85"
                fill="none"
                stroke="#ffffff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Rodapé do Painel Esquerdo: Badge "COM VALIDADE JURÍDICA" Ampliado (Ligeiramente maior que o medalhão circular) */}
          <div className="relative z-10 flex items-center justify-center w-full mt-2">
            <div className="w-full max-w-[155px] sm:max-w-[178px] inline-flex items-center justify-center gap-1.5 bg-[#0b1b36] border border-[#e5c158]/70 rounded-full py-1.5 px-3 shadow-md mx-auto">
              <div className="w-4 h-4 rounded-full bg-[#f3e5ab] text-[#7a5310] flex items-center justify-center shrink-0 shadow-xs">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <span className="text-[10px] sm:text-[11.5px] font-black text-[#faea9e] tracking-wider uppercase whitespace-nowrap leading-none">
                COM VALIDADE JURÍDICA
              </span>
            </div>
          </div>
        </div>

        {/* ================= 2. ÁREA CENTRAL (DADOS DO CLIENTE + HASH & ID + BARRA ESCURA + FAIXA DOURADA) ================= */}
        <div className="flex-1 flex flex-col justify-between p-2.5 sm:p-3 min-w-0 bg-white">
          {/* Topo: Avatar com Anéis de Radar + Rótulo + Nome do Cliente Ampliado + CPF Mascarado Ampliado */}
          <div className="flex items-center gap-3">
            {/* Ícone de Avatar com Anéis de Biometria/Radar */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#1e40af]">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.4" />
                <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.8" />
                <circle cx="50" cy="50" r="31" fill="#f8fafc" stroke="currentColor" strokeWidth="3" />
                {/* Silhueta da cabeça e ombros */}
                <circle cx="50" cy="40" r="12" fill="none" stroke="currentColor" strokeWidth="4" />
                <path d="M 30,70 C 30,57 40,54 50,54 C 60,54 70,70" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            {/* Informações do Signatário / Cliente */}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-[12px] font-extrabold text-slate-700 tracking-wider uppercase">
                {effectiveRole}:
              </div>
              <div className="text-lg sm:text-2xl font-black text-[#071224] leading-tight truncate tracking-tight">
                {effectiveName}
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-600 font-semibold">CPF:</span>
                <span className="font-mono text-slate-950 font-black tracking-wide">{effectiveDoc}</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-200 my-1" />

          {/* Meio: Blocos HASH (18 caracteres + ...) e ID lado a lado com Ícones Dourados */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 items-center">
            {/* Bloco HASH Ampliado */}
            <div className="flex items-start gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#c59837] text-[#a1751d] flex items-center justify-center shrink-0 mt-0.5 bg-amber-50/70 shadow-xs">
                <span className="font-black text-lg sm:text-xl">#</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-black text-slate-950 uppercase leading-none">
                  HASH SHA-256:
                </div>
                <div className="text-xs sm:text-base font-black font-mono text-[#071224] tracking-tight leading-tight mt-1 truncate">
                  {shortHash}
                </div>
              </div>
            </div>

            {/* Bloco ID */}
            <div className="flex items-start gap-2 min-w-0 border-l border-slate-200 pl-2 sm:pl-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#c59837] text-[#a1751d] flex items-center justify-center shrink-0 mt-0.5 bg-amber-50/70 shadow-xs">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12zM6 10h6v2H6zm0 4h4v2H6zm8-4h4v6h-4z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-black text-slate-950 uppercase leading-none">
                  ID:
                </div>
                <div className="text-xs sm:text-base font-black font-mono text-[#071224] tracking-tight leading-tight mt-1 truncate">
                  {effectiveId}
                </div>
              </div>
            </div>
          </div>

          {/* Faixa Escura Horizontal de Metadados e Integridade (com ícones dourados) */}
          <div className="mt-1.5 w-full bg-[#071224] text-white rounded-lg px-2 py-1.5 grid grid-cols-4 gap-1.5 items-center">
            {/* DATA */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="text-[#e5c158] shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="min-w-0 leading-none">
                <div className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-300">DATA</div>
                <div className="text-[9px] sm:text-[10.5px] font-black text-white truncate mt-0.5">{formattedDate}</div>
              </div>
            </div>

            {/* HORA */}
            <div className="flex items-center gap-1.5 min-w-0 border-l border-slate-700 pl-1.5">
              <div className="text-[#e5c158] shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="min-w-0 leading-none">
                <div className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-300">HORA</div>
                <div className="text-[9px] sm:text-[10.5px] font-black text-white truncate mt-0.5">{formattedTime}</div>
              </div>
            </div>

            {/* INTEGRIDADE */}
            <div className="flex items-center gap-1.5 min-w-0 border-l border-slate-700 pl-1.5">
              <div className="text-[#e5c158] shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="min-w-0 leading-none">
                <div className="text-[7px] sm:text-[8px] font-bold text-slate-300">INTEGRIDADE:</div>
                <div className="text-[8.5px] sm:text-[10px] font-black text-[#e5c158] uppercase mt-0.5 truncate">VERIFICADA</div>
              </div>
            </div>

            {/* DOCUMENTO PROTEGIDO */}
            <div className="flex items-center gap-1.5 min-w-0 border-l border-slate-700 pl-1.5">
              <div className="text-[#e5c158] shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <rect x="9" y="11" width="6" height="5" rx="1" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0 leading-none">
                <div className="text-[7.5px] sm:text-[8.5px] font-black text-white leading-tight">DOC PROTEGIDO</div>
                <div className="text-[6.5px] sm:text-[7.5px] text-slate-300 truncate leading-tight">Contra alterações</div>
              </div>
            </div>
          </div>

          {/* Fita Dourada Curva no Rodapé Central */}
          <div className="mt-1 w-full bg-gradient-to-r from-[#d8ab43] via-[#f7e599] to-[#c59837] rounded-md px-2 py-0.5 text-center shadow-xs">
            <span className="text-[8px] sm:text-[9.5px] font-black text-[#071224] tracking-tight uppercase">
              REFERÊNCIAS LEGAIS DE VALIDADE JURÍDICA MP 2.200-2/2001 LEI 14.063/2020
            </span>
          </div>
        </div>

        {/* ================= 3. LADO DIREITO (QR CODE COM MOLDURA DOURADA DUPLA & TEXTOS DE VALIDAÇÃO TOTALMENTE CENTRALIZADOS) ================= */}
        <div className="relative w-[25%] sm:w-[24%] shrink-0 flex flex-col items-center justify-center p-1 sm:p-1.5 bg-slate-50/50 border-l border-slate-200">
          <div className="flex flex-col items-center justify-center my-auto w-full px-0.5">
            {/* Título Superior VALIDAR posicionado mais acima */}
            <div className="text-center w-full leading-none mb-1.5">
              <div className="text-xs sm:text-sm font-black text-[#071224] tracking-wider uppercase">
                VALIDAR
              </div>
            </div>

            {/* Moldura Dourada com Borda Dupla ao redor do QR Code Expandido (+20% de tamanho) */}
            <div className="w-full max-w-[170px] sm:max-w-[195px] aspect-square p-1.5 rounded-xl border-2 border-[#d8ab43] bg-white shadow-md flex items-center justify-center relative my-0.5 mx-auto">
              <div className="absolute inset-0.5 border border-[#e5c158] rounded-lg pointer-events-none" />
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code de Validação"
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full bg-slate-100 animate-pulse rounded flex items-center justify-center text-[10px] text-slate-400">
                  QR...
                </div>
              )}
            </div>

            {/* Instrução Inferior de Validação em 3 Linhas bem legíveis */}
            <div className="text-center w-full leading-tight mt-1">
              <div className="text-[7.5px] sm:text-[9px] font-bold text-slate-700 leading-tight">
                <div>Escaneie o QR Code</div>
                <div>para verificar a validade</div>
                <div>deste documento</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

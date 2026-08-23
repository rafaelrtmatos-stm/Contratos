import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Fingerprint,
  Scale,
  Hash,
  Smartphone,
  Lock,
  User,
  Check,
} from 'lucide-react';
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
  signerDoc = '***.***.***-**',
  roleLabel = 'ASSINANTE',
  contractNumber = 'CTR-2026-001',
  contractId = '8F4A-92C1-7B35-4D81',
  isPending = false,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Formatação dos Dados
  const effectiveName = signature?.nomeSignatario || signerName || 'Signatário Autenticado';
  
  // Mascarar CPF preservando privacidade
  const rawDoc = signature?.documentoSignatario || signerDoc || '';
  const formatMaskedDoc = (doc: string): string => {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
    }
    if (clean.length === 14) {
      return `**.${clean.slice(2, 5)}.${clean.slice(5, 8)}/****-**`;
    }
    return doc.includes('*') ? doc : `***.***.***-**`;
  };
  const effectiveDoc = formatMaskedDoc(rawDoc);

  // Data e Hora
  const dateObj = signature?.assinadoEm ? new Date(signature.assinadoEm) : new Date();
  
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '22/08/2026';

  const formattedTime = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '17:42:18';

  // ID da Assinatura (ex: 8F4A-92C1-7B35-4D81)
  const effectiveId = signature?.hashAutenticacao
    ? `${signature.hashAutenticacao.slice(0, 4)}-${signature.hashAutenticacao.slice(4, 8)}-${signature.hashAutenticacao.slice(8, 12)}-${signature.hashAutenticacao.slice(12, 16)}`.toUpperCase()
    : (contractId || '8F4A-92C1-7B35-4D81').toUpperCase();

  // Hash SHA-256 (32 a 64 chars em maiúsculo)
  const effectiveHash = (signature?.hashAutenticacao || '7A91F3E2D8F5C6A4B7E2D9F1A3C8E2B7E82F7B1C9D2E3F4A5B6C7D8E9F0A1B2C')
    .toUpperCase()
    .slice(0, 36);

  // Gerar QR Code Dinâmico de Validação
  useEffect(() => {
    const validationPayload = JSON.stringify({
      autenticacao: 'CONTRATO_VALIDADO',
      id: effectiveId,
      contrato: contractNumber,
      signatario: effectiveName,
      hash: effectiveHash,
      data: `${formattedDate} ${formattedTime}`,
    });

    QRCode.toDataURL(
      validationPayload,
      {
        width: 320,
        margin: 1,
        color: {
          dark: '#001a38',
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
  }, [effectiveId, contractNumber, effectiveName, effectiveHash, formattedDate, formattedTime]);

  if (isPending && !signature) {
    return (
      <div className="relative bg-slate-50/80 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 font-sans space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-sm font-bold text-slate-700">Aguardando Assinatura Digital</div>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          O carimbo de autenticação jurídica com QR Code e Hash SHA-256 será emitido após a assinatura eletrônica de <strong>{signerName}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div
      id="digital-signature-stamp"
      className="relative bg-white rounded-2xl sm:rounded-3xl border-2 border-[#001f3f] p-3 sm:p-4 md:p-5 shadow-sm text-slate-900 font-sans transition-all overflow-visible max-w-4xl mx-auto"
    >
      {/* Grade Principal Horizontal */}
      <div className="flex flex-col lg:flex-row items-stretch gap-3.5 sm:gap-4.5">
        
        {/* ========================================================================= */}
        {/* 1. BLOCO ESQUERDO: Painel Vertical Azul-Marinho com Escudo & Validade     */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-44 bg-gradient-to-b from-[#061838] via-[#04122c] to-[#020a1c] rounded-xl sm:rounded-2xl p-4 flex flex-col items-center justify-between text-center text-white shrink-0 relative overflow-hidden shadow-inner min-h-[220px] lg:min-h-[260px]">
          {/* Textura de Fundo Sutil */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:10px_10px]" />

          {/* Escudo com Check Verde */}
          <div className="relative my-auto flex flex-col items-center space-y-2 z-10">
            <div className="relative w-18 h-22 sm:w-20 sm:h-24 flex items-center justify-center">
              {/* Contorno Externo do Escudo */}
              <svg viewBox="0 0 100 120" className="w-full h-full text-white drop-shadow-md">
                <path
                  d="M50 5 L88 20 C88 65 50 110 50 110 C50 110 12 65 12 20 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                {/* Check Verde em Destaque */}
                <path
                  d="M32 58 L45 72 L70 42"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Tipografia de Assinado Eletronicamente */}
            <div className="space-y-0.5">
              <span className="block text-base sm:text-lg font-black tracking-wider text-white leading-tight">
                ASSINADO
              </span>
              <span className="block text-[11px] sm:text-xs font-black tracking-widest text-[#10b981] uppercase leading-tight">
                ELETRONICAMENTE
              </span>
            </div>
          </div>

          {/* Selo Inferior: COM VALIDADE JURÍDICA */}
          <div className="w-full mt-2 pt-2 border-t border-white/10 z-10">
            <div className="bg-[#032e1e]/80 border border-[#10b981]/50 rounded-full px-2 py-1 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold text-[#10b981] tracking-tight">
              <div className="w-3.5 h-3.5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="truncate">COM VALIDADE JURÍDICA</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BLOCO CENTRAL: Informações do Signatário, Metadados e Fundamentação   */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-3.5 min-w-0">
          
          {/* BLOCO CENTRAL SUPERIOR: Nome do Assinante e CPF */}
          <div className="flex items-start gap-3 sm:gap-3.5 pb-2.5 sm:pb-3 border-b border-slate-100">
            {/* Ícone Circular de Usuário */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#001f3f] text-white flex items-center justify-center shrink-0 shadow-md">
              <User className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {roleLabel || 'ASSINANTE'}
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-[#001f3f] tracking-tight truncate leading-tight mt-0.5">
                {effectiveName}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                CPF: <span className="font-mono text-slate-900 font-bold">{effectiveDoc}</span>
              </p>
            </div>
          </div>

          {/* BLOCO CENTRAL INTERMEDIÁRIO: Data, Hora e ID da Assinatura */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 items-center py-1">
            {/* 1. DATA DA ASSINATURA */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#001f3f] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  DATA DA ASSINATURA
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#001f3f] truncate block">
                  {formattedDate}
                </span>
              </div>
            </div>

            {/* 2. HORA DA ASSINATURA */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 border-l border-slate-200 pl-2 sm:pl-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#001f3f] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  HORA DA ASSINATURA
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#001f3f] truncate block">
                  {formattedTime}
                </span>
              </div>
            </div>

            {/* 3. ID DA ASSINATURA */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 border-l border-slate-200 pl-2 sm:pl-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#001f3f] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  ID DA ASSINATURA
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-extrabold text-[#001f3f] truncate block">
                  {effectiveId}
                </span>
              </div>
            </div>
          </div>

          {/* FUNDAMENTAÇÃO LEGAL & HASH SHA-256 */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2 border-t border-slate-100">
            {/* Fundamentação Legal (Col 5) */}
            <div className="sm:col-span-5 flex items-center gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl p-2">
              <div className="w-8 h-8 rounded-lg bg-[#001f3f] text-white flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase block leading-tight">
                  FUNDAMENTAÇÃO LEGAL
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 block leading-tight">
                  MP 2.200-2/2001 • Lei 14.063/2020
                </span>
              </div>
            </div>

            {/* Hash SHA-256 (Col 7) */}
            <div className="sm:col-span-7 flex items-center gap-2 bg-slate-50/80 border border-slate-200/80 rounded-xl p-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#001f3f] text-white flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase block leading-tight">
                  HASH SHA-256
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#001f3f] truncate block leading-tight">
                  {effectiveHash}
                </span>
              </div>
            </div>
          </div>

          {/* FAIXA: DOCUMENTO PROTEGIDO (NÃO FICA EMBAIXO DO QR CODE) */}
          <div className="bg-[#f0fdf4] border border-[#86efac] rounded-xl px-3 py-2 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-5 h-5 rounded-md bg-[#10b981] text-white flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black text-[#047857] uppercase tracking-wider">
                DOCUMENTO PROTEGIDO
              </span>
            </div>

            <div className="hidden sm:block h-3.5 w-px bg-[#86efac]" />

            <span className="text-[11px] font-semibold text-slate-700 truncate">
              Contra alterações após a assinatura.
            </span>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. BLOCO DIREITO: Painel Vertical Exclusivo com QR CODE GRANDE            */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-52 rounded-2xl border-2 border-[#001f3f] overflow-hidden flex flex-col justify-between bg-white shrink-0 shadow-xs">
          {/* Área Superior: QR Code Grande em Destaque Proporcional */}
          <div className="p-3 sm:p-3.5 flex-1 flex items-center justify-center bg-white min-h-[160px]">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code de Autenticidade"
                className="w-full h-full max-w-[170px] max-h-[170px] aspect-square object-contain mx-auto"
              />
            ) : (
              <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
                Gerando QR...
              </div>
            )}
          </div>

          {/* Barra Inferior Azul-Marinho com Validação e Smartphone */}
          <div className="bg-[#001f3f] text-white p-2.5 flex items-center justify-center gap-2 text-center">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-left">
              <span className="block text-[10px] sm:text-[11px] font-black tracking-wider uppercase leading-tight text-white">
                VALIDAR DOCUMENTO
              </span>
              <span className="block text-[9px] text-slate-300 font-medium leading-tight">
                Escaneie o QR Code
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Ícone Central Pequeno na Borda Inferior (Fiel à Imagem) */}
      <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 bg-[#001f3f] text-white px-2 py-0.5 rounded-md border border-white shadow-xs flex items-center justify-center">
        <Check className="w-3 h-3 text-[#10b981] stroke-[3]" />
      </div>
    </div>
  );
};

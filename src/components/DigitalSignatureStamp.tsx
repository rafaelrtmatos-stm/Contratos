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
  
  // CPF/CNPJ COMPLETO (não mascarado)
  const rawDoc = signature?.documentoSignatario || signerDoc || '';
  const formatDoc = (doc: string): string => {
    // Retorna o CPF/CNPJ completo e formatado
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      // CPF: 000.000.000-00
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
    }
    if (clean.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
    }
    return doc;
  };
  const effectiveDoc = formatDoc(rawDoc);

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
      <div className="relative bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 font-sans space-y-2">
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

  // Layout compacto e vertical: selo em cima, depois status, depois CPF, depois QR
  return (
    <div
      id="digital-signature-stamp"
      className="relative bg-white rounded-xl border-2 border-[#0D376B] shadow-sm text-center font-sans overflow-hidden max-w-xs mx-auto p-4"
    >
      {/* ================= PAINEL INSTITUCIONAL: CARIMBO OFICIAL ================= */}
      <div className="bg-[#0D376B] text-white rounded-lg p-3 mb-3 flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-2">
          <Check className="w-4 h-4 text-[#18A544] stroke-[3]" />
        </div>
        <div className="leading-tight">
          <span className="block text-[10px] font-black tracking-wide">ASSINADO</span>
          <span className="block text-[7px] font-bold tracking-wide">ELETRONICAMENTE</span>
        </div>
        <span className="block text-[6.5px] font-medium mt-1 opacity-90">COM VALIDADE JURÍDICA</span>
        <div className="w-6 h-px bg-white/40 my-1.5" />
        <div className="text-[6px] font-semibold leading-snug opacity-90">
          <div>MP 2.200-2/2001 | LEI 14.063/2020</div>
        </div>
      </div>

      {/* ================= STATUS: CONTRATADO ================= */}
      <div className="mb-3">
        <p className="text-sm font-black text-[#0D376B]">✅ CONTRATADO</p>
      </div>

      {/* ================= CPF ================= */}
      <div className="mb-3">
        <p className="text-xs font-bold text-[#3F4D63] uppercase block mb-1">CPF</p>
        <p className="text-base font-mono font-bold text-slate-900">{effectiveDoc}</p>
      </div>

      {/* ================= QR CODE ================= */}
      <div className="flex flex-col items-center">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code de Autenticidade"
            className="w-24 h-24 object-contain border border-slate-200 rounded-md mb-2"
          />
        ) : (
          <div className="w-24 h-24 bg-slate-100 animate-pulse rounded-md flex items-center justify-center text-[8px] text-slate-400 mb-2">
            QR...
          </div>
        )}
        <span className="text-[7px] font-black text-[#0D376B] uppercase">VALIDAR DOCUMENTO</span>
      </div>
    </div>
  );
};

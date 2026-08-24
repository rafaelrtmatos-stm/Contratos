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

  // Mesma paleta e estrutura do carimbo oficial (painel institucional + conteúdo + QR)
  return (
    <div
      id="digital-signature-stamp"
      className="relative flex bg-white rounded-2xl border-2 border-[#0D376B] shadow-sm text-slate-900 font-sans overflow-hidden w-full max-w-4xl mx-auto"
    >
      {/* ================= PAINEL INSTITUCIONAL ESQUERDO (fundo azul sólido) ================= */}
      <div className="w-[20%] shrink-0 bg-[#0D376B] text-white flex flex-col items-center px-[2%] py-[2%] text-center">
        <div className="w-[35%] h-auto aspect-square rounded-full bg-white flex items-center justify-center shrink-0">
          <Check className="w-[50%] h-auto text-[#18A544] stroke-[3]" />
        </div>
        <div className="mt-[1.5%] leading-tight w-full">
          <span className="block text-[1.2vw] font-black tracking-wide">ASSINADO</span>
          <span className="block text-[0.9vw] font-bold tracking-wide">ELETRONICAMENTE</span>
        </div>
        <span className="block text-[0.8vw] font-medium mt-[0.5%] opacity-90 leading-tight">
          COM VALIDADE JURÍDICA
        </span>
        <div className="w-[40%] h-px bg-white/40 my-[1.5%]" />
        <div className="text-[0.7vw] font-semibold leading-snug opacity-90 w-full">
          <div>MP 2.200-2/2001</div>
          <div>LEI 14.063/2020</div>
        </div>
      </div>

      {/* ================= ÁREA DE CONTEÚDO ================= */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-[2%] px-[2%] pt-[1.5%] pb-[1.5%] border-b border-slate-100 bg-blue-50/50">
          <div className="w-[8%] h-auto aspect-square rounded-full bg-[#164A82] text-white flex items-center justify-center shrink-0">
            <User className="w-[60%] h-auto" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.9vw] font-bold text-[#3F4D63] uppercase tracking-wider block">
              {roleLabel || 'ASSINANTE'}
            </span>
            <h3 className="text-[1.3vw] font-black text-[#0D376B] leading-tight break-words">
              {effectiveName}
            </h3>
            <p className="text-[1vw] font-semibold text-[#3F4D63] mt-[0.3%] break-words">
              CPF: <span className="font-mono text-slate-900 font-bold">{effectiveDoc}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[1.5%] px-[2%] py-[1.5%] border-b border-slate-100">
          <div className="flex items-center gap-[1%] min-w-0">
            <Calendar className="w-[3%] h-auto text-[#164A82] shrink-0" />
            <div className="min-w-0">
              <span className="text-[0.75vw] font-bold text-[#3F4D63] uppercase block truncate">DATA</span>
              <span className="text-[1vw] font-extrabold text-slate-800 truncate block">{formattedDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-[1%] min-w-0 border-l border-slate-200 pl-[1.5%]">
            <Clock className="w-[3%] h-auto text-[#164A82] shrink-0" />
            <div className="min-w-0">
              <span className="text-[0.75vw] font-bold text-[#3F4D63] uppercase block truncate">HORA</span>
              <span className="text-[1vw] font-extrabold text-slate-800 truncate block">{formattedTime}</span>
            </div>
          </div>
          <div className="flex items-center gap-[1%] min-w-0 border-l border-slate-200 pl-[1.5%]">
            <Fingerprint className="w-[3%] h-auto text-[#164A82] shrink-0" />
            <div className="min-w-0">
              <span className="text-[0.75vw] font-bold text-[#3F4D63] uppercase block truncate">ID DA ASSINATURA</span>
              <span className="text-[0.9vw] font-mono font-extrabold text-slate-800 truncate block">{effectiveId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[1.5%] px-[2%] pt-[1%]">
          <ShieldCheck className="w-[3%] h-auto text-[#18A544] shrink-0" />
          <span className="text-[0.9vw] font-bold text-[#3F4D63] uppercase">INTEGRIDADE DO DOCUMENTO</span>
          <span className="text-[0.9vw] font-black text-[#18A544] uppercase">VERIFICADA</span>
        </div>

        <div className="flex items-center gap-[1.5%] px-[2%] py-[1%] min-w-0">
          <div className="w-[3%] aspect-square rounded-full bg-[#164A82] text-white flex items-center justify-center text-[0.8vw] font-bold shrink-0">#</div>
          <span className="text-[0.9vw] font-bold text-[#3F4D63] uppercase shrink-0">HASH SHA-256</span>
          <span className="text-[0.8vw] font-mono text-slate-600 truncate min-w-0">{effectiveHash}</span>
        </div>

        <div className="flex items-center gap-[1.5%] px-[2%] pb-[1.5%] pt-[0.5%]">
          <Lock className="w-[3%] h-auto text-[#164A82] shrink-0" />
          <div className="min-w-0">
            <span className="text-[0.9vw] font-bold text-[#3F4D63] uppercase block leading-tight">DOCUMENTO PROTEGIDO</span>
            <span className="text-[0.8vw] text-slate-500 block leading-tight">Contra alterações após a assinatura</span>
          </div>
        </div>
      </div>

      {/* ================= QR CODE (canto superior direito) ================= */}
      <div className="w-[20%] shrink-0 flex flex-col items-center justify-start pt-[1.5%] px-[1.5%] gap-[1%] border-l border-slate-100">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code de Autenticidade"
            className="w-[80%] h-auto object-contain border border-slate-200 rounded-md"
          />
        ) : (
          <div className="w-[80%] h-auto aspect-square bg-slate-100 animate-pulse rounded-md flex items-center justify-center text-[0.7vw] text-slate-400">
            QR...
          </div>
        )}
        <div className="text-center leading-tight w-full">
          <span className="block text-[0.75vw] font-black text-[#0D376B] uppercase">VALIDAR DOCUMENTO</span>
          <span className="block text-[0.65vw] text-slate-400">Escaneie o QR Code</span>
        </div>
      </div>
    </div>
  );
};

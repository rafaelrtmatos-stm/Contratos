import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Fingerprint,
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

// Selo dimensionado como percentual fixo da página A4 (210mm x 297mm):
// 33% da largura da página e 7% da altura da página, em todas as visualizações
// (tela, impressão e PDF). Unidades em mm garantem o mesmo tamanho físico
// independente do viewport.
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const STAMP_WIDTH_MM = PAGE_WIDTH_MM * 0.33; // 69.3mm
const STAMP_HEIGHT_MM = PAGE_HEIGHT_MM * 0.07; // 20.79mm

// Tamanho mínimo de fonte: 4pt (nenhum texto fica abaixo disso)
const MIN_FONT = '4pt';

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
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
    }
    if (clean.length === 14) {
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

  // Hash SHA-256 completo (nenhuma informação é truncada)
  const effectiveHash = (signature?.hashAutenticacao || '7A91F3E2D8F5C6A4B7E2D9F1A3C8E2B7E82F7B1C9D2E3F4A5B6C7D8E9F0A1B2C').toUpperCase();

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
      <div
        className="relative bg-slate-50/80 rounded-md border-2 border-dashed border-slate-300 text-center text-slate-500 font-sans flex flex-col items-center justify-center gap-[0.4mm] mx-auto overflow-hidden"
        style={{ width: `${STAMP_WIDTH_MM}mm`, height: `${STAMP_HEIGHT_MM}mm`, boxSizing: 'border-box', padding: '1mm' }}
      >
        <Lock style={{ width: '2.5mm', height: '2.5mm' }} className="text-slate-400" />
        <div style={{ fontSize: '5.5pt', lineHeight: 1.1 }} className="font-bold text-slate-700">
          Aguardando Assinatura Digital
        </div>
        <p style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="text-slate-500">
          Selo com QR Code e Hash SHA-256 emitido após a assinatura de <strong>{signerName}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div
      id="digital-signature-stamp"
      className="relative flex bg-white border-[0.3mm] border-[#0D376B] shadow-sm text-slate-900 font-sans overflow-hidden mx-auto"
      style={{
        width: `${STAMP_WIDTH_MM}mm`,
        height: `${STAMP_HEIGHT_MM}mm`,
        boxSizing: 'border-box',
        borderRadius: '1mm',
      }}
    >
      {/* ================= PAINEL INSTITUCIONAL ESQUERDO ================= */}
      <div
        className="shrink-0 bg-[#0D376B] text-white flex flex-col items-center justify-center text-center"
        style={{ width: '20%', padding: '0.5mm' }}
      >
        <div
          className="rounded-full bg-white flex items-center justify-center shrink-0"
          style={{ width: '2.8mm', height: '2.8mm' }}
        >
          <Check style={{ width: '1.7mm', height: '1.7mm' }} className="text-[#18A544] stroke-[3]" />
        </div>
        <div className="leading-none w-full" style={{ marginTop: '0.4mm' }}>
          <span className="block font-black tracking-wide" style={{ fontSize: MIN_FONT, lineHeight: 1.15 }}>ASSINADO</span>
          <span className="block font-bold tracking-wide" style={{ fontSize: MIN_FONT, lineHeight: 1.15 }}>ELETRONICAMENTE</span>
        </div>
        <span className="block font-medium opacity-90" style={{ fontSize: MIN_FONT, lineHeight: 1.1, marginTop: '0.3mm' }}>
          COM VALIDADE JURÍDICA
        </span>
        <div className="bg-white/40" style={{ width: '40%', height: '0.15mm', margin: '0.4mm 0' }} />
        <div className="font-semibold opacity-90 w-full" style={{ fontSize: MIN_FONT, lineHeight: 1.15 }}>
          <div>MP 2.200-2/2001</div>
          <div>LEI 14.063/2020</div>
        </div>
      </div>

      {/* ================= ÁREA DE CONTEÚDO ================= */}
      <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ padding: '0 0.7mm', gap: '0.3mm' }}>
        <div className="flex items-start" style={{ gap: '0.5mm' }}>
          <div
            className="rounded-full bg-[#164A82] text-white flex items-center justify-center shrink-0"
            style={{ width: '2.3mm', height: '2.3mm' }}
          >
            <User style={{ width: '1.3mm', height: '1.3mm' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: MIN_FONT, lineHeight: 1.15 }} className="break-words">
              <span className="font-bold uppercase tracking-wide text-[#3F4D63]">{(roleLabel || 'ASSINANTE') + ': '}</span>
              <span className="font-black text-[#0D376B]">{effectiveName}</span>
            </div>
            <p style={{ fontSize: MIN_FONT, lineHeight: 1.15 }} className="font-semibold text-[#3F4D63] break-words">
              CPF: <span className="font-mono text-slate-900 font-bold">{effectiveDoc}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3" style={{ gap: '0.6mm' }}>
          <div className="flex items-center min-w-0" style={{ gap: '0.3mm' }}>
            <Calendar style={{ width: '1.6mm', height: '1.6mm' }} className="text-[#164A82] shrink-0" />
            <div className="min-w-0">
              <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-bold text-[#3F4D63] uppercase block truncate">DATA</span>
              <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-extrabold text-slate-800 truncate block">{formattedDate}</span>
            </div>
          </div>
          <div className="flex items-center min-w-0 border-l border-slate-200" style={{ gap: '0.3mm', paddingLeft: '0.5mm' }}>
            <Clock style={{ width: '1.6mm', height: '1.6mm' }} className="text-[#164A82] shrink-0" />
            <div className="min-w-0">
              <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-bold text-[#3F4D63] uppercase block truncate">HORA</span>
              <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-extrabold text-slate-800 truncate block">{formattedTime}</span>
            </div>
          </div>
          <div className="flex items-center min-w-0 border-l border-slate-200" style={{ gap: '0.3mm', paddingLeft: '0.5mm' }}>
            <Fingerprint style={{ width: '1.6mm', height: '1.6mm' }} className="text-[#164A82] shrink-0" />
            <div className="min-w-0">
              <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-bold text-[#3F4D63] uppercase block truncate">ID</span>
              <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-mono font-extrabold text-slate-800 truncate block">{effectiveId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: '0.5mm' }}>
          <ShieldCheck style={{ width: '1.6mm', height: '1.6mm' }} className="text-[#18A544] shrink-0" />
          <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-bold text-[#3F4D63] uppercase">INTEGRIDADE:</span>
          <span style={{ fontSize: MIN_FONT, lineHeight: 1.1 }} className="font-black text-[#18A544] uppercase">VERIFICADA</span>
        </div>

        <div className="flex items-start min-w-0" style={{ gap: '0.5mm' }}>
          <span style={{ fontSize: MIN_FONT, lineHeight: 1.15 }} className="font-bold text-[#3F4D63] uppercase shrink-0">HASH:</span>
          <span style={{ fontSize: MIN_FONT, lineHeight: 1.15, wordBreak: 'break-all' }} className="font-mono text-slate-600 min-w-0">{effectiveHash}</span>
        </div>

        <div className="min-w-0" style={{ fontSize: MIN_FONT, lineHeight: 1.15 }}>
          <span className="font-bold text-[#3F4D63] uppercase">DOCUMENTO PROTEGIDO </span>
          <span className="text-slate-500">contra alterações após a assinatura</span>
        </div>
      </div>

      {/* ================= QR CODE ================= */}
      <div
        className="shrink-0 flex flex-col items-center justify-center border-l border-slate-100"
        style={{ width: '20%', padding: '0.5mm', gap: '0.3mm' }}
      >
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code de Autenticidade"
            className="object-contain border border-slate-200 rounded-sm"
            style={{ width: '85%', height: 'auto' }}
          />
        ) : (
          <div
            className="bg-slate-100 animate-pulse rounded-sm flex items-center justify-center text-slate-400"
            style={{ width: '85%', aspectRatio: '1 / 1', fontSize: MIN_FONT }}
          >
            QR...
          </div>
        )}
        <div className="text-center leading-none w-full">
          <span className="block font-black text-[#0D376B] uppercase" style={{ fontSize: MIN_FONT, lineHeight: 1.1 }}>VALIDAR</span>
          <span className="block text-slate-400" style={{ fontSize: MIN_FONT, lineHeight: 1.1 }}>Escaneie o QR</span>
        </div>
      </div>
    </div>
  );
};

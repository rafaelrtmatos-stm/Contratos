import React from 'react';
import { ContractData, DigitalSignature } from '../types/contract';
import { X, ShieldCheck, Fingerprint, Globe, Monitor, Clock, KeyRound } from 'lucide-react';

interface EvidenceLogModalProps {
  contract: ContractData;
  onClose: () => void;
}

const roleLabel = (role: string): string => {
  if (role === 'vendedor') return 'Contratante';
  if (role === 'comprador') return 'Contratado';
  if (role === 'comprador_adicional') return 'Contratado Adicional';
  if (role === 'testemunha1') return 'Testemunha 1';
  if (role === 'testemunha2') return 'Testemunha 2';
  return role;
};

const formatDateTime = (iso: string): string => {
  try {
    // Sempre horário de Brasília, independente do fuso do dispositivo.
    return new Date(iso).toLocaleString('pt-BR', { hour12: true, timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
};

export const EvidenceLogModal: React.FC<EvidenceLogModalProps> = ({ contract, onClose }) => {
  const assinaturas: DigitalSignature[] = contract.assinaturas || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Log de Evidências</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {assinaturas.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Nenhuma assinatura digital registrada para este contrato ainda.
            </p>
          ) : (
            assinaturas.map((a, idx) => (
              <div
                key={`${a.role}-${idx}`}
                className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {roleLabel(a.role)} — {a.nomeSignatario}
                  </span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    Assinado digitalmente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatDateTime(a.assinadoEm)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>IP: {a.ipAssinatura || 'não capturado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Meio de autenticação: {a.meioAutenticacao || 'não registrado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="break-all font-mono">{a.hashAutenticacao}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="break-all">{a.metadadosNavegador}</span>
                  </div>
                  <div className="text-slate-500 sm:col-span-2">
                    Documento: {a.documentoSignatario}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

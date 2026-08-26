import React, { useState } from 'react';
import { ContractData, DigitalSignature } from '../types/contract';
import {
  X,
  ShieldCheck,
  Fingerprint,
  Globe,
  Monitor,
  Clock,
  KeyRound,
  Copy,
  Check,
  FileText,
} from 'lucide-react';

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
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Formata todo o log de auditoria em texto claro para cópia
  const formatFullLogText = (): string => {
    const lines: string[] = [
      '====================================================',
      '        LOG DE EVIDÊNCIAS E AUDITORIA DIGITAL        ',
      '====================================================',
      `Contrato: Nº ${contract.numeroContrato || '---'}`,
      `Título: ${contract.titulo || 'Contrato Imobiliário'}`,
      `Tipo: ${contract.tipo || 'Venda'}`,
      `Data de Emissão do Log: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília)`,
      `Status: ${assinaturas.length > 0 ? `${assinaturas.length} assinatura(s) registrada(s)` : 'Sem assinaturas'}`,
      '----------------------------------------------------',
      'SIGNATÁRIOS E EVIDÊNCIAS DE ASSINATURA ELETRÔNICA:',
      '----------------------------------------------------',
    ];

    if (assinaturas.length === 0) {
      lines.push('Nenhuma assinatura digital registrada até o momento.');
    } else {
      assinaturas.forEach((a, index) => {
        lines.push(`\n[ASSINATURA #${index + 1}]`);
        lines.push(`Signatário: ${a.nomeSignatario}`);
        lines.push(`Papel: ${roleLabel(a.role)}`);
        lines.push(`Documento / CPF: ${a.documentoSignatario || 'Não informado'}`);
        lines.push(`Data e Hora: ${formatDateTime(a.assinadoEm)} (Horário de Brasília)`);
        lines.push(`Endereço IP: ${a.ipAssinatura || 'Não capturado'}`);
        lines.push(`Meio de Autenticação: ${a.meioAutenticacao || 'Código de Confirmação OTP'}`);
        if (a.codigoConfirmacao) {
          lines.push(`Código de Verificação: ${a.codigoConfirmacao}`);
        }
        lines.push(`HASH Criptográfico SHA-256: ${a.hashAutenticacao}`);
        lines.push(`Metadados do Dispositivo / Navegador: ${a.metadadosNavegador || '---'}`);
      });
    }

    lines.push('\n----------------------------------------------------');
    lines.push('BASE LEGAL:');
    lines.push('Assinatura Eletrônica em conformidade com a Medida Provisória nº 2.200-2/2001 e Lei Federal nº 14.063/2020.');
    lines.push('====================================================');

    return lines.join('\n');
  };

  // Formata o log de um signatário específico
  const formatSingleSignatureText = (a: DigitalSignature, index: number): string => {
    return [
      `--- EVIDÊNCIA DE ASSINATURA ELETRÔNICA #${index + 1} ---`,
      `Contrato: Nº ${contract.numeroContrato || '---'} (${contract.titulo || ''})`,
      `Signatário: ${a.nomeSignatario} (${roleLabel(a.role)})`,
      `Documento / CPF: ${a.documentoSignatario || '---'}`,
      `Data e Hora: ${formatDateTime(a.assinadoEm)} (Horário de Brasília)`,
      `IP: ${a.ipAssinatura || '---'}`,
      `Meio de Autenticação: ${a.meioAutenticacao || 'Código OTP'}`,
      a.codigoConfirmacao ? `Código de Verificação: ${a.codigoConfirmacao}` : '',
      `HASH SHA-256: ${a.hashAutenticacao}`,
      `Dispositivo / Navegador: ${a.metadadosNavegador || '---'}`,
      `Validade Jurídica: MP 2.200-2/2001 e Lei 14.063/2020`,
    ].filter(Boolean).join('\n');
  };

  const handleCopyAll = async () => {
    try {
      const text = formatFullLogText();
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar log:', err);
    }
  };

  const handleCopySingle = async (a: DigitalSignature, index: number) => {
    try {
      const text = formatSingleSignatureText(a, index);
      await navigator.clipboard.writeText(text);
      setCopiedIdx(index);
      setTimeout(() => setCopiedIdx(null), 2500);
    } catch (err) {
      console.error('Erro ao copiar evidência:', err);
    }
  };

  const handleCopyField = async (val: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 print:hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">
                Log de Evidências e Auditoria
              </h2>
              <p className="text-[11px] text-slate-500">
                Contrato Nº {contract.numeroContrato || '---'} • Registro criptográfico de autenticidade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {assinaturas.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Copiar todo o relatório de evidências para a área de transferência"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Log Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copiar Log Completo</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de Evidências */}
        <div className="p-4 overflow-y-auto space-y-3.5 divide-y divide-slate-100">
          {assinaturas.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Nenhuma assinatura digital registrada para este contrato ainda.
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Assim que as partes assinarem digitalmente, os carimbos de data/hora, IPs, hashes SHA-256 e evidências de auditoria ficarão listados aqui.
              </p>
            </div>
          ) : (
            assinaturas.map((a, idx) => (
              <div
                key={`${a.role}-${idx}`}
                className="pt-3.5 first:pt-0 border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/70 border"
              >
                {/* Barra do Signatário com Botão de Copiar Específico */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-[#faea9e] font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="text-xs font-black text-slate-900 block truncate">
                        {roleLabel(a.role)} — {a.nomeSignatario}
                      </span>
                      {a.documentoSignatario && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Doc: {a.documentoSignatario}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-amber-700" /> Assinado Digitalmente
                    </span>

                    {/* Botão de Copiar Evidência Deste Signatário */}
                    <button
                      type="button"
                      onClick={() => handleCopySingle(a, idx)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                      title="Copiar dados de evidência deste signatário"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Grade de Metadados e Evidências */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80">
                  <div className="flex items-center justify-between gap-1.5 p-1 bg-slate-50/50 rounded">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatDateTime(a.assinadoEm)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyField(formatDateTime(a.assinadoEm), `date-${idx}`)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                      title="Copiar data/hora"
                    >
                      {copiedField === `date-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 p-1 bg-slate-50/50 rounded">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">IP: {a.ipAssinatura || 'não capturado'}</span>
                    </div>
                    {a.ipAssinatura && (
                      <button
                        type="button"
                        onClick={() => handleCopyField(a.ipAssinatura, `ip-${idx}`)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                        title="Copiar IP"
                      >
                        {copiedField === `ip-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:col-span-2 p-1 bg-slate-50/50 rounded">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Meio de autenticação: <strong>{a.meioAutenticacao || 'Código de Confirmação OTP'}</strong></span>
                  </div>

                  {/* Hash SHA-256 com Botão de Cópia Direta */}
                  <div className="flex items-start justify-between gap-2 sm:col-span-2 p-2 bg-amber-50/40 border border-amber-200/60 rounded-md">
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <Fingerprint className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-amber-900 block uppercase tracking-wider">
                          HASH SHA-256 Criptográfico:
                        </span>
                        <span className="break-all font-mono text-[10.5px] text-slate-900 select-all font-semibold leading-relaxed">
                          {a.hashAutenticacao}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyField(a.hashAutenticacao, `hash-${idx}`)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Copiar HASH SHA-256"
                    >
                      {copiedField === `hash-${idx}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar HASH</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Metadados de Navegador */}
                  <div className="flex items-start gap-1.5 sm:col-span-2 p-1.5 bg-slate-50/50 rounded">
                    <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-all text-[10px] text-slate-500 leading-tight">
                      {a.metadadosNavegador}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Validade Jurídica respaldada pela MP 2.200-2/2001 e Lei 14.063/2020.
          </span>
          <div className="flex items-center gap-2">
            {assinaturas.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[#faea9e] rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copiado!' : 'Copiar Log'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


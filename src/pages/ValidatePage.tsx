import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validateSignatureCode, SignatureValidationResult } from '../utils/signatureOtpUtils';
import { supabase } from '../utils/supabaseClient';
import { ShieldCheck, ShieldAlert, Search, Loader2, Copy, Check, FileText, ExternalLink } from 'lucide-react';

const roleLabel = (role?: string): string => {
  if (role === 'vendedor') return 'Contratante';
  if (role === 'comprador') return 'Contratado';
  if (role === 'testemunha1') return 'Testemunha 1';
  if (role === 'testemunha2') return 'Testemunha 2';
  return role || '';
};

const tipoLabel = (tipo?: string): string => {
  if (tipo === 'venda_vista') return 'Venda à Vista';
  if (tipo === 'venda_parcelada') return 'Venda Parcelada';
  if (tipo === 'exclusividade') return 'Contrato de Exclusividade';
  return tipo || '';
};

export const ValidatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [codigo, setCodigo] = useState(searchParams.get('sig') || '');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<SignatureValidationResult | null>(null);
  const [buscou, setBuscou] = useState(false);
  const [copiedValidation, setCopiedValidation] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const handleVerDocumento = async () => {
    setLoadingDoc(true);
    setDocError(null);
    setDocUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-document-url', {
        body: { code: codigo },
      });
      if (error || data?.error) {
        setDocError(data?.error || 'Não foi possível abrir o documento agora.');
        return;
      }
      setDocUrl(data.url);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setDocError('Não foi possível abrir o documento agora.');
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleValidar = async (codigoParam?: string) => {
    const alvo = codigoParam ?? codigo;
    if (!alvo.trim()) return;

    setLoading(true);
    setBuscou(true);
    try {
      const r = await validateSignatureCode(alvo);
      setResultado(r);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyValidation = async () => {
    if (!resultado || !resultado.encontrado) return;
    const text = [
      '=== REGISTRO DE VALIDAÇÃO DE ASSINATURA DIGITAL ===',
      `Status: Documento Autêntico e Válido`,
      `Signatário: ${resultado.nomeSignatario} (${roleLabel(resultado.papel)})`,
      `Data/Hora: ${resultado.assinadoEm ? new Date(resultado.assinadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}`,
      `Contrato: Nº ${resultado.numeroContrato} — ${tipoLabel(resultado.tipoContrato)}`,
      `Meio de Autenticação: ${resultado.meioAutenticacao || 'Código de Confirmação OTP'}`,
      `Código de Validação: ${codigo}`,
      `HASH SHA-256: ${resultado.hashCompleto}`,
      `Base Legal: MP 2.200-2/2001 e Lei 14.063/2020`,
      '==================================================',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedValidation(true);
      setTimeout(() => setCopiedValidation(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const sig = searchParams.get('sig');
    if (sig) {
      handleValidar(sig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-start justify-center">
      <div className="max-w-md w-full mt-8 sm:mt-16">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 mb-3">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Validação de Assinatura Digital</h1>
          <p className="text-sm text-slate-500 mt-1">
            Confira a autenticidade de um contrato assinado digitalmente neste sistema.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidar()}
              placeholder="Ex: A8F9-2041-99BC-1234"
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-mono uppercase tracking-wider focus:border-yellow-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleValidar()}
              disabled={loading || !codigo.trim()}
              className="px-5 py-3 btn-gold text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md shadow-yellow-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Validar
            </button>
          </div>

          {buscou && !loading && resultado && (
            resultado.encontrado ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-emerald-900 text-sm">Documento VÁLIDO, ÍNTEGRO e AUTÊNTICO</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyValidation}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100/50 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                    title="Copiar relatório de validação"
                  >
                    {copiedValidation ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-emerald-700" />
                        <span>Copiar Evidência</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Identificação do signatário */}
                <div className="text-xs text-emerald-800 space-y-1 pt-1 bg-white/70 p-3 rounded-lg border border-emerald-200">
                  <p><strong>Assinado por:</strong> {resultado.nomeSignatario} ({roleLabel(resultado.papel)})</p>
                  {resultado.documentoSignatarioMascarado && (
                    <p><strong>CPF/CNPJ:</strong> <span className="font-mono">{resultado.documentoSignatarioMascarado}</span></p>
                  )}
                  <p><strong>Contrato nº:</strong> {resultado.numeroContrato} — {tipoLabel(resultado.tipoContrato)}</p>
                </div>

                {/* Trilha de auditoria */}
                <div className="text-xs text-emerald-800 space-y-1 pt-1 bg-white/70 p-3 rounded-lg border border-emerald-200">
                  <p><strong>Data/Hora da assinatura:</strong> {resultado.assinadoEm ? new Date(resultado.assinadoEm).toLocaleString('pt-BR', { hour12: true, timeZone: 'America/Sao_Paulo' }) : '-'}</p>
                  {resultado.ipAssinatura && (
                    <p><strong>IP utilizado:</strong> <span className="font-mono">{resultado.ipAssinatura}</span></p>
                  )}
                  {resultado.meioAutenticacao && (
                    <p><strong>Meio de autenticação:</strong> {resultado.meioAutenticacao}</p>
                  )}
                </div>

                {/* Dados técnicos de criptografia */}
                <div className="text-xs text-emerald-800 space-y-1 pt-1 bg-white/70 p-3 rounded-lg border border-emerald-200">
                  <p><strong>ID de Verificação:</strong> <span className="font-mono uppercase">{codigo}</span></p>
                  <p className="break-all font-mono text-[10px] text-emerald-700 pt-1.5 border-t border-emerald-200/60 mt-1.5">
                    <strong>Hash SHA-256:</strong> {resultado.hashCompleto}
                  </p>
                </div>

                {/* Documento original */}
                {resultado.temDocumento && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleVerDocumento}
                      disabled={loadingDoc}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {loadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Ver documento original (PDF)
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    {docError && <p className="text-[11px] text-red-600 mt-1.5 text-center">{docError}</p>}
                    <p className="text-[10px] text-emerald-700/70 text-center mt-1">O link de visualização expira em 10 minutos por segurança.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <span className="text-sm text-red-800">
                  Código não encontrado. Confira se digitou certo, sem espaços extras.
                </span>
              </div>
            )
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          O código de validação está impresso no selo de assinatura do documento (texto ou QR Code).
        </p>
      </div>
    </div>
  );
};


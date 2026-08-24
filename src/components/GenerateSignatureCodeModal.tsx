import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { createSignatureLink } from '../utils/signatureLinksRepository';
import { Link as LinkIcon, Copy, CheckCircle2, AlertCircle, Loader, X, ShieldCheck } from 'lucide-react';

interface GenerateSignatureCodeModalProps {
  contract: ContractData;
  isOpen: boolean;
  onClose: () => void;
  onCodeGenerated: (code: string, link: string, validadeMs: number) => void;
  // Contrato já 100% assinado: o link serve só para o cliente rever/baixar
  // o documento, sem fluxo de assinatura. Não faz sentido gerar/mostrar
  // código de acesso nesse caso - o cliente já sabe o próprio CPF.
  isFullySigned?: boolean;
}

export const GenerateSignatureCodeModal: React.FC<GenerateSignatureCodeModalProps> = ({
  contract,
  isOpen,
  onClose,
  onCodeGenerated,
  isFullySigned = false,
}) => {
  const [validade, setValidade] = useState('24h');
  const [customDias, setCustomDias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getValidadeMs = (): number => {
    switch (validade) {
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '48h':
        return 48 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case 'custom':
        return parseInt(customDias) * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  };

  const handleGenerateCode = async () => {
    setError(null);

    if (validade === 'custom' && (!customDias || parseInt(customDias) <= 0)) {
      setError('Digite um número válido de dias');
      return;
    }

    setLoading(true);
    try {
      const validadeMs = getValidadeMs();
      const { token, link, otpCode } = await createSignatureLink(contract, validadeMs);

      setGeneratedLink(link);
      onCodeGenerated(token, link, validadeMs);
      void otpCode; // o cliente vê o próprio OTP na tela dele
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar código');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;

    try {
      let mensagem = generatedLink;

      // Contrato ainda não assinado: inclui o código de acesso (últimos 4
      // dígitos do CPF/CNPJ) junto no texto copiado, para o cliente
      // desbloquear o fluxo de assinatura.
      if (!isFullySigned) {
        const cpfCnpj = contract.comprador?.cpfCnpj || '';
        const digitos = cpfCnpj.replace(/\D/g, '');
        const codigoAcesso = digitos.slice(-4);
        mensagem = `${generatedLink}\n\n💡 Código de acesso: ${codigoAcesso}`;
      }
      // Contrato já assinado: só o link. O cliente já sabe o próprio CPF
      // e usa os últimos 4 dígitos para abrir - não precisa reenviar nada.

      await navigator.clipboard.writeText(mensagem);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Erro ao copiar link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            {isFullySigned ? 'Compartilhar Contrato Assinado' : 'Gerar Código para Cliente'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {!generatedLink ? (
            <>
              <p className="text-sm text-slate-600">
                {isFullySigned
                  ? 'Escolha o tempo de validade do link de acesso ao contrato assinado.'
                  : 'Escolha o tempo de validade do link de assinatura do cliente.'}
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Tempo de Validade
                </label>

                <div className="space-y-2">
                  {[
                    { value: '24h', label: '24 horas' },
                    { value: '48h', label: '48 horas' },
                    { value: '7d', label: '7 dias' },
                    { value: 'custom', label: 'Customizado' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="validade"
                        value={option.value}
                        checked={validade === option.value}
                        onChange={(e) => setValidade(e.target.value)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>

                {validade === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={customDias}
                      onChange={(e) => setCustomDias(e.target.value)}
                      placeholder="Quantos dias?"
                      min="1"
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg
                  transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    {isFullySigned ? 'Gerar Link de Acesso' : 'Gerar Código e Link'}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    {isFullySigned ? 'Link Gerado!' : 'Código Gerado!'}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {isFullySigned
                      ? 'Compartilhe este link com seu cliente para ele rever e baixar o contrato assinado.'
                      : 'Compartilhe este link com seu cliente.'}
                  </p>
                </div>
              </div>

              {/* Código de Acesso: só faz sentido no fluxo de assinatura.
                  Para contrato já assinado, o cliente abre o link e usa os
                  próprios últimos 4 dígitos do CPF - não precisa que o
                  corretor gere/reenvie nenhum código separado. */}
              {isFullySigned ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-600">
                    Para abrir, o cliente digita os últimos 4 dígitos do próprio CPF —
                    o mesmo código usado para desbloquear a assinatura. Não há código
                    novo para enviar.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                  <p className="text-xs font-bold text-amber-900 mb-1">🔐 Código de Acesso:</p>
                  <p className="text-lg font-black text-amber-700 font-mono tracking-widest">
                    {contract.comprador?.cpfCnpj?.replace(/\D/g, '').slice(-4) || '****'}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    ↑ Os últimos 4 dígitos do CPF do cliente
                  </p>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-slate-700">Link para Compartilhar:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink || ''}
                    readOnly
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isFullySigned
                    ? 'ℹ️ Ao copiar, apenas o link é incluído — nenhum código é gerado'
                    : 'ℹ️ O código de acesso será incluído automaticamente ao copiar'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-bold rounded-lg"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

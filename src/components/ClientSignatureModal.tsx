import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader, Copy, X } from 'lucide-react';

interface ClientSignatureModalProps {
  isOpen: boolean;
  otp: string;
  onClose: () => void;
  onSign: (otpDigitado: string) => Promise<void>;
}

export const ClientSignatureModal: React.FC<ClientSignatureModalProps> = ({
  isOpen,
  otp,
  onClose,
  onSign,
}) => {
  const [step, setStep] = useState<'otp' | 'success'>('otp');
  const [otpInput, setOtpInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasteButton, setShowPasteButton] = useState(true);

  const handleCopyOTP = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Erro ao copiar. Copie manualmente.');
    }
  };

  const handlePasteOTP = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOtpInput(text.trim());
      setShowPasteButton(false);
    } catch (err) {
      setError('Erro ao colar. Copie e digite manualmente.');
    }
  };

  const handleSign = async () => {
    setError(null);

    if (otpInput.trim() !== otp) {
      setError('Código OTP inválido. Confira e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      await onSign(otpInput.trim());
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">Confirmar Assinatura Digital</h3>
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
          {step === 'otp' && (
            <>
              <p className="text-sm text-slate-600">
                Copie o código OTP abaixo e cole no campo para confirmar sua assinatura.
              </p>

              {/* Código OTP Exibido */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Código OTP:
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-amber-50/70 border-2 border-amber-300 rounded-lg">
                    <p className="text-center font-mono font-bold text-amber-950 text-lg tracking-wider">
                      {otp}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOTP}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      copied
                        ? 'btn-gold text-slate-950 shadow-xs'
                        : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Campo para Digitar/Colar */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Digitar/Colar código aqui:
                </label>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder={otp}
                  className="w-full px-3.5 py-3 border-2 border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-mono
                    focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500
                    disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-2">
                {showPasteButton && (
                  <button
                    type="button"
                    onClick={handlePasteOTP}
                    className="flex-1 px-4 py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl
                      transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-slate-800"
                  >
                    <Copy className="w-4 h-4 text-yellow-400" />
                    Colar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!otpInput || loading}
                  className={`flex-1 px-4 py-3 text-xs font-extrabold rounded-xl
                    transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !otpInput || loading
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'btn-gold text-slate-950 shadow-md shadow-yellow-500/20'
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Assinando...
                    </>
                  ) : (
                    '✍️ Assinar'
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Clique Copiar, depois clique Colar para colar do seu clipboard
              </p>
            </>
          )}

          {step === 'success' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-950">Assinatura Confirmada!</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Seu contrato foi assinado com sucesso.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

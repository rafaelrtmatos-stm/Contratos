import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader, Copy, X } from 'lucide-react';

interface ClientSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (otp: string) => void;
}

export const ClientSignatureModal: React.FC<ClientSignatureModalProps> = ({
  isOpen,
  onClose,
  onSign,
}) => {
  const [step, setStep] = useState<'otp' | 'success'>('otp');
  const [otp] = useState('ABC123DEF456');
  const [otpInput, setOtpInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasteButton, setShowPasteButton] = useState(true);

  const handleCopyOTP = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Erro ao copiar');
    }
  };

  const handlePasteOTP = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOtpInput(text);
      setShowPasteButton(false);
    } catch (err) {
      alert('Erro ao colar. Copie manualmente.');
    }
  };

  const handleSign = async () => {
    if (otpInput !== otp) {
      alert('Código OTP inválido');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep('success');
      onSign(otp);

      setTimeout(() => {
        onClose();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
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
                  <div className="flex-1 px-4 py-3 bg-slate-100 border-2 border-slate-300 rounded-lg">
                    <p className="text-center font-mono font-bold text-slate-900 text-lg tracking-wider">
                      {otp}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOTP}
                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
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
                  placeholder="ABC123DEF456"
                  className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-mono
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                    disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                {showPasteButton && (
                  <button
                    type="button"
                    onClick={handlePasteOTP}
                    className="flex-1 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg
                      transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Colar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!otpInput || loading}
                  className={`flex-1 px-3 py-2.5 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2 ${
                      !otpInput || loading
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
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
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900">Assinatura Confirmada!</p>
                  <p className="text-xs text-green-700 mt-1">
                    Seu contrato foi assinado com sucesso.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg"
              >
                📥 Baixar Contrato
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

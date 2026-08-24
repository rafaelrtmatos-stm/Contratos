import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { Lock, CheckCircle2, AlertCircle, Loader, X } from 'lucide-react';

interface DigitalSignatureFlowModalProps {
  contract: ContractData;
  parte: 'usuario' | 'comprador';
  onClose: () => void;
  onSignatureComplete: (signature: any) => void;
}

export const DigitalSignatureFlowModal: React.FC<DigitalSignatureFlowModalProps> = ({
  contract,
  parte,
  onClose,
  onSignatureComplete,
}) => {
  const [step, setStep] = useState<'password' | 'success' | 'error'>('password');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carimbo, setCarimbo] = useState<any>(null);

  const handleConfirmPassword = async () => {
    setError(null);

    if (!password.trim()) {
      setError('Digite sua senha de login');
      return;
    }

    setLoading(true);
    try {
      // Simular validação de senha (em produção, validar contra API)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Gerar carimbo automaticamente
      const novoCarimbo = {
        id: `${Math.random().toString(36).substr(2, 9)}-${Date.now()}`.toUpperCase(),
        assinante: parte === 'usuario' ? 'Rafael Tavares' : contract.comprador.nome,
        cpf: parte === 'usuario' ? '123.456.789-00' : contract.comprador.cpfCnpj,
        data: new Date().toLocaleString('pt-BR'),
        timestamp: new Date().toISOString(),
        hash: Math.random().toString(36).substr(2, 16).toUpperCase(),
        ip: '192.168.1.1', // Em produção, obter do servidor
      };

      setCarimbo(novoCarimbo);
      setStep('success');

      // Callback com carimbo
      onSignatureComplete({
        role: parte,
        tipo: 'digital',
        carimbo: novoCarimbo,
      });

      // Fechar após 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar assinatura');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmPassword();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-green-600" />
            Assinatura Digital
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
          {step === 'password' && (
            <>
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Confirme sua identidade com a senha de login para gerar o carimbo digital.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Senha de Login
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua senha"
                    disabled={loading}
                    className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                      disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmPassword}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Confirmar e Gerar Carimbo
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'success' && carimbo && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900">Carimbo Gerado com Sucesso!</p>
                  <p className="text-xs text-green-700 mt-1">
                    Seu carimbo digital foi criado automaticamente.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-bold text-slate-700">ID da Assinatura:</p>
                <p className="text-xs font-mono text-slate-600">{carimbo.id}</p>
                <p className="text-xs font-bold text-slate-700 mt-2">Data/Hora:</p>
                <p className="text-xs text-slate-600">{carimbo.data}</p>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Fechando em alguns segundos...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

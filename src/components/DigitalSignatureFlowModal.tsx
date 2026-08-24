import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { useAuth } from '../utils/authContext';
import { supabase } from '../utils/supabaseClient';
import { createAuditStamp, getClientIpAddress, AuditStamp } from '../utils/signatureOtpUtils';
import { exportToPdf } from '../utils/contractGenerators';
import { GenerateSignatureCodeModal } from './GenerateSignatureCodeModal';
import { Lock, CheckCircle2, AlertCircle, Loader, X, FileDown, KeyRound } from 'lucide-react';

interface DigitalSignatureFlowModalProps {
  contract: ContractData;
  parte: 'usuario' | 'comprador';
  onClose: () => void;
  onSignatureRegistered: (auditStamp: AuditStamp) => void;
}

export const DigitalSignatureFlowModal: React.FC<DigitalSignatureFlowModalProps> = ({
  contract,
  onClose,
  onSignatureRegistered,
}) => {
  const { session, profile } = useAuth();
  const [step, setStep] = useState<'password' | 'actions'>('password');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carimbo, setCarimbo] = useState<AuditStamp | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleConfirmPassword = async () => {
    setError(null);

    if (!password.trim()) {
      setError('Digite sua senha de login');
      return;
    }

    const email = session?.user.email;
    if (!email) {
      setError('Sessão inválida. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      // Revalida a senha do usuário logado contra o Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Senha incorreta.');
        return;
      }

      const nomeAssinante = profile?.nome || contract.vendedor.nome;
      const cpfAssinante = contract.vendedor.cpfCnpj;
      const ip = await getClientIpAddress();
      const documentText = `${contract.id}|${contract.numeroContrato}|${new Date().toISOString()}`;
      const stamp = await createAuditStamp(nomeAssinante, cpfAssinante, documentText, ip);

      setCarimbo(stamp);
      onSignatureRegistered(stamp);
      setStep('actions');
    } catch (err: any) {
      setError(err.message || 'Erro ao processar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmPassword();
    }
  };

  const handleDownloadPdf = () => {
    setDownloading(true);
    try {
      exportToPdf(contract);
    } finally {
      setDownloading(false);
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

          {step === 'actions' && carimbo && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900">Carimbo Gerado com Sucesso!</p>
                  <p className="text-xs text-green-700 mt-1">
                    Seu carimbo digital foi criado e a assinatura já foi registrada.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-bold text-slate-700">ID da Assinatura:</p>
                <p className="text-xs font-mono text-slate-600">{carimbo.signatureId}</p>
                <p className="text-xs font-bold text-slate-700 mt-2">Data/Hora:</p>
                <p className="text-xs text-slate-600">
                  {new Date(carimbo.dataAssinatura).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {downloading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  PDF Assinado por Mim
                </button>

                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(true)}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  Gerar Código para Cliente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCodeModalOpen && (
        <GenerateSignatureCodeModal
          contract={contract}
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          onCodeGenerated={() => {
            // Link exibido dentro do próprio modal; usuário fecha quando quiser.
          }}
        />
      )}
    </div>
  );
};

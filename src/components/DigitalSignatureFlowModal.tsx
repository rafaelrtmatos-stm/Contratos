/**
 * Modal de assinatura digital simplificado (Apenas OTP + Confirmar)
 * SEM rubrica visual, SEM desenho - Apenas autenticação por senha/OTP
 * 
 * Fluxo simples:
 * 1. Mostra informações do contrato
 * 2. Pede senha (OTP)
 * 3. Confirma e assina
 * 4. Download automático
 */

import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { X, Loader2, Check, AlertCircle, Lock } from 'lucide-react';
import {
  createVerificationCode,
  validateVerificationCode,
  createAuditStamp,
  getClientIpAddress,
  type AuditStamp,
} from '../utils/signatureOtpUtils';
import {
  processSignatureTags,
  findSignatureTags,
  mapTagsToConfig,
} from '../utils/signatureTagProcessor';
import { downloadTemplateWithCache } from '../utils/supabaseTemplateStorage';
import { resolveTemplate } from '../utils/templateResolver';

interface DigitalSignatureFlowModalProps {
  contract: ContractData;
  parte: 'usuario' | 'comprador';
  onClose: () => void;
  onSignatureComplete: (auditStamp: AuditStamp, docxProcessado: ArrayBuffer) => void;
}

type Step = 'gerar_otp' | 'digitar_otp' | 'processing' | 'success' | 'error';

export const DigitalSignatureFlowModal: React.FC<DigitalSignatureFlowModalProps> = ({
  contract,
  parte,
  onClose,
  onSignatureComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('gerar_otp');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP gerado
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [senhaDigitada, setSenhaDigitada] = useState('');

  const nomeAssinante = parte === 'usuario' ? contract.vendedor.nome : contract.comprador.nome;
  const cpfAssinante = parte === 'usuario' ? contract.vendedor.cpfCnpj : contract.comprador.cpfCnpj;

  // ============================================
  // PASSO 1: Gerar OTP
  // ============================================
  const handleGerarOtp = async () => {
    setError(null);
    setLoading(true);

    try {
      const otp = await createVerificationCode(contract.id, 30);
      setGeneratedOtp(otp.code);
      setSenhaDigitada('');
      setCurrentStep('digitar_otp');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar código');
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PASSO 2: Validar OTP e Assinar
  // ============================================
  const handleConfirmarEAssinar = async () => {
    setError(null);

    if (!senhaDigitada.trim()) {
      setError('Por favor, digite a senha');
      return;
    }

    setLoading(true);
    setCurrentStep('processing');

    try {
      // Validar OTP
      const validation = await validateVerificationCode(contract.id, senhaDigitada);
      if (!validation.ok) {
        const reasons: Record<string, string> = {
          'not_found': 'Código não encontrado',
          'expired': 'Código expirou - gere um novo',
          'already_used': 'Código já foi utilizado',
          'wrong_code': 'Código incorreto',
          'too_many_attempts': 'Muitas tentativas - gere um novo código',
        };
        setError(reasons[validation.reason] || 'Código inválido');
        setCurrentStep('error');
        setLoading(false);
        return;
      }

      // OTP válido! Processar assinatura
      const clientIp = await getClientIpAddress();
      const auditStamp = await createAuditStamp(nomeAssinante, cpfAssinante, contract.objetoDescricao || '', clientIp);

      // Resolver template
      const estadoAssinatura = {
        usuarioAssinou: parte === 'usuario',
        usuarioModalidade: 'digital' as const,
        compradorAssinou: parte === 'comprador',
        compradorModalidade: 'digital' as const,
        testemunhaprecisa: false,
      };

      const templateResolved = resolveTemplate(contract.tipo, 'download_depois_assinar', estadoAssinatura);

      // Recuperar template
      const { sucesso, blob } = await downloadTemplateWithCache(templateResolved.arquivo);
      if (!sucesso || !blob) throw new Error('Falha ao recuperar template');

      const docxBuffer = await blob.arrayBuffer();

      // Procurar e processar tags
      const tagsEncontradas = await findSignatureTags(docxBuffer);
      if (tagsEncontradas.length > 0) {
        const tagsConfig = mapTagsToConfig(
          tagsEncontradas,
          parte === 'usuario',
          parte === 'comprador',
          'digital',
          'digital'
        );
        const docxProcessado = await processSignatureTags(docxBuffer, tagsConfig);

        setCurrentStep('success');
        setTimeout(() => {
          onSignatureComplete(auditStamp, docxProcessado);
        }, 1500);
      } else {
        throw new Error('Nenhuma tag de assinatura encontrada');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar assinatura');
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Confirmar Assinatura</h2>
            <p className="text-xs text-slate-500">Assinatura Digital Eletrônica</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações do Contrato */}
        {currentStep !== 'success' && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Contrato</p>
              <p className="text-sm font-mono text-slate-700">{contract.numeroContrato}</p>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Assinante</p>
              <p className="text-sm font-bold text-slate-900">{nomeAssinante}</p>
              <p className="text-xs text-slate-600 font-mono">{cpfAssinante}</p>
            </div>
          </div>
        )}

        {/* Conteúdo por Step */}
        {currentStep === 'gerar_otp' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Clique no botão abaixo para gerar um código de confirmação de 6 dígitos.
            </p>
            <button
              onClick={handleGerarOtp}
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  GERAR CÓDIGO OTP
                </>
              )}
            </button>
          </div>
        )}

        {currentStep === 'digitar_otp' && (
          <div className="space-y-4">
            {/* Mostrar código gerado */}
            {generatedOtp && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[10px] font-bold text-blue-600 mb-1">CÓDIGO GERADO:</p>
                <p className="text-xl font-mono font-bold text-blue-700 text-center tracking-widest">
                  {generatedOtp}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Input de senha */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">
                Digite sua senha ou o código OTP:
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={senhaDigitada}
                onChange={(e) => setSenhaDigitada(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleConfirmarEAssinar()}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg font-mono text-center text-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                autoFocus
              />
            </div>

            {/* Botão confirmar */}
            <button
              onClick={handleConfirmarEAssinar}
              disabled={loading || !senhaDigitada.trim()}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  CONFIRMAR E ASSINAR
                </>
              )}
            </button>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto animate-spin">
              <Loader2 className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Processando assinatura...</p>
            <p className="text-xs text-slate-500">Preparando documento para download</p>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Assinado com Sucesso!</h3>
              <p className="text-xs text-slate-500 mt-1">Seu documento será baixado automaticamente</p>
            </div>
          </div>
        )}

        {currentStep === 'error' && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={() => {
                setCurrentStep('gerar_otp');
                setError(null);
                setSenhaDigitada('');
                setGeneratedOtp(null);
              }}
              className="w-full py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-100">
          <p>✓ Certificação Digital SHA-256 e Registro de Custódia</p>
        </div>
      </div>
    </div>
  );
};


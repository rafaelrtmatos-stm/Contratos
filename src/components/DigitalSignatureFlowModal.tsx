/**
 * Modal de assinatura digital com OTP
 * Fluxo: CPF → OTP → Validação → Inserir carimbo no DOCX
 * 
 * Adaptado do fluxo do CRM:
 * https://github.com/rafaelrtmatos-stm/crm/blob/main/src/components/ContractSignaturePublicPage.tsx
 */

import React, { useState, useRef, useEffect } from 'react';
import { ContractData } from '../types/contract';
import { 
  X, 
  Loader2, 
  Check, 
  AlertCircle, 
  ShieldCheck,
  Copy,
  Clock,
} from 'lucide-react';
import {
  generateOtpCode,
  createVerificationCode,
  validateVerificationCode,
  validateDocumentLastDigits,
  createAuditStamp,
  getClientIpAddress,
  formatAuditStampText,
  type AuditStamp,
} from '../utils/signatureOtpUtils';
import {
  processSignatureTags,
  findSignatureTags,
  mapTagsToConfig,
  type SignatureTagConfig,
} from '../utils/signatureTagProcessor';
import {
  downloadTemplateWithCache,
} from '../utils/supabaseTemplateStorage';
import { resolveTemplate } from '../utils/templateResolver';

interface DigitalSignatureFlowModalProps {
  contract: ContractData;
  parte: 'usuario' | 'comprador'; // Quem está assinando?
  onClose: () => void;
  onSignatureComplete: (auditStamp: AuditStamp, docxProcessado: ArrayBuffer) => void;
}

type Step = 'cpf' | 'otp_input' | 'processing' | 'success' | 'error';

export const DigitalSignatureFlowModal: React.FC<DigitalSignatureFlowModalProps> = ({
  contract,
  parte,
  onClose,
  onSignatureComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('cpf');
  const [error, setError] = useState<string | null>(null);

  // Passo 1: Validar CPF/CNPJ (4 últimos dígitos)
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [documentDigits, setDocumentDigits] = useState('');
  const [isValidatingCpf, setIsValidatingCpf] = useState(false);

  // Passo 2: Validar OTP
  const [generatedOtpCode, setGeneratedOtpCode] = useState<string | null>(null);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [isValidatingOtp, setIsValidatingOtp] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ============================================
  // PASSO 1: Validar CPF/CNPJ
  // ============================================
  const handleValidateCpf = async () => {
    setError(null);

    if (!cpfCnpj.trim()) {
      setError('Por favor, informe o CPF ou CNPJ');
      return;
    }

    if (!documentDigits.trim() || documentDigits.length !== 4) {
      setError('Por favor, informe os 4 últimos dígitos');
      return;
    }

    // Validar os 4 últimos dígitos
    if (!validateDocumentLastDigits(cpfCnpj, documentDigits)) {
      setError('Os dígitos informados não conferem com o CPF/CNPJ');
      return;
    }

    // Gerar OTP e passar para próximo passo
    setIsValidatingCpf(true);
    try {
      const otp = await createVerificationCode(contract.id, 30);
      setGeneratedOtpCode(otp.code);
      setCurrentStep('otp_input');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar código OTP');
    } finally {
      setIsValidatingCpf(false);
    }
  };

  // ============================================
  // PASSO 2: Validar OTP e Assinar
  // ============================================
  const handleValidateOtp = async () => {
    setError(null);

    const enteredCode = codeDigits.join('');
    if (enteredCode.length !== 6) {
      setError('Por favor, digite os 6 dígitos do código');
      return;
    }

    setIsValidatingOtp(true);
    try {
      // Validar código OTP
      const validation = await validateVerificationCode(contract.id, enteredCode);
      if (!validation.ok) {
        const reasons: Record<string, string> = {
          'not_found': 'Código não encontrado',
          'expired': 'Código expirado',
          'already_used': 'Código já foi utilizado',
          'wrong_code': 'Código incorreto',
          'too_many_attempts': 'Muitas tentativas erradas. Gere um novo código.',
        };
        setError(reasons[validation.reason] || 'Código inválido');
        return;
      }

      // OTP válido! Processar assinatura
      setCurrentStep('processing');

      // 1. Obter IP do cliente
      const clientIp = await getClientIpAddress();

      // 2. Criar carimbo de auditoria
      const auditStamp = await createAuditStamp(
        parte === 'usuario' ? contract.vendedor.nome : contract.comprador.nome,
        parte === 'usuario' ? contract.vendedor.cpfCnpj : contract.comprador.cpfCnpj,
        contract.objetoDescricao || '', // texto simplificado
        clientIp
      );

      // 3. Resolver qual template usar (agora com assinatura do usuário)
      const estadoAssinatura = {
        usuarioAssinou: parte === 'usuario',
        usuarioModalidade: 'digital' as const,
        compradorAssinou: parte === 'comprador',
        compradorModalidade: 'digital' as const,
        testemunhaprecisa: false,
      };

      const templateResolved = resolveTemplate(
        contract.tipo,
        'download_depois_assinar',
        estadoAssinatura
      );

      // 4. Recuperar template do Supabase
      const { sucesso, blob } = await downloadTemplateWithCache(templateResolved.arquivo);
      if (!sucesso || !blob) {
        throw new Error('Falha ao recuperar template do Supabase');
      }

      const docxBuffer = await blob.arrayBuffer();

      // 5. Procurar tags de assinatura
      const tagsEncontradas = await findSignatureTags(docxBuffer);

      if (tagsEncontradas.length > 0) {
        // 6. Mapear tags para configuração
        const tagsConfig = mapTagsToConfig(
          tagsEncontradas,
          parte === 'usuario',
          parte === 'comprador',
          'digital',
          'digital'
        );

        // 7. Processar tags (inserir carimbo)
        const docxProcessado = await processSignatureTags(docxBuffer, tagsConfig);

        // 8. Sucesso!
        setCurrentStep('success');
        
        // Chamar callback com carimbo e DOCX
        setTimeout(() => {
          onSignatureComplete(auditStamp, docxProcessado);
        }, 2000);
      } else {
        throw new Error('Nenhuma tag de assinatura encontrada no template');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar assinatura');
      setCurrentStep('error');
    } finally {
      setIsValidatingOtp(false);
    }
  };

  // ============================================
  // Gerenciamento de input de OTP (navegação com tab)
  // ============================================
  const handleCodeChange = (index: number, value: string) => {
    const newDigits = [...codeDigits];
    
    if (value.length > 1) {
      // Colar múltiplos dígitos
      const digits = value.slice(0, 6 - index).split('');
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        if (/\d/.test(digits[i])) {
          newDigits[index + i] = digits[i];
        }
      }
      setCodeDigits(newDigits);
      const lastIndex = Math.min(index + digits.length, 5);
      setTimeout(() => codeInputRefs.current[lastIndex]?.focus(), 0);
    } else if (/\d/.test(value) || value === '') {
      newDigits[index] = value;
      setCodeDigits(newDigits);
      
      if (value !== '' && index < 5) {
        setTimeout(() => codeInputRefs.current[index + 1]?.focus(), 0);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // ============================================
  // Render por Step
  // ============================================

  if (currentStep === 'cpf') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">Assinar Digitalmente</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Informe seus dados para validação de identidade. Você receberá um código OTP para confirmar a assinatura.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">CPF/CNPJ</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Últimos 4 dígitos do CPF/CNPJ
              </label>
              <input
                type="text"
                placeholder="0000"
                maxLength={4}
                value={documentDigits}
                onChange={(e) => setDocumentDigits(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none font-mono text-center"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Digite apenas os 4 últimos dígitos para validação de identidade.
              </p>
            </div>
          </div>

          {/* Botões */}
          <button
            onClick={handleValidateCpf}
            disabled={isValidatingCpf}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isValidatingCpf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Próximo: Gerar Código OTP
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'otp_input') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-900">Código OTP</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Código gerado: {generatedOtpCode}
            </p>

            {/* Botão copiar código */}
            {generatedOtpCode && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedOtpCode!);
                  setOtpCopied(true);
                  setTimeout(() => setOtpCopied(false), 2000);
                }}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {otpCopied ? 'Copiado!' : generatedOtpCode}
              </button>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">
                Digite os 6 dígitos do código:
              </label>
              <div className="flex gap-1.5 justify-center">
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      codeInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-10 text-center font-bold text-lg border-2 border-slate-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Cole ou digite cada dígito
              </p>
            </div>
          </div>

          {/* Botões */}
          <button
            onClick={handleValidateOtp}
            disabled={isValidatingOtp}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isValidatingOtp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Assinar Digitalmente
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'processing') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto animate-spin">
            <Loader2 className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="font-bold text-slate-900">Processando...</h2>
          <p className="text-xs text-slate-600">Gerando carimbo digital e preparando documento...</p>
        </div>
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto animate-bounce">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="font-bold text-slate-900">Assinado com Sucesso!</h2>
          <p className="text-xs text-slate-600">
            Seu carimbo digital foi inserido no documento. Você pode baixar o DOCX agora.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erro na Assinatura
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-600">{error}</p>

          <button
            onClick={() => {
              setCurrentStep('cpf');
              setError(null);
              setCpfCnpj('');
              setDocumentDigits('');
              setCodeDigits(['', '', '', '', '', '']);
            }}
            className="w-full py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return null;
};

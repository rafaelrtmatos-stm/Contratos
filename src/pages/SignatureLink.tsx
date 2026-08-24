import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, FileText, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { ClientSignatureModal } from '../components/ClientSignatureModal';

export const SignatureLink: React.FC = () => {
  const { contratoId } = useParams<{ contratoId: string }>();
  const [step, setStep] = useState<'cpf' | 'read' | 'error'>('cpf');
  const [cpfInput, setCpfInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [contractContent, setContractContent] = useState('');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    // Simular carregamento do contrato
    setContractContent(
      `CONTRATO DE VENDA COM SINAL

Celebram entre si, de um lado como VENDEDOR(A), Rafael Tavares, 
brasileiro(a), portador(a) do CPF n.º 123.456.789-00, e de outro lado 
como COMPRADOR(A), JOÃO DA SILVA, brasileiro(o), portador(a) do CPF 
n.º 987.654.321-00, o presente instrumento particular de Contrato de 
Venda, conforme as cláusulas e condições seguintes:

CLÁUSULA PRIMEIRA - DO OBJETO
O(A) VENDEDOR(A) vende ao(à) COMPRADOR(A) o imóvel localizado...

CLÁUSULA SEGUNDA - DO PREÇO
O preço total da venda é de R$ 150.000,00 (cento e cinquenta mil reais).

[... mais conteúdo do contrato ...]

CLÁUSULA TERCEIRA - FORMA E PRAZO DE PAGAMENTO
O(a) comprador(a) se obriga a pagar o preço conforme acordado.

CLÁUSULA QUARTA - DISPOSIÇÕES GERAIS
As partes resolvem por este termo o presente contrato.

---

Assinado digitalmente pelo Vendedor em: 2026-08-24 14:30:15
Rafael Tavares | CPF: 123.456.789-00 | ID: SIGN-ABC123XYZ`
    );
    setClientName('João da Silva');
  }, [contratoId]);

  const handleValidateCPF = async () => {
    setError(null);

    if (!cpfInput.trim()) {
      setError('Digite os últimos 4 dígitos do seu CPF');
      return;
    }

    if (cpfInput.length !== 4 || !/^\d{4}$/.test(cpfInput)) {
      setError('Digite exatamente 4 dígitos numéricos');
      return;
    }

    setLoading(true);
    try {
      // Simular validação contra o banco de dados
      await new Promise(resolve => setTimeout(resolve, 800));

      // Validação simples (em produção, validar contra API)
      if (cpfInput !== '1234') {
        setError('CPF não encontrado ou inválido');
        return;
      }

      setStep('read');
    } catch (err: any) {
      setError(err.message || 'Erro ao validar CPF');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = (otp: string) => {
    setSigned(true);
    // Aqui salvaria a assinatura no banco de dados
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidateCPF();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-6 h-6 text-green-600" />
            <h1 className="text-3xl font-bold text-slate-900">Assinar Contrato</h1>
          </div>
          <p className="text-slate-600">Contrato de Venda - {contratoId}</p>
        </div>

        {step === 'cpf' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">
              Confirme sua identidade
            </h2>
            <p className="text-sm text-slate-600 text-center mb-6">
              Digite os últimos 4 dígitos do seu CPF para desbloquear o contrato.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Últimos 4 dígitos do CPF:
                </label>
                <input
                  type="text"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="____"
                  maxLength={4}
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-center text-lg tracking-widest font-bold
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleValidateCPF}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg
                  transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Desbloquear Contrato
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              Use: 1234 para teste
            </p>
          </div>
        )}

        {step === 'read' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-4">
                  Olá {clientName}, aqui está o contrato para você ler e assinar:
                </p>
              </div>

              {/* Contrato em Leitura */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                <div className="prose prose-sm text-slate-700 whitespace-pre-wrap text-xs leading-relaxed">
                  {contractContent}
                </div>
              </div>

              {/* Checklist de Aceito */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 mt-0.5 accent-green-600"
                  />
                  <span className="text-sm text-slate-700">
                    Li e entendi o contrato e todos os seus termos e condições.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 mt-0.5 accent-green-600"
                  />
                  <span className="text-sm text-slate-700">
                    Concordo em assinar este contrato digitalmente.
                  </span>
                </label>
              </div>

              {/* Botão Assinar */}
              <button
                type="button"
                onClick={() => setSignatureModalOpen(true)}
                disabled={signed}
                className={`w-full mt-6 px-4 py-3 text-white text-sm font-bold rounded-lg
                  transition-colors flex items-center justify-center gap-2 ${
                    signed
                      ? 'bg-green-600 cursor-default'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {signed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Contrato Assinado
                  </>
                ) : (
                  '✍️ Assinar Contrato'
                )}
              </button>

              {signed && (
                <button
                  type="button"
                  className="w-full mt-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2"
                >
                  📥 Baixar Contrato Assinado
                </button>
              )}
            </div>

            {/* Modal de Assinatura */}
            <ClientSignatureModal
              isOpen={signatureModalOpen}
              onClose={() => setSignatureModalOpen(false)}
              onSign={handleSign}
            />
          </>
        )}

        {step === 'error' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-md mx-auto">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-red-900 mb-2 text-center">
              Erro ao Acessar Contrato
            </h2>
            <p className="text-sm text-red-700 text-center">
              Este link pode ter expirado ou é inválido. Entre em contato com o vendedor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, FileText, AlertCircle, CheckCircle2, Loader, Loader2 } from 'lucide-react';
import { ClientSignatureModal } from '../components/ClientSignatureModal';
import { ContractData } from '../types/contract';
import {
  fetchContractForSignatureToken,
  validateSignatureLinkCpf,
  signContractViaLink,
} from '../utils/signatureLinksRepository';
import { renderContractDocumentHtml, renderContractDocumentPdf, renderContractDocumentPlainText } from '../utils/renderContractFromDocx';
import { getSignedDocumentUrl, saveClientSignedPdfToSupabase } from '../utils/contractDocumentsStorage';
import { buildPdfFileName } from '../utils/pdfFileName';
import { startSimulatedPdfProgress } from '../utils/pdfProgressSimulator';
import { sha256Hex, getClientIpAddress } from '../utils/signatureOtpUtils';

export const SignatureLink: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [vendedorNome, setVendedorNome] = useState('');

  const [step, setStep] = useState<'cpf' | 'read'>('cpf');
  const [cpfInput, setCpfInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signed, setSigned] = useState(false);
  const [previouslySigned, setPreviouslySigned] = useState(false);
  const [clientName, setClientName] = useState('');
  const [accepted, setAccepted] = useState({ leu: false, concorda: false });
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [renderLoading, setRenderLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoadError('Link inválido.');
      setLoadingPage(false);
      return;
    }

    (async () => {
      try {
        const { contrato, otpCode, vendedorNome, jaAssinado } = await fetchContractForSignatureToken(token);
        setContract(contrato);
        setOtpCode(otpCode);
        setVendedorNome(vendedorNome);
        // Na exclusividade os campos são invertidos: o cliente real (quem
        // assina pelo link) fica em "vendedor", não em "comprador" - mesma
        // convenção usada no resto do fluxo (ver comentário em
        // signatureLinksRepository.ts e ContractViewer.tsx).
        const dadosClienteLink = contrato.tipo === 'exclusividade' ? contrato.vendedor : contrato.comprador;
        setClientName(dadosClienteLink?.nome || '');
        if (jaAssinado) {
          // Reabrindo o mesmo link depois de já ter assinado: pula
          // direto pro modo visualização/download, sem bloquear com erro.
          setSigned(true);
          setPreviouslySigned(true);
        }
      } catch (err: any) {
        setLoadError(err.message || 'Não foi possível carregar o contrato.');
      } finally {
        setLoadingPage(false);
      }
    })();
  }, [token]);

  // Renderiza o contrato a partir do .docx real (mesma fonte do download em
  // Word) sempre que o contrato mudar - inclui os selos de quem já assinou,
  // e reflete a própria assinatura assim que o cliente confirma.
  useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    setRenderLoading(true);
    setRenderError(null);
    renderContractDocumentHtml(contract)
      .then((html) => {
        if (!cancelled) setRenderedHtml(html);
      })
      .catch((err: any) => {
        if (!cancelled) setRenderError(err.message || 'Erro ao carregar o texto do contrato.');
      })
      .finally(() => {
        if (!cancelled) setRenderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contract]);

  const handleValidateCPF = async () => {
    setError(null);

    if (!token) return;

    if (cpfInput.length !== 4 || !/^\d{4}$/.test(cpfInput)) {
      setError('Digite exatamente 4 dígitos numéricos');
      return;
    }

    setLoading(true);
    try {
      const valido = await validateSignatureLinkCpf(token, cpfInput);
      if (!valido) {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidateCPF();
    }
  };

  const handleSign = async (otpDigitado: string) => {
    if (!token || !contract) return;

    // Na exclusividade os campos são invertidos: "comprador" guarda o
    // CORRETOR e "vendedor" guarda o CONTRATANTE (cliente real que está
    // assinando por este link) - mesma convenção usada em
    // signatureLinksRepository.ts e ContractViewer.tsx. Usar sempre
    // contract.comprador aqui fazia o cliente assinar com os dados do
    // corretor num contrato de exclusividade.
    const isExclSign = contract.tipo === 'exclusividade';
    const dadosClienteSign = isExclSign ? contract.vendedor : contract.comprador;
    const roleClienteSign: 'vendedor' | 'comprador' = isExclSign ? 'vendedor' : 'comprador';

    const documento = dadosClienteSign?.cpfCnpj || '';
    const nome = clientName || dadosClienteSign?.nome || 'Cliente';
    const ip = await getClientIpAddress();
    // Hash do CONTEÚDO REAL do contrato preenchido (mesma lógica do lado
    // do corretor) - prova de integridade de verdade.
    const documentText = await renderContractDocumentPlainText(contract);
    const hash = await sha256Hex(documentText);

    const result = await signContractViaLink({
      token,
      otp: otpDigitado,
      nomeSignatario: nome,
      documentoSignatario: documento,
      hashAutenticacao: hash,
      ip,
    });

    if (!result.sucesso) {
      throw new Error(
        result.erro === 'otp_invalido'
          ? 'Código OTP inválido.'
          : result.erro === 'link_expirado'
          ? 'Este link expirou.'
          : result.erro === 'ja_assinado'
          ? 'Este contrato já foi assinado.'
          : 'Erro ao confirmar assinatura.'
      );
    }

    const novasAssinaturas = [
      ...(contract.assinaturas || []),
      {
        role: roleClienteSign,
        nomeSignatario: nome,
        documentoSignatario: documento,
        assinaturaDataUrl: '',
        // Horário gravado pelo servidor no INSERT (ver sign_contract_via_link
        // na migração fix_assinado_em_server_authoritative.sql) - nunca o
        // relógio do dispositivo de quem está assinando pelo link.
        assinadoEm: result.assinadoEm || new Date().toISOString(),
        hashAutenticacao: hash,
        ipAssinatura: ip,
        metadadosNavegador: navigator.userAgent,
        meioAutenticacao: 'Link de assinatura: CPF (4 últimos dígitos) + código OTP',
      },
    ];

    const vendedorAssinou = novasAssinaturas.some((a) => a.role === 'vendedor' || a.role === 'ambos');
    const compradorAssinou = novasAssinaturas.some(
      (a) => a.role === 'comprador' || a.role === 'comprador_adicional' || a.role === 'ambos'
    );
    const isFullySigned = vendedorAssinou && compradorAssinou;

    const updatedContract: ContractData = {
      ...contract,
      status: isFullySigned ? 'assinado_total' : 'assinado_parcial',
      assinaturas: novasAssinaturas,
    };

    setSigned(true);
    setContract(updatedContract);

    // Salva automaticamente uma cópia em PDF na pasta do cliente (não
    // bloqueia a tela se falhar - a assinatura em si já foi confirmada).
    renderContractDocumentPdf(updatedContract)
      .then((pdfBlob) => saveClientSignedPdfToSupabase(updatedContract.id, pdfBlob))
      .catch((err) => console.warn('Não foi possível salvar o PDF do cliente:', err));
  };

  const handleDownload = async () => {
    if (!contract || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      // Se já existe o documento final salvo no Storage (ex: o corretor
      // baixou o Word depois de assinar), abre exatamente esse arquivo -
      // gera um link assinado novo na hora (o antigo pode ter expirado).
      // Abertura é praticamente instantânea aqui - não faz sentido simular
      // barra de progresso, é só pro caminho que realmente gera o PDF.
      if (contract.documentoStoragePath) {
        const signedUrl = await getSignedDocumentUrl(contract.documentoStoragePath, 60 * 10);
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        // Se não conseguiu gerar o link (arquivo removido, etc.), cai pro
        // PDF gerado na hora a partir dos dados do contrato.
      }

      const cancelarProgresso = startSimulatedPdfProgress(setDownloadProgress);

      const pdfBlob = await renderContractDocumentPdf(contract);
      cancelarProgresso();
      setDownloadProgress(100);
      await new Promise((r) => setTimeout(r, 300));

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const nomeClientePdf =
        (contract.tipo === 'exclusividade' ? contract.vendedor?.nome : contract.comprador?.nome) ||
        contract.imovel?.nomeEmpreendimento ||
        'documento';
      a.download = buildPdfFileName(nomeClientePdf);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar contrato:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader className="w-5 h-5 animate-spin" />
          Carregando contrato...
        </div>
      </div>
    );
  }

  if (loadError || !contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-red-900 mb-2 text-center">
            Erro ao Acessar Contrato
          </h2>
          <p className="text-sm text-red-700 text-center">
            {loadError || 'Este link pode ter expirado ou é inválido. Entre em contato com o vendedor.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-6 h-6 text-green-600" />
            <h1 className="text-3xl font-bold text-slate-900">Assinar Contrato</h1>
          </div>
          <p className="text-slate-600">
            Contrato nº {contract.numeroContrato}
            {vendedorNome ? ` · ${contract.tipo === 'exclusividade' ? 'Contratante' : 'Vendedor'}: ${vendedorNome}` : ''}
          </p>
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
                  onChange={(e) => setCpfInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
          </div>
        )}

        {step === 'read' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-4">
                  {previouslySigned
                    ? `Olá ${clientName || 'Cliente'}, este contrato já foi assinado. Você pode revê-lo e baixá-lo quantas vezes precisar:`
                    : `Olá ${clientName || 'Cliente'}, aqui está o contrato para você ler e assinar:`}
                </p>
              </div>

              {/* Contrato em Leitura - renderizado a partir do .docx real */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                {renderLoading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Carregando contrato...</span>
                  </div>
                )}
                {renderError && !renderLoading && (
                  <div className="text-xs text-red-600">{renderError}</div>
                )}
                {!renderLoading && !renderError && renderedHtml && (
                  <div
                    className="prose prose-sm text-slate-700 text-xs leading-relaxed [&_p]:mb-2 [&_p]:text-justify [&_strong]:font-bold [&_img]:w-[33%]! [&_img]:h-auto! [&_img]:max-w-[33%]!"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                )}
              </div>

              {/* Checklist de Aceito - só faz sentido antes de assinar */}
              {!previouslySigned && (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accepted.leu}
                      onChange={(e) => setAccepted((prev) => ({ ...prev, leu: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 accent-green-600"
                    />
                    <span className="text-sm text-slate-700">
                      Li e entendi o contrato e todos os seus termos e condições.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accepted.concorda}
                      onChange={(e) => setAccepted((prev) => ({ ...prev, concorda: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 accent-green-600"
                    />
                    <span className="text-sm text-slate-700">
                      Concordo em assinar este contrato digitalmente.
                    </span>
                  </label>
                </div>
              )}

              {/* Botão Assinar - só aparece antes de assinar */}
              {!previouslySigned && (
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  disabled={signed || !accepted.leu || !accepted.concorda}
                  className={`w-full mt-6 px-4 py-3 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2 ${
                      signed || !accepted.leu || !accepted.concorda
                        ? 'bg-slate-300 cursor-not-allowed'
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
              )}

              {signed && (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className={`w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg
                    transition-colors flex items-center justify-center gap-2 ${previouslySigned ? '' : 'mt-2'}`}
                >
                  {downloading ? 'Gerando PDF...' : '📥 Baixar Contrato Assinado'}
                </button>
              )}

              {/* Barra de progresso do download - mesmo padrão da tela do
                  corretor (ContractViewer). Só aparece quando o PDF está
                  sendo gerado de verdade (não no atalho de link já salvo,
                  que abre na hora). */}
              {downloading && downloadProgress > 0 && (
                <div className="mt-3 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Gerando PDF...
                    </span>
                    <span className="text-sm font-bold text-blue-600 tabular-nums">{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500 ease-out"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal de Assinatura */}
            <ClientSignatureModal
              isOpen={signatureModalOpen}
              otp={otpCode}
              onClose={() => setSignatureModalOpen(false)}
              onSign={handleSign}
            />
          </>
        )}
      </div>
    </div>
  );
};

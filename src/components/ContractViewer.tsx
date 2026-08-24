import React, { useState, useEffect } from 'react';
import { ContractData, DigitalSignature } from '../types/contract';
import {
  generateContractLegalText,
  formatDate,
  getExclusivityStatus,
  getAllCompradores,
} from '../utils/contractGenerators';
import {
  downloadDocxContract,
  getCustomWordTemplateMeta,
  resolveTemplateKey,
  CustomTemplateMeta,
} from '../utils/docxProcessor';
import { resolveTemplate } from '../utils/templateResolver';
import { downloadTemplateWithCache } from '../utils/supabaseTemplateStorage';
import { getTratamento } from '../utils/tratamento';
import { renderContractDocumentHtml, renderContractDocumentPdf, renderContractDocumentPlainText } from '../utils/renderContractFromDocx';
import { 
  processSignatureTags,
  findSignatureTags,
  mapTagsToConfig,
  summarizeChanges,
  PartySignatureInfo,
} from '../utils/signatureTagProcessor';
import {
  generateContractTags,
  substituirTagsNoDocx,
} from '../utils/dataTagsProcessor';
import { saveContractDocumentToSupabase } from '../utils/contractDocumentsStorage';
import { buildPdfFileName } from '../utils/pdfFileName';
import { saveSignature } from '../utils/contractsRepository';
import { AuditStamp, formatAuditStampText } from '../utils/signatureOtpUtils';
import { DigitalSignatureFlowModal } from './DigitalSignatureFlowModal';
import { GenerateSignatureCodeModal } from './GenerateSignatureCodeModal';
import { DigitalSignatureStamp } from './DigitalSignatureStamp';
import { EvidenceLogModal } from './EvidenceLogModal';
import { WordTemplateModal } from './WordTemplateModal';
import {
  FileDown,
  FileText,
  ArrowLeft,
  Edit3,
  Printer,
  Calendar,
  Copy,
  Check,
  FileCheck,
  Settings,
  ShieldCheck,
  Users,
  PrinterCheck,
  Sparkles,
  FileSearch,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';

interface ContractViewerProps {
  contract: ContractData;
  onBack: () => void;
  onEdit: () => void;
  onUpdateContract: (updated: ContractData) => void;
}

/** Nome de arquivo amigável a partir do nome do cliente (sem acentos/espaços/caracteres especiais). */
function slugifyNomeArquivo(nome: string): string {
  const semAcentos = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const limpo = semAcentos
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return limpo || 'contrato';
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  onBack,
  onEdit,
  onUpdateContract,
}) => {
  const [isWordTemplateModalOpen, setIsWordTemplateModalOpen] = useState(false);
  const [isDigitalSignFlowOpen, setIsDigitalSignFlowOpen] = useState(false);
  const [isEvidenceLogOpen, setIsEvidenceLogOpen] = useState(false);
  const [isShareLinkOpen, setIsShareLinkOpen] = useState(false);
  const [signFlowParte, setSignFlowParte] = useState<'usuario' | 'comprador'>('usuario');
  const [copied, setCopied] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [renderLoading, setRenderLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Modalidade de Assinatura: 'digital' ou 'manual'
  const currentModality = contract.modalidadeAssinatura || (contract.assinaturas && contract.assinaturas.length > 0 ? 'digital' : 'digital');

  const handleModalityChange = (modality: 'digital' | 'manual') => {
    const updated: ContractData = {
      ...contract,
      modalidadeAssinatura: modality,
    };
    onUpdateContract(updated);
  };

  const legal = generateContractLegalText(contract);
  const exclusivityInfo = getExclusivityStatus(contract);
  const tags = legal.tagsMapping;
  const [customTemplateMeta, setCustomTemplateMeta] = useState<CustomTemplateMeta | null>(null);

  // Renderiza a visualização em tela a partir do MESMO .docx que o botão
  // "Word (.docx)" baixa - selos e dados já processados - em vez de um
  // texto jurídico escrito à parte, que divergia do Word real.
  useEffect(() => {
    let cancelled = false;
    setRenderLoading(true);
    setRenderError(null);
    renderContractDocumentHtml(contract)
      .then((html) => {
        if (!cancelled) setRenderedHtml(html);
      })
      .catch((err: any) => {
        if (!cancelled) setRenderError(err.message || 'Erro ao carregar o contrato.');
      })
      .finally(() => {
        if (!cancelled) setRenderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contract]);

  useEffect(() => {
    let cancelled = false;
    getCustomWordTemplateMeta(resolveTemplateKey(contract.tipo, contract.subcategoria)).then((meta) => {
      if (!cancelled) setCustomTemplateMeta(meta);
    });
    return () => {
      cancelled = true;
    };
  }, [contract.tipo, contract.subcategoria]);

  const handleAddSignature = (signature: DigitalSignature) => {
    const filtered = contract.assinaturas.filter((a) => {
      if (signature.signerIndex !== undefined && a.signerIndex !== undefined) {
        return !(a.role === signature.role && a.signerIndex === signature.signerIndex);
      }
      if (signature.documentoSignatario && a.documentoSignatario) {
        return a.documentoSignatario !== signature.documentoSignatario;
      }
      return a.role !== signature.role;
    });
    const updatedSignatures = [...filtered, signature];

    const allCompradores = getAllCompradores(contract);
    const hasVendedor = updatedSignatures.some((a) => a.role === 'vendedor');
    const allBuyersSigned = allCompradores.every((comp, idx) => 
      updatedSignatures.some(a => 
        (a.role === 'comprador' && idx === 0) ||
        (a.role === 'comprador_adicional' && a.signerIndex === idx) ||
        a.documentoSignatario === comp.cpfCnpj
      )
    );

    const isFullySigned = hasVendedor && allBuyersSigned;

    const updatedContract: ContractData = {
      ...contract,
      modalidadeAssinatura: 'digital',
      assinaturas: updatedSignatures,
      status: isFullySigned ? 'assinado_total' : 'assinado_parcial',
    };

    onUpdateContract(updatedContract);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const pdfBlob = await renderContractDocumentPdf(contract);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const nomeClientePdf = (isExcl ? contract.vendedor?.nome : contract.comprador?.nome) || contract.nomeLote || 'documento';
      a.download = buildPdfFileName(nomeClientePdf);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSignatureRegistered = async (auditStamp: AuditStamp) => {
    // "usuario" (quem assina com senha de login) é sempre o CORRETOR/CONTRATADO.
    // Na exclusividade, quem guarda os dados do corretor é o campo "comprador"
    // (o campo "vendedor" guarda o CONTRATANTE/proprietário) - mesma inversão
    // usada no download e no selo de assinatura. Antes, esse handler sempre
    // gravava role:'vendedor' com os dados de contract.vendedor, então na
    // exclusividade a assinatura do corretor era registrada com o nome/CPF
    // do Contratante e aparecia como se o Contratante tivesse assinado.
    const isExclSig = contract.tipo === 'exclusividade';
    const dadosCorretorSig = isExclSig ? contract.comprador : contract.vendedor;
    const roleCorretorSig: 'vendedor' | 'comprador' = isExclSig ? 'comprador' : 'vendedor';

    const signature: DigitalSignature = {
      role: signFlowParte === 'usuario' ? roleCorretorSig : 'comprador',
      nomeSignatario: signFlowParte === 'usuario' ? dadosCorretorSig.nome : contract.comprador.nome,
      documentoSignatario: signFlowParte === 'usuario' ? dadosCorretorSig.cpfCnpj : contract.comprador.cpfCnpj,
      assinaturaDataUrl: auditStamp.signatureId,
      assinadoEm: auditStamp.dataAssinatura,
      hashAutenticacao: auditStamp.hashDocumento,
      ipAssinatura: auditStamp.ipAssinatura,
      metadadosNavegador: auditStamp.userAgent || navigator.userAgent,
    };

    handleAddSignature(signature);

    try {
      await saveSignature(contract.id, signature);
    } catch (err: any) {
      console.warn('⚠️ Assinatura registrada localmente, mas falhou ao persistir:', err.message);
    }

    console.log(formatAuditStampText(auditStamp));
  };

  const handleCopyText = async () => {
    try {
      const textToCopy = await renderContractDocumentPlainText(contract);
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar texto do contrato:', err);
    }
  };

  const realizarDownloadESalvar = async (docxBuffer: ArrayBuffer, nomeArquivo: string) => {
    // 1. Download local (navegador)
    const blob = new Blob([docxBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 2. Salvar no Supabase (background)
    try {
      console.log('💾 Salvando cópia no Supabase...');
      await saveContractDocumentToSupabase(
        contract.id,
        nomeArquivo,
        docxBuffer,
        {
          tipo: contract.tipo,
          vendedor: contract.vendedor.nome,
          comprador: contract.comprador.nome,
          valor: contract.valorTotal,
        }
      );
      console.log('✅ Cópia salva com sucesso no Supabase!');
    } catch (error: any) {
      console.warn('⚠️ Aviso: Arquivo baixado mas não salvo no Supabase:', error.message);
      // Não bloqueia o download local se o Supabase falhar
    }
  };

  const handleDownloadDocx = async () => {
    setIsDownloadingDocx(true);
    setDownloadError(null);

    try {
      // 1. Decidir qual template usar
      const isExclDownload = contract.tipo === 'exclusividade';
      // "usuario" (selo {{USUARIO_ASSINATURA_DIGITAL}}) é sempre o CORRETOR/CONTRATADO.
      // Na exclusividade, quem guarda os dados do corretor é o campo "comprador"
      // (o campo "vendedor" guarda o CONTRATANTE/proprietário) - ver getContractExclusividadeTags.
      const dadosCorretor = isExclDownload ? contract.comprador : contract.vendedor;
      const dadosCliente = isExclDownload ? contract.vendedor : contract.comprador;
      const roleCorretor: 'vendedor' | 'comprador' = isExclDownload ? 'comprador' : 'vendedor';
      const roleCliente: 'vendedor' | 'comprador' = isExclDownload ? 'vendedor' : 'comprador';

      const sigCorretorAtual = contract.assinaturas?.find(a => a.role === roleCorretor);
      const sigClienteAtual = contract.assinaturas?.find(a => a.role === roleCliente);
      // Modalidade por PESSOA: quem já assinou digitalmente é 'digital', quem
      // ainda não assinou é tratado como 'manual' (linha física + testemunhas).
      // Evita que a assinatura digital de uma parte "contamine" a modalidade
      // da outra parte que ainda não assinou.
      const usuarioModalidadeDownload: 'digital' | 'manual' = sigCorretorAtual ? 'digital' : 'manual';
      const compradorModalidadeDownload: 'digital' | 'manual' = sigClienteAtual ? 'digital' : 'manual';
      const estadoAssinatura = {
        usuarioAssinou: !!sigCorretorAtual,
        usuarioModalidade: usuarioModalidadeDownload,
        compradorAssinou: !!sigClienteAtual,
        compradorModalidade: compradorModalidadeDownload,
        testemunhaprecisa: usuarioModalidadeDownload === 'manual' || compradorModalidadeDownload === 'manual',
      };

      // Resolver qual template usar (download_depois_assinar = está baixando após ter preenchido dados)
      const templateResolved = resolveTemplate(
        contract.tipo,
        'download_depois_assinar',
        estadoAssinatura,
        contract.tipo === 'exclusividade' ? (contract.varianteExclusividade || 'normal') : undefined
      );

      console.log('📋 Template selecionado:', templateResolved.arquivo);
      console.log('📝 Motivação:', templateResolved.motivacao);

      // 2. Recuperar template do Supabase
      const { sucesso, blob, erro } = await downloadTemplateWithCache(templateResolved.arquivo);

      if (!sucesso || !blob) {
        throw new Error(erro || 'Falha ao recuperar template do Supabase');
      }

      const docxBuffer = await blob.arrayBuffer();

      // 2. Processar tags de assinatura PRIMEIRO (antes da substituição geral de dados,
      // que apaga qualquer {{TAG}} que não reconheça - incluindo as tags de selo).
      const tagsEncontradas = await findSignatureTags(docxBuffer);

      let docxComSelos = docxBuffer;

      if (tagsEncontradas.length > 0) {
        console.log('🏷️ Tags de assinatura encontradas:', tagsEncontradas);

        const usuarioInfo: PartySignatureInfo = {
          assinou: estadoAssinatura.usuarioAssinou,
          modalidade: estadoAssinatura.usuarioModalidade,
          signature: sigCorretorAtual,
          nome: dadosCorretor.nome,
          documento: dadosCorretor.cpfCnpj,
          roleLabel: isExclDownload ? getTratamento('contratado', dadosCorretor.genero) : vTermo,
        };
        const compradorInfo: PartySignatureInfo = {
          assinou: estadoAssinatura.compradorAssinou,
          modalidade: estadoAssinatura.compradorModalidade,
          signature: sigClienteAtual,
          nome: dadosCliente.nome,
          documento: dadosCliente.cpfCnpj,
          roleLabel: isExclDownload ? getTratamento('contratante', dadosCliente.genero) : cTermo,
        };

        const tagsConfig = mapTagsToConfig(tagsEncontradas, usuarioInfo, compradorInfo);

        const resumo = summarizeChanges(tagsConfig);
        console.log('📊 Resumo de mudanças:', resumo);

        docxComSelos = await processSignatureTags(docxBuffer, tagsConfig);
      }

      // 3. Substituir tags de DADOS do contrato (sobre o DOCX já com os selos inseridos)
      console.log('🔄 Gerando tags de dados...');
      const tagsContrato = generateContractTags(contract);

      console.log('✏️ Substituindo tags de dados no template...');
      const docxComDados = await substituirTagsNoDocx(docxComSelos, tagsContrato);

      // 4. Fazer download + salvar no Supabase
      const nomeClienteArquivo = dadosCliente.nome || contract.nomeLote || 'contrato';
      const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = `${slugifyNomeArquivo(nomeClienteArquivo)}_${dataArquivo}.docx`;
      await realizarDownloadESalvar(docxComDados, nomeArquivo);
    } catch (error: any) {
      console.error('Erro ao baixar DOCX:', error);
      setDownloadError(error.message || 'Houve um erro ao processar o arquivo Word.');
      alert(`Erro: ${error.message || 'Falha ao gerar documento'}`);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const isExcl = contract.tipo === 'exclusividade';
  const allCompradores = getAllCompradores(contract);
  const anyTags = tags as unknown as Record<string, string>;
  const vNome = anyTags.CONTRATANTE_NOME || anyTags.vendedor_nome || anyTags.vendedor || (isExcl ? 'CONTRATANTE' : 'PROMITENTE VENDEDOR(A)');
  const cNome = anyTags.VENDEDOR_NOME || anyTags.comprador_nome || anyTags.comprador || (isExcl ? 'CONTRATADO(A)' : 'PROMITENTE COMPRADOR(A)');
  const vDoc = anyTags.CONTRATANTE_CPF || anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '';
  const cDoc = isExcl
    ? (anyTags.VENDEDOR_CRECI ? `CRECI nº ${anyTags.VENDEDOR_CRECI} | CPF/CNPJ: ${anyTags.VENDEDOR_CPF || ''}` : (anyTags.VENDEDOR_CPF || ''))
    : (anyTags.comprador_cpf || anyTags.cpf_comprador || '');
  const vTermo = isExcl ? 'CONTRATANTE' : (anyTags.vendedor_termo || 'PROMITENTE VENDEDOR(A)');
  const cTermo = isExcl ? 'CONTRATADO(A)' : (anyTags.comprador_termo || 'PROMITENTE COMPRADOR(A)');

  const isDigital = currentModality === 'digital';
  const isFullySigned = contract.modalidadeAssinatura === 'digital' && (contract.assinaturas?.length || 0) >= 2;
  // Corretor (vendedor/"usuario") já assinou, mas o cliente ainda não -
  // nesse ponto o botão de assinatura vira "etapa 2": gerar/enviar o
  // link de assinatura pro cliente, em vez de reabrir o fluxo de
  // assinatura do próprio corretor de novo.
  const sigVendedor = contract.assinaturas?.find((a) => a.role === 'vendedor');
  const vendedorJaAssinouAguardandoCliente = isDigital && !!sigVendedor && !isFullySigned;

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-[38px] text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar ao Dashboard</span>
        </button>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Indicador de Modelo Word Mestre Ativo */}
          <button
            onClick={() => setIsWordTemplateModalOpen(true)}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              customTemplateMeta
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Gerenciar modelo institucional Word (.docx)"
          >
            {customTemplateMeta ? (
              <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="truncate max-w-[200px]">
              {customTemplateMeta
                ? `Word: ${customTemplateMeta.fileName}`
                : 'Modelo Word (.docx)'}
            </span>
          </button>

          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>Editar</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Copiar texto do contrato"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>Imprimir</span>
          </button>

          {/* Exportar WORD (.DOCX) - some depois que o contrato digital está 100% assinado */}
          {!isFullySigned && (
            <button
              onClick={handleDownloadDocx}
              disabled={isDownloadingDocx}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Gera o arquivo Word (.docx) original substituindo apenas as TAGs com 100% de preservação de formatação"
            >
              <FileDown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{isDownloadingDocx ? 'Gerando...' : 'Word (.docx)'}</span>
            </button>
          )}

          {/* Exportar PDF - gerado a partir do MESMO .docx real (não mais um texto desenhado à parte) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            title="Baixar em formato PDF formatado"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>{isDownloadingPdf ? 'Gerando...' : 'PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELETOR DE MODALIDADE DE FINALIZAÇÃO / ASSINATURA DO CONTRATO            */}
      {/* Some por completo quando o contrato digital já está 100% assinado        */}
      {/* ========================================================================= */}
      {isFullySigned ? (
        <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <span className="text-sm font-bold text-amber-950 block">
                Contrato assinado — somente visualização
              </span>
              <p className="text-xs text-amber-800 mt-0.5">
                Ambas as partes já assinaram digitalmente. Não é mais possível reabrir o fluxo de assinatura.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEvidenceLogOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer min-h-[38px]"
              title="Ver log de evidências das assinaturas"
            >
              <FileSearch className="w-4 h-4 text-amber-600" />
              <span>Log de Evidências</span>
            </button>
            <button
              onClick={() => setIsShareLinkOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer min-h-[38px]"
              title="Gerar/compartilhar link para o cliente rever e baixar o contrato"
            >
              <LinkIcon className="w-4 h-4 text-amber-600" />
              <span>Compartilhar Link</span>
            </button>
          </div>
        </div>
      ) : (
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Finalização do Contrato
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Como deseja assinar?
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {isDigital
              ? '✨ 2 Partes (Sem Testemunhas) • Certificação Digital'
              : '📄 2 Partes + 2 Testemunhas para Impressão'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Opção 1: Assinatura Digital */}
          <label
            onClick={() => handleModalityChange('digital')}
            className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
              isDigital
                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <input
              type="radio"
              name="modalidadeAssinatura"
              checked={isDigital}
              onChange={() => handleModalityChange('digital')}
              className="mt-1 w-4 h-4 text-amber-600 focus:ring-amber-500"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <strong className="text-sm font-bold text-slate-900">Assinatura digital</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contratado e Contratante assinam eletronicamente via sistema com código de confirmação. 
                <strong className="text-amber-900 block mt-0.5">Sem campos ou linhas de testemunhas.</strong>
              </p>
            </div>
          </label>

          {/* Opção 2: PDF para Assinatura Manual */}
          <label
            onClick={() => handleModalityChange('manual')}
            className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
              !isDigital
                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <input
              type="radio"
              name="modalidadeAssinatura"
              checked={!isDigital}
              onChange={() => handleModalityChange('manual')}
              className="mt-1 w-4 h-4 text-amber-600 focus:ring-amber-500"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PrinterCheck className="w-4 h-4 text-slate-700 shrink-0" />
                <strong className="text-sm font-bold text-slate-900">PDF para assinatura manual</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gera o documento para impressão e assinatura a próprio punho. 
                <strong className="text-slate-900 block mt-0.5">Inclui Contratado, Contratante e 2 Testemunhas.</strong>
              </p>
            </div>
          </label>
        </div>

        {/* Ação Rápida de Assinatura se for Modalidade Digital */}
        {isDigital && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70">
            <div className="text-xs text-amber-950">
              {contract.assinaturas && contract.assinaturas.length === 2 ? (
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <Check className="w-4 h-4 text-amber-600" /> Ambas as partes já assinaram digitalmente!
                </span>
              ) : vendedorJaAssinouAguardandoCliente ? (
                <span>
                  ✅ Sua assinatura está registrada. Agora gere o link e envie para o cliente assinar.
                </span>
              ) : (
                <span>
                  Nenhuma assinatura eletrônica registrada ainda. Clique no botão ao lado para iniciar o fluxo.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsEvidenceLogOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer min-h-[38px]"
                title="Ver log de evidências das assinaturas"
              >
                <FileSearch className="w-4 h-4" />
                <span>Log de Evidências</span>
              </button>

              {vendedorJaAssinouAguardandoCliente ? (
                <button
                  onClick={() => setIsShareLinkOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer min-h-[38px]"
                  title="Gerar código e link de assinatura para o cliente"
                >
                  <LinkIcon className="w-4 h-4 text-slate-950" />
                  <span>Gerar Link para Cliente</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSignFlowParte('usuario');
                    setIsDigitalSignFlowOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer min-h-[38px]"
                  title="Fluxo com OTP e carimbo digital"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Assinatura Digital</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Banner de Monitor de Prazo se for Exclusividade */}
      {contract.tipo === 'exclusividade' && contract.exclusividade && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Monitoramento de Prazo de Exclusividade
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Vigência de <strong>{formatDate(contract.exclusividade.dataInicio)}</strong> até{' '}
                  <strong>{formatDate(contract.exclusividade.dataTermino)}</strong> ({contract.exclusividade.prazoMesesOuDias} {contract.exclusividade.unidadePrazo}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${exclusivityInfo.badgeColor}`}>
                {exclusivityInfo.label}
              </span>
            </div>
          </div>

          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                exclusivityInfo.status === 'vencido'
                  ? 'bg-rose-500'
                  : exclusivityInfo.status === 'alerta'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${exclusivityInfo.progressoPercentual}%` }}
            />
          </div>
        </div>
      )}
      {/* Papel do Contrato (Documento Renderizado a partir do .docx REAL -
          mesma fonte do botão "Word (.docx)": selos e dados já processados.
          Fidelidade total ao contrato que você formatou, sem texto duplicado
          mantido à parte. */}
      <div
        id="contract-paper-document"
        className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-10 md:p-14 font-serif text-slate-900 leading-relaxed transition-all max-w-full overflow-hidden"
      >
        {/* Cabeçalho do Documento */}
        <div className="text-right text-[11px] font-sans text-slate-500 mb-6 print:hidden">
          Ref: Contrato nº <strong className="text-slate-800">{contract.numeroContrato}</strong>
        </div>

        {renderLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-sans">Carregando contrato...</span>
          </div>
        )}

        {renderError && !renderLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-sans text-red-700">
            Não foi possível carregar o contrato: {renderError}
          </div>
        )}

        {!renderLoading && !renderError && renderedHtml && (
          <div
            className="contract-docx-html text-sm sm:text-base [&_p]:mb-3 [&_p]:text-justify [&_strong]:font-bold [&_table]:w-full [&_img]:w-[33%]! [&_img]:h-auto! [&_img]:max-w-[33%]!"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>

      {/* Modal de Gerenciamento de Modelos Word (.docx) */}
      {isWordTemplateModalOpen && (
        <WordTemplateModal
          isOpen={isWordTemplateModalOpen}
          initialType={contract.tipo}
          onClose={() => setIsWordTemplateModalOpen(false)}
        />
      )}

      {/* Modal de Assinatura Digital com OTP (Novo Fluxo) */}
      {isDigitalSignFlowOpen && (
        <DigitalSignatureFlowModal
          contract={contract}
          parte={signFlowParte}
          onClose={() => setIsDigitalSignFlowOpen(false)}
          onSignatureRegistered={handleSignatureRegistered}
        />
      )}

      {isEvidenceLogOpen && (
        <EvidenceLogModal
          contract={contract}
          onClose={() => setIsEvidenceLogOpen(false)}
        />
      )}

      {isShareLinkOpen && (
        <GenerateSignatureCodeModal
          contract={contract}
          isOpen={isShareLinkOpen}
          onClose={() => setIsShareLinkOpen(false)}
          onCodeGenerated={() => {}}
          isFullySigned={isFullySigned}
        />
      )}
    </div>
  );
};

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
import { processarBlocoTestemunhas } from '../utils/witnessBlockProcessor';
import { buildPdfFileName, buildDocxFileName } from '../utils/pdfFileName';
import { startSimulatedPdfProgress } from '../utils/pdfProgressSimulator';
import { saveSignature, fetchSignatures } from '../utils/contractsRepository';
import { supabase } from '../utils/supabaseClient';
import { AuditStamp, formatAuditStampText } from '../utils/signatureOtpUtils';
import { DigitalSignatureFlowModal } from './DigitalSignatureFlowModal';
import { GenerateSignatureCodeModal } from './GenerateSignatureCodeModal';
import { DigitalSignatureStamp } from './DigitalSignatureStamp';
import { EvidenceLogModal } from './EvidenceLogModal';
import {
  FileDown,
  FileText,
  ArrowLeft,
  Edit3,
  Printer,
  Calendar,
  Copy,
  Check,
  ShieldCheck,
  Users,
  PrinterCheck,
  Sparkles,
  FileSearch,
  Link as LinkIcon,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  ExternalLink,
  Info,
} from 'lucide-react';

interface ContractViewerProps {
  contract: ContractData;
  onBack: () => void;
  onEdit: () => void;
  onUpdateContract: (updated: ContractData) => void;
  onDelete?: (contractId: string) => void;
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
  onDelete,
}) => {
  const [isDigitalSignFlowOpen, setIsDigitalSignFlowOpen] = useState(false);
  const [isEvidenceLogOpen, setIsEvidenceLogOpen] = useState(false);
  const [isShareLinkOpen, setIsShareLinkOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingContract, setIsDeletingContract] = useState(false);
  const [signFlowParte, setSignFlowParte] = useState<'usuario' | 'comprador'>('usuario');
  const [copied, setCopied] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
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

  // Assinatura em tempo real: se o cliente assina pelo link dele enquanto
  // o corretor está com esta tela aberta em outro aparelho, o corretor
  // precisa ver a atualização sozinho - sem isso, a tela ficava presa no
  // estado antigo (ainda oferecendo "assinar"/gerar link de assinatura)
  // até um F5 manual, mesmo já estando 100% assinado no banco.
  useEffect(() => {
    if (!contract.id) return;

    const channel = supabase
      .channel(`contract_signatures_${contract.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_signatures', filter: `contract_id=eq.${contract.id}` },
        async () => {
          try {
            const assinaturasAtualizadas = await fetchSignatures(contract.id!);
            if (!assinaturasAtualizadas) return;

            const allCompradores = getAllCompradores(contract);
            const hasVendedorRT = assinaturasAtualizadas.some((a) => a.role === 'vendedor');
            const allBuyersSignedRT = allCompradores.every((comp, idx) =>
              assinaturasAtualizadas.some(
                (a) =>
                  (a.role === 'comprador' && idx === 0) ||
                  (a.role === 'comprador_adicional' && a.signerIndex === idx) ||
                  a.documentoSignatario === comp.cpfCnpj
              )
            );
            const isFullySignedRT = hasVendedorRT && allBuyersSignedRT;

            onUpdateContract({
              ...contract,
              assinaturas: assinaturasAtualizadas,
              status: isFullySignedRT ? 'assinado_total' : assinaturasAtualizadas.length > 0 ? 'assinado_parcial' : contract.status,
            });
          } catch {
            // Falha ao buscar assinaturas atualizadas: mantém o estado atual
            // na tela em vez de quebrar - o corretor ainda pode dar F5.
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

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
    setPdfProgress(0);

    const cancelarProgresso = startSimulatedPdfProgress(setPdfProgress);

    try {
      const pdfBlob = await renderContractDocumentPdf(contract);
      cancelarProgresso();
      setPdfProgress(100);
      // deixa o 100% visível brevemente antes de fechar a barra
      await new Promise((r) => setTimeout(r, 300));

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildPdfFileName(contract);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      cancelarProgresso();
      setIsDownloadingPdf(false);
      setPdfProgress(0);
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
      // Valor provisório (relógio do dispositivo). Substituído abaixo pelo
      // horário do servidor assim que a persistência confirma - é ele que
      // deve aparecer em qualquer PDF/manifesto/log gerado a partir daqui.
      assinadoEm: auditStamp.dataAssinatura,
      hashAutenticacao: auditStamp.hashDocumento,
      ipAssinatura: auditStamp.ipAssinatura,
      metadadosNavegador: auditStamp.userAgent || navigator.userAgent,
      meioAutenticacao: 'Login e senha (revalidação via Supabase Auth)',
    };

    // Se o INSERT falhar, a assinatura NÃO existe no banco: não podemos
    // adicionar ao estado local nem deixar o modal avançar para a tela de
    // "sucesso" (que libera o download do PDF com um selo que não valida
    // em lugar nenhum). Por isso o erro é propagado (throw) em vez de só
    // logado - quem chama (DigitalSignatureFlowModal) trata e mostra ao
    // usuário, mantendo-o na tela de senha para tentar de novo.
    const assinadoEmServidor = await saveSignature(contract.id, signature);
    signature.assinadoEm = assinadoEmServidor;

    handleAddSignature(signature);

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
    // Defesa extra: nunca gerar o .docx "cru" se qualquer parte já assinou digitalmente
    // (o botão já vem desabilitado nesse caso, mas evita chamada indevida por outro caminho).
    if ((contract.assinaturas?.length || 0) > 0) {
      setDownloadError('Não é possível baixar em Word: pelo menos uma parte já assinou digitalmente. Use o PDF.');
      return;
    }

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
        // varianteExclusividade nunca é preenchido em lugar nenhum (não existe
        // campo no formulário nem coluna no banco pra ele) - sempre chegava
        // aqui undefined e caía no default 'normal', que usa o template COM
        // cláusula de cônjuge mesmo sem ter como o usuário escolher isso.
        // Até existir essa escolha na UI, o padrão correto é 'sem_conjuge'
        // (o template dedicado que já é o que deve sair no dia a dia).
        contract.tipo === 'exclusividade' ? (contract.varianteExclusividade || 'sem_conjuge') : undefined
      );

      console.log('📋 Template selecionado:', templateResolved.arquivo);
      console.log('📝 Motivação:', templateResolved.motivacao);

      // 2. Recuperar template do Supabase
      const { sucesso, blob, erro } = await downloadTemplateWithCache(templateResolved.arquivo);

      if (!sucesso || !blob) {
        throw new Error(erro || 'Falha ao recuperar template do Supabase');
      }

      let docxBuffer = await blob.arrayBuffer();

      // 1.5. Bloco de testemunhas: mantém ou remove {{BLOCO_TESTEMUNHAS_INICIO}}...
      // {{BLOCO_TESTEMUNHAS_FIM}} conforme testemunhaprecisa (calculado acima a
      // partir da modalidade real de cada parte). Precisa rodar antes da
      // substituição de tags, senão a limpeza de tags desconhecidas apaga só os
      // marcadores e o conteúdo do bloco fica sempre visível. No-op em templates
      // antigos que não têm esses marcadores.
      docxBuffer = await processarBlocoTestemunhas(docxBuffer, estadoAssinatura.testemunhaprecisa);

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
          roleLabel: isExclDownload ? getTratamento('contratado', dadosCorretor.genero) : corretorTermo,
        };
        const compradorInfo: PartySignatureInfo = {
          assinou: estadoAssinatura.compradorAssinou,
          modalidade: estadoAssinatura.compradorModalidade,
          signature: sigClienteAtual,
          nome: dadosCliente.nome,
          documento: dadosCliente.cpfCnpj,
          roleLabel: isExclDownload ? getTratamento('contratante', dadosCliente.genero) : clienteTermo,
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
      const nomeArquivo = buildDocxFileName(contract);
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
  const isLoc = contract.tipo === 'locacao';
  const allCompradores = getAllCompradores(contract);
  const anyTags = tags as unknown as Record<string, string>;

  // Papéis contratuais específicos por tipo:
  // - Venda: Vendedor (Você/Vendedor) e Comprador (Cliente)
  // - Exclusividade: Contratado (Você/Corretor) e Contratante (Cliente)
  // - Locação: Locador (Você/Locador/Proprietário) e Locatário (Cliente/Inquilino)
  const corretorTermo = isExcl
    ? 'CONTRATADO(A)'
    : isLoc
    ? 'LOCADOR(A)'
    : (anyTags.vendedor_termo || 'PROMITENTE VENDEDOR(A)');

  const corretorNome = isExcl
    ? (anyTags.VENDEDOR_NOME || anyTags.comprador_nome || anyTags.comprador || 'CONTRATADO(A)')
    : isLoc
    ? (anyTags.locador || anyTags.vendedor_nome || anyTags.vendedor || 'LOCADOR(A)')
    : (anyTags.vendedor_nome || anyTags.vendedor || 'PROMITENTE VENDEDOR(A)');

  const corretorDoc = isExcl
    ? (anyTags.VENDEDOR_CRECI ? `CRECI nº ${anyTags.VENDEDOR_CRECI} | CPF/CNPJ: ${anyTags.VENDEDOR_CPF || ''}` : (anyTags.VENDEDOR_CPF || ''))
    : isLoc
    ? (anyTags.cpf_locador || anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '')
    : (anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '');

  const clienteTermo = isExcl
    ? 'CONTRATANTE'
    : isLoc
    ? 'LOCATÁRIO(A)'
    : (anyTags.comprador_termo || 'PROMITENTE COMPRADOR(A)');

  const clienteNome = isExcl
    ? (anyTags.CONTRATANTE_NOME || anyTags.vendedor_nome || anyTags.vendedor || 'CONTRATANTE')
    : isLoc
    ? (anyTags.locatario || anyTags.comprador_nome || anyTags.comprador || 'LOCATÁRIO(A)')
    : (anyTags.comprador_nome || anyTags.comprador || 'PROMITENTE COMPRADOR(A)');

  const clienteDoc = isExcl
    ? (anyTags.CONTRATANTE_CPF || anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '')
    : isLoc
    ? (anyTags.cpf_locatario || anyTags.comprador_cpf || anyTags.cpf_comprador || '')
    : (anyTags.comprador_cpf || anyTags.cpf_comprador || '');

  const isDigital = currentModality === 'digital';
  const isFullySigned = contract.modalidadeAssinatura === 'digital' && (contract.assinaturas?.length || 0) >= 2;
  // Assim que QUALQUER uma das partes assina digitalmente, o selo eletrônico já foi
  // embutido no documento - baixar o .docx "cru" (sem selo, com tags substituíveis)
  // deixaria de refletir o estado real do contrato. Por isso o botão Word (.docx)
  // fica desabilitado a partir da primeira assinatura digital, não só quando 100% assinado.
  const hasAnyDigitalSignature = (contract.assinaturas?.length || 0) > 0;
  // Corretor (vendedor/"usuario") já assinou, mas o cliente ainda não -
  // nesse ponto o botão de assinatura vira "etapa 2": gerar/enviar o
  // link de assinatura pro cliente, em vez de reabrir o fluxo de
  // assinatura do próprio corretor de novo.
  // Em contratos de EXCLUSIVIDADE os campos são invertidos (vendedor =
  // Contratante/proprietário, comprador = Contratado/corretor) - e é
  // esse mesmo mapeamento que handleSignatureRegistered usa para gravar
  // a assinatura do corretor com role:'comprador' nesse tipo de
  // contrato. Sem levar isso em conta aqui, a assinatura já registrada
  // do corretor nunca era encontrada, e o painel voltava a pedir senha
  // como se ninguém tivesse assinado ainda.
  const roleCorretorAtual = isExcl ? 'comprador' : 'vendedor';
  const roleClienteAtual = isExcl ? 'vendedor' : 'comprador';
  const sigVendedor = contract.assinaturas?.find((a) => a.role === roleCorretorAtual);
  const clienteJaAssinou = !!contract.assinaturas?.find((a) => a.role === roleClienteAtual);
  const vendedorJaAssinouAguardandoCliente = isDigital && !!sigVendedor && !isFullySigned && !clienteJaAssinou;

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Barra de progresso do download do PDF (fixa, sobre o conteúdo) */}
      {isDownloadingPdf && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-white border border-amber-200 rounded-xl shadow-lg p-4 print:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              Gerando PDF...
            </span>
            <span className="text-sm font-bold text-amber-600 tabular-nums">{pdfProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${pdfProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Action Bar (Navegação & Ações Rápidas) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar ao Dashboard</span>
          </button>

          <div className="hidden sm:block border-l border-slate-200 h-6"></div>

          <div className="hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Nº {contract.numeroContrato || '---'}
            </span>
            <span className="text-xs font-bold text-slate-800">
              {contract.tipo === 'venda_vista'
                ? 'Venda à Vista'
                : contract.tipo === 'venda_parcelada'
                ? 'Venda Parcelada'
                : 'Exclusividade de Venda'}
            </span>
          </div>
        </div>

        {/* Ações Rápidas: Editar, Copiar, Imprimir, Excluir.
            "Pedir Dados (Auto-Cadastro)" não fica aqui - já tem card dedicado
            no Dashboard, não precisa duplicar dentro da aba do contrato. */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title={
              hasAnyDigitalSignature
                ? 'Este contrato já possui assinatura eletrônica registrada. Editar criará uma nova cópia limpa.'
                : 'Editar dados do contrato'
            }
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{hasAnyDigitalSignature ? 'Editar (Nova Cópia)' : 'Editar'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Copiar texto integral do contrato para a área de transferência"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Imprimir documento via navegador"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Imprimir</span>
          </button>

          {onDelete && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-500 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Mover contrato para a Lixeira"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAINEL DE FINALIZAÇÃO, ASSINATURA & DOWNLOAD DO CONTRATO                  */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-5">
        {/* Cabeçalho do Painel com Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Formalização & Assinatura
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Finalização do Contrato
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha como deseja assinar e acompanhe o status de cada parte até a conclusão.
            </p>
          </div>

          <div className="shrink-0">
            {isFullySigned ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                100% Assinado Eletronicamente
              </span>
            ) : vendedorJaAssinouAguardandoCliente ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                Aguardando Assinatura do Cliente
              </span>
            ) : clienteJaAssinou ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                Aguardando Sua Assinatura
              </span>
            ) : isDigital ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Assinatura Eletrônica (Online)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <PrinterCheck className="w-4 h-4 text-slate-600" />
                Assinatura Manual (Impressão)
              </span>
            )}
          </div>
        </div>

        {/* Seletor de Modalidade (Assinatura Eletrônica vs Assinatura Manual) */}
        {!isFullySigned && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Como deseja formalizar este contrato?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opção 1: Assinatura Eletrônica */}
              <label
                onClick={() => handleModalityChange('digital')}
                className={`relative flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  isDigital
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
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
                <div className="space-y-1 pr-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <strong className="text-sm font-bold text-slate-900">
                      Assinatura Eletrônica
                    </strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                      Recomendado • Sem Testemunhas
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Você e o cliente assinam online pelo celular ou computador com confirmação por código, IP, data/hora e carimbo com QR Code.
                    <span className="text-slate-500 block mt-1">
                      *Não requer certificado digital ICP/e-CPF nem impressão. Válido pela Lei 14.063/2020.
                    </span>
                  </p>
                </div>
              </label>

              {/* Opção 2: Assinatura Manual */}
              <label
                onClick={() => handleModalityChange('manual')}
                className={`relative flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  !isDigital
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
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
                <div className="space-y-1 pr-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PrinterCheck className="w-4 h-4 text-slate-700 shrink-0" />
                    <strong className="text-sm font-bold text-slate-900">
                      PDF para Assinatura Manual
                    </strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      Em Papel
                    </span>
                  </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                    {hasAnyDigitalSignature
                      ? 'Modalidade mista: mantém a assinatura eletrônica já feita e gera o documento para a outra parte assinar a próprio punho.'
                      : 'Gera o documento formatado para impressão e coleta manual de assinaturas a próprio punho.'}
                    <strong className="text-slate-800 block mt-1">
                      {hasAnyDigitalSignature
                        ? 'Inclui a parte pendente + 2 Testemunhas.'
                        : isLoc
                        ? 'Inclui Locador, Locatário e 2 Testemunhas.'
                        : isExcl
                        ? 'Inclui Contratado, Contratante e 2 Testemunhas.'
                        : 'Inclui Vendedor, Comprador e 2 Testemunhas.'}
                    </strong>
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Quadro de Acompanhamento das Assinaturas (Modalidade Eletrônica) */}
        {isDigital && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Status das Assinaturas
              </span>
              <span className="text-xs text-slate-500">
                {contract.assinaturas?.length || 0} de 2 partes assinadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Corretor / Locador / Contratado */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  sigVendedor
                    ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {corretorTermo} ({isLoc ? 'Locador' : isExcl ? 'Você / Corretor' : 'Vendedor'})
                    </span>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {corretorNome}
                    </p>
                    {corretorDoc && <p className="text-[11px] text-slate-500">{corretorDoc}</p>}
                  </div>

                  {sigVendedor ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3 h-3" /> Assinado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3 h-3" /> Pendente
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  {sigVendedor ? (
                    <div className="text-[11px] text-emerald-800 leading-tight">
                      <span>Assinado em {formatDate(sigVendedor.dataAssinatura)}</span>
                      {sigVendedor.codigoConfirmacao && (
                        <span className="block text-[10px] text-emerald-700 font-mono font-bold">
                          Cód: {sigVendedor.codigoConfirmacao}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSignFlowParte('usuario');
                        setIsDigitalSignFlowOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 btn-gold text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>{isLoc ? 'Assinar como Locador' : isExcl ? 'Assinar como Corretor' : 'Assinar como Vendedor'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Cliente / Locatário / Contratante */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  clienteJaAssinou
                    ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {clienteTermo} ({isLoc ? 'Locatário / Inquilino' : 'Cliente'})
                    </span>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {clienteNome}
                    </p>
                    {clienteDoc && <p className="text-[11px] text-slate-500">{clienteDoc}</p>}
                  </div>

                  {clienteJaAssinou ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3 h-3" /> Assinado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3 h-3" /> Pendente
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-2">
                  {clienteJaAssinou ? (
                    <div className="text-[11px] text-emerald-800 leading-tight">
                      <span>Assinado pelo {isLoc ? 'locatário' : isExcl ? 'contratante' : 'comprador'}</span>
                      {contract.assinaturas?.find(a => a.role === roleClienteAtual)?.codigoConfirmacao && (
                        <span className="block text-[10px] text-emerald-700 font-mono font-bold">
                          Cód: {contract.assinaturas.find(a => a.role === roleClienteAtual)?.codigoConfirmacao}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {sigVendedor ? (
                        <button
                          onClick={() => setIsShareLinkOpen(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 btn-gold text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <LinkIcon className="w-4 h-4 text-slate-950" />
                          <span>{isLoc ? 'Link Assinatura Locatário' : 'Link Assinatura Cliente'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic py-1 block">
                          Assine primeiro para liberar o link de assinatura
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé de Ações Rápidas: Assinatura, Links e Auditoria */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-700 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isFullySigned
                ? 'Contrato concluído! Todas as assinaturas foram validadas e embutidas com QR Code.'
                : vendedorJaAssinouAguardandoCliente
                ? `Sua assinatura foi registrada. Envie o link para o ${isLoc ? 'locatário' : 'cliente'} assinar online.`
                : clienteJaAssinou
                ? `O ${isLoc ? 'locatário' : 'cliente'} já assinou. Clique em "Assinar como ${isLoc ? 'Locador' : isExcl ? 'Corretor' : 'Vendedor'}" para concluir.`
                : isDigital
                ? `Inicie assinando o contrato como ${isLoc ? 'locador' : isExcl ? 'corretor' : 'vendedor'} para gerar o link de envio.`
                : 'Baixe o PDF abaixo para imprimir e coletar as assinaturas a próprio punho com 2 testemunhas.'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Log de Evidências */}
            <button
              onClick={() => setIsEvidenceLogOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer min-h-[38px]"
              title="Ver log de auditoria e evidências jurídicas"
            >
              <FileSearch className="w-4 h-4 text-slate-600" />
              <span>Log de Evidências</span>
            </button>

            {/* Ação Primária Dinâmica */}
            {isFullySigned ? (
              <button
                onClick={() => setIsShareLinkOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer min-h-[38px]"
                title="Compartilhar link de visualização com o cliente"
              >
                <LinkIcon className="w-4 h-4 text-emerald-700" />
                <span>Compartilhar Link</span>
              </button>
            ) : isDigital && vendedorJaAssinouAguardandoCliente ? (
              <button
                onClick={() => setIsShareLinkOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 btn-gold text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[38px]"
                title="Gerar link de assinatura do cliente"
              >
                <LinkIcon className="w-4 h-4 text-slate-950" />
                <span>Enviar Link ao Cliente</span>
              </button>
            ) : isDigital && !sigVendedor ? (
              <button
                onClick={() => {
                  setSignFlowParte('usuario');
                  setIsDigitalSignFlowOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 btn-gold text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[38px]"
                title="Assinar digitalmente com código OTP"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Assinar Contrato Agora</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Central de Downloads de Arquivos (PDF Oficial e Minuta Word) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">
                Baixar Documento do Contrato
              </span>
              <p className="text-[11px] text-slate-500 max-w-md">
                {isFullySigned
                  ? 'Baixe o PDF final com todos os carimbos, assinaturas digitais e validação com QR Code.'
                  : isDigital
                  ? 'O PDF é o documento oficial. Se precisar fazer ajustes no texto antes de assinar, baixe o Word (.docx).'
                  : 'Documento formatado pronto para impressão e coleta manual de assinaturas.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* Baixar Minuta Word (.docx) */}
              {!isFullySigned && (
                <button
                  onClick={handleDownloadDocx}
                  disabled={isDownloadingDocx || hasAnyDigitalSignature}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                  title={
                    hasAnyDigitalSignature
                      ? 'Indisponível: o contrato já possui assinatura eletrônica registrada. Baixe em PDF para visualizar com os selos.'
                      : 'Baixar arquivo Word (.docx) para edição de minuta'
                  }
                >
                  <FileDown className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isDownloadingDocx ? 'Gerando Word...' : 'Word (.docx)'}</span>
                </button>
              )}

              {/* Baixar PDF Oficial (.pdf) */}
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex items-center justify-center gap-2 px-4.5 py-2.5 min-h-[42px] text-xs font-extrabold text-white bg-slate-950 hover:bg-slate-900 active:bg-black disabled:opacity-60 rounded-xl transition-all shadow-xs cursor-pointer border border-slate-800"
                title="Baixar contrato oficial formatado em PDF"
              >
                <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>{isDownloadingPdf ? 'Gerando PDF...' : 'Baixar PDF (.pdf)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
            className="contract-docx-html text-sm sm:text-base [&_p]:mb-3 [&_p]:text-justify [&_strong]:font-bold [&_table]:w-full [&_img]:w-[33%]! [&_img]:max-w-[33%]! [&_img]:h-auto! [&_img]:mx-auto [&_img]:my-3 [&_img]:block [&_img]:rounded-xl [&_img]:shadow-xs"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>

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

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  Mover Contrato para a Lixeira?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O contrato <strong className="text-slate-800 font-bold">"{contract.titulo}"</strong> será enviado para a Lixeira por 30 dias e você retornará ao painel de controle.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingContract}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingContract}
                onClick={async () => {
                  if (!onDelete || !contract.id) return;
                  try {
                    setIsDeletingContract(true);
                    await onDelete(contract.id);
                  } catch (err) {
                    console.error('Erro ao excluir:', err);
                  } finally {
                    setIsDeletingContract(false);
                    setIsDeleteConfirmOpen(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isDeletingContract ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Mover para Lixeira</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

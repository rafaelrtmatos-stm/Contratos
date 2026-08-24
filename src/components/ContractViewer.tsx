import React, { useState } from 'react';
import { ContractData, DigitalSignature } from '../types/contract';
import {
  generateContractLegalText,
  exportToPdf,
  formatDate,
  getExclusivityStatus,
  getAllCompradores,
} from '../utils/contractGenerators';
import {
  downloadDocxContract,
  getCustomWordTemplateMeta,
} from '../utils/docxProcessor';
import { resolveTemplate } from '../utils/templateResolver';
import { downloadTemplateWithCache } from '../utils/supabaseTemplateStorage';
import { 
  processSignatureTags,
  findSignatureTags,
  mapTagsToConfig,
  summarizeChanges,
} from '../utils/signatureTagProcessor';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import { WordTemplateModal } from './WordTemplateModal';
import { DigitalSignatureStamp } from './DigitalSignatureStamp';
import {
  FileDown,
  FileText,
  PenTool,
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
} from 'lucide-react';

interface ContractViewerProps {
  contract: ContractData;
  onBack: () => void;
  onEdit: () => void;
  onUpdateContract: (updated: ContractData) => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  onBack,
  onEdit,
  onUpdateContract,
}) => {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isWordTemplateModalOpen, setIsWordTemplateModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
  const customTemplateMeta = getCustomWordTemplateMeta(contract.tipo);

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

  const handleCopyText = () => {
    const textToCopy = `${legal.titulo}\n\n${legal.preambulo}\n\n${legal.clausulas.map(c => `${c.numero} – ${c.titulo}\n${c.conteudo}`).join('\n\n')}\n\n${legal.dataLocal}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    setIsDownloadingDocx(true);
    setDownloadError(null);

    try {
      // 1. Decidir qual template usar
      const estadoAssinatura = {
        usuarioAssinou: contract.assinaturas?.some(a => a.role === 'vendedor') || false,
        usuarioModalidade: (contract.modalidadeAssinatura === 'digital' ? 'digital' : 'manual') as 'digital' | 'manual',
        compradorAssinou: contract.assinaturas?.some(a => a.role === 'comprador') || false,
        compradorModalidade: (contract.modalidadeAssinatura === 'digital' ? 'digital' : 'manual') as 'digital' | 'manual',
        testemunhaprecisa: contract.modalidadeAssinatura === 'manual',
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

      // 3. Processar tags de assinatura
      const tagsEncontradas = await findSignatureTags(docxBuffer);
      
      if (tagsEncontradas.length > 0) {
        console.log('🏷️ Tags de assinatura encontradas:', tagsEncontradas);
        
        const tagsConfig = mapTagsToConfig(
          tagsEncontradas,
          estadoAssinatura.usuarioAssinou,
          estadoAssinatura.compradorAssinou,
          estadoAssinatura.usuarioModalidade,
          estadoAssinatura.compradorModalidade
        );

        const resumo = summarizeChanges(tagsConfig);
        console.log('📊 Resumo de mudanças:', resumo);

        // Processar tags
        const docxProcessado = await processSignatureTags(docxBuffer, tagsConfig);

        // 4. Fazer download
        const url = URL.createObjectURL(new Blob([docxProcessado], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contract.nomeLote || 'contrato'}_${new Date().getTime()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Nenhuma tag de assinatura, fazer download direto
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contract.nomeLote || 'contrato'}_${new Date().getTime()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
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

          {/* Exportar WORD (.DOCX) */}
          <button
            onClick={handleDownloadDocx}
            disabled={isDownloadingDocx}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Gera o arquivo Word (.docx) original substituindo apenas as TAGs com 100% de preservação de formatação"
          >
            <FileDown className="w-4 h-4 text-green-600 shrink-0" />
            <span>{isDownloadingDocx ? 'Gerando...' : 'Word (.docx)'}</span>
          </button>

          {/* Exportar PDF */}
          <button
            onClick={() => exportToPdf(contract)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            title="Baixar em formato PDF formatado"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELETOR DE MODALIDADE DE FINALIZAÇÃO / ASSINATURA DO CONTRATO            */}
      {/* ========================================================================= */}
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
              : '📄 2 Partes + 3 Testemunhas para Impressão'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Opção 1: Assinatura Digital */}
          <label
            onClick={() => handleModalityChange('digital')}
            className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
              isDigital
                ? 'border-green-600 bg-green-50/70 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <input
              type="radio"
              name="modalidadeAssinatura"
              checked={isDigital}
              onChange={() => handleModalityChange('digital')}
              className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <strong className="text-sm font-bold text-slate-900">Assinatura digital</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contratado e Contratante assinam eletronicamente via sistema com código de confirmação. 
                <strong className="text-green-900 block mt-0.5">Sem campos ou linhas de testemunhas.</strong>
              </p>
            </div>
          </label>

          {/* Opção 2: PDF para Assinatura Manual */}
          <label
            onClick={() => handleModalityChange('manual')}
            className={`flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
              !isDigital
                ? 'border-green-600 bg-green-50/70 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <input
              type="radio"
              name="modalidadeAssinatura"
              checked={!isDigital}
              onChange={() => handleModalityChange('manual')}
              className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PrinterCheck className="w-4 h-4 text-slate-700 shrink-0" />
                <strong className="text-sm font-bold text-slate-900">PDF para assinatura manual</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gera o documento para impressão e assinatura a próprio punho. 
                <strong className="text-slate-900 block mt-0.5">Inclui Contratado, Contratante e 3 Testemunhas.</strong>
              </p>
            </div>
          </label>
        </div>

        {/* Ação Rápida de Assinatura se for Modalidade Digital */}
        {isDigital && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-green-50/60 p-3 rounded-xl border border-green-100">
            <div className="text-xs text-green-900">
              {contract.assinaturas && contract.assinaturas.length === 2 ? (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Ambas as partes já assinaram digitalmente!
                </span>
              ) : contract.assinaturas && contract.assinaturas.length === 1 ? (
                <span>
                  1 de 2 assinaturas registradas ({contract.assinaturas[0].role === 'vendedor' ? 'Contratado' : 'Contratante'}).
                </span>
              ) : (
                <span>
                  Nenhuma assinatura eletrônica registrada ainda. Clique no botão ao lado para iniciar o fluxo.
                </span>
              )}
            </div>
            <button
              onClick={() => setIsSignModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 min-h-[38px]"
            >
              <PenTool className="w-4 h-4" />
              <span>Abrir Painel de Assinatura Digital</span>
            </button>
          </div>
        )}
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

      {/* Papel do Contrato (Documento Renderizado Oficial) */}
      <div
        id="contract-paper-document"
        className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-10 md:p-14 font-serif text-slate-900 leading-relaxed transition-all max-w-full overflow-hidden"
      >
        {/* Cabeçalho do Documento */}
        <div className="text-right text-[11px] font-sans text-slate-500 mb-6">
          Ref: Contrato nº <strong className="text-slate-800">{contract.numeroContrato}</strong>
        </div>

        <h1 className="text-center text-lg sm:text-xl font-bold uppercase tracking-wider mb-8 text-slate-900 border-b border-slate-200 pb-4">
          {legal.titulo}
        </h1>

        {/* Preâmbulo e Qualificação das Partes */}
        <div className="text-justify text-sm sm:text-base space-y-4 mb-6 leading-relaxed">
          <h2 className="font-bold font-sans text-xs tracking-wider uppercase text-slate-700">
            DAS PARTES CONTRATANTES
          </h2>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 font-sans text-xs sm:text-sm space-y-3">
            <div>
              <strong className="text-green-900 block text-xs uppercase mb-1">
                {vTermo}:
              </strong>
              <p className="text-slate-800 leading-relaxed">
                <strong>{vNome}</strong>, {tags.vendedor_nacionalidade || (tags as unknown as Record<string, string>).nacionalidade_vendedor || 'brasileiro(a)'}, {tags.vendedor_estado_civil || (tags as unknown as Record<string, string>).estado_civil_vendedor || 'casado(a)'}, portador(a) do RG nº {tags.vendedor_rg || (tags as unknown as Record<string, string>).rg_vendedor || ''} {tags.vendedor_rg_orgao || (tags as unknown as Record<string, string>).emissao_rg_vendedor || ''}, inscrito(a) no CPF/CNPJ sob o nº <strong>{vDoc}</strong>, {(tags as unknown as Record<string, string>).concordancia_vendedor || 'residente e domiciliado(a)'} na {tags.vendedor_endereco || (tags as unknown as Record<string, string>).endereco_vendedor || ''}, nº {tags.vendedor_numero || (tags as unknown as Record<string, string>).numero_vendedor || 'S/N'}, Bairro {tags.vendedor_bairro || (tags as unknown as Record<string, string>).bairro_vendedor || ''}, na cidade de {tags.vendedor_cidade || (tags as unknown as Record<string, string>).cidade_vendedor || ''}/{tags.vendedor_uf || (tags as unknown as Record<string, string>).estado_vendedor || ''}.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <strong className="text-emerald-900 block text-xs uppercase mb-1">
                {cTermo}:
              </strong>
              <p className="text-slate-800 leading-relaxed">
                <strong>{cNome}</strong>, {tags.comprador_nacionalidade || (tags as unknown as Record<string, string>).nacionalidade_comprador || 'brasileiro(a)'}, {tags.comprador_estado_civil || (tags as unknown as Record<string, string>).estado_civil_comprador || 'solteiro(a)'}, portador(a) do RG nº {tags.comprador_rg || (tags as unknown as Record<string, string>).rg_comprador || ''} {tags.comprador_rg_orgao || (tags as unknown as Record<string, string>).emissao_rg_comprador || ''}, inscrito(a) no CPF sob o nº <strong>{cDoc}</strong>, {(tags as unknown as Record<string, string>).concordancia_comprador || 'residente e domiciliado(a)'} na {tags.comprador_endereco || (tags as unknown as Record<string, string>).endereco_comprador || ''}, nº {tags.comprador_numero || (tags as unknown as Record<string, string>).numero_comprador || 'S/N'}, Bairro {tags.comprador_bairro || (tags as unknown as Record<string, string>).bairro_comprador || ''}, CEP {tags.comprador_cep || (tags as unknown as Record<string, string>).cep_comprador || ''}, na cidade de {tags.comprador_cidade || (tags as unknown as Record<string, string>).cidade_comprador || ''}/{tags.comprador_uf || (tags as unknown as Record<string, string>).estado_comprador || ''}.
              </p>
            </div>
          </div>

          <p className="pt-2 text-justify">
            Têm entre si, justo e acertado, o presente instrumento particular, que se regerá pelas seguintes cláusulas e condições:
          </p>
        </div>

        {/* Cláusulas Contratuais */}
        <div className="space-y-6 my-8 text-sm sm:text-base leading-relaxed text-justify">
          {legal.clausulas.map((c, index) => (
            <div key={index} className="space-y-1.5">
              <h3 className="font-bold uppercase text-xs sm:text-sm tracking-wide text-slate-900">
                {c.numero} – {c.titulo}
              </h3>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                {c.conteudo}
              </p>
            </div>
          ))}
        </div>

        {/* Data e Local */}
        <div className="text-right font-semibold text-sm sm:text-base text-slate-800 my-10">
          {legal.dataLocal}
        </div>

        {/* ========================================================================= */}
        {/* RENDERIZAÇÃO CONFORME MODALIDADE ESCOLHIDA                                */}
        {/* ========================================================================= */}
        {isDigital ? (
          /* MODALIDADE 1: ASSINATURA DIGITAL / ELETRÔNICA (COM NOVO CARIMBO EXECUTIVO) */
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#001f3f] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-700" />
                Certificação de Assinatura Eletrônica (MP nº 2.200-2/2001 e Lei 14.063/2020)
              </span>
              <span className="text-[11px] font-sans font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Chancela e Carimbo Criptográfico
              </span>
            </div>

            <div className="space-y-6">
              {/* Signatário 1: Contratado / Vendedor */}
              {(() => {
                const sig = contract.assinaturas?.find((a) => a.role === 'vendedor');
                return (
                  <DigitalSignatureStamp
                    signature={sig}
                    signerName={sig ? sig.nomeSignatario : vNome}
                    signerDoc={sig ? sig.documentoSignatario : vDoc}
                    roleLabel={vTermo.toUpperCase()}
                    contractNumber={contract.numeroContrato}
                    contractId={contract.id}
                    isPending={!sig}
                  />
                );
              })()}

              {/* Signatários Compradores */}
              {allCompradores.map((comp, idx) => {
                const sig = contract.assinaturas?.find((a) => 
                  (a.role === 'comprador' && idx === 0) ||
                  (a.role === 'comprador_adicional' && a.signerIndex === idx) ||
                  a.documentoSignatario === comp.cpfCnpj
                );
                const roleLabel = isExcl
                  ? 'CONTRATADO(A)'
                  : (allCompradores.length > 1 ? `${idx + 1}º PROMITENTE COMPRADOR(A)` : cTermo.toUpperCase());
                return (
                  <DigitalSignatureStamp
                    key={idx}
                    signature={sig}
                    signerName={sig ? sig.nomeSignatario : (comp.nome || `COMPRADOR ${idx + 1}`)}
                    signerDoc={sig ? sig.documentoSignatario : comp.cpfCnpj}
                    roleLabel={roleLabel}
                    contractNumber={contract.numeroContrato}
                    contractId={contract.id}
                    isPending={!sig}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* MODALIDADE 2: ASSINATURA MANUAL (COM 3 TESTEMUNHAS) */
          <div className="space-y-10 pt-10 border-t border-slate-300">
            {/* Linhas das Partes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs sm:text-sm">
              <div className="space-y-1">
                <div className="w-56 sm:w-64 border-t border-slate-800 mx-auto pt-2">
                  <strong className="block text-slate-900">{vNome}</strong>
                  <span className="text-[11px] font-sans text-slate-600 block">{vTermo}</span>
                  <span className="text-[11px] font-sans text-slate-500 block">CPF/CNPJ: {vDoc || '---'}</span>
                </div>
              </div>

              {allCompradores.map((comp, idx) => {
                const label = isExcl
                  ? 'CONTRATADO(A)'
                  : (allCompradores.length > 1 ? `${idx + 1}º PROMITENTE COMPRADOR(A)` : cTermo);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="w-56 sm:w-64 border-t border-slate-800 mx-auto pt-2">
                      <strong className="block text-slate-900">{comp.nome || `COMPRADOR ${idx + 1}`}</strong>
                      <span className="text-[11px] font-sans text-slate-600 block">{label}</span>
                      <span className="text-[11px] font-sans text-slate-500 block">CPF/CNPJ: {comp.cpfCnpj || '---'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas das 3 Testemunhas Obrigatórias */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <span className="font-sans font-bold text-xs uppercase tracking-wider text-slate-800 block">
                  TESTEMUNHAS:
                </span>
                <span className="text-[11px] font-sans font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  3 Testemunhas para Assinatura Manual
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
                {/* Testemunha 1 */}
                <div className="space-y-1">
                  <div className="border-t border-slate-700 pt-2">
                    <span className="font-bold block text-slate-900">1. (Assinatura)</span>
                    <div className="h-4 border-b border-slate-300 w-full mb-1"></div>
                    <span className="block text-slate-600">Nome: {contract.testemunha1?.nome || ''}</span>
                    <span className="block text-slate-600">CPF: {contract.testemunha1?.cpf || ''}</span>
                    <span className="block text-slate-600">RG: {contract.testemunha1?.rg || ''}</span>
                  </div>
                </div>

                {/* Testemunha 2 */}
                <div className="space-y-1">
                  <div className="border-t border-slate-700 pt-2">
                    <span className="font-bold block text-slate-900">2. (Assinatura)</span>
                    <div className="h-4 border-b border-slate-300 w-full mb-1"></div>
                    <span className="block text-slate-600">Nome: {contract.testemunha2?.nome || ''}</span>
                    <span className="block text-slate-600">CPF: {contract.testemunha2?.cpf || ''}</span>
                    <span className="block text-slate-600">RG: {contract.testemunha2?.rg || ''}</span>
                  </div>
                </div>

                {/* Testemunha 3 */}
                <div className="space-y-1 sm:col-span-2 sm:max-w-md">
                  <div className="border-t border-slate-700 pt-2">
                    <span className="font-bold block text-slate-900">3. (Assinatura)</span>
                    <div className="h-4 border-b border-slate-300 w-full mb-1"></div>
                    <span className="block text-slate-600">Nome: {contract.testemunha3?.nome || ''}</span>
                    <span className="block text-slate-600">CPF: {contract.testemunha3?.cpf || ''}</span>
                    <span className="block text-slate-600">RG: {contract.testemunha3?.rg || ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      {/* Modal de Assinatura Digital */}
      {isSignModalOpen && (
        <DigitalSignatureModal
          contract={contract}
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          onSign={(sig) => {
            handleAddSignature(sig);
          }}
        />
      )}
    </div>
  );
};

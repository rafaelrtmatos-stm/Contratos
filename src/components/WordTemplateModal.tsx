import React, { useState, useEffect, useRef } from 'react';
import { ContractType } from '../types/contract';
import {
  saveCustomWordTemplate,
  getCustomWordTemplateMeta,
  getCustomWordTemplate,
  removeCustomWordTemplate,
  downloadSampleDocxTemplate,
  CustomTemplateMeta,
} from '../utils/docxProcessor';
import JSZip from 'jszip';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  ShieldCheck,
  Building2,
  Users,
  Banknote,
  CalendarDays,
  Scale,
  CalendarClock,
  Sparkles,
} from 'lucide-react';

interface WordTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ContractType;
}

export const WordTemplateModal: React.FC<WordTemplateModalProps> = ({
  isOpen,
  onClose,
  initialType = 'venda_vista',
}) => {
  const [activeType, setActiveType] = useState<ContractType>(initialType);
  const [metas, setMetas] = useState<Record<ContractType, CustomTemplateMeta | null>>({
    venda_vista: null,
    venda_parcelada: null,
    exclusividade: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadMetas();
    }
  }, [isOpen, activeType]);

  const loadMetas = () => {
    setMetas({
      venda_vista: getCustomWordTemplateMeta('venda_vista'),
      venda_parcelada: getCustomWordTemplateMeta('venda_parcelada'),
      exclusividade: getCustomWordTemplateMeta('exclusividade'),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setUploadError('Por favor, selecione um arquivo válido do Microsoft Word (.docx).');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Validar se é um arquivo docx legível
      const zip = await JSZip.loadAsync(arrayBuffer);
      if (!zip.file('word/document.xml')) {
        throw new Error('O arquivo não possui a estrutura padrão de um documento Word (.docx).');
      }

      saveCustomWordTemplate(activeType, arrayBuffer, file.name);
      loadMetas();
      setUploadSuccess(
        `Modelo institucional "${file.name}" importado e ativado com sucesso para novos contratos.`
      );
    } catch (err: any) {
      setUploadError(err.message || 'Falha ao processar o arquivo Word. Verifique se o arquivo não está protegido ou corrompido.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveTemplate = () => {
    if (confirm('Deseja restaurar o modelo Word padrão do sistema para esta modalidade de contrato?')) {
      removeCustomWordTemplate(activeType);
      loadMetas();
      setUploadSuccess('Modelo padrão do sistema restaurado com sucesso.');
    }
  };

  const handleDownloadActiveTemplate = () => {
    downloadSampleDocxTemplate(activeType);
  };

  if (!isOpen) return null;

  const currentMeta = metas[activeType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header Profissional */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Modelos Contratuais em Word (.docx)</h3>
              <p className="text-xs text-slate-300">
                Gerencie arquivos matriz em Microsoft Word com total preservação do design, cabeçalhos e formatações.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Modalidade de Contrato */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Selecione o tipo de contrato:
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              3 Modelos Disponíveis
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {/* Modelo 1: Venda à Vista */}
            <button
              type="button"
              onClick={() => setActiveType('venda_vista')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[58px] sm:min-h-[70px] cursor-pointer ${
                activeType === 'venda_vista'
                  ? 'bg-green-50/90 border-green-500 ring-2 ring-green-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Banknote
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      activeType === 'venda_vista' ? 'text-green-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-bold truncate block ${
                      activeType === 'venda_vista' ? 'text-green-900' : 'text-slate-700'
                    }`}
                  >
                    1. Venda à Vista
                  </span>
                </div>
                {metas.venda_vista ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" title="Modelo Personalizado Ativo" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" title="Modelo Padrão" />
                )}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] text-slate-500 hidden sm:inline">
                  Quitação integral
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    metas.venda_vista
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {metas.venda_vista ? 'Personalizado' : 'Padrão'}
                </span>
              </div>
            </button>

            {/* Modelo 2: Venda Parcelada */}
            <button
              type="button"
              onClick={() => setActiveType('venda_parcelada')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[58px] sm:min-h-[70px] cursor-pointer ${
                activeType === 'venda_parcelada'
                  ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CalendarClock
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      activeType === 'venda_parcelada' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-bold truncate block ${
                      activeType === 'venda_parcelada' ? 'text-emerald-900' : 'text-slate-700'
                    }`}
                  >
                    2. Venda Parcelada
                  </span>
                </div>
                {metas.venda_parcelada ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" title="Modelo Personalizado Ativo" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" title="Modelo Padrão" />
                )}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] text-slate-500 hidden sm:inline">
                  Entrada e parcelas
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    metas.venda_parcelada
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {metas.venda_parcelada ? 'Personalizado' : 'Padrão'}
                </span>
              </div>
            </button>

            {/* Modelo 3: Exclusividade */}
            <button
              type="button"
              onClick={() => setActiveType('exclusividade')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[58px] sm:min-h-[70px] cursor-pointer ${
                activeType === 'exclusividade'
                  ? 'bg-slate-50/90 border-slate-500 ring-2 ring-slate-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      activeType === 'exclusividade' ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-bold truncate block ${
                      activeType === 'exclusividade' ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    3. Exclusividade
                  </span>
                </div>
                {metas.exclusividade ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" title="Modelo Personalizado Ativo" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" title="Modelo Padrão" />
                )}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] text-slate-500 hidden sm:inline">
                  Corretagem e prazo
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    metas.exclusividade
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {metas.exclusividade ? 'Personalizado' : 'Padrão'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Box do Documento Ativo */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
                  currentMeta ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {currentMeta ? <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" /> : <FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Status do Modelo:
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentMeta ? 'bg-emerald-100 text-emerald-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {currentMeta ? 'Modelo Personalizado Ativo' : 'Modelo Padrão do Sistema'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                  {currentMeta ? currentMeta.fileName : `Modelo_Padrao_${activeType}.docx`}
                </h4>
                {currentMeta && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Atualizado em {new Date(currentMeta.uploadedAt).toLocaleDateString('pt-BR')} •{' '}
                    {(currentMeta.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
              <button
                onClick={handleDownloadActiveTemplate}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Baixar arquivo Word para consulta ou edição no Microsoft Word"
              >
                <Download className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Baixar (.docx)</span>
              </button>
              {currentMeta && (
                <button
                  onClick={handleRemoveTemplate}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  title="Restaurar modelo padrão do sistema"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Restaurar</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Área de Upload */}
          <div className="border-2 border-dashed border-slate-300 hover:border-green-500 bg-white hover:bg-green-50/40 rounded-2xl p-6 text-center transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="hidden"
              id="docx-upload-input"
              disabled={isUploading}
            />
            <label
              htmlFor="docx-upload-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3.5 bg-green-100 text-green-700 rounded-full">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isUploading
                    ? 'Processando arquivo Word...'
                    : 'Importar Modelo Institucional (.docx)'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Envie o arquivo Word oficial do seu escritório ou imobiliária. O sistema utilizará a sua estrutura gráfica e tipográfica original.
                </p>
              </div>
              <span className="inline-flex items-center px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-xs">
                Selecionar Arquivo Word (.docx)
              </span>
            </label>
          </div>

          {/* Seção Informativa de Integração Jurídica */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Campos Automatizados pelo Sistema
              </h4>
              <p className="text-xs text-slate-500">
                Ao gerar contratos, todas as informações preenchidas são incorporadas diretamente ao documento Word selecionado:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Partes */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Users className="w-4 h-4 text-green-600" />
                  <span>Qualificação das Partes</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Nome completo ou razão social, CPF/CNPJ, RG e órgão emissor, nacionalidade, estado civil, profissão, endereço residencial e contatos.
                </p>
              </div>

              {/* Imóvel */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Identificação e Objeto Imobiliário</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Empreendimento ou loteamento, lote, quadra, metragens de confrontação (frente, laterais, fundos), área total em m² e localização.
                </p>
              </div>

              {/* Financeiro */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Banknote className="w-4 h-4 text-slate-600" />
                  <span>Condições Financeiras e Pagamento</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Valor total em moeda e por extenso, condições de quitação à vista, entrada/sinal, quantidade de parcelas, datas de vencimento ou comissão.
                </p>
              </div>

              {/* Jurídico / Foro */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>Disposições Legais e Foro</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Comarca e foro eleito, local da assinatura, datação por extenso (dia, mês e ano) e cláusulas de segurança jurídica.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Compatibilidade com Microsoft Word (.docx) e OpenXML.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

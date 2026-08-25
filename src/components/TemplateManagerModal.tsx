/**
 * Modal de Gestão de Templates
 * 
 * Funcionalidades:
 * 1. Mostrar 9 templates padrão do Supabase (3 por tipo)
 * 2. Permitir escolher qual é o padrão por tipo
 * 3. Permitir fazer download de template
 * 4. Permitir substituir template com upload customizado
 * 5. Salvar preferências no localStorage
 */

import React, { useState, useEffect, useRef } from 'react';
import { ContractType } from '../types/contract';
import {
  X,
  Download,
  Upload,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import { downloadTemplateWithCache, uploadTemplate, deleteTemplate, listTemplates } from '../utils/supabaseTemplateStorage';
import { TEMPLATE_MAP } from '../utils/templateResolver';
import { extractTagsFromText, isKnownTag, describeTag } from '../utils/knownContractTags';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'venda_vista' | 'venda_parcelada' | 'exclusividade' | 'outros_bens';

const TEMPLATE_GROUPS: Record<ContractType | 'outros_bens', Array<{
  modalidade: string;
  arquivo: string;
  descricao: string;
  testemunhas: boolean;
}>> = {
  venda_vista: [
    {
      modalidade: 'Digital',
      arquivo: 'venda_vista_assinatura_digital.docx',
      descricao: 'Ambos assinam digitalmente - SEM testemunhas',
      testemunhas: false,
    },
    {
      modalidade: 'Manual',
      arquivo: 'venda_vista_assinatura_manual_2_testemunhas.docx',
      descricao: 'Ambos assinam manualmente - COM 2 testemunhas',
      testemunhas: true,
    },
    {
      modalidade: 'Mista',
      arquivo: 'venda_vista_mista_2_testemunhas.docx',
      descricao: 'Um digital, outro manual - COM 2 testemunhas',
      testemunhas: true,
    },
  ],
  venda_parcelada: [
    {
      modalidade: 'Digital',
      arquivo: 'parcelado_assinatura_digital_sem_testemunhas.docx',
      descricao: 'Ambos assinam digitalmente - SEM testemunhas',
      testemunhas: false,
    },
    {
      modalidade: 'Manual',
      arquivo: 'parcelado_ambos_manuais_2_testemunhas.docx',
      descricao: 'Ambos assinam manualmente - COM 2 testemunhas',
      testemunhas: true,
    },
    {
      modalidade: 'Mista',
      arquivo: 'parcelado_usuario_digital_comprador_manual_2_testemunhas.docx',
      descricao: 'Um digital, outro manual - COM 2 testemunhas',
      testemunhas: true,
    },
  ],
  exclusividade: [
    {
      modalidade: 'Digital',
      arquivo: 'exclusividade_digital_sem_testemunhas.docx',
      descricao: 'Ambos assinam digitalmente - SEM testemunhas',
      testemunhas: false,
    },
    {
      modalidade: 'Mista',
      arquivo: 'exclusividade_usuario_digital_contratante_manual_2_testemunhas.docx',
      descricao: 'Um digital, outro manual - COM 2 testemunhas',
      testemunhas: true,
    },
    {
      modalidade: 'Sem Cônjuge',
      arquivo: 'exclusividade_sem_conjuge_mista_2_testemunhas.docx',
      descricao: 'Variante SEM cônjuge - COM 2 testemunhas',
      testemunhas: true,
    },
  ],
  outros_bens: [
    // 🔄 PREPARADO PARA ADICIONAR 3 TEMPLATES FUTUROS
    // - outros_bens_assinatura_digital.docx
    // - outros_bens_assinatura_manual_2_testemunhas.docx
    // - outros_bens_mista_2_testemunhas.docx
  ],
};

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('venda_vista');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prévia do arquivo matriz (o .docx real, com design/cabeçalhos/tags
  // visíveis como estão no template - sem preencher com nenhum contrato).
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Assistente de importação: arquivo escolhido, tags encontradas nele, e
  // em qual "slot" (modalidade) do tipo ativo ele vai substituir
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [pendingSlotIdx, setPendingSlotIdx] = useState<number>(0);
  const [scanningTags, setScanningTags] = useState(false);

  // Quais arquivos REALMENTE existem no bucket agora (o card de cada
  // modalidade é uma "vaga" fixa - existe sempre, tenha ou não um
  // arquivo enviado nela; sem isso, apagar um arquivo não tirava o card
  // da lista, porque a lista nunca conferia se o arquivo ainda existia).
  const [existingFiles, setExistingFiles] = useState<Set<string> | null>(null);

  const refreshExistingFiles = async () => {
    const { sucesso, templates } = await listTemplates();
    if (sucesso && templates) setExistingFiles(new Set(templates));
  };

  useEffect(() => {
    if (isOpen) refreshExistingFiles();
  }, [isOpen]);

  // Fazer download de template
  // Prévia do arquivo matriz: converte o .docx real (design, cabeçalhos,
  // tabelas) pra HTML com mammoth - mostra exatamente como o modelo está
  // formatado, com as tags {tag} ainda visíveis como estão no arquivo
  // (isso aqui é o modelo em si, não um contrato preenchido).
  const handlePreviewTemplate = async (templateFile: string) => {
    setPreviewFile(templateFile);
    setPreviewHtml(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const { sucesso, blob, erro } = await downloadTemplateWithCache(templateFile);
      if (!sucesso || !blob) throw new Error(erro || 'Falha ao carregar o modelo.');

      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setPreviewHtml(result.value);
    } catch (error: any) {
      setPreviewError(error.message || 'Falha ao gerar a prévia do modelo.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadTemplate = async (templateFile: string) => {
    setDownloadingFile(templateFile);
    try {
      const { sucesso, blob } = await downloadTemplateWithCache(templateFile);
      if (!sucesso || !blob) {
        throw new Error('Falha ao baixar template');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = templateFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Template ${templateFile} baixado` });
      setTimeout(() => setMessage(null), 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao baixar: ${error.message}` });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setDownloadingFile(null);
    }
  };

  // Excluir template do bucket (afeta TODOS os contratos que usam esse
  // arquivo - por isso exige confirmação explícita antes)
  const handleDeleteTemplate = async (templateFile: string) => {
    setDeletingFile(templateFile);
    try {
      const { sucesso, erro } = await deleteTemplate(templateFile);
      if (!sucesso) throw new Error(erro || 'Falha ao excluir template');
      await refreshExistingFiles();
      setMessage({ type: 'success', text: `Template ${templateFile} excluído do bucket.` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao excluir: ${error.message}` });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setDeletingFile(null);
      setConfirmDeleteFile(null);
    }
  };

  // Passo 1: usuário escolhe o arquivo .docx - lemos e escaneamos as tags
  // dele ANTES de subir, pra ele poder conferir se o sistema reconhece
  // cada tag (evita repetir o problema de contrato saindo com {tag} cru)
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo .docx' });
      return;
    }

    setScanningTags(true);
    setMessage(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const xml = await zip.file('word/document.xml')?.async('string');
      const plainText = (xml || '').replace(/<[^>]+>/g, '');
      const tags = extractTagsFromText(plainText);

      setPendingFile(file);
      setPendingTags(tags);
      setPendingSlotIdx(0);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Não foi possível ler o arquivo: ${error.message}` });
    } finally {
      setScanningTags(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Passo 2: depois de conferir as tags, o corretor confirma em qual
  // modalidade (Digital/Manual/Mista) o modelo entra - o upload SEMPRE
  // usa o nome de arquivo canônico do slot (não o nome original enviado),
  // porque é esse nome fixo que o sistema de geração de contrato lê
  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    const slot = TEMPLATE_GROUPS[activeTab][pendingSlotIdx];
    if (!slot) return;

    setLoading(true);
    try {
      const arrayBuffer = await pendingFile.arrayBuffer();
      const { sucesso, erro } = await uploadTemplate(slot.arquivo, arrayBuffer);
      if (!sucesso) throw new Error(erro || 'Falha ao enviar modelo');
      await refreshExistingFiles();

      setMessage({
        type: 'success',
        text: `Modelo salvo como "${slot.modalidade}" de ${getTypeLabel(activeTab)}.`,
      });
      setTimeout(() => setMessage(null), 4000);
      setPendingFile(null);
      setPendingTags([]);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao enviar: ${error.message}` });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: Tab) => {
    switch (type) {
      case 'venda_vista':
        return '';
      case 'venda_parcelada':
        return '';
      case 'exclusividade':
        return '';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: Tab) => {
    switch (type) {
      case 'venda_vista':
        return 'Venda à Vista';
      case 'venda_parcelada':
        return 'Venda Parcelada';
      case 'exclusividade':
        return 'Exclusividade';
      case 'outros_bens':
        return 'Outros Bens';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-400" />
              Modelos Contratuais em Word (.docx)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Gerencie arquivos matriz em Microsoft Word com total preservação do design, cabeçalhos e formatações.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[88px] bg-white border-b border-slate-200 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {(['venda_vista', 'venda_parcelada', 'exclusividade', 'outros_bens'] as Tab[]).map((type) => {
              const templates = TEMPLATE_GROUPS[type];
              return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === type
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } ${templates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={templates.length === 0}
              >
                {getIconForType(type)} {getTypeLabel(type)}
                {templates.length === 0 && <span className="text-xs ml-1">(Em breve)</span>}
              </button>
            );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Escolha qual tipo de contrato deseja gerenciar →
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-lg flex gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-amber-50 border border-amber-200 text-amber-950'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              {message.text}
            </div>
          )}

          {/* Templates List */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              {TEMPLATE_GROUPS[activeTab].length} Modelos Disponíveis
            </h3>

            {TEMPLATE_GROUPS[activeTab].map((template, idx) => {
              // null = ainda carregando a lista real do bucket (não afirma nada
              // ainda); depois disso, existe de fato ou não.
              const fileExists = existingFiles === null ? true : existingFiles.has(template.arquivo);

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    fileExists ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-dashed border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-900">{template.modalidade}</span>
                        {!fileExists && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                            SEM ARQUIVO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{template.descricao}</p>
                      <p className="text-xs font-mono text-slate-500 break-all">
                        arquivo: {template.arquivo}
                      </p>
                      {!fileExists && (
                        <p className="text-xs text-slate-500 mt-1">
                          Nenhum arquivo enviado nesta modalidade ainda - envie um pelo assistente de importação
                          abaixo.
                        </p>
                      )}
                      {template.testemunhas && (
                        <p className="text-xs text-amber-800 font-medium mt-1">Inclui 2 espaços para testemunhas</p>
                      )}
                    </div>

                    {/* Botões de Ação - só fazem sentido se o arquivo existe de verdade */}
                    {fileExists && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handlePreviewTemplate(template.arquivo)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Ver prévia do modelo (design, cabeçalhos e formatação reais)"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Prévia
                        </button>

                        <button
                          onClick={() => handleDownloadTemplate(template.arquivo)}
                          disabled={downloadingFile === template.arquivo}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                          title="Baixar este template"
                        >
                          {downloadingFile === template.arquivo ? (
                            <Loader2 className="w-3.5 h-3.5 inline animate-spin" />
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 inline mr-1" />
                              Baixar
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setConfirmDeleteFile(template.arquivo)}
                          disabled={deletingFile === template.arquivo}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                          title="Excluir este template do bucket"
                        >
                          {deletingFile === template.arquivo ? (
                            <Loader2 className="w-3.5 h-3.5 inline animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {confirmDeleteFile === template.arquivo && (
                    <div className="mt-3 pt-3 border-t border-red-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                      <p className="text-xs font-bold text-red-800 mb-2">
                        Excluir "{template.arquivo}" do bucket? Isso afeta TODOS os contratos que usam essa
                        modalidade — eles vão parar de conseguir gerar Word/PDF até um novo arquivo ser enviado
                        nesse mesmo slot.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDeleteFile(null)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.arquivo)}
                          className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Sim, excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Assistente de Importação: Passo 1 selecionar arquivo, Passo 2 conferir tags */}
          {!pendingFile ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 mb-1">Importar Modelo Institucional (.docx)</h4>
              <p className="text-xs text-slate-600 mb-4">
                Envie o arquivo Word oficial do seu escritório ou imobiliária. Antes de salvar, o sistema mostra
                quais tags do arquivo ele reconhece, pra você conferir.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                disabled={scanningTags}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanningTags}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center gap-2 justify-center mx-auto cursor-pointer shadow-xs"
              >
                {scanningTags ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lendo arquivo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-950" />
                    Selecionar Arquivo Word (.docx)
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="border-2 border-amber-300 rounded-xl p-5 space-y-4">
              <div>
                <h4 className="font-bold text-slate-900">Conferir modelo antes de salvar</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Arquivo: <span className="font-mono">{pendingFile.name}</span>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Em qual modalidade este modelo entra?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TEMPLATE_GROUPS[activeTab].map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPendingSlotIdx(idx)}
                      className={`p-2.5 rounded-lg border-2 text-left text-xs transition-colors cursor-pointer ${
                        pendingSlotIdx === idx
                          ? 'border-amber-400 bg-amber-50 text-amber-950'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold">{slot.modalidade}</div>
                      <div className="text-[10px] mt-0.5">
                        {slot.testemunhas ? 'Com testemunhas' : 'Sem testemunhas'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tags encontradas no arquivo ({pendingTags.length})
                </label>
                {pendingTags.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Nenhuma tag do tipo {'{tag}'} ou {'{{TAG}}'} foi encontrada neste arquivo.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                    {pendingTags.map((tag) => {
                      const status = isKnownTag(tag);
                      return (
                        <div
                          key={tag}
                          className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                            status === 'unknown' ? 'bg-red-50' : 'bg-slate-50'
                          }`}
                        >
                          {status === 'unknown' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-slate-800">{'{' + tag + '}'}</span>
                            <span className="text-slate-500"> — {describeTag(tag)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Em vermelho: tags que o sistema não reconhece — no contrato gerado, elas saem em branco.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPendingFile(null);
                    setPendingTags([]);
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center gap-2 justify-center cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar e Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
            <p>
              Informação: <strong>Compatibilidade com Microsoft Word (.docx) e OpenXML.</strong> Todos os templates padrão
              incluem campos para assinatura automática com carimbo digital.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Modal de Prévia do arquivo matriz */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">Prévia do modelo</h3>
                <p className="text-xs font-mono text-slate-500 truncate">{previewFile}</p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-5 py-2 bg-amber-50/60 border-b border-amber-100 shrink-0">
              <p className="text-[11px] text-amber-950">
                Isto é o arquivo matriz em si - as tags {'{tag}'} aparecem como estão no modelo, sem preencher com
                nenhum contrato específico.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50">
              {previewLoading && (
                <div className="flex items-center justify-center gap-2 text-slate-500 py-10">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando prévia...
                </div>
              )}
              {previewError && !previewLoading && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {previewError}
                </div>
              )}
              {!previewLoading && !previewError && previewHtml && (
                <div
                  className="bg-white rounded-lg shadow-sm p-8 mx-auto max-w-2xl prose prose-sm text-slate-800 leading-relaxed [&_p]:mb-2 [&_p]:text-justify [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

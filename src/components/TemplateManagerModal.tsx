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
  Star,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react';
import { downloadTemplateWithCache, uploadTemplate } from '../utils/supabaseTemplateStorage';
import { TEMPLATE_MAP } from '../utils/templateResolver';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplatePreferences {
  venda_vista: string;
  venda_parcelada: string;
  exclusividade: string;
  outros_bens: string;
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
      arquivo: 'venda_parcelada_assinatura_digital.docx',
      descricao: 'Ambos assinam digitalmente - SEM testemunhas',
      testemunhas: false,
    },
    {
      modalidade: 'Manual',
      arquivo: 'venda_parcelada_assinatura_manual_2_testemunhas.docx',
      descricao: 'Ambos assinam manualmente - COM 2 testemunhas',
      testemunhas: true,
    },
    {
      modalidade: 'Mista',
      arquivo: 'venda_parcelada_mista_2_testemunhas.docx',
      descricao: 'Um digital, outro manual - COM 2 testemunhas',
      testemunhas: true,
    },
  ],
  exclusividade: [
    {
      modalidade: 'Digital',
      arquivo: 'exclusividade_assinatura_digital.docx',
      descricao: 'Ambos assinam digitalmente - SEM testemunhas',
      testemunhas: false,
    },
    {
      modalidade: 'Mista',
      arquivo: 'exclusividade_mista_2_testemunhas.docx',
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
  const [preferences, setPreferences] = useState<TemplatePreferences>({
    venda_vista: 'venda_vista_assinatura_digital.docx',
    venda_parcelada: 'venda_parcelada_assinatura_digital.docx',
    exclusividade: 'exclusividade_assinatura_digital.docx',
    outros_bens: '', // Vazio até serem adicionados templates
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar preferências do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('templatePreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.warn('Erro ao carregar preferências:', e);
      }
    }
  }, []);

  // Salvar preferência de template padrão
  const handleSetAsDefault = (templateFile: string, type: ContractType) => {
    const newPrefs = { ...preferences, [type]: templateFile };
    setPreferences(newPrefs);
    localStorage.setItem('templatePreferences', JSON.stringify(newPrefs));
    setMessage({ type: 'success', text: `Template padrão atualizado para ${type}` });
    setTimeout(() => setMessage(null), 3000);
  };

  // Fazer download de template
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

  // Upload de template customizado
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo .docx' });
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const nome = file.name;

      await uploadTemplate(nome, arrayBuffer);

      // Atualizar preferência para o novo template
      const newPrefs = { ...preferences, [activeTab]: nome };
      setPreferences(newPrefs);
      localStorage.setItem('templatePreferences', JSON.stringify(newPrefs));

      setMessage({ type: 'success', text: `Template ${nome} enviado e definido como padrão` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao enviar: ${error.message}` });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <div className="sticky top-0 bg-gradient-to-r from-green-50 to-blue-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-green-600" />
              Modelos Contratuais em Word (.docx)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Gerencie arquivos matriz em Microsoft Word com total preservação do design, cabeçalhos e formatações.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[88px] bg-white border-b border-slate-200 p-4">
          <div className="flex gap-2">
            {(['venda_vista', 'venda_parcelada', 'exclusividade', 'outros_bens'] as Tab[]).map((type) => {
              const templates = TEMPLATE_GROUPS[type];
              return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === type
                    ? 'bg-green-600 text-white shadow-lg'
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
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
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
              const isDefault = preferences[activeTab] === template.arquivo;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isDefault
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{template.modalidade}</span>
                        {isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded-full">
                            <Star className="w-3 h-3" /> PADRÃO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{template.descricao}</p>
                      <p className="text-xs font-mono text-slate-500 break-all">
                        arquivo: {template.arquivo}
                      </p>
                      {template.testemunhas && (
                        <p className="text-xs text-blue-600 mt-1">Inclui 2 espaços para testemunhas</p>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleSetAsDefault(template.arquivo, activeTab)}
                        disabled={isDefault}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isDefault
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="Usar este como padrão"
                      >
                        <Star className="w-3.5 h-3.5 inline mr-1" />
                        {isDefault ? 'Padrão' : 'Usar'}
                      </button>

                      <button
                        onClick={() => handleDownloadTemplate(template.arquivo)}
                        disabled={downloadingFile === template.arquivo}
                        className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload Custom Template */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-900 mb-1">Importar Modelo Institucional (.docx)</h4>
            <p className="text-xs text-slate-600 mb-4">
              Envie o arquivo Word oficial do seu escritório ou imobiliária. O sistema utilizará a sua estrutura
              gráfica e tipográfica original.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleFileSelect}
              disabled={loading}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-2 justify-center mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Selecionar Arquivo Word (.docx)
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
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
    </div>
  );
};

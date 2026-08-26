import React, { useState, useEffect, useRef } from 'react';
import { ContractType } from '../types/contract';
import {
  saveCustomWordTemplate,
  getCustomWordTemplateMeta,
  removeCustomWordTemplate,
  downloadSampleDocxTemplate,
  CustomTemplateMeta,
  CustomTemplateKey,
  resolveTemplateKey,
} from '../utils/docxProcessor';
import {
  downloadTemplateWithCache,
  uploadTemplate,
  deleteTemplate,
  listTemplates,
  clearTemplateCache,
} from '../utils/supabaseTemplateStorage';
import {
  downloadOfficialTemplateAsPdf,
  downloadCustomTemplateAsPdf,
} from '../utils/templatePdfExporter';
import { extractTagsFromText, isKnownTag, describeTag } from '../utils/knownContractTags';
import { extractEditableParagraphs, applyParagraphEdits, EditableParagraph } from '../utils/templateTextEditor';
import { supabase } from '../utils/supabaseClient';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
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
  CalendarClock,
  Sparkles,
  Lock,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Info,
  ChevronRight,
  FileCode,
  Cloud,
  CheckCircle,
  FolderSync,
  HardDrive,
  SlidersHorizontal,
  Package,
  Pencil,
  FileType,
} from 'lucide-react';

export type TemplateCategory = ContractType | 'outros_bens';

// Mapeia o tipo de contrato para a chave de template personalizada
function toTemplateKey(tipo: TemplateCategory): CustomTemplateKey {
  if (tipo === 'venda_vista') return 'venda_vista_imovel';
  if (tipo === 'venda_parcelada') return 'venda_parcelada_imovel';
  if (tipo === 'outros_bens') return 'venda_vista_outros';
  return 'exclusividade';
}

interface WordTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TemplateCategory;
}

type SubTab = 'matrizes' | 'upload' | 'tags' | 'previa';

interface SlotDefinition {
  modalidade: 'digital' | 'manual' | 'mista' | 'variante';
  titulo: string;
  arquivo: string;
  testemunhas: boolean;
  descricao: string;
  badge: string;
}

export const WordTemplateModal: React.FC<WordTemplateModalProps> = ({
  isOpen,
  onClose,
  initialType = 'venda_vista',
}) => {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>(initialType);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('matrizes');

  // Metadados de modelos customizados do usuário por tipo
  const [metas, setMetas] = useState<Record<TemplateCategory, CustomTemplateMeta | null>>({
    venda_vista: null,
    venda_parcelada: null,
    exclusividade: null,
    outros_bens: null,
  });

  // Lista de arquivos presentes no bucket do Supabase
  const [supabaseFiles, setSupabaseFiles] = useState<Set<string>>(new Set());
  const [loadingStorage, setLoadingStorage] = useState(false);

  // Estados de feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadingPdfFile, setDownloadingPdfFile] = useState<string | null>(null);
  const [isDownloadingCustomPdf, setIsDownloadingCustomPdf] = useState(false);

  // Assistente de upload e scanner de tags
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [scannedTags, setScannedTags] = useState<{ valid: string[]; unknown: string[] }>({ valid: [], unknown: [] });
  const [isScanning, setIsScanning] = useState(false);
  const [targetSlotFile, setTargetSlotFile] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'storage' | 'custom'>('storage');

  // Prévia HTML com Mammoth
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Editor de texto do modelo (edição segura, só o texto dos parágrafos -
  // ver templateTextEditor.ts pro porquê do escopo limitado)
  const [editorFileName, setEditorFileName] = useState<string | null>(null);
  const [editorParagraphs, setEditorParagraphs] = useState<EditableParagraph[]>([]);
  const [editorDrafts, setEditorDrafts] = useState<Record<number, string>>({});
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSuccess, setEditorSuccess] = useState<string | null>(null);
  // Guarda o XML original (word/document.xml) pra aplicar as edições em
  // cima dele na hora de salvar, sem precisar baixar o arquivo de novo.
  const editorOriginalXmlRef = useRef<string | null>(null);

  // Editor completo (Zoho Writer, via iframe) - fonte, negrito, parágrafos,
  // tudo. Ver supabase/functions/zoho-open-document.
  const [zohoEditorUrl, setZohoEditorUrl] = useState<string | null>(null);
  const [zohoEditorFileName, setZohoEditorFileName] = useState<string | null>(null);
  const [zohoEditorLoading, setZohoEditorLoading] = useState(false);
  const [zohoEditorError, setZohoEditorError] = useState<string | null>(null);

  const handleOpenZohoEditor = async (arquivoNome: string) => {
    setZohoEditorFileName(arquivoNome);
    setZohoEditorUrl(null);
    setZohoEditorLoading(true);
    setZohoEditorError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('zoho-open-document', {
        body: { arquivo: arquivoNome },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Falha ao abrir o editor.');
      }

      setZohoEditorUrl(data.document_url);
    } catch (err: any) {
      setZohoEditorError(err.message || 'Falha ao abrir o editor completo.');
    } finally {
      setZohoEditorLoading(false);
    }
  };

  const handleCloseZohoEditor = async () => {
    setZohoEditorFileName(null);
    setZohoEditorUrl(null);
    setZohoEditorError(null);
    // O salvar acontece dentro do editor da Zoho (botão Salvar dela), que
    // chama nosso callback e grava no bucket - ao fechar, só recarregamos
    // a lista pra refletir qualquer alteração já salva.
    clearTemplateCache();
    await loadAllData();
  };

  const handleOpenEditor = async (arquivoNome: string) => {
    setEditorFileName(arquivoNome);
    setEditorLoading(true);
    setEditorError(null);
    setEditorSuccess(null);
    setEditorParagraphs([]);
    setEditorDrafts({});
    editorOriginalXmlRef.current = null;

    try {
      const { sucesso, blob, erro } = await downloadTemplateWithCache(arquivoNome);
      if (!sucesso || !blob) throw new Error(erro || 'Não foi possível carregar o arquivo.');

      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file('word/document.xml')?.async('string');
      if (!documentXml) throw new Error('Não achei o conteúdo do documento dentro do arquivo .docx.');

      editorOriginalXmlRef.current = documentXml;
      setEditorParagraphs(extractEditableParagraphs(documentXml));
    } catch (err: any) {
      setEditorError(err.message || 'Falha ao abrir o modelo para edição.');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSaveEditor = async () => {
    if (!editorFileName || !editorOriginalXmlRef.current) return;

    const edits = new Map<number, string>();
    for (const p of editorParagraphs) {
      const draft = editorDrafts[p.id];
      if (draft !== undefined && draft !== p.text) edits.set(p.id, draft);
    }

    if (edits.size === 0) {
      setEditorSuccess('Nada para salvar - nenhum parágrafo foi alterado.');
      return;
    }

    setEditorSaving(true);
    setEditorError(null);
    setEditorSuccess(null);

    try {
      // Reconstrói o .docx: lê o zip de novo (o que já está em cache),
      // troca só o word/document.xml pelo texto editado, e reenvia pro
      // MESMO nome de arquivo no bucket.
      const { sucesso, blob, erro } = await downloadTemplateWithCache(editorFileName);
      if (!sucesso || !blob) throw new Error(erro || 'Falha ao reler o arquivo original.');

      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const novoXml = applyParagraphEdits(editorOriginalXmlRef.current, edits);
      zip.file('word/document.xml', novoXml);

      const novoBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const novoBlob = new Blob([novoBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const { sucesso: sucessoUpload, erro: erroUpload } = await uploadTemplate(editorFileName, novoBlob);
      if (!sucessoUpload) throw new Error(erroUpload || 'Falha ao salvar o modelo editado.');

      clearTemplateCache();
      await loadAllData();

      setEditorSuccess('Modelo salvo! As próximas gerações de contrato já usam o texto novo.');
      // Atualiza a base de comparação pra continuar editando sem reabrir
      editorOriginalXmlRef.current = novoXml;
      setEditorParagraphs((prev) => prev.map((p) => (edits.has(p.id) ? { ...p, text: edits.get(p.id)! } : p)));
      setEditorDrafts({});
    } catch (err: any) {
      setEditorError(err.message || 'Falha ao salvar as edições.');
    } finally {
      setEditorSaving(false);
    }
  };

  // Dicionário de tags
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<'todas' | 'partes' | 'imovel' | 'financeiro' | 'assinaturas'>('todas');
  const [tagSearch, setTagSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directSlotInputRef = useRef<HTMLInputElement>(null);
  const [directUploadSlot, setDirectUploadSlot] = useState<string | null>(null);

  // Mapeamento dos 9 slots oficiais + outros bens
  const TEMPLATE_SLOTS: Record<TemplateCategory, SlotDefinition[]> = {
    venda_vista: [
      {
        modalidade: 'digital',
        titulo: 'Assinatura Digital',
        arquivo: 'venda_vista_assinatura_digital.docx',
        testemunhas: false,
        descricao: 'Ambas as partes assinam digitalmente com código criptográfico e QR Code.',
        badge: 'Sem Testemunhas',
      },
      {
        modalidade: 'manual',
        titulo: 'Assinatura Manual / Física',
        arquivo: 'venda_vista_assinatura_manual_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Ambas as partes assinam com caneta, com linhas para 2 testemunhas.',
        badge: '2 Testemunhas',
      },
      {
        modalidade: 'mista',
        titulo: 'Assinatura Mista',
        arquivo: 'venda_vista_mista_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Corretor/Vendedor assina digitalmente e Comprador assina presencialmente.',
        badge: '2 Testemunhas',
      },
    ],
    venda_parcelada: [
      {
        modalidade: 'digital',
        titulo: 'Assinatura Digital',
        arquivo: 'parcelado_assinatura_digital_sem_testemunhas.docx',
        testemunhas: false,
        descricao: 'Ambas as partes assinam digitalmente. Entrada e parcelas discriminadas.',
        badge: 'Sem Testemunhas',
      },
      {
        modalidade: 'manual',
        titulo: 'Assinatura Manual / Física',
        arquivo: 'parcelado_ambos_manuais_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Assinatura física de ambas as partes com bloco para 2 testemunhas.',
        badge: '2 Testemunhas',
      },
      {
        modalidade: 'mista',
        titulo: 'Assinatura Mista',
        arquivo: 'parcelado_usuario_digital_comprador_manual_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Corretor digital + Comprador presencial / caneta.',
        badge: '2 Testemunhas',
      },
    ],
    exclusividade: [
      {
        modalidade: 'digital',
        titulo: 'Assinatura Digital',
        arquivo: 'exclusividade_digital_sem_testemunhas.docx',
        testemunhas: false,
        descricao: 'Corretor e Contratante/Proprietário assinam digitalmente pelo sistema.',
        badge: 'Sem Testemunhas',
      },
      {
        modalidade: 'mista',
        titulo: 'Assinatura Mista',
        arquivo: 'exclusividade_usuario_digital_contratante_manual_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Corretor assina no sistema e Contratante assina presencialmente.',
        badge: '2 Testemunhas',
      },
      {
        modalidade: 'variante',
        titulo: 'Variante Sem Cônjuge (Mista)',
        arquivo: 'exclusividade_sem_conjuge_mista_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Modelo adaptado para proprietário sem cônjuge ou solteiro.',
        badge: 'Sem Cônjuge • 2 Testemunhas',
      },
    ],
    outros_bens: [
      {
        modalidade: 'digital',
        titulo: 'Venda Geral - Digital',
        arquivo: 'venda_vista_assinatura_digital.docx',
        testemunhas: false,
        descricao: 'Venda de veículos, maquinários e bens móveis com quitação integral.',
        badge: 'Sem Testemunhas',
      },
      {
        modalidade: 'manual',
        titulo: 'Venda Geral - Manual',
        arquivo: 'venda_vista_assinatura_manual_2_testemunhas.docx',
        testemunhas: true,
        descricao: 'Venda de outros bens com assinatura física e 2 testemunhas.',
        badge: '2 Testemunhas',
      },
    ],
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
      // Define o primeiro slot como padrão para upload se nenhum selecionado
      const slots = TEMPLATE_SLOTS[activeCategory];
      if (slots && slots.length > 0) {
        setTargetSlotFile(slots[0].arquivo);
      }
    }
  }, [isOpen, activeCategory]);

  const loadAllData = async () => {
    setLoadingStorage(true);
    try {
      const [vistaMeta, parcMeta, exclMeta, outrosMeta, listRes] = await Promise.all([
        getCustomWordTemplateMeta('venda_vista_imovel'),
        getCustomWordTemplateMeta('venda_parcelada_imovel'),
        getCustomWordTemplateMeta('exclusividade'),
        getCustomWordTemplateMeta('venda_vista_outros'),
        listTemplates(),
      ]);

      setMetas({
        venda_vista: vistaMeta,
        venda_parcelada: parcMeta,
        exclusividade: exclMeta,
        outros_bens: outrosMeta,
      });

      if (listRes.sucesso && listRes.templates) {
        setSupabaseFiles(new Set(listRes.templates));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar templates:', e);
    } finally {
      setLoadingStorage(false);
    }
  };

  // Processar e escanear arquivo Word selecionado
  const handleScanAndSelectFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErrorMessage('O arquivo selecionado deve ser no formato Microsoft Word (.docx).');
      return;
    }

    setSelectedUploadFile(file);
    setIsScanning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const docXml = zip.file('word/document.xml');
      if (!docXml) {
        throw new Error('O arquivo não possui o formato OpenXML válido de um documento Word (.docx).');
      }

      const xmlText = await docXml.async('text');
      const foundTags = extractTagsFromText(xmlText);

      const valid: string[] = [];
      const unknown: string[] = [];

      foundTags.forEach((tag) => {
        if (isKnownTag(tag)) {
          valid.push(tag);
        } else {
          unknown.push(tag);
        }
      });

      setScannedTags({ valid, unknown });
      setActiveSubTab('upload');
      setSuccessMessage(`Arquivo "${file.name}" carregado. Encontramos ${valid.length} tag(s) reconhecidas.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao analisar o arquivo .docx.');
      setSelectedUploadFile(null);
    } finally {
      setIsScanning(false);
    }
  };

  // Confirmar o Upload do arquivo analisado
  const handleConfirmUpload = async () => {
    if (!selectedUploadFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const arrayBuffer = await selectedUploadFile.arrayBuffer();

      if (uploadMode === 'storage') {
        // Enviar para o Supabase Storage no nome de arquivo selecionado
        const targetName = targetSlotFile || selectedUploadFile.name;
        const res = await uploadTemplate(targetName, selectedUploadFile);

        if (!res.sucesso) {
          throw new Error(res.erro || 'Falha ao enviar arquivo para o Supabase Storage.');
        }

        clearTemplateCache();
        setSuccessMessage(`Matriz oficial "${targetName}" atualizada com sucesso no Supabase Storage!`);
      } else {
        // Salvar como modelo personalizado do usuário para a categoria ativa
        const key = toTemplateKey(activeCategory);
        await saveCustomWordTemplate(key, arrayBuffer, selectedUploadFile.name);
        setSuccessMessage(`Modelo personalizado do seu escritório ativado com sucesso para ${getCategoryLabel(activeCategory)}!`);
      }

      await loadAllData();
      setSelectedUploadFile(null);
      setActiveSubTab('matrizes');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao concluir importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload rápido direto para um slot específico
  const handleDirectSlotUpload = (arquivoNome: string) => {
    setDirectUploadSlot(arquivoNome);
    if (directSlotInputRef.current) {
      directSlotInputRef.current.value = '';
      directSlotInputRef.current.click();
    }
  };

  const handleDirectSlotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !directUploadSlot) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        throw new Error('Selecione um arquivo .docx válido.');
      }

      const res = await uploadTemplate(directUploadSlot, file);
      if (!res.sucesso) {
        throw new Error(res.erro || 'Falha ao atualizar template no storage.');
      }

      clearTemplateCache();
      await loadAllData();
      setSuccessMessage(`Slot "${directUploadSlot}" atualizado com sucesso com o arquivo "${file.name}"!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha no upload do slot.');
    } finally {
      setIsProcessing(false);
      setDirectUploadSlot(null);
      if (directSlotInputRef.current) {
        directSlotInputRef.current.value = '';
      }
    }
  };

  // Download de template Word (.docx)
  const handleDownloadFile = async (arquivoNome: string) => {
    setDownloadingFile(arquivoNome);
    setErrorMessage(null);

    try {
      const { sucesso, blob, erro } = await downloadTemplateWithCache(arquivoNome);
      if (!sucesso || !blob) {
        throw new Error(erro || 'Arquivo não encontrado no storage.');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivoNome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(`Erro ao baixar "${arquivoNome}": ${err.message}`);
    } finally {
      setDownloadingFile(null);
    }
  };

  // Download de template em PDF (.pdf)
  const handleDownloadFilePdf = async (arquivoNome: string) => {
    setDownloadingPdfFile(arquivoNome);
    setErrorMessage(null);

    try {
      await downloadOfficialTemplateAsPdf(arquivoNome);
    } catch (err: any) {
      setErrorMessage(`Erro ao gerar PDF de "${arquivoNome}": ${err.message}`);
    } finally {
      setDownloadingPdfFile(null);
    }
  };

  // Download do modelo personalizado em uso em Word (.docx)
  const handleDownloadCustomActive = () => {
    downloadSampleDocxTemplate(toTemplateKey(activeCategory));
  };

  // Download do modelo personalizado em uso em PDF (.pdf)
  const handleDownloadCustomActivePdf = async () => {
    const key = toTemplateKey(activeCategory);
    setIsDownloadingCustomPdf(true);
    setErrorMessage(null);

    try {
      const fileName = currentMeta ? currentMeta.fileName : `Matriz_${activeCategory}`;
      await downloadCustomTemplateAsPdf(key, fileName);
    } catch (err: any) {
      setErrorMessage(`Erro ao gerar PDF do modelo em uso: ${err.message}`);
    } finally {
      setIsDownloadingCustomPdf(false);
    }
  };

  // Restaurar modelo padrão (remover customização)
  const handleRemoveCustomTemplate = async () => {
    if (confirm(`Deseja restaurar o modelo padrão oficial para ${getCategoryLabel(activeCategory)}?`)) {
      await removeCustomWordTemplate(toTemplateKey(activeCategory));
      await loadAllData();
      setSuccessMessage('Modelo padrão oficial restaurado com sucesso.');
    }
  };

  // Visualizar Prévia com Mammoth
  const handlePreviewFile = async (arquivoNome: string) => {
    setPreviewFileName(arquivoNome);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHtml(null);
    setActiveSubTab('previa');

    try {
      const { sucesso, blob, erro } = await downloadTemplateWithCache(arquivoNome);
      if (!sucesso || !blob) {
        throw new Error(erro || 'Não foi possível carregar o arquivo para prévia.');
      }

      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setPreviewHtml(result.value);
    } catch (err: any) {
      setPreviewError(err.message || 'Falha ao renderizar prévia do documento.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const copyToClipboard = (tag: string) => {
    navigator.clipboard.writeText(`{${tag}}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const getCategoryLabel = (category: TemplateCategory) => {
    switch (category) {
      case 'venda_vista':
        return 'Venda à Vista';
      case 'venda_parcelada':
        return 'Venda Parcelada';
      case 'exclusividade':
        return 'Exclusividade';
      case 'outros_bens':
        return 'Outros Bens / Veículos';
    }
  };

  // Dicionário de tags categorizado
  const TAG_CATEGORIES = [
    {
      id: 'partes',
      titulo: 'Qualificação das Partes (Vendedor & Comprador)',
      icone: Users,
      tags: [
        { tag: 'vendedor', desc: 'Nome completo do vendedor ou contratante' },
        { tag: 'cpf_vendedor', desc: 'CPF ou CNPJ do vendedor' },
        { tag: 'rg_vendedor', desc: 'RG e órgão emissor do vendedor' },
        { tag: 'nacionalidade_vendedor', desc: 'Nacionalidade do vendedor' },
        { tag: 'estado_civil_vendedor', desc: 'Estado civil do vendedor' },
        { tag: 'profissao_vendedor', desc: 'Profissão do vendedor' },
        { tag: 'endereco_vendedor', desc: 'Endereço residencial completo' },
        { tag: 'comprador', desc: 'Nome completo do comprador ou corretor' },
        { tag: 'cpf_comprador', desc: 'CPF ou CNPJ do comprador' },
        { tag: 'rg_comprador', desc: 'RG e órgão emissor do comprador' },
        { tag: 'nacionalidade_comprador', desc: 'Nacionalidade do comprador' },
        { tag: 'estado_civil_comprador', desc: 'Estado civil do comprador' },
        { tag: 'profissao_comprador', desc: 'Profissão do comprador' },
        { tag: 'endereco_comprador', desc: 'Endereço residencial do comprador' },
      ],
    },
    {
      id: 'imovel',
      titulo: 'Dados do Imóvel & Confrontações',
      icone: Building2,
      tags: [
        { tag: 'empreendimento', desc: 'Nome do loteamento ou condomínio' },
        { tag: 'lote', desc: 'Número do lote' },
        { tag: 'quadra', desc: 'Número ou letra da quadra' },
        { tag: 'area_total', desc: 'Área total em metros quadrados (m²)' },
        { tag: 'frente', desc: 'Metragem e confrontação de frente' },
        { tag: 'fundos', desc: 'Metragem e confrontação de fundos' },
        { tag: 'lateral_direita', desc: 'Metragem e confrontação lateral direita' },
        { tag: 'lateral_esquerda', desc: 'Metragem e confrontação lateral esquerda' },
        { tag: 'cidade_imovel', desc: 'Cidade e UF do imóvel' },
        { tag: 'matricula', desc: 'Número da matrícula do imóvel' },
        { tag: 'cartorio', desc: 'Cartório de Registro de Imóveis' },
      ],
    },
    {
      id: 'financeiro',
      titulo: 'Valores, Parcelamento & Prazos',
      icone: Banknote,
      tags: [
        { tag: 'valor_total', desc: 'Valor total formatado (ex: R$ 250.000,00)' },
        { tag: 'valor_total_extenso', desc: 'Valor total escrito por extenso' },
        { tag: 'entrada', desc: 'Valor da entrada / sinal (se houver)' },
        { tag: 'entrada_extenso', desc: 'Valor da entrada por extenso' },
        { tag: 'num_parcelas', desc: 'Quantidade de parcelas mensais' },
        { tag: 'valor_parcela', desc: 'Valor individual de cada parcela' },
        { tag: 'valor_parcela_extenso', desc: 'Valor da parcela por extenso' },
        { tag: 'data_primeira_parcela', desc: 'Data de vencimento da 1ª parcela' },
        { tag: 'comissao_porcentagem', desc: 'Percentual de honorários do corretor (%)' },
        { tag: 'prazo_meses', desc: 'Prazo de vigência da exclusividade (meses)' },
        { tag: 'dia', desc: 'Dia da assinatura (2 dígitos)' },
        { tag: 'mes_extenso', desc: 'Mês da assinatura por extenso' },
        { tag: 'ano', desc: 'Ano da assinatura (4 dígitos)' },
      ],
    },
    {
      id: 'assinaturas',
      titulo: 'Selos Criptográficos & Assinatura Manual',
      icone: Lock,
      tags: [
        { tag: 'USUARIO_ASSINATURA_DIGITAL', desc: 'Selo criptográfico do corretor / contratado' },
        { tag: 'COMPRADOR_ASSINATURA_DIGITAL', desc: 'Selo criptográfico do comprador / cliente' },
        { tag: 'COMPRADOR_ASSINATURA_MANUAL', desc: 'Linha de assinatura manual para caneta' },
        { tag: 'CONTRATANTE_ASSINATURA_DIGITAL', desc: 'Selo digital do contratante (exclusividade)' },
        { tag: 'CONTRATANTE_ASSINATURA_MANUAL', desc: 'Linha física para contratante (exclusividade)' },
        { tag: 'TESTEMUNHA_1', desc: 'Nome e documento da primeira testemunha' },
        { tag: 'TESTEMUNHA_2', desc: 'Nome e documento da segunda testemunha' },
      ],
    },
  ];

  const filteredCategories = TAG_CATEGORIES.filter((cat) => {
    if (tagFilter !== 'todas' && cat.id !== tagFilter) return false;
    return true;
  }).map((cat) => ({
    ...cat,
    tags: cat.tags.filter((t) => {
      if (!tagSearch) return true;
      const s = tagSearch.toLowerCase();
      return t.tag.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s);
    }),
  })).filter((cat) => cat.tags.length > 0);

  if (!isOpen) return null;

  const currentMeta = metas[activeCategory];
  const currentSlots = TEMPLATE_SLOTS[activeCategory] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* Input oculto para upload direto no slot */}
      <input
        ref={directSlotInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleDirectSlotFileChange}
        className="hidden"
      />

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95">
        
        {/* ========================================================
            HEADER PRINCIPAL: PADRÃO DARK LUXURY COM DETALHES OURO
           ======================================================== */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <FileText className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight leading-tight">
                  Central de Modelos Word (.docx)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 text-[10px] font-extrabold border border-yellow-400/30">
                  <Cloud className="w-3 h-3" />
                  Nuvem & Local Unificados
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1 sm:line-clamp-none">
                Gerencie matrizes oficiais, visualize formatações, teste tags e envie modelos timbrados do seu escritório.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer shrink-0"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            1. SELETOR DE CATEGORIA (CARDS RESPONSIVOS E ERGONÔMICOS)
           ======================================================== */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              1. Categoria do Contrato:
            </span>
            <div className="flex items-center gap-2">
              {loadingStorage && (
                <span className="text-[10px] text-amber-700 flex items-center gap-1 font-semibold">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando...
                </span>
              )}
            </div>
          </div>

          {/* Grid de Categorias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Card Venda à Vista */}
            <button
              type="button"
              onClick={() => setActiveCategory('venda_vista')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative ${
                activeCategory === 'venda_vista'
                  ? 'bg-amber-50/95 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      activeCategory === 'venda_vista' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 stroke-[2.3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    Venda à Vista
                  </span>
                </div>
                {metas.venda_vista ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" title="Customizado Ativo" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-medium">3 matrizes</span>
                <span className={`font-bold ${metas.venda_vista ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {metas.venda_vista ? 'Customizado' : 'Oficial'}
                </span>
              </div>
            </button>

            {/* Card Venda Parcelada */}
            <button
              type="button"
              onClick={() => setActiveCategory('venda_parcelada')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative ${
                activeCategory === 'venda_parcelada'
                  ? 'bg-amber-50/95 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      activeCategory === 'venda_parcelada' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CalendarClock className="w-3.5 h-3.5 stroke-[2.3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    Venda Parcelada
                  </span>
                </div>
                {metas.venda_parcelada ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" title="Customizado Ativo" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-medium">3 matrizes</span>
                <span className={`font-bold ${metas.venda_parcelada ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {metas.venda_parcelada ? 'Customizado' : 'Oficial'}
                </span>
              </div>
            </button>

            {/* Card Exclusividade */}
            <button
              type="button"
              onClick={() => setActiveCategory('exclusividade')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative ${
                activeCategory === 'exclusividade'
                  ? 'bg-amber-50/95 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      activeCategory === 'exclusividade' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    Exclusividade
                  </span>
                </div>
                {metas.exclusividade ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" title="Customizado Ativo" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-medium">3 matrizes</span>
                <span className={`font-bold ${metas.exclusividade ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {metas.exclusividade ? 'Customizado' : 'Oficial'}
                </span>
              </div>
            </button>

            {/* Card Outros Bens */}
            <button
              type="button"
              onClick={() => setActiveCategory('outros_bens')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative ${
                activeCategory === 'outros_bens'
                  ? 'bg-amber-50/95 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      activeCategory === 'outros_bens' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 stroke-[2.3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    Outros Bens
                  </span>
                </div>
                {metas.outros_bens ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-medium">2 matrizes</span>
                <span className={`font-bold ${metas.outros_bens ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {metas.outros_bens ? 'Customizado' : 'Oficial'}
                </span>
              </div>
            </button>
          </div>

          {/* ========================================================
              SUB-NAVEGAÇÃO (TABS ULTRA-RESPONSIVAS)
             ======================================================== */}
          <div className="flex items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-200 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveSubTab('matrizes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'matrizes'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Matrizes da Categoria ({currentSlots.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'upload'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>2. Importar & Validar .docx</span>
              {selectedUploadFile && (
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('tags')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'tags'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>3. Dicionário de Tags ({'{campo}'})</span>
            </button>

            {previewFileName && (
              <button
                onClick={() => setActiveSubTab('previa')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeSubTab === 'previa'
                    ? 'bg-yellow-400 text-slate-950 shadow-xs'
                    : 'bg-yellow-50 text-yellow-900 hover:bg-yellow-100 border border-yellow-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="max-w-[140px] truncate">Prévia: {previewFileName}</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            CORPO DO MODAL (CONTEÚDO DAS ABAS)
           ======================================================== */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          
          {/* Mensagens de Sucesso & Erro */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-900 flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-900 flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-700 hover:text-rose-900 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================
              ABA 1: MATRIZES DA CATEGORIA (CARDS ERGONÔMICOS E COMPLETOS)
             ======================================================== */}
          {activeSubTab === 'matrizes' && (
            <div className="space-y-4">
              {/* Banner de Modelo Personalizado Ativo (se houver) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      currentMeta
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {currentMeta ? (
                      <FileCheck className="w-5 h-5 stroke-[2.4]" />
                    ) : (
                      <FileText className="w-5 h-5 stroke-[2.4]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Status do Modelo em Uso ({getCategoryLabel(activeCategory)}):
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                          currentMeta
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {currentMeta ? 'Modelo Customizado Ativo' : 'Padrão Oficial do Sistema'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">
                      {currentMeta ? currentMeta.fileName : `Matriz_Padrao_${activeCategory}.docx`}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {currentMeta
                        ? `Enviado em ${new Date(currentMeta.uploadedAt).toLocaleDateString('pt-BR')} (${(currentMeta.fileSize / 1024).toFixed(1)} KB)`
                        : 'Utilizando matriz oficial sincronizada com o armazenamento Supabase.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    onClick={handleDownloadCustomActive}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl transition-all cursor-pointer shadow-xs min-h-[40px]"
                    title="Baixar matriz atualmente em uso em formato Word (.docx)"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Word (.docx)</span>
                  </button>

                  <button
                    onClick={handleDownloadCustomActivePdf}
                    disabled={isDownloadingCustomPdf}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-xl transition-all cursor-pointer shadow-xs min-h-[40px] disabled:opacity-50"
                    title="Baixar matriz atualmente em uso em formato PDF (.pdf)"
                  >
                    <FileType className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isDownloadingCustomPdf ? 'Gerando PDF...' : 'PDF (.pdf)'}</span>
                  </button>

                  {currentMeta && (
                    <button
                      onClick={handleRemoveCustomTemplate}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer min-h-[40px]"
                      title="Restaurar matriz original do sistema"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Restaurar Oficial</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid dos Slots de Modalidade de Assinatura */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-600" />
                    Modalidades de Assinatura ({getCategoryLabel(activeCategory)})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {currentSlots.length} variações disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentSlots.map((slot, idx) => {
                    const isFileInStorage = supabaseFiles.has(slot.arquivo);
                    const isCurrentDownloading = downloadingFile === slot.arquivo;
                    const isCurrentDownloadingPdf = downloadingPdfFile === slot.arquivo;

                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 transition-all relative overflow-hidden"
                      >
                        <div>
                          {/* Cabeçalho do Card */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-black text-slate-900 block leading-tight">
                                {idx + 1}. {slot.titulo}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5 break-all">
                                {slot.arquivo}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-[9px] font-extrabold rounded-md shrink-0 ${
                                slot.testemunhas
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {slot.badge}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            {slot.descricao}
                          </p>

                          {/* Status na Nuvem */}
                          <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                              <Cloud className="w-3.5 h-3.5 text-slate-400" /> Storage Nuvem:
                            </span>
                            <span
                              className={`font-black flex items-center gap-1 ${
                                isFileInStorage ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {isFileInStorage ? (
                                <>
                                  <CheckCircle className="w-3 h-3" /> Online
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3" /> Padrão local
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Botões de Ação do Card */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {/* Linha 1: Prévia e Edição */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handlePreviewFile(slot.arquivo)}
                              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200 min-h-[36px]"
                              title="Visualizar texto e formatação original"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Prévia</span>
                            </button>

                            <button
                              onClick={() => handleOpenZohoEditor(slot.arquivo)}
                              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200 min-h-[36px]"
                              title="Editar o modelo completo (fonte, negrito, tabelas) direto no navegador"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span>Editar</span>
                            </button>
                          </div>

                          {/* Linha 2: Baixar Word e Baixar PDF */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleDownloadFile(slot.arquivo)}
                              disabled={isCurrentDownloading}
                              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-extrabold btn-chrome-graphite text-white rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
                              title="Baixar arquivo Word (.docx) para edição"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isCurrentDownloading ? '...' : 'Word (.docx)'}</span>
                            </button>

                            <button
                              onClick={() => handleDownloadFilePdf(slot.arquivo)}
                              disabled={isCurrentDownloadingPdf}
                              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
                              title="Baixar modelo formatado em PDF (.pdf)"
                            >
                              <FileType className="w-3.5 h-3.5 text-rose-100" />
                              <span>{isCurrentDownloadingPdf ? '...' : 'PDF (.pdf)'}</span>
                            </button>
                          </div>

                          {/* Linha 3: Substituição */}
                          <button
                            onClick={() => handleDirectSlotUpload(slot.arquivo)}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-yellow-950 bg-yellow-100/70 hover:bg-yellow-200/80 border border-yellow-300/80 rounded-xl transition-all cursor-pointer min-h-[34px] disabled:opacity-50"
                            title="Substituir este slot com um arquivo Word"
                          >
                            <Upload className="w-3.5 h-3.5 text-yellow-800" />
                            <span>Substituir este .docx</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 2: IMPORTAR & VALIDAR MODELO (.DOCX)
             ======================================================== */}
          {activeSubTab === 'upload' && (
            <div className="space-y-4">
              {/* Dropzone de Upload */}
              <div className="border-2 border-dashed border-slate-300 hover:border-yellow-500 bg-white hover:bg-yellow-50/20 rounded-3xl p-6 sm:p-8 text-center transition-all shadow-xs">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScanAndSelectFile(file);
                  }}
                  className="hidden"
                  id="unified-docx-upload-input"
                  disabled={isProcessing || isScanning}
                />
                <label
                  htmlFor="unified-docx-upload-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-14 h-14 bg-yellow-100 text-yellow-800 rounded-2xl flex items-center justify-center shadow-xs border border-yellow-200">
                    <Upload className="w-7 h-7 stroke-[2.3]" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-extrabold text-slate-950">
                      {isScanning
                        ? 'Analisando OpenXML e escaneando tags...'
                        : 'Selecione ou Arraste o Arquivo Word (.docx)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto leading-relaxed">
                      O sistema analisa as tags <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">{'{campo}'}</code> e valida a formatação, logotipos e cabeçalhos do documento.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold btn-gold text-slate-950 rounded-xl shadow-md shadow-yellow-500/20 hover:shadow-lg transition-all">
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Escolher Arquivo Word (.docx)</span>
                  </span>
                </label>
              </div>

              {/* Resultado da Análise de Tags & Configuração de Destino */}
              {selectedUploadFile && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-xs animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                          {selectedUploadFile.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Tamanho: {(selectedUploadFile.size / 1024).toFixed(1)} KB • {scannedTags.valid.length} tags válidas detectadas
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUploadFile(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Diagnóstico de Tags Encontradas */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Tags Identificadas no Documento:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {scannedTags.valid.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md text-[10px] font-mono font-bold"
                        >
                          {`{${tag}}`}
                        </span>
                      ))}
                      {scannedTags.unknown.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-md text-[10px] font-mono font-bold"
                          title="Tag não padrão do sistema"
                        >
                          {`{${tag}} (não catalogada)`}
                        </span>
                      ))}
                      {scannedTags.valid.length === 0 && scannedTags.unknown.length === 0 && (
                        <span className="text-xs text-slate-400 italic">
                          Nenhuma tag no formato {'{campo}'} encontrada no corpo do documento.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Configuração de Destino do Upload */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 block">
                      Como você deseja salvar este modelo?
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Opção 1: Matriz Oficial do Storage */}
                      <button
                        type="button"
                        onClick={() => setUploadMode('storage')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          uploadMode === 'storage'
                            ? 'bg-yellow-50/80 border-yellow-500 ring-2 ring-yellow-400/30'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-yellow-700" />
                          <span className="text-xs font-extrabold text-slate-900">
                            Substituir Slot Oficial (Supabase Storage)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Atualiza a matriz na nuvem para todos os downloads do tipo selecionado.
                        </p>
                      </button>

                      {/* Opção 2: Customização Pessoal do Escritório */}
                      <button
                        type="button"
                        onClick={() => setUploadMode('custom')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          uploadMode === 'custom'
                            ? 'bg-yellow-50/80 border-yellow-500 ring-2 ring-yellow-400/30'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-yellow-700" />
                          <span className="text-xs font-extrabold text-slate-900">
                            Modelo Timbrado Personalizado (Seu Usuário)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Ativa como seu modelo padrão preferencial para {getCategoryLabel(activeCategory)}.
                        </p>
                      </button>
                    </div>

                    {uploadMode === 'storage' && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-700">
                          Selecione qual slot oficial este arquivo vai substituir:
                        </label>
                        <select
                          value={targetSlotFile}
                          onChange={(e) => setTargetSlotFile(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                        >
                          {currentSlots.map((s, idx) => (
                            <option key={idx} value={s.arquivo}>
                              {s.titulo} ({s.arquivo}) - {s.badge}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Botão de Confirmação */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedUploadFile(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmUpload}
                      disabled={isProcessing}
                      className="px-5 py-2.5 text-xs font-extrabold btn-gold text-slate-950 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Gravando Modelo...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[2.8]" />
                          <span>Confirmar e Ativar Modelo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 3: DICIONÁRIO DE TAGS ({campo})
             ======================================================== */}
          {activeSubTab === 'tags' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-950 flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-yellow-600" />
                      Dicionário de Tags de Preenchimento Automático
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Clique em qualquer tag para copiar <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">{'{nome_da_tag}'}</code> e colar diretamente no Microsoft Word ou Google Docs.
                    </p>
                  </div>

                  {/* Filtro Rápido */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setTagFilter('todas')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        tagFilter === 'todas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setTagFilter('partes')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        tagFilter === 'partes' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Partes
                    </button>
                    <button
                      onClick={() => setTagFilter('imovel')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        tagFilter === 'imovel' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Imóvel
                    </button>
                    <button
                      onClick={() => setTagFilter('financeiro')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        tagFilter === 'financeiro' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Valores
                    </button>
                    <button
                      onClick={() => setTagFilter('assinaturas')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        tagFilter === 'assinaturas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Assinaturas
                    </button>
                  </div>
                </div>

                {/* Campo de Busca */}
                <input
                  type="text"
                  placeholder="Buscar tag por nome ou significado (ex: vendedor, lote, valor, comissão, assinatura)..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Grid de Categorias */}
              <div className="space-y-4">
                {filteredCategories.map((cat, idx) => {
                  const Icon = cat.icone;
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                        <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-900 flex items-center justify-center font-bold">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h5 className="font-extrabold text-xs sm:text-sm text-slate-950">
                          {cat.titulo}
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {cat.tags.map((t, tIdx) => {
                          const isCopied = copiedTag === t.tag;
                          return (
                            <button
                              key={tIdx}
                              onClick={() => copyToClipboard(t.tag)}
                              className="p-2.5 bg-slate-50 hover:bg-yellow-50/70 border border-slate-200 hover:border-yellow-300 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between gap-2"
                              title="Clique para copiar a tag"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono font-black text-xs text-slate-900 block truncate group-hover:text-yellow-900">
                                  {`{${t.tag}}`}
                                </span>
                                <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                                  {t.desc}
                                </span>
                              </div>

                              <div className="shrink-0 p-1.5 rounded-lg bg-white group-hover:bg-yellow-100 text-slate-400 group-hover:text-yellow-900 border border-slate-200 group-hover:border-yellow-300 transition-colors">
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              ABA 4: PRÉVIA FORMATADA DO MODELO WORD (MAMMOTH)
             ======================================================== */}
          {activeSubTab === 'previa' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-950">
                      Prévia do Modelo: {previewFileName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Exibindo formatação original, cláusulas e posicionamento de tags.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {previewFileName && (
                    <>
                      <button
                        onClick={() => handleDownloadFile(previewFileName)}
                        disabled={downloadingFile === previewFileName}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Baixar modelo em formato Word (.docx)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingFile === previewFileName ? 'Baixando...' : 'Baixar .docx'}</span>
                      </button>

                      <button
                        onClick={() => handleDownloadFilePdf(previewFileName)}
                        disabled={downloadingPdfFile === previewFileName}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Baixar modelo formatado em PDF (.pdf)"
                      >
                        <FileType className="w-3.5 h-3.5 text-rose-100" />
                        <span>{downloadingPdfFile === previewFileName ? 'Gerando PDF...' : 'Baixar .pdf'}</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActiveSubTab('matrizes')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {previewLoading && (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                  <p className="text-xs font-medium">Carregando e renderizando documento Word...</p>
                </div>
              )}

              {previewError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {!previewLoading && !previewError && previewHtml && (
                <div className="max-h-[55vh] overflow-y-auto p-4 sm:p-6 bg-slate-50/60 rounded-xl border border-slate-200">
                  <div
                    className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline">
            Dica: Edite os arquivos baixados no Word preservando as chaves <code className="font-mono font-bold text-slate-700">{'{nome_da_tag}'}</code>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all cursor-pointer text-center ml-auto"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal do Editor Completo (Zoho Writer) */}
      {zohoEditorFileName && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-5xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0 bg-slate-50">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <Pencil className="w-4 h-4 text-slate-700" />
                  Editor completo do modelo
                </h3>
                <p className="text-[11px] font-mono text-slate-500 truncate">{zohoEditorFileName}</p>
              </div>
              <button
                onClick={handleCloseZohoEditor}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
              >
                Concluído / Fechar
              </button>
            </div>

            <div className="flex-1 relative bg-slate-100">
              {zohoEditorLoading && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-500">
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Abrindo editor...
                </div>
              )}
              {zohoEditorError && !zohoEditorLoading && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2 max-w-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {zohoEditorError}
                  </div>
                </div>
              )}
              {zohoEditorUrl && !zohoEditorLoading && (
                <iframe
                  src={zohoEditorUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Editor Zoho Writer"
                />
              )}
            </div>

            <div className="px-5 py-2 border-t border-slate-100 bg-amber-50/60 shrink-0">
              <p className="text-[11px] text-amber-950">
                Use o botão "Salvar" dentro do editor pra gravar as alterações no modelo. Ao fechar esta janela, a
                lista é atualizada automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Editor de Texto do Modelo (simples, reserva) */}
      {editorFileName && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditorFileName(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-slate-700" />
                  Editar texto do modelo
                </h3>
                <p className="text-xs font-mono text-slate-500 truncate">{editorFileName}</p>
              </div>
              <button
                onClick={() => setEditorFileName(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-100 shrink-0">
              <p className="text-[11px] text-amber-950">
                Edição rápida: só o texto de cada parágrafo, sem baixar e reenviar pelo Word. As tags{' '}
                {'{tag}'} continuam funcionando normalmente - só não dá pra mudar negrito/fonte dentro do
                mesmo parágrafo nem adicionar parágrafos novos aqui.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 bg-slate-50">
              {editorLoading && (
                <div className="flex items-center justify-center gap-2 text-slate-500 py-10">
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Carregando modelo...
                </div>
              )}

              {editorError && !editorLoading && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {editorError}
                </div>
              )}

              {!editorLoading &&
                !editorError &&
                editorParagraphs.map((p) => (
                  <textarea
                    key={p.id}
                    value={editorDrafts[p.id] ?? p.text}
                    onChange={(e) => setEditorDrafts({ ...editorDrafts, [p.id]: e.target.value })}
                    rows={Math.max(1, Math.ceil((editorDrafts[p.id] ?? p.text).length / 90))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      editorDrafts[p.id] !== undefined && editorDrafts[p.id] !== p.text
                        ? 'border-amber-400'
                        : 'border-slate-200'
                    }`}
                  />
                ))}

              {!editorLoading && !editorError && editorParagraphs.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  Não achei texto editável neste modelo (pode ser um arquivo só com tabelas/imagens).
                </p>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 shrink-0 space-y-2">
              {editorSuccess && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {editorSuccess}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditorFileName(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSaveEditor}
                  disabled={editorSaving || editorLoading}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-bold text-sm rounded-lg transition-all flex items-center gap-2 justify-center cursor-pointer shadow-xs"
                >
                  {editorSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar no modelo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

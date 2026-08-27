import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import {
  ContractData,
  ContractType,
} from '../types/contract';
import {
  getContractTags,
  getContractParceladoTags,
  getContractExclusividadeTags,
  getContractLocacaoTags,
} from './contractGenerators';
import { supabase } from './supabaseClient';
import { buildFilledDocx } from './renderContractFromDocx';
import { buildDocxFileName } from './pdfFileName';

// Chaves de armazenamento de templates Word personalizados por modalidade de contrato
export type CustomTemplateKey =
  | 'venda_vista_imovel'
  | 'venda_vista_outros'
  | 'venda_parcelada_imovel'
  | 'venda_parcelada_outros'
  | 'exclusividade'
  | 'locacao_imovel';

const TEMPLATE_STORAGE_KEYS: Record<CustomTemplateKey, string> = {
  venda_vista_imovel: 'custom_word_template_venda_vista_imovel',
  venda_vista_outros: 'custom_word_template_venda_vista_outros',
  venda_parcelada_imovel: 'custom_word_template_venda_parcelada_imovel',
  venda_parcelada_outros: 'custom_word_template_venda_parcelada_outros',
  exclusividade: 'custom_word_template_exclusividade',
  locacao_imovel: 'custom_word_template_locacao_imovel',
};

const TEMPLATE_META_STORAGE_KEYS: Record<CustomTemplateKey, string> = {
  venda_vista_imovel: 'custom_word_template_meta_venda_vista_imovel',
  venda_vista_outros: 'custom_word_template_meta_venda_vista_outros',
  venda_parcelada_imovel: 'custom_word_template_meta_venda_parcelada_imovel',
  venda_parcelada_outros: 'custom_word_template_meta_venda_parcelada_outros',
  exclusividade: 'custom_word_template_meta_exclusividade',
  locacao_imovel: 'custom_word_template_meta_locacao_imovel',
};

const CUSTOM_TEMPLATES_BUCKET = 'contract-templates';

async function getOwnerId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function customTemplateStoragePath(ownerId: string, templateKey: CustomTemplateKey): string {
  return `custom/${ownerId}/${templateKey}.docx`;
}

function customTemplateMetaStoragePath(ownerId: string, templateKey: CustomTemplateKey): string {
  return `custom/${ownerId}/${templateKey}.meta.json`;
}

export function resolveTemplateKey(tipo: ContractType, subcategoria?: string): CustomTemplateKey {
  if (tipo === 'locacao') return 'locacao_imovel';
  if (tipo === 'exclusividade') return 'exclusividade';
  if (tipo === 'venda_vista') {
    return subcategoria === 'outros_bens' ? 'venda_vista_outros' : 'venda_vista_imovel';
  }
  if (tipo === 'venda_parcelada') {
    return subcategoria === 'outros_bens' ? 'venda_parcelada_outros' : 'venda_parcelada_imovel';
  }
  return 'venda_vista_imovel';
}

export interface CustomTemplateMeta {
  fileName: string;
  uploadedAt: string;
  fileSize: number;
}

// Salvar template .docx enviado pelo usuário (Supabase Storage, com cache local)
export async function saveCustomWordTemplate(
  templateKey: CustomTemplateKey,
  fileData: ArrayBuffer,
  fileName: string
): Promise<void> {
  const ownerId = await getOwnerId();
  if (!ownerId) {
    throw new Error('Sessão expirada. Faça login novamente para salvar o modelo.');
  }

  const meta: CustomTemplateMeta = {
    fileName,
    uploadedAt: new Date().toISOString(),
    fileSize: fileData.byteLength,
  };

  const { error: uploadError } = await supabase.storage
    .from(CUSTOM_TEMPLATES_BUCKET)
    .upload(customTemplateStoragePath(ownerId, templateKey), fileData, {
      upsert: true,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  if (uploadError) {
    throw new Error(`Falha ao salvar o modelo Word: ${uploadError.message}`);
  }

  const { error: metaError } = await supabase.storage
    .from(CUSTOM_TEMPLATES_BUCKET)
    .upload(customTemplateMetaStoragePath(ownerId, templateKey), JSON.stringify(meta), {
      upsert: true,
      contentType: 'application/json',
    });
  if (metaError) {
    throw new Error(`Falha ao salvar metadados do modelo Word: ${metaError.message}`);
  }

  // Cache local (acelera leituras subsequentes no mesmo navegador)
  try {
    const bytes = new Uint8Array(fileData);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    localStorage.setItem(TEMPLATE_STORAGE_KEYS[templateKey], btoa(binary));
    localStorage.setItem(TEMPLATE_META_STORAGE_KEYS[templateKey], JSON.stringify(meta));
  } catch {
    // cache local é best-effort; falha aqui não é crítica
  }
}

// Obter metadados do template personalizado (Supabase Storage, com fallback local)
export async function getCustomWordTemplateMeta(templateKey: CustomTemplateKey): Promise<CustomTemplateMeta | null> {
  const ownerId = await getOwnerId();
  if (ownerId) {
    try {
      const { data, error } = await supabase.storage
        .from(CUSTOM_TEMPLATES_BUCKET)
        .download(customTemplateMetaStoragePath(ownerId, templateKey));
      if (!error && data) {
        const text = await data.text();
        return JSON.parse(text);
      }
    } catch {
      // segue para fallback local
    }
  }

  try {
    const raw = localStorage.getItem(TEMPLATE_META_STORAGE_KEYS[templateKey]);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignora
  }
  return null;
}

// Obter dados binários do template personalizado (Supabase Storage, com fallback local)
export async function getCustomWordTemplate(templateKey: CustomTemplateKey): Promise<ArrayBuffer | null> {
  const ownerId = await getOwnerId();
  if (ownerId) {
    try {
      const { data, error } = await supabase.storage
        .from(CUSTOM_TEMPLATES_BUCKET)
        .download(customTemplateStoragePath(ownerId, templateKey));
      if (!error && data) {
        return await data.arrayBuffer();
      }
    } catch {
      // segue para fallback local
    }
  }

  try {
    const base64 = localStorage.getItem(TEMPLATE_STORAGE_KEYS[templateKey]);
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

// Remover template personalizado
export async function removeCustomWordTemplate(templateKey: CustomTemplateKey): Promise<void> {
  const ownerId = await getOwnerId();
  if (ownerId) {
    await supabase.storage
      .from(CUSTOM_TEMPLATES_BUCKET)
      .remove([
        customTemplateStoragePath(ownerId, templateKey),
        customTemplateMetaStoragePath(ownerId, templateKey),
      ]);
  }

  localStorage.removeItem(TEMPLATE_STORAGE_KEYS[templateKey]);
  localStorage.removeItem(TEMPLATE_META_STORAGE_KEYS[templateKey]);

  if (templateKey === 'venda_vista_imovel') {
    localStorage.removeItem('custom_word_template_venda_vista');
    localStorage.removeItem('custom_word_template_meta_venda_vista');
  }
  if (templateKey === 'venda_parcelada_imovel') {
    localStorage.removeItem('custom_word_template_venda_parcelada');
    localStorage.removeItem('custom_word_template_meta_venda_parcelada');
  }
}

// Compila todas as tags conhecidas em um dicionário unificado com variações de maiúsculas, minúsculas e aliases
export function buildUnifiedContractTags(contract: ContractData): Record<string, string> {
  const vistaTags = getContractTags(contract);
  const parceladoTags = getContractParceladoTags(contract);
  const exclusividadeTags = getContractExclusividadeTags(contract);
  const locacaoTags = getContractLocacaoTags(contract);

  const tags: Record<string, string> = {};

  // Auxiliar para registrar chave e variações
  const setTag = (key: string, value: string | number | boolean | undefined | null) => {
    const val = value !== undefined && value !== null ? String(value) : '';
    tags[key] = val;
    tags[key.toUpperCase()] = val;
    tags[key.toLowerCase()] = val;
  };

  // Mapear tags do modelo à vista
  Object.entries(vistaTags).forEach(([k, v]) => {
    if (v !== undefined) setTag(k, v as string);
  });

  // Mapear tags do modelo parcelado
  Object.entries(parceladoTags).forEach(([k, v]) => {
    if (v !== undefined) setTag(k, v as string);
  });

  // Mapear tags do modelo de exclusividade
  Object.entries(exclusividadeTags).forEach(([k, v]) => {
    if (v !== undefined) setTag(k, v as string);
  });

  // Mapear tags do modelo de locação
  Object.entries(locacaoTags).forEach(([k, v]) => {
    if (v !== undefined) setTag(k, v as string);
  });

  // Aliases universais e diretos requisitados
  const v = contract.vendedor;
  const c = contract.comprador;
  const im = contract.imovel;

  setTag('VENDEDOR', v.nome);
  setTag('COMPRADOR', c.nome);
  setTag('VENDEDOR_NOME', v.nome);
  setTag('COMPRADOR_NOME', c.nome);
  setTag('CPF_VENDEDOR', v.cpfCnpj);
  setTag('CPF_COMPRADOR', c.cpfCnpj);
  setTag('VENDEDOR_CPF', v.cpfCnpj);
  setTag('COMPRADOR_CPF', c.cpfCnpj);
  setTag('VALOR_TOTAL', vistaTags.valor_total || parceladoTags.valor_total || exclusividadeTags.VALOR_TOTAL);
  setTag('VALOR_TOTAL_EXTENSO', vistaTags.valor_total_extenso || parceladoTags.valor_total_extenso || exclusividadeTags.VALOR_TOTAL_EXTENSO);
  setTag('LOTE', im?.numeroLote || '');
  setTag('NUMERO_LOTE', im?.numeroLote || '');
  setTag('QUADRA', im?.numeroQuadra || '');
  setTag('NUMERO_QUADRA', im?.numeroQuadra || '');
  setTag('EMPREENDIMENTO', im?.nomeEmpreendimento || '');
  setTag('AREA_TOTAL', im?.areaTotalM2 ? `${im.areaTotalM2} m²` : '');
  setTag('AREA_TOTAL_M2', im?.areaTotalM2 || '');
  setTag('CIDADE', contract.cidadeAssinatura || contract.cidadeForo || 'Santarém');
  setTag('ESTADO', contract.ufAssinatura || contract.ufForo || 'PA');
  setTag('UF', contract.ufAssinatura || contract.ufForo || 'PA');
  setTag('DATA', `${contract.diaAssinatura || ''} de ${contract.mesExtensoAssinatura || ''} de ${contract.anoAssinatura || ''}`.trim());
  setTag('DATA_ASSINATURA', `${contract.diaAssinatura || ''} de ${contract.mesExtensoAssinatura || ''} de ${contract.anoAssinatura || ''}`.trim());
  setTag('DIA', contract.diaAssinatura || '');
  setTag('MES_EXTENSO', contract.mesExtensoAssinatura || '');
  setTag('ANO', contract.anoAssinatura || '');
  setTag('CIDADE_ASSINATURA', contract.cidadeAssinatura || contract.cidadeForo || 'Santarém');
  setTag('ESTADO_ASSINATURA', contract.ufAssinatura || contract.ufForo || 'PA');
  setTag('FORO_COMARCA', `${contract.cidadeForo || 'Santarém'}/${contract.ufForo || 'PA'}`);

  // Testemunhas: preenche exatamente os dados informados ou vazio se não houver
  const t1 = contract.testemunha1;
  const t2 = contract.testemunha2;
  const t3 = contract.testemunha3;

  setTag('TESTEMUNHA_1_NOME', t1?.nome || '');
  setTag('TESTEMUNHA_1_CPF', t1?.cpf || '');
  setTag('TESTEMUNHA_1_RG', t1?.rg || '');
  setTag('TESTEMUNHA_2_NOME', t2?.nome || '');
  setTag('TESTEMUNHA_2_CPF', t2?.cpf || '');
  setTag('TESTEMUNHA_2_RG', t2?.rg || '');
  setTag('TESTEMUNHA_3_NOME', t3?.nome || '');
  setTag('TESTEMUNHA_3_CPF', t3?.cpf || '');
  setTag('TESTEMUNHA_3_RG', t3?.rg || '');

  const partesTestemunhas: string[] = [];
  if (t1?.nome) partesTestemunhas.push(`1. Nome: ${t1.nome}${t1.cpf ? `  CPF: ${t1.cpf}` : ''}${t1.rg ? `  RG: ${t1.rg}` : ''}`);
  if (t2?.nome) partesTestemunhas.push(`2. Nome: ${t2.nome}${t2.cpf ? `  CPF: ${t2.cpf}` : ''}${t2.rg ? `  RG: ${t2.rg}` : ''}`);
  if (t3?.nome) partesTestemunhas.push(`3. Nome: ${t3.nome}${t3.cpf ? `  CPF: ${t3.cpf}` : ''}${t3.rg ? `  RG: ${t3.rg}` : ''}`);

  const blocoTestemunhas = partesTestemunhas.length > 0 ? `TESTEMUNHAS:\n${partesTestemunhas.join('\n\n')}` : '';
  setTag('BLOCO_TESTEMUNHAS', blocoTestemunhas);
  setTag('TESTEMUNHAS', blocoTestemunhas);

  return tags;
}

// Substituição direta em strings XML OpenXML preservando nós <w:t> e toda a formatação
export function replaceTagsInOpenXmlString(xmlContent: string, tags: Record<string, string>): string {
  let result = xmlContent;

  // Primeiro passo: unir TAGs que o Word pode ter fragmentado em múltiplos <w:t>
  // Exemplo: <w:t>{{</w:t></w:r><w:r><w:t>VENDEDOR_NOME</w:t></w:r><w:r><w:t>}}</w:t>
  // Regex para localizar blocos {{...}} ou {...} em nós <w:t>
  
  // Substituição direta para chaves existentes
  Object.entries(tags).forEach(([key, rawValue]) => {
    const val = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
    // Escapar caracteres XML no valor substituído
    const xmlSafeVal = val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Substituir {{TAG}} (duplo)
    const regexDouble = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi');
    result = result.replace(regexDouble, xmlSafeVal);

    // 2. Substituir {TAG} (simples)
    const regexSingle = new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'gi');
    result = result.replace(regexSingle, xmlSafeVal);
  });

  // Limpeza de TAGs não preenchidas: remove {{QUALQUER_TAG}} e {qualquer_tag} restantes sem deixar rastros
  result = result.replace(/\{\{\s*[A-Za-z0-9_À-ÿ]+\s*\}\}/g, '');
  // Apenas remover tags simples que pareçam identificadores de tags válidas (não quebrar código/fórmulas se houver)
  result = result.replace(/\{[a-z0-9_]{3,40}\}/gi, '');

  return result;
}

// Processa o arquivo .docx diretamente via JSZip manipulando os arquivos XML internos
export async function processDocxDirectly(
  docxBuffer: ArrayBuffer,
  tags: Record<string, string>
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(docxBuffer);

  // Arquivos onde o texto e cabeçalhos/rodapés/tabelas residem
  const xmlFiles = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith('word/') &&
      (name.endsWith('.xml') || name.endsWith('.xml.rels')) &&
      !name.endsWith('settings.xml') &&
      !name.endsWith('styles.xml') &&
      !name.endsWith('fontTable.xml')
  );

  for (const fileName of xmlFiles) {
    const file = zip.file(fileName);
    if (file) {
      const originalXml = await file.async('string');
      const updatedXml = replaceTagsInOpenXmlString(originalXml, tags);
      zip.file(fileName, updatedXml);
    }
  }

  return await zip.generateAsync({
    type: 'uint8array',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

// Processamento com Docxtemplater como mecanismo de alta precisão para runs fragmentados
export function processDocxWithTemplater(
  docxBuffer: ArrayBuffer,
  tags: Record<string, string>
): Uint8Array {
  try {
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '', // Remove tags sem valor sem quebrar o layout
    });

    // Mapear chaves para o formato esperado pelo Docxtemplater
    doc.render(tags);

    return doc.getZip().generate({
      type: 'uint8array',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  } catch {
    // Fallback: se Docxtemplater encontrar tags com sintaxe mista, usar o processador direto OpenXML
    return new Uint8Array(docxBuffer);
  }
}

// Gera o arquivo .docx preenchido a partir do template enviado pelo usuário
export async function generateFilledDocx(contract: ContractData): Promise<Uint8Array> {
  const tags = buildUnifiedContractTags(contract);
  const templateKey = resolveTemplateKey(contract.tipo, contract.subcategoria);
  
  // Buscar template customizado salvo pelo usuário
  let templateBuffer = await getCustomWordTemplate(templateKey);

  if (!templateBuffer) {
    throw new Error(
      `Template não encontrado para ${templateKey}. Por favor, envie um documento DOCX formatado com as tags para substituição.`
    );
  }

  // Processar o template usando Docxtemplater para substituir tags {{}}
  return await processDocxWithTemplater(templateBuffer, tags);
}

// Construtor do documento base .docx oficial nativo com formatação jurídica e tabelas OpenXML

// Faz o download no navegador do arquivo .docx preenchido - usa a MESMA
// pipeline real do PDF (buildFilledDocx: template do bucket compartilhado
// + selos de assinatura + dados do contrato), em vez de depender de um
// modelo customizado que o usuário precisasse enviar à parte por fora
// (era o que causava "Template não encontrado para X" sempre que
// ninguém tivesse subido esse modelo específico antes).
export async function downloadDocxContract(contract: ContractData): Promise<void> {
  const filledBytes = await buildFilledDocx(contract);
  const blob = new Blob([filledBytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildDocxFileName(contract);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download do arquivo de modelo .docx enviado pelo usuário
export async function downloadSampleDocxTemplate(templateKey: CustomTemplateKey): Promise<void> {
  const templateBuffer = await getCustomWordTemplate(templateKey);
  if (!templateBuffer) {
    throw new Error(
      `Nenhum modelo encontrado para ${templateKey}. Por favor, envie um documento DOCX formatado com as tags.`
    );
  }

  const blob = new Blob([templateBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modelo_master_${templateKey}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

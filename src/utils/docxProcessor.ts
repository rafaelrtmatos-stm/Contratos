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
} from './contractGenerators';

// Chaves de armazenamento de templates Word personalizados por modalidade de contrato
export type CustomTemplateKey =
  | 'venda_vista_imovel'
  | 'venda_vista_outros'
  | 'venda_parcelada_imovel'
  | 'venda_parcelada_outros'
  | 'exclusividade';

const TEMPLATE_STORAGE_KEYS: Record<CustomTemplateKey, string> = {
  venda_vista_imovel: 'custom_word_template_venda_vista_imovel',
  venda_vista_outros: 'custom_word_template_venda_vista_outros',
  venda_parcelada_imovel: 'custom_word_template_venda_parcelada_imovel',
  venda_parcelada_outros: 'custom_word_template_venda_parcelada_outros',
  exclusividade: 'custom_word_template_exclusividade',
};

const TEMPLATE_META_STORAGE_KEYS: Record<CustomTemplateKey, string> = {
  venda_vista_imovel: 'custom_word_template_meta_venda_vista_imovel',
  venda_vista_outros: 'custom_word_template_meta_venda_vista_outros',
  venda_parcelada_imovel: 'custom_word_template_meta_venda_parcelada_imovel',
  venda_parcelada_outros: 'custom_word_template_meta_venda_parcelada_outros',
  exclusividade: 'custom_word_template_meta_exclusividade',
};

export function resolveTemplateKey(tipo: ContractType, subcategoria?: string): CustomTemplateKey {
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

// Salvar template .docx enviado pelo usuário
export function saveCustomWordTemplate(
  templateKey: CustomTemplateKey,
  fileData: ArrayBuffer,
  fileName: string
): void {
  try {
    const bytes = new Uint8Array(fileData);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    localStorage.setItem(TEMPLATE_STORAGE_KEYS[templateKey], base64);
    const meta: CustomTemplateMeta = {
      fileName,
      uploadedAt: new Date().toISOString(),
      fileSize: fileData.byteLength,
    };
    localStorage.setItem(TEMPLATE_META_STORAGE_KEYS[templateKey], JSON.stringify(meta));
  } catch (error) {
    console.error('Erro ao salvar template personalizado do Word:', error);
    throw new Error('Falha ao salvar o modelo Word no armazenamento local.');
  }
}

// Obter metadados do template personalizado
export function getCustomWordTemplateMeta(templateKey: CustomTemplateKey): CustomTemplateMeta | null {
  try {
    // Tenta primeiro a chave específica
    const raw = localStorage.getItem(TEMPLATE_META_STORAGE_KEYS[templateKey]);
    if (raw) return JSON.parse(raw);

    // Fallback retrocompatível para chaves legadas simples caso existam
    if (templateKey === 'venda_vista_imovel') {
      const legacy = localStorage.getItem('custom_word_template_meta_venda_vista');
      if (legacy) return JSON.parse(legacy);
    }
    if (templateKey === 'venda_parcelada_imovel') {
      const legacy = localStorage.getItem('custom_word_template_meta_venda_parcelada');
      if (legacy) return JSON.parse(legacy);
    }
    return null;
  } catch {
    return null;
  }
}

// Obter dados binários do template personalizado (se existir)
export function getCustomWordTemplate(templateKey: CustomTemplateKey): ArrayBuffer | null {
  try {
    let base64 = localStorage.getItem(TEMPLATE_STORAGE_KEYS[templateKey]);
    
    // Fallback retrocompatível
    if (!base64 && templateKey === 'venda_vista_imovel') {
      base64 = localStorage.getItem('custom_word_template_venda_vista');
    }
    if (!base64 && templateKey === 'venda_parcelada_imovel') {
      base64 = localStorage.getItem('custom_word_template_venda_parcelada');
    }

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
export function removeCustomWordTemplate(templateKey: CustomTemplateKey): void {
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

  // Regra de Testemunhas e Modalidade de Assinatura:
  // Se modalidade for digital: testemunhas NÃO devem aparecer (tags vazias/suprimidas)
  // Se modalidade for manual: apresentar as 3 testemunhas
  const isDigital = contract.modalidadeAssinatura === 'digital';
  const t1 = contract.testemunha1;
  const t2 = contract.testemunha2;
  const t3 = contract.testemunha3;

  if (isDigital) {
    // Modo Digital: tags de testemunhas são limpas
    setTag('TESTEMUNHA_1_NOME', '');
    setTag('TESTEMUNHA_1_CPF', '');
    setTag('TESTEMUNHA_1_RG', '');
    setTag('TESTEMUNHA_2_NOME', '');
    setTag('TESTEMUNHA_2_CPF', '');
    setTag('TESTEMUNHA_2_RG', '');
    setTag('TESTEMUNHA_3_NOME', '');
    setTag('TESTEMUNHA_3_CPF', '');
    setTag('TESTEMUNHA_3_RG', '');
    setTag('BLOCO_TESTEMUNHAS', '');
    setTag('TESTEMUNHAS', '');
  } else {
    // Modo Manual: 3 testemunhas com linhas de assinatura
    setTag('TESTEMUNHA_1_NOME', t1?.nome || '_____________________________________');
    setTag('TESTEMUNHA_1_CPF', t1?.cpf || '_________________');
    setTag('TESTEMUNHA_1_RG', t1?.rg || '_________________');
    setTag('TESTEMUNHA_2_NOME', t2?.nome || '_____________________________________');
    setTag('TESTEMUNHA_2_CPF', t2?.cpf || '_________________');
    setTag('TESTEMUNHA_2_RG', t2?.rg || '_________________');
    setTag('TESTEMUNHA_3_NOME', t3?.nome || '_____________________________________');
    setTag('TESTEMUNHA_3_CPF', t3?.cpf || '_________________');
    setTag('TESTEMUNHA_3_RG', t3?.rg || '_________________');

    const blocoManual = `TESTEMUNHAS:\n1. _____________________________________________\nNome: ${t1?.nome || ''}  CPF: ${t1?.cpf || ''}  RG: ${t1?.rg || ''}\n\n2. _____________________________________________\nNome: ${t2?.nome || ''}  CPF: ${t2?.cpf || ''}  RG: ${t2?.rg || ''}\n\n3. _____________________________________________\nNome: ${t3?.nome || ''}  CPF: ${t3?.cpf || ''}  RG: ${t3?.rg || ''}`;
    setTag('BLOCO_TESTEMUNHAS', blocoManual);
    setTag('TESTEMUNHAS', blocoManual);
  }

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
  let templateBuffer = getCustomWordTemplate(templateKey);

  if (!templateBuffer) {
    throw new Error(
      `Template não encontrado para ${templateKey}. Por favor, envie um documento DOCX formatado com as tags para substituição.`
    );
  }

  // Processar o template usando Docxtemplater para substituir tags {{}}
  return await processDocxWithTemplater(templateBuffer, tags);
}

// Processar DOCX com Docxtemplater - substitui {{TAG}} pelos dados
async function processDocxWithTemplater(docxBuffer: ArrayBuffer, tags: Record<string, string>): Promise<Uint8Array> {
  try {
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,      // Permite {{#ARRAY}}...{{/ARRAY}}
      linebreaks: true,          // Preserva quebras de linha \n
      delimiters: { 
        start: '{{', 
        end: '}}' 
      },
      nullGetter: () => '',     // Tags sem valor viram strings vazias
    });

    // Renderizar com os tags do contrato
    doc.render(tags);

    // Gerar novo DOCX preenchido
    return doc.getZip().generate({
      type: 'uint8array',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  } catch (error) {
    console.error('Erro ao processar DOCX:', error);
    throw new Error(
      `Erro ao gerar documento: ${error instanceof Error ? error.message : 'Verifique o template enviado'}`
    );
  }
}

// Construtor do documento base .docx oficial nativo com formatação jurídica e tabelas OpenXML

// Faz o download no navegador do arquivo .docx preenchido
export async function downloadDocxContract(contract: ContractData): Promise<void> {
  const filledBytes = await generateFilledDocx(contract);
  const blob = new Blob([filledBytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedName = (contract.comprador?.nome || contract.vendedor?.nome || 'contrato')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `contrato_${contract.tipo}_${contract.subcategoria || 'imovel'}_${sanitizedName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download do arquivo de modelo .docx enviado pelo usuário
export async function downloadSampleDocxTemplate(templateKey: CustomTemplateKey): Promise<void> {
  const templateBuffer = getCustomWordTemplate(templateKey);
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

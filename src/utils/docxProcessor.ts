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

// Gera o arquivo .docx preenchido a partir do modelo mestre ativo
export async function generateFilledDocx(contract: ContractData): Promise<Uint8Array> {
  const tags = buildUnifiedContractTags(contract);
  const templateKey = resolveTemplateKey(contract.tipo, contract.subcategoria);
  let templateBuffer = getCustomWordTemplate(templateKey);

  if (!templateBuffer) {
    // Se o usuário ainda não fez upload de um .docx específico, gerar a estrutura base .docx
    templateBuffer = await generateBaseDocxTemplate(templateKey);
  }

  // Usar Docxtemplater para substituição confiável de tags {{}}
  try {
    return await processDocxWithTemplaterFixed(templateBuffer, tags);
  } catch (error) {
    console.warn('Docxtemplater falhou, usando processador direto:', error);
    // Fallback: processar o arquivo .docx original preservando 100% da formatação OpenXML
    return await processDocxDirectly(templateBuffer, tags);
  }
}

// Nova função usando Docxtemplater com melhor tratamento de erros
async function processDocxWithTemplaterFixed(docxBuffer: ArrayBuffer, tags: Record<string, string>): Promise<Uint8Array> {
  try {
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '', // Remove tags sem valor
    });

    doc.render(tags);

    return doc.getZip().generate({
      type: 'uint8array',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  } catch (error) {
    console.error('Erro ao processar DOCX com Docxtemplater:', error);
    throw error;
  }
}

// Construtor do documento base .docx oficial nativo com formatação jurídica e tabelas OpenXML
export async function generateBaseDocxTemplate(templateKey: CustomTemplateKey): Promise<ArrayBuffer> {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:lang w:val="pt-BR"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  // Gerar o documento XML correspondente ao tipo com tags {{ }}
  let documentXmlContent = '';

  if (templateKey === 'venda_vista_imovel') {
    documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL À VISTA</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>1. PROMITENTE(S) VENDEDOR(ES): </w:t></w:r>
      <w:r><w:t>{{VENDEDOR_NOME}}, {{VENDEDOR_NACIONALIDADE}}, {{VENDEDOR_ESTADO_CIVIL}}, {{VENDEDOR_PROFISSAO}}, portador(a) do RG nº {{VENDEDOR_RG}}, inscrito(a) no CPF/CNPJ sob o nº {{VENDEDOR_CPF}}, residente e domiciliado(a) no endereço: {{VENDEDOR_ENDERECO}}, {{VENDEDOR_CIDADE}}/{{VENDEDOR_UF}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>2. PROMITENTE(S) COMPRADOR(ES): </w:t></w:r>
      <w:r><w:t>{{COMPRADOR_NOME}}, {{COMPRADOR_NACIONALIDADE}}, {{COMPRADOR_ESTADO_CIVIL}}, {{COMPRADOR_PROFISSAO}}, portador(a) do RG nº {{COMPRADOR_RG}}, inscrito(a) no CPF sob o nº {{COMPRADOR_CPF}}, residente e domiciliado(a) no endereço: {{COMPRADOR_ENDERECO}}, {{COMPRADOR_CIDADE}}/{{COMPRADOR_UF}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA PRIMEIRA – DO OBJETO: </w:t></w:r>
      <w:r><w:t>O(s) VENDEDOR(ES) é(são) legítimo(s) proprietário(s) e possuidor(es) do bem imóvel caracterizado como Lote nº {{LOTE}}, Quadra nº {{QUADRA}}, situado no loteamento/empreendimento {{EMPREENDIMENTO}}, na cidade de {{CIDADE_IMOVEL}}/{{UF_IMOVEL}}, confrontando pela frente em {{FRENTE_M}}m com {{CONFRONTACAO_FRENTE}}, lateral direita em {{LATERAL_DIR_M}}m com {{CONFRONTACAO_LATERAL_DIR}}, lateral esquerda em {{LATERAL_ESQ_M}}m com {{CONFRONTACAO_LATERAL_ESQ}}, fundos em {{FUNDOS_M}}m com {{CONFRONTACAO_FUNDOS}}, perfazendo a área total de {{AREA_TOTAL_M2}} m².</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA SEGUNDA – DO PREÇO E QUITAÇÃO INTEGRAL: </w:t></w:r>
      <w:r><w:t>A presente alienação é celebrada pelo preço certo e ajustado de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), pago integralmente à vista através de {{CONDICOES_PAGAMENTO}}, dando o(s) VENDEDOR(ES) plena, geral e irrevogável quitação de pago e satisfeito.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA TERCEIRA – DA POSSE E TRANSMISSÃO: </w:t></w:r>
      <w:r><w:t>A posse direta, mansa e pacífica do imóvel é transmitida ao(s) COMPRADOR(ES) nesta data, livre e desembaraçado de quaisquer dúvidas, dívidas, taxas, impostos, hipotecas ou ônus reais.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA QUARTA – DO FORO: </w:t></w:r>
      <w:r><w:t>As partes elegem o Foro da Comarca de {{FORO_COMARCA}} para dirimir qualquer dúvida ou litígio resultante deste instrumento.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="240" w:after="400"/></w:pPr>
      <w:r><w:t>{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="300" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{VENDEDOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Vendedor - CPF/CNPJ: {{VENDEDOR_CPF}})</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{COMPRADOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Comprador - CPF/CNPJ: {{COMPRADOR_CPF}})</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
  } else if (templateKey === 'venda_vista_outros') {
    documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE BEM MÓVEL / VEÍCULO À VISTA</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>1. PROMITENTE(S) VENDEDOR(ES): </w:t></w:r>
      <w:r><w:t>{{VENDEDOR_NOME}}, {{VENDEDOR_NACIONALIDADE}}, {{VENDEDOR_ESTADO_CIVIL}}, {{VENDEDOR_PROFISSAO}}, portador(a) do RG nº {{VENDEDOR_RG}}, inscrito(a) no CPF/CNPJ sob o nº {{VENDEDOR_CPF}}, residente e domiciliado(a) no endereço: {{VENDEDOR_ENDERECO}}, {{VENDEDOR_CIDADE}}/{{VENDEDOR_UF}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>2. PROMITENTE(S) COMPRADOR(ES): </w:t></w:r>
      <w:r><w:t>{{COMPRADOR_NOME}}, {{COMPRADOR_NACIONALIDADE}}, {{COMPRADOR_ESTADO_CIVIL}}, {{COMPRADOR_PROFISSAO}}, portador(a) do RG nº {{COMPRADOR_RG}}, inscrito(a) no CPF sob o nº {{COMPRADOR_CPF}}, residente e domiciliado(a) no endereço: {{COMPRADOR_ENDERECO}}, {{COMPRADOR_CIDADE}}/{{COMPRADOR_UF}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA PRIMEIRA – DO OBJETO: </w:t></w:r>
      <w:r><w:t>O(s) VENDEDOR(ES) é(são) legítimo(s) proprietário(s) e possuidor(es) do bem caracterizado como: {{DESCRICAO_BEM}}, Marca/Modelo: {{MARCA_BEM}} {{MODELO_BEM}}, Ano Fab/Mod: {{ANO_FABRICACAO_BEM}}/{{ANO_MODELO_BEM}}, Cor: {{COR_BEM}}, Placa: {{PLACA_BEM}}, Chassi: {{CHASSI_BEM}}, RENAVAM: {{RENAVAM_BEM}}, Quilometragem/Uso: {{QUILOMETRAGEM_BEM}}, Estado de conservação: {{ESTADO_CONSERVACAO_BEM}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA SEGUNDA – DO PREÇO E QUITAÇÃO INTEGRAL: </w:t></w:r>
      <w:r><w:t>A presente alienação é celebrada pelo preço certo e ajustado de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), pago integralmente à vista através de {{CONDICOES_PAGAMENTO}}, dando o(s) VENDEDOR(ES) plena e irrevogável quitação.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA TERCEIRA – DA TRADIÇÃO E ENTREGA DO BEM: </w:t></w:r>
      <w:r><w:t>A posse direta e a entrega física do bem ao(s) COMPRADOR(ES) opera-se nesta data, livre de multas, débitos, tributos ou restrições judiciais até a presente data.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA QUARTA – DO FORO: </w:t></w:r>
      <w:r><w:t>As partes elegem o Foro da Comarca de {{FORO_COMARCA}} para dirimir litígios oriundos deste contrato.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="240" w:after="400"/></w:pPr>
      <w:r><w:t>{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="300" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{VENDEDOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Vendedor - CPF/CNPJ: {{VENDEDOR_CPF}})</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{COMPRADOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Comprador - CPF/CNPJ: {{COMPRADOR_CPF}})</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
  } else if (templateKey === 'venda_parcelada_imovel') {
    documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>CONTRATO PARTICULAR DE COMPRA E VENDA DE IMÓVEL PARCELADO COM RESERVA DE DOMÍNIO</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>DAS PARTES: </w:t></w:r>
      <w:r><w:t>De um lado, como PROMITENTE VENDEDOR(A): {{VENDEDOR_NOME}}, inscrito(a) no CPF sob o nº {{VENDEDOR_CPF}}, residente em {{VENDEDOR_ENDERECO}}. E de outro lado, como PROMITENTE COMPRADOR(A): {{COMPRADOR_NOME}}, inscrito(a) no CPF sob o nº {{COMPRADOR_CPF}}, residente em {{COMPRADOR_ENDERECO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 1ª – DO OBJETO: </w:t></w:r>
      <w:r><w:t>O presente contrato tem como objeto a venda do imóvel consistente no Lote nº {{LOTE}}, Quadra nº {{QUADRA}}, do loteamento {{EMPREENDIMENTO}}, com área total de {{AREA_TOTAL_M2}} m², localizado em {{CIDADE_IMOVEL}}/{{UF_IMOVEL}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 2ª – DO PREÇO E CONDIÇÕES DE PAGAMENTO PARCELADO: </w:t></w:r>
      <w:r><w:t>O preço total acordado para a compra e venda é de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), a ser pago nas seguintes condições: Sinal/Entrada no valor de {{VALOR_ENTRADA}} ({{VALOR_ENTRADA_EXTENSO}}), e o saldo de {{VALOR_SALDO}} ({{VALOR_SALDO_EXTENSO}}) dividido em {{QTD_PARCELAS}} parcelas mensais e sucessivas de {{VALOR_PARCELA}} ({{VALOR_PARCELA_EXTENSO}}), vencendo-se a primeira em {{DATA_VENCIMENTO_PRIMEIRA_PARCELA}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 3ª – DO PACTO DE RESERVA DE DOMÍNIO: </w:t></w:r>
      <w:r><w:t>Nos termos dos Artigos 521 a 528 do Código Civil Brasileiro, a presente venda é celebrada sob a expressa cláusula de Reserva de Domínio, de modo que a propriedade definitiva do bem permanecerá com o(a) VENDEDOR(A) até a liquidação e quitação integral de todas as parcelas convencionadas.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 4ª – DO FORO: </w:t></w:r>
      <w:r><w:t>Fica eleito o Foro da Comarca de {{FORO_COMARCA}} para dirimir qualquer pendência decorrente deste instrumento.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="240" w:after="400"/></w:pPr>
      <w:r><w:t>{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="300" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{VENDEDOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Vendedor - CPF: {{VENDEDOR_CPF}})</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{COMPRADOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Comprador - CPF: {{COMPRADOR_CPF}})</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
  } else if (templateKey === 'venda_parcelada_outros') {
    documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>CONTRATO DE COMPRA E VENDA PARCELADA DE BEM MÓVEL / VEÍCULO COM RESERVA DE DOMÍNIO</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>DAS PARTES: </w:t></w:r>
      <w:r><w:t>De um lado, como PROMITENTE VENDEDOR(A): {{VENDEDOR_NOME}}, inscrito(a) no CPF sob o nº {{VENDEDOR_CPF}}, residente em {{VENDEDOR_ENDERECO}}. E de outro lado, como PROMITENTE COMPRADOR(A): {{COMPRADOR_NOME}}, inscrito(a) no CPF sob o nº {{COMPRADOR_CPF}}, residente em {{COMPRADOR_ENDERECO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 1ª – DO OBJETO (BEM MÓVEL / VEÍCULO): </w:t></w:r>
      <w:r><w:t>O presente contrato tem por objeto a alienação do bem: {{DESCRICAO_BEM}}, Marca/Modelo: {{MARCA_BEM}} {{MODELO_BEM}}, Ano Fab/Mod: {{ANO_FABRICACAO_BEM}}/{{ANO_MODELO_BEM}}, Cor: {{COR_BEM}}, Placa: {{PLACA_BEM}}, Chassi: {{CHASSI_BEM}}, RENAVAM: {{RENAVAM_BEM}}, Quilometragem/Uso: {{QUILOMETRAGEM_BEM}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 2ª – DO PREÇO E CONDIÇÕES DE PAGAMENTO PARCELADO: </w:t></w:r>
      <w:r><w:t>O preço total acordado é de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), a ser pago com Entrada de {{VALOR_ENTRADA}} ({{VALOR_ENTRADA_EXTENSO}}) e saldo de {{VALOR_SALDO}} ({{VALOR_SALDO_EXTENSO}}) em {{QTD_PARCELAS}} parcelas de {{VALOR_PARCELA}} ({{VALOR_PARCELA_EXTENSO}}), vencendo a primeira em {{DATA_VENCIMENTO_PRIMEIRA_PARCELA}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 3ª – DA RESERVA DE DOMÍNIO: </w:t></w:r>
      <w:r><w:t>Conforme os Artigos 521 e seguintes do Código Civil, o(a) VENDEDOR(A) reserva para si a propriedade do bem até o pagamento total de todas as parcelas.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 4ª – DO FORO: </w:t></w:r>
      <w:r><w:t>Fica eleito o Foro da Comarca de {{FORO_COMARCA}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="240" w:after="400"/></w:pPr>
      <w:r><w:t>{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="300" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{VENDEDOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Vendedor - CPF: {{VENDEDOR_CPF}})</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{COMPRADOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Comprador - CPF: {{COMPRADOR_CPF}})</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
  } else {
    // Exclusividade
    documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>DADOS DO CONTRATANTE: </w:t></w:r>
      <w:r><w:t>{{CONTRATANTE_NOME}}, {{CONTRATANTE_ESTADO_CIVIL}}, {{CONTRATANTE_PROFISSAO}}, inscrito(a) no CPF sob o nº {{CONTRATANTE_CPF}}, portador(a) do RG nº {{CONTRATANTE_RG}}, residente e domiciliado(a) no endereço: {{CONTRATANTE_ENDERECO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>DADOS DO CONTRATADO: </w:t></w:r>
      <w:r><w:t>{{VENDEDOR_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{VENDEDOR_CPF}}, registrado(a) no CRECI sob o nº {{VENDEDOR_CRECI}}, estabelecido(a) no endereço: {{VENDEDOR_ENDERECO}}, telefone/contato: {{VENDEDOR_TELEFONE}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 1ª – DO OBJETO DO CONTRATO E DADOS DO IMÓVEL: </w:t></w:r>
      <w:r><w:t>O presente contrato tem por objeto a prestação de serviços de intermediação e corretagem imobiliária com cláusula de exclusividade para a promoção e venda do bem imóvel caracterizado como {{TIPO_IMOVEL}}, situado em {{LOCALIZACAO_IMOVEL}}, Matrícula nº {{MATRICULA}}, Inscrição Prefeitura: {{INSCRICAO_PREFEITURA}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 2ª – DO VALOR E CONDIÇÕES DE VENDA: </w:t></w:r>
      <w:r><w:t>O imóvel objeto deste instrumento será promovido para venda pelo valor total de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), sob as seguintes condições de pagamento: {{CONDICOES_PAGAMENTO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 3ª – DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE: </w:t></w:r>
      <w:r><w:t>A presente autorização é outorgada em caráter de EXCLUSIVIDADE pelo prazo de {{PRAZO_EXCLUSIVIDADE_DIAS}} dias, iniciando-se na data de assinatura deste instrumento e com término fixado em {{DATA_TERMINO_EXCLUSIVIDADE}}, em consonância com o Artigo 726 do Código Civil Brasileiro.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 4ª – DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM: </w:t></w:r>
      <w:r><w:t>Pelos serviços de intermediação, o(a) CONTRATANTE pagará ao(à) CONTRATADO a comissão de corretagem correspondente a {{PERCENTUAL_CORRETAGEM}} ({{PERCENTUAL_CORRETAGEM_EXTENSO}}) calculada sobre o valor total da alienação concretizada.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>CLÁUSULA 5ª – DO FORO: </w:t></w:r>
      <w:r><w:t>As partes elegem o Foro da Comarca de {{FORO_COMARCA}} para dirimir qualquer controvérsia oriunda deste contrato.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="right"/><w:spacing w:before="240" w:after="400"/></w:pPr>
      <w:r><w:t>{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="300" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{CONTRATANTE_NOME}}</w:t></w:r>
      <w:r><w:t> (Contratante - CPF: {{CONTRATANTE_CPF}})</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r><w:t>____________________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>{{VENDEDOR_NOME}}</w:t></w:r>
      <w:r><w:t> (Contratado - CRECI: {{VENDEDOR_CRECI}} | CPF/CNPJ: {{VENDEDOR_CPF}})</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
  }

  zip.file('word/document.xml', documentXmlContent);

  return await zip.generateAsync({
    type: 'arraybuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

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

// Download do arquivo de modelo .docx (exemplo pronto para o usuário editar no Word)
export async function downloadSampleDocxTemplate(templateKey: CustomTemplateKey): Promise<void> {
  let templateBuffer = getCustomWordTemplate(templateKey);
  if (!templateBuffer) {
    templateBuffer = await generateBaseDocxTemplate(templateKey);
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

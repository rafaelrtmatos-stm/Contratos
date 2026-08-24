/**
 * Processa tags de assinatura em documentos DOCX
 * Substitui a tag pelo carimbo real de assinatura (nome, CPF, data/hora e hash)
 * quando a parte já assinou digitalmente, ou por uma linha de assinatura
 * (modalidade manual) / aviso de pendência (modalidade digital ainda não assinada).
 */

import JSZip from 'jszip';
import { DigitalSignature } from '../types/contract';

export interface PartySignatureInfo {
  assinou: boolean;
  modalidade: 'digital' | 'manual';
  signature?: DigitalSignature;
  nome: string;
  documento: string;
  roleLabel: string;
}

export interface SignatureTagConfig {
  tag: string;
  tipo: 'digital' | 'manual';
  parte: 'usuario' | 'comprador';
  info: PartySignatureInfo;
}

/**
 * Tags de assinatura mapeadas por tipo
 */
export const SIGNATURE_TAGS = {
  USUARIO_DIGITAL: '{{USUARIO_ASSINATURA_DIGITAL}}',
  USUARIO_MANUAL: '{{USUARIO_ASSINATURA_MANUAL}}',
  COMPRADOR_DIGITAL: '{{COMPRADOR_ASSINATURA_DIGITAL}}',
  COMPRADOR_MANUAL: '{{COMPRADOR_ASSINATURA_MANUAL}}',
  // Contrato de Exclusividade: {{CONTRATANTE_ASSINATURA_DIGITAL}} é o selo do CONTRATANTE
  // (mapeado para o slot "comprador" internamente - ver mapTagsToConfig)
  CONTRATANTE_DIGITAL: '{{CONTRATANTE_ASSINATURA_DIGITAL}}',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Processa tags de assinatura em um arquivo DOCX
 *
 * @param docxBuffer Buffer do arquivo DOCX
 * @param tagsConfig Configuração de tags a processar
 * @returns Buffer do DOCX processado
 */
export async function processSignatureTags(
  docxBuffer: ArrayBuffer,
  tagsConfig: SignatureTagConfig[]
): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    let documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      throw new Error('Documento Word inválido - document.xml não encontrado');
    }

    // Processar cada tag de assinatura
    for (const config of tagsConfig) {
      if (config.tipo === 'digital') {
        if (config.info.assinou && config.info.signature) {
          // DIGITAL + JÁ ASSINADO: insere o carimbo com os dados reais da assinatura
          documentXml = insertDigitalSignatureStamp(documentXml, config.tag, config.info);
        } else {
          // DIGITAL + AINDA NÃO ASSINADO: insere aviso de pendência (nunca deixa a tag "crua" no documento)
          documentXml = insertPendingSignatureNotice(documentXml, config.tag, config.info);
        }
      } else {
        // MANUAL: linha em branco para assinatura física, com nome/documento da parte
        documentXml = insertSignatureSpace(documentXml, config.tag, config.info);
      }
    }

    // Atualizar XML no ZIP
    zip.file('word/document.xml', documentXml);

    // Gerar novo buffer
    return await zip.generateAsync({ type: 'arraybuffer' });
  } catch (error) {
    console.error('Erro ao processar tags de assinatura:', error);
    throw error;
  }
}

/**
 * Insere o carimbo de assinatura eletrônica com os dados reais de quem assinou
 * (nome, CPF/CNPJ, data/hora e hash de autenticação) no lugar da tag.
 */
function insertDigitalSignatureStamp(xml: string, tag: string, info: PartySignatureInfo): string {
  const sig = info.signature!;
  const dt = new Date(sig.assinadoEm);
  const dataStr = isNaN(dt.getTime()) ? sig.assinadoEm : dt.toLocaleDateString('pt-BR');
  const horaStr = isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString('pt-BR');
  const hash = (sig.hashAutenticacao || '').toUpperCase();

  const nome = escapeXml(sig.nomeSignatario || info.nome || '');
  const doc = escapeXml(sig.documentoSignatario || info.documento || '');
  const role = escapeXml(info.roleLabel || '');

  const block = `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${nome}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${role}${doc ? ` — CPF/CNPJ: ${doc}` : ''}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:i/><w:color w:val="15803D"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">Assinado eletronicamente em ${dataStr}${horaStr ? ` às ${horaStr}` : ''}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr><w:t xml:space="preserve">Código de autenticação: ${escapeXml(hash || 'N/A')}</w:t></w:r>
    </w:p>`;

  return xml.split(tag).join(block);
}

/**
 * Insere um aviso de pendência quando a modalidade é digital, mas a parte ainda não assinou.
 * Evita deixar a tag "{{...}}" crua e visível no documento final.
 */
function insertPendingSignatureNotice(xml: string, tag: string, info: PartySignatureInfo): string {
  const nome = escapeXml(info.nome || '');
  const role = escapeXml(info.roleLabel || '');

  const block = `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${nome}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${role}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:i/><w:color w:val="B45309"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">[Pendente de assinatura eletrônica]</w:t></w:r>
    </w:p>`;

  return xml.split(tag).join(block);
}

/**
 * Insere um espaço em branco (linha de assinatura) onde estava a tag, com o nome
 * e documento da parte identificados abaixo da linha.
 */
function insertSignatureSpace(xml: string, tag: string, info: PartySignatureInfo): string {
  const nome = escapeXml(info.nome || '');
  const role = escapeXml(info.roleLabel || '');
  const doc = escapeXml(info.documento || '');

  const signatureSpace = `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:line="360" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">_____________________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${nome}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${role}${doc ? ` — CPF/CNPJ: ${doc}` : ''}</w:t></w:r>
    </w:p>`;

  return xml.split(tag).join(signatureSpace);
}

/**
 * Verifica quais tags de assinatura existem em um documento
 */
export async function findSignatureTags(docxBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      return [];
    }

    const tags: string[] = [];

    // Procurar por tags de assinatura
    for (const tagKey in SIGNATURE_TAGS) {
      const tag = SIGNATURE_TAGS[tagKey as keyof typeof SIGNATURE_TAGS];
      if (documentXml.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  } catch (error) {
    console.error('Erro ao procurar tags de assinatura:', error);
    return [];
  }
}

/**
 * Mapeia tags encontradas em um documento para suas configurações, já carregando
 * os dados reais (nome, documento, assinatura) de cada parte.
 */
export function mapTagsToConfig(
  foundTags: string[],
  usuarioInfo: PartySignatureInfo,
  compradorInfo: PartySignatureInfo
): SignatureTagConfig[] {
  const config: SignatureTagConfig[] = [];

  for (const tag of foundTags) {
    if (tag.includes('USUARIO') && tag.includes('DIGITAL')) {
      config.push({ tag, tipo: 'digital', parte: 'usuario', info: usuarioInfo });
    } else if (tag.includes('USUARIO') && tag.includes('MANUAL')) {
      config.push({ tag, tipo: 'manual', parte: 'usuario', info: usuarioInfo });
    } else if (tag.includes('COMPRADOR') && tag.includes('DIGITAL')) {
      config.push({ tag, tipo: 'digital', parte: 'comprador', info: compradorInfo });
    } else if (tag.includes('COMPRADOR') && tag.includes('MANUAL')) {
      config.push({ tag, tipo: 'manual', parte: 'comprador', info: compradorInfo });
    } else if (tag.includes('CONTRATANTE') && tag.includes('DIGITAL')) {
      // Exclusividade: CONTRATANTE_ASSINATURA_DIGITAL usa o mesmo slot de compradorInfo
      config.push({ tag, tipo: 'digital', parte: 'comprador', info: compradorInfo });
    }
  }

  return config;
}

/**
 * Resumo das mudanças que serão feitas
 */
export function summarizeChanges(tagsConfig: SignatureTagConfig[]): {
  removidas: string[];
  digitais: string[];
  manuais: string[];
} {
  return {
    removidas: tagsConfig.map(t => t.tag),
    digitais: tagsConfig.filter(t => t.tipo === 'digital').map(t => `${t.parte} (${t.info.assinou ? 'selo inserido' : 'pendente'})`),
    manuais: tagsConfig.filter(t => t.tipo === 'manual').map(t => `${t.parte} (espaço para assinatura)`),
  };
}

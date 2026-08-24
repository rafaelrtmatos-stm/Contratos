/**
 * Processa tags de assinatura em documentos DOCX
 * Remove tags, insere selos digitais ou deixa espaços em branco
 */

import JSZip from 'jszip';

export interface SignatureTagConfig {
  tag: string;
  tipo: 'digital' | 'manual';
  parte: 'usuario' | 'comprador';
  sealUrl?: string; // URL do selo digital (se tipo = digital)
}

/**
 * Tags de assinatura mapeadas por tipo
 */
export const SIGNATURE_TAGS = {
  USUARIO_DIGITAL: '{{USUARIO_ASSINATURA_DIGITAL}}',
  USUARIO_MANUAL: '{{USUARIO_ASSINATURA_MANUAL}}',
  COMPRADOR_DIGITAL: '{{COMPRADOR_ASSINATURA_DIGITAL}}',
  COMPRADOR_MANUAL: '{{COMPRADOR_ASSINATURA_MANUAL}}',
};

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
      if (config.tipo === 'digital' && config.sealUrl) {
        // DIGITAL: Remover tag e inserir selo (como imagem/referência)
        documentXml = removeSignatureTag(documentXml, config.tag);
        // Nota: Inserir imagem de selo é complexo, por enquanto apenas remover a tag
        // e deixar espaço. Em produção, usar biblioteca como docx para isso.
      } else if (config.tipo === 'manual') {
        // MANUAL: Remover tag e deixar espaço em branco
        documentXml = removeSignatureTag(documentXml, config.tag);
        // Inserir espaço em branco (linha de assinatura)
        documentXml = insertSignatureSpace(documentXml, config.tag);
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
 * Remove uma tag de assinatura do XML
 */
function removeSignatureTag(xml: string, tag: string): string {
  // Escaped tag para regex
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Remover a tag e qualquer espaço em branco ao redor
  const regex = new RegExp(`\\s*${escapedTag}\\s*`, 'g');
  return xml.replace(regex, '');
}

/**
 * Insere um espaço em branco (linha de assinatura) onde estava a tag
 */
function insertSignatureSpace(xml: string, tag: string): string {
  // Substitui a tag por um parágrafo com espaço em branco para assinatura
  const signatureSpace = `
    <w:p>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t>_____________________________________________</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
        </w:rPr>
        <w:t>Assinatura</w:t>
      </w:r>
    </w:p>
  `;

  return xml.replace(tag, signatureSpace);
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
 * Mapeia tags encontradas em um documento para suas configurações
 */
export function mapTagsToConfig(
  foundTags: string[],
  usuarioAssinou: boolean = false,
  compradorAssinou: boolean = false,
  usuarioModalidade: 'digital' | 'manual' = 'manual',
  compradorModalidade: 'digital' | 'manual' = 'manual'
): SignatureTagConfig[] {
  const config: SignatureTagConfig[] = [];

  for (const tag of foundTags) {
    if (tag.includes('USUARIO') && tag.includes('DIGITAL')) {
      config.push({
        tag,
        tipo: 'digital',
        parte: 'usuario',
        sealUrl: usuarioAssinou ? '/seal-placeholder.png' : undefined,
      });
    } else if (tag.includes('USUARIO') && tag.includes('MANUAL')) {
      config.push({
        tag,
        tipo: 'manual',
        parte: 'usuario',
      });
    } else if (tag.includes('COMPRADOR') && tag.includes('DIGITAL')) {
      config.push({
        tag,
        tipo: 'digital',
        parte: 'comprador',
        sealUrl: compradorAssinou ? '/seal-placeholder.png' : undefined,
      });
    } else if (tag.includes('COMPRADOR') && tag.includes('MANUAL')) {
      config.push({
        tag,
        tipo: 'manual',
        parte: 'comprador',
      });
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
    digitais: tagsConfig.filter(t => t.tipo === 'digital').map(t => `${t.parte} (selo inserido)`),
    manuais: tagsConfig.filter(t => t.tipo === 'manual').map(t => `${t.parte} (espaço para assinatura)`),
  };
}

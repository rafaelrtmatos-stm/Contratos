/**
 * CORREÇÃO: Sistema de processamento de DOCX robustos
 * Problema: Templates padrão não persistem por tipo
 * Solução: Usar docxtemplater com templates específicos + localStorage
 */

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { ContractData } from '../types/contract';

/**
 * Melhor forma de processar DOCX com Docxtemplater
 * Garante que tags {{}} sejam substituídas corretamente
 */
export async function generateFilledDocxWithDocxtemplater(
  docxBuffer: ArrayBuffer,
  tags: Record<string, string>
): Promise<Uint8Array> {
  try {
    const zip = new PizZip(docxBuffer);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,      // Permite loops em parágrafos
      linebreaks: true,          // Preserva quebras de linha
      delimiters: { 
        start: '{{', 
        end: '}}' 
      },
      nullGetter: () => '',     // Tags sem valor viram strings vazias
      xml: {
        parseXML: (xmlString: string) => {
          const parser = new DOMParser();
          return parser.parseFromString(xmlString, 'application/xml');
        },
        serializeXML: (xmlObject: any) => {
          const serializer = new XMLSerializer();
          return serializer.serializeToString(xmlObject);
        },
      },
    });

    // Renderizar com as tags
    doc.render(tags);

    // Gerar o novo documento
    return doc.getZip().generate({
      type: 'uint8array',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  } catch (error) {
    console.error('Erro ao processar DOCX com Docxtemplater:', error);
    throw new Error(`Falha ao processar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Validar se um template tem todas as tags obrigatórias
 */
export function validateTemplateHasTags(xmlContent: string, requiredTags: string[]): {
  isValid: boolean;
  missingTags: string[];
} {
  const missingTags: string[] = [];
  
  requiredTags.forEach(tag => {
    const patterns = [
      `{{${tag}}}`,
      `{{ ${tag} }}`,
      `{{${tag.toUpperCase()}}}`,
      `{{ ${tag.toUpperCase()} }}`,
    ];
    
    const hasTag = patterns.some(p => xmlContent.includes(p));
    if (!hasTag) {
      missingTags.push(tag);
    }
  });

  return {
    isValid: missingTags.length === 0,
    missingTags
  };
}

/**
 * Criar um template DOCX mínimo viável com Docxtemplater
 * Compatível com {{tag}} substitution
 */
export async function createMinimalDocxTemplate(
  title: string,
  contenido: string
): Promise<ArrayBuffer> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Structure mínima de um DOCX
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>
      <w:r>
        <w:t>${contenido}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`);

  return zip.generateAsync({
    type: 'arraybuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

/**
 * Verificar se template é válido DOCX
 */
export function isValidDocxBuffer(buffer: ArrayBuffer): boolean {
  try {
    // DOCX é um ZIP, e ZIP começa com 4 bytes específicos
    const view = new Uint8Array(buffer);
    const signature = (view[0] << 24) | (view[1] << 16) | (view[2] << 8) | view[3];
    // ZIP signature é 0x504B0304
    return signature === 0x504B0304;
  } catch {
    return false;
  }
}

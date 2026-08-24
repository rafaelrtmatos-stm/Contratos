/**
 * Processa tags de assinatura em documentos DOCX
 * Substitui a tag pelo carimbo real de assinatura (nome, CPF, data/hora e hash)
 * quando a parte já assinou digitalmente, ou por uma linha de assinatura
 * (modalidade manual) / aviso de pendência (modalidade digital ainda não assinada).
 */

import JSZip from 'jszip';
import { DigitalSignature } from '../types/contract';
import { renderSignatureStampPng } from './signatureStampImage';

const EMU_PER_MM = 36000;
const STAMP_WIDTH_MM = 69.3; // 33% da largura da página A4 (210mm)

/** Adiciona um PNG ao pacote DOCX (media + relacionamento + content type) e retorna o rId. */
async function addImageToDocx(zip: JSZip, pngBytes: Uint8Array): Promise<string> {
  const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
  let maxImgIdx = 0;
  for (const f of mediaFiles) {
    const m = f.match(/image(\d+)\./i);
    if (m) maxImgIdx = Math.max(maxImgIdx, parseInt(m[1], 10));
  }
  const imgIdx = maxImgIdx + 1;
  zip.file(`word/media/image${imgIdx}.png`, pngBytes);

  const relsPath = 'word/_rels/document.xml.rels';
  let relsXml = await zip.file(relsPath)?.async('string');
  if (!relsXml) {
    relsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  }
  const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10));
  const nextRid = (existingIds.length ? Math.max(...existingIds) : 0) + 1;
  const rId = `rId${nextRid}`;
  const relEntry = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${imgIdx}.png"/>`;
  relsXml = relsXml.replace('</Relationships>', `${relEntry}</Relationships>`);
  zip.file(relsPath, relsXml);

  const ctPath = '[Content_Types].xml';
  const ctXml = await zip.file(ctPath)?.async('string');
  if (ctXml && !/Extension="png"/i.test(ctXml)) {
    zip.file(ctPath, ctXml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>'));
  }

  return rId;
}

function signatureIdFromHash(hash?: string): string {
  const h = (hash || '').toUpperCase();
  if (h.length < 16) return (h || 'PENDENTE').padEnd(16, '0').replace(/(.{4})/g, '$1-').slice(0, 19);
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

function buildValidationUrl(signatureId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/validar?sig=${encodeURIComponent(signatureId)}`;
}

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
  // Contrato de Exclusividade (modalidade mista): {{CONTRATANTE_ASSINATURA_MANUAL}} é o
  // espaço/linha de assinatura manuscrita do CONTRATANTE (mapeado para o slot "comprador")
  CONTRATANTE_MANUAL: '{{CONTRATANTE_ASSINATURA_MANUAL}}',
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
          // DIGITAL + JÁ ASSINADO: insere o selo visual (imagem PNG) com os dados reais da assinatura
          documentXml = await insertDigitalSignatureStampImage(zip, documentXml, config.tag, config.info);
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
 * Substitui o parágrafo <w:p>...</w:p> INTEIRO que contém a tag pelo bloco
 * de parágrafos novos - nunca insere <w:p> dentro de um <w:t> existente.
 *
 * Inserir <w:p> dentro de <w:t> gera XML bem-formado mas estruturalmente
 * inválido no formato OOXML (um parágrafo não pode viver dentro de um nó de
 * texto). O Word é tolerante e "conserta" sozinho ao abrir, mas isso quebra
 * parsers mais estritos (ex: mammoth, usado na pré-visualização/PDF) e é
 * um risco de corrupção em outras ferramentas.
 */
function replaceEnclosingParagraph(xml: string, tag: string, replacementBlock: string): string {
  let result = xml;
  let searchFrom = 0;

  while (true) {
    const tagIndex = result.indexOf(tag, searchFrom);
    if (tagIndex === -1) break;

    // Acha a abertura do parágrafo (<w:p> ou <w:p ...>) mais próxima ANTES da tag.
    // Regex negativa evita casar com <w:pPr>, <w:pStyle> etc.
    const beforeTag = result.slice(0, tagIndex);
    const pOpenRegex = /<w:p(?=[ >])/g;
    let lastOpenIndex = -1;
    let match: RegExpExecArray | null;
    while ((match = pOpenRegex.exec(beforeTag)) !== null) {
      lastOpenIndex = match.index;
    }

    // Acha o fechamento </w:p> mais próximo DEPOIS da tag.
    const closeIndex = result.indexOf('</w:p>', tagIndex);

    if (lastOpenIndex === -1 || closeIndex === -1) {
      // Não achou os limites do parágrafo (não deveria acontecer em um
      // template válido) - aplica só na tag em si, pra não travar o processo.
      result = result.slice(0, tagIndex) + replacementBlock + result.slice(tagIndex + tag.length);
      searchFrom = tagIndex + replacementBlock.length;
      continue;
    }

    const paragraphEnd = closeIndex + '</w:p>'.length;
    result = result.slice(0, lastOpenIndex) + replacementBlock + result.slice(paragraphEnd);
    searchFrom = lastOpenIndex + replacementBlock.length;
  }

  return result;
}

let stampPicSeq = 0;

/**
 * Insere o selo de assinatura eletrônica como IMAGEM (mesmo layout visual da
 * prévia em tela e do PDF gerado via jsPDF: painel azul, QR Code, ícones),
 * no lugar da tag. Antes, essa função só inseria texto simples (nome, cargo,
 * data e hash), por isso o carimbo aparecia "só em texto" nos contratos
 * gerados a partir do DOCX.
 *
 * Dimensão: 33% da largura da página, altura proporcional ao próprio desenho.
 */
async function insertDigitalSignatureStampImage(
  zip: JSZip,
  xml: string,
  tag: string,
  info: PartySignatureInfo
): Promise<string> {
  const sig = info.signature!;
  const dt = new Date(sig.assinadoEm);
  const dataStr = isNaN(dt.getTime()) ? sig.assinadoEm : dt.toLocaleDateString('pt-BR');
  const horaStr = isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString('pt-BR');
  const hash = (sig.hashAutenticacao || '').toUpperCase();
  const signatureId = signatureIdFromHash(sig.hashAutenticacao);

  const rawDoc = (sig.documentoSignatario || info.documento || '').replace(/\D/g, '');
  const cpfCnpj =
    rawDoc.length === 11
      ? `${rawDoc.slice(0, 3)}.${rawDoc.slice(3, 6)}.${rawDoc.slice(6, 9)}-${rawDoc.slice(9, 11)}`
      : rawDoc.length === 14
      ? `${rawDoc.slice(0, 2)}.${rawDoc.slice(2, 5)}.${rawDoc.slice(5, 8)}/${rawDoc.slice(8, 12)}-${rawDoc.slice(12, 14)}`
      : sig.documentoSignatario || info.documento || '';

  const { bytes, widthPx, heightPx } = await renderSignatureStampPng({
    signerName: sig.nomeSignatario || info.nome || '',
    cpfCnpj,
    roleLabel: info.roleLabel || '',
    dateStr: dataStr,
    timeStr: horaStr,
    signatureId,
    hash: hash || 'N/A',
    validationUrl: buildValidationUrl(signatureId),
  });

  const rId = await addImageToDocx(zip, bytes);
  const picId = ++stampPicSeq;

  const cx = Math.round(STAMP_WIDTH_MM * EMU_PER_MM); // 33% da largura da página
  const cy = Math.round(cx * (heightPx / widthPx)); // altura proporcional ao desenho

  const drawing = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${picId}" name="SeloAssinatura${picId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${picId}" name="SeloAssinatura${picId}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;

  return replaceEnclosingParagraph(xml, tag, drawing);
}

/**
 * Insere um aviso de pendência quando a modalidade é digital, mas a parte ainda não assinou.
 * Evita deixar a tag "{{...}}" crua e visível no documento final.
 *
 * Não imprime nome/cargo aqui: TODOS os templates já têm um bloco de texto fixo
 * logo abaixo da tag (ex: "{NOME_PAPEL_CONTRATADO} - {contratado}" / "CPF nº
 * {cpf_contratado}") com o nome e CPF da parte. Antes, esta função também
 * imprimia nome+cargo, duplicando o nome no documento final.
 */
function insertPendingSignatureNotice(xml: string, tag: string, info: PartySignatureInfo): string {
  const block = `<w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:i/><w:color w:val="B45309"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">[Pendente de assinatura eletrônica]</w:t></w:r>
    </w:p>`;

  return replaceEnclosingParagraph(xml, tag, block);
}

/**
 * Insere um espaço em branco (linha de assinatura) onde estava a tag, com o nome
 * e documento da parte identificados abaixo da linha.
 */
function insertSignatureSpace(xml: string, tag: string, info: PartySignatureInfo): string {
  const nome = escapeXml(info.nome || '');
  const role = escapeXml(info.roleLabel || '');
  const doc = escapeXml(info.documento || '');

  const signatureSpace = `<w:p>
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

  return replaceEnclosingParagraph(xml, tag, signatureSpace);
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
    } else if (tag.includes('CONTRATANTE') && tag.includes('MANUAL')) {
      // Exclusividade (mista): CONTRATANTE_ASSINATURA_MANUAL usa o mesmo slot de compradorInfo
      config.push({ tag, tipo: 'manual', parte: 'comprador', info: compradorInfo });
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

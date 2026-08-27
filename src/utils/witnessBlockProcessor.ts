import JSZip from 'jszip';

/**
 * Processa o bloco de testemunhas de um template .docx marcado com
 * {{BLOCO_TESTEMUNHAS_INICIO}} ... {{BLOCO_TESTEMUNHAS_FIM}}.
 *
 * Permite manter UM ÚNICO arquivo mestre por tipo de contrato (em vez de um
 * arquivo "_sem_testemunhas" e outro "_2_testemunhas" mantidos à mão em
 * paralelo, que é fonte comum de divergência quando alguém edita uma
 * cláusula só em um dos dois - ver comentário em docxProcessor.ts sobre o
 * bug do título/cláusulas diferentes).
 *
 * - precisaTestemunha = false: remove o bloco inteiro (marcadores + conteúdo,
 *   ou seja, as linhas "Testemunha 1/2" e os sublinhados somem).
 * - precisaTestemunha = true: mantém o conteúdo do bloco, remove só os
 *   marcadores (ficam invisíveis no resultado final).
 *
 * Se os marcadores não existirem no documento (ex: template antigo sem essa
 * marcação), a função não faz nada - comportamento idêntico ao atual.
 */

const MARK_INICIO = '{{BLOCO_TESTEMUNHAS_INICIO}}';
const MARK_FIM = '{{BLOCO_TESTEMUNHAS_FIM}}';

function acharParagrafo(xml: string, textoAlvo: string): { inicio: number; fim: number } | null {
  const idxTexto = xml.indexOf(textoAlvo);
  if (idxTexto === -1) return null;

  const inicioComAtributos = xml.lastIndexOf('<w:p ', idxTexto);
  const inicioSemAtributos = xml.lastIndexOf('<w:p>', idxTexto);
  const inicio = Math.max(inicioComAtributos, inicioSemAtributos);
  if (inicio === -1) return null;

  const fimTag = '</w:p>';
  const fimIdx = xml.indexOf(fimTag, idxTexto);
  if (fimIdx === -1) return null;

  return { inicio, fim: fimIdx + fimTag.length };
}

/**
 * Aplica a remoção/limpeza do bloco de testemunhas diretamente numa string XML
 * (word/document.xml já carregada em memória).
 */
export function processarBlocoTestemunhasXml(xml: string, precisaTestemunha: boolean): string {
  const pIni = acharParagrafo(xml, MARK_INICIO);
  const pFim = acharParagrafo(xml, MARK_FIM);

  // Template não tem marcadores - não mexe em nada (compatibilidade com
  // templates antigos que já vêm prontos sem/com testemunhas).
  if (!pIni || !pFim) return xml;

  if (!precisaTestemunha) {
    // Remove o bloco inteiro (do início do parágrafo INICIO até o fim do
    // parágrafo FIM, inclusive).
    if (pFim.fim < pIni.inicio) return xml; // marcadores fora de ordem - não mexe, por segurança
    return xml.slice(0, pIni.inicio) + xml.slice(pFim.fim);
  }

  // Mantém o conteúdo, remove só os dois parágrafos-marcadores.
  let semIni = xml.slice(0, pIni.inicio) + xml.slice(pIni.fim);
  const pFim2 = acharParagrafo(semIni, MARK_FIM);
  if (!pFim2) return semIni;
  return semIni.slice(0, pFim2.inicio) + semIni.slice(pFim2.fim);
}

/**
 * Mesma operação, mas recebendo/devolvendo o buffer do .docx inteiro
 * (abre o zip, mexe em word/document.xml, fecha de novo).
 */
export async function processarBlocoTestemunhas(
  docxBuffer: ArrayBuffer,
  precisaTestemunha: boolean
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(docxBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) return docxBuffer;

  const processedXml = processarBlocoTestemunhasXml(documentXml, precisaTestemunha);
  if (processedXml === documentXml) return docxBuffer;

  zip.file('word/document.xml', processedXml);
  return await zip.generateAsync({ type: 'arraybuffer' });
}

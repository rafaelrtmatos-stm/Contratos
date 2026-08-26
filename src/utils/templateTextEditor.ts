/**
 * Edição de texto de modelos .docx direto no navegador, sem precisar
 * baixar/reenviar pelo Word.
 *
 * Escopo deliberadamente limitado: só troca o TEXTO visível de cada
 * parágrafo, preservando a formatação do parágrafo (a "rPr" da primeira
 * run) e toda a estrutura XML ao redor intocada. Não dá pra:
 * - adicionar/remover parágrafos
 * - misturar negrito/itálico dentro do mesmo parágrafo (a run vira uma só)
 * - mexer em tabelas, imagens ou cabeçalho/rodapé
 *
 * Motivo do limite: o motor de geração de contrato (dataTagsProcessor.ts,
 * signatureTagProcessor.ts) depende da estrutura exata de parágrafos e
 * runs do documento pra encontrar e substituir as tags {tag}. Um editor
 * "verdadeiro" (estilo Word, reconstruindo o XML do zero a partir de HTML)
 * arriscaria quebrar essa estrutura de formas sutis e difíceis de prever -
 * por isso a edição aqui é cirúrgica: troca só o texto, nunca reconstrói
 * o parágrafo do zero.
 */

export interface EditableParagraph {
  id: number;
  text: string;
}

function extractParagraphText(paragraphXml: string): string {
  const matches = paragraphXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
  return matches
    .map((m) => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Lista todos os parágrafos com texto visível do documento, em ordem. */
export function extractEditableParagraphs(xml: string): EditableParagraph[] {
  const pRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  const result: EditableParagraph[] = [];
  let match: RegExpExecArray | null;
  let id = 0;
  while ((match = pRegex.exec(xml)) !== null) {
    const text = extractParagraphText(match[0]);
    if (text.trim().length > 0) {
      result.push({ id, text });
    }
    id++; // mantém a numeração alinhada com applyParagraphEdits, mesmo pulando parágrafos vazios na exibição
  }
  return result;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Aplica as edições (por id de parágrafo) no XML original: pra cada
 * parágrafo editado, junta todas as runs de texto dele numa run só, com
 * a formatação (rPr) da primeira run original - preserva negrito/fonte
 * do parágrafo como um todo, mesmo sem dar pra variar formatação DENTRO
 * do parágrafo depois de editado.
 */
export function applyParagraphEdits(xml: string, edits: Map<number, string>): string {
  if (edits.size === 0) return xml;

  const pRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  let id = 0;

  return xml.replace(pRegex, (paragraphXml) => {
    const currentId = id++;
    const novoTexto = edits.get(currentId);
    if (novoTexto === undefined) return paragraphXml;

    // Formatação da primeira run (negrito, fonte, tamanho etc) - se não
    // houver nenhuma, o parágrafo fica sem formatação de texto específica
    // (herda o estilo do parágrafo, que continua intocado).
    const firstRunPrMatch = paragraphXml.match(/<w:r(?:\s[^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/);
    const rPr = firstRunPrMatch ? firstRunPrMatch[1] : '';

    // Propriedades do parágrafo (<w:pPr>...</w:pPr>), se existirem, ficam
    // intocadas - só as runs de conteúdo são substituídas.
    const pPrMatch = paragraphXml.match(/^(<w:p(?:\s[^>]*)?>)(\s*<w:pPr>[\s\S]*?<\/w:pPr>)?/);
    const abertura = pPrMatch ? pPrMatch[1] + (pPrMatch[2] || '') : paragraphXml.slice(0, paragraphXml.indexOf('>') + 1);

    const novaRun = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(novoTexto)}</w:t></w:r>`;

    return `${abertura}${novaRun}</w:p>`;
  });
}

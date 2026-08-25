import JSZip from 'jszip';
import { ContractData, DigitalSignature } from '../types/contract';

/**
 * Item 1 do checklist de conformidade jurídica: página de manifesto/trilha
 * de auditoria anexada ao PDF final.
 *
 * Hoje a prova de assinatura (IP, hash, meio de autenticação, horário de
 * servidor, user-agent) só existe DENTRO do sistema, no EvidenceLogModal -
 * que só abre pra quem está logado. Se o PDF sair do ambiente (impresso,
 * anexado a e-mail, salvo no computador do cliente), ele não carrega essa
 * prova junto. Esta página resolve isso: imprime a mesma trilha de
 * auditoria como última página do PDF, então o documento passa a ser
 * autoexplicativo mesmo fora do sistema.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const roleLabel = (role: string): string => {
  if (role === 'vendedor') return 'Contratado';
  if (role === 'comprador') return 'Contratante';
  if (role === 'comprador_adicional') return 'Contratante Adicional';
  if (role === 'ambos') return 'Contratante/Contratado';
  if (role === 'testemunha1') return 'Testemunha 1';
  if (role === 'testemunha2') return 'Testemunha 2';
  return role;
};

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false }) + ' (horário de Brasília, fuso -03:00)';
  } catch {
    return iso;
  }
};

function labelValueParagraph(label: string, value: string, opts?: { mono?: boolean; before?: number }): string {
  const before = opts?.before ?? 40;
  const font = opts?.mono
    ? '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>'
    : '';
  return `<w:p>
      <w:pPr><w:spacing w:before="${before}" w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">${escapeXml(label)}: </w:t></w:r>
      <w:r><w:rPr>${font}<w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>
    </w:p>`;
}

function signatureBlockXml(sig: DigitalSignature, index: number): string {
  const header = `<w:p>
      <w:pPr><w:spacing w:before="240" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="D4A017"/></w:pBdr></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="7C5A00"/></w:rPr><w:t xml:space="preserve">${escapeXml(`${index + 1}. ${roleLabel(sig.role)} — ${sig.nomeSignatario}`)}</w:t></w:r>
    </w:p>`;

  const fields = [
    labelValueParagraph('Documento (CPF/CNPJ)', sig.documentoSignatario || 'não informado'),
    labelValueParagraph('Assinado em', formatDateTime(sig.assinadoEm)),
    labelValueParagraph('Meio de autenticação', sig.meioAutenticacao || 'não registrado'),
    labelValueParagraph('Endereço IP', sig.ipAssinatura || 'não capturado'),
    labelValueParagraph('Navegador/Dispositivo (User-Agent)', sig.metadadosNavegador || 'não capturado'),
    labelValueParagraph('Hash SHA-256 do conteúdo assinado', sig.hashAutenticacao || 'não disponível', { mono: true }),
  ].join('\n');

  return header + '\n' + fields;
}

/**
 * Monta o corpo OOXML (parágrafos) da página de manifesto, pronto para
 * ser injetado no document.xml de um .docx já existente.
 */
function buildManifestBodyXml(contract: ContractData): string {
  const assinaturas = contract.assinaturas || [];

  // Quebra de página antes do manifesto, para começar sempre numa folha nova.
  const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

  const title = `<w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">ANEXO — MANIFESTO DE AUDITORIA DE ASSINATURAS DIGITAIS</w:t></w:r>
    </w:p>`;

  const subtitle = `<w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="17"/><w:szCs w:val="17"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">Contrato nº ${escapeXml(contract.numeroContrato || '—')} — gerado automaticamente pelo sistema, prova complementar à cláusula de aceite do meio eletrônico deste contrato.</w:t></w:r>
    </w:p>`;

  const intro = `<w:p>
      <w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">Esta página registra, para cada assinatura eletrônica deste contrato, os dados técnicos coletados no momento da assinatura como evidência de autoria e integridade: identificação do signatário, data/hora (gerada pelo servidor do sistema, não pelo relógio do dispositivo de quem assina), meio de autenticação utilizado, endereço IP de origem, identificação do navegador/dispositivo e o hash criptográfico (SHA-256) do conteúdo exato do contrato no instante da assinatura. Qualquer alteração posterior ao texto do contrato torna o hash divergente, evidenciando a violação.</w:t></w:r>
    </w:p>`;

  if (assinaturas.length === 0) {
    const nenhuma = `<w:p>
        <w:pPr><w:spacing w:before="120"/></w:pPr>
        <w:r><w:rPr><w:i/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">Nenhuma assinatura eletrônica registrada até o momento da geração deste PDF.</w:t></w:r>
      </w:p>`;
    return pageBreak + title + subtitle + intro + nenhuma;
  }

  const blocks = assinaturas.map((sig, i) => signatureBlockXml(sig, i)).join('\n');

  const footer = `<w:p>
      <w:pPr><w:spacing w:before="300"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="15"/><w:szCs w:val="15"/><w:color w:val="64748B"/></w:rPr><w:t xml:space="preserve">Este manifesto foi gerado automaticamente no momento da exportação do PDF e reflete os registros de assinatura existentes no sistema até aquele instante.</w:t></w:r>
    </w:p>`;

  return pageBreak + title + subtitle + intro + blocks + '\n' + footer;
}

/**
 * Recebe o .docx já preenchido (mesmo buffer usado para o PDF fiel) e
 * devolve uma cópia com a página de manifesto de auditoria anexada ao
 * final, antes da conversão para PDF.
 */
export async function appendAuditManifestPage(
  docxBuffer: ArrayBuffer,
  contract: ContractData
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(docxBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    // Não deveria acontecer com um .docx válido - se acontecer, devolve o
    // original sem manifesto em vez de quebrar o download do contrato.
    console.warn('appendAuditManifestPage: document.xml não encontrado, manifesto não anexado.');
    return docxBuffer;
  }

  const manifestXml = buildManifestBodyXml(contract);

  // O <w:sectPr> de nível de documento (propriedades de página/seção) é
  // sempre o último filho de <w:body>, imediatamente antes de </w:body>.
  // Inserir o manifesto ali (antes dele) mantém a mesma seção/formatação
  // de página do documento original.
  const sectPrIndex = documentXml.lastIndexOf('<w:sectPr');
  let newDocumentXml: string;
  if (sectPrIndex === -1) {
    // Sem sectPr encontrado (raro) - insere direto antes de </w:body>.
    newDocumentXml = documentXml.replace('</w:body>', manifestXml + '</w:body>');
  } else {
    newDocumentXml =
      documentXml.slice(0, sectPrIndex) + manifestXml + documentXml.slice(sectPrIndex);
  }

  zip.file('word/document.xml', newDocumentXml);
  return await zip.generateAsync({ type: 'arraybuffer' });
}

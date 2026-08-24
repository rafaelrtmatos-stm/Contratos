import * as mammoth from 'mammoth';
import jsPDF from 'jspdf';
import { ContractData } from '../types/contract';
import { resolveTemplate } from './templateResolver';
import { downloadTemplateWithCache } from './supabaseTemplateStorage';
import { generateContractTags, substituirTagsNoDocx } from './dataTagsProcessor';
import {
  findSignatureTags,
  mapTagsToConfig,
  processSignatureTags,
  PartySignatureInfo,
} from './signatureTagProcessor';

/**
 * Fonte única de verdade para qualquer exibição do contrato fora do
 * download em Word: tela de visualização (ContractViewer, SignatureLink)
 * e o PDF exportado.
 *
 * Em vez de manter um texto jurídico separado escrito à mão em JS
 * (que diverge do .docx real ao longo do tempo - foi o que causou o
 * bug do título/cláusulas diferentes), esta função pega o MESMO
 * template .docx que o botão "Word (.docx)" usa, processa os MESMOS
 * selos de assinatura e os MESMOS dados, e converte o resultado para
 * HTML com mammoth. Content-wise, é sempre idêntico ao Word.
 */
export async function renderContractDocumentHtml(contract: ContractData): Promise<string> {
  const isExcl = contract.tipo === 'exclusividade';

  // "usuario" (selo {{USUARIO_ASSINATURA_DIGITAL}}) é sempre o CORRETOR/CONTRATADO.
  // Na exclusividade, quem guarda os dados do corretor é o campo "comprador"
  // (o campo "vendedor" guarda o CONTRATANTE/proprietário).
  const dadosCorretor = isExcl ? contract.comprador : contract.vendedor;
  const dadosCliente = isExcl ? contract.vendedor : contract.comprador;
  const roleCorretor: 'vendedor' | 'comprador' = isExcl ? 'comprador' : 'vendedor';
  const roleCliente: 'vendedor' | 'comprador' = isExcl ? 'vendedor' : 'comprador';

  const sigCorretorAtual = contract.assinaturas?.find((a) => a.role === roleCorretor);
  const sigClienteAtual = contract.assinaturas?.find((a) => a.role === roleCliente);

  const modalidadeContrato: 'digital' | 'manual' =
    contract.modalidadeAssinatura === 'digital' ? 'digital' : 'manual';

  const estadoAssinatura = {
    usuarioAssinou: !!sigCorretorAtual,
    usuarioModalidade: modalidadeContrato,
    compradorAssinou: !!sigClienteAtual,
    compradorModalidade: modalidadeContrato,
    testemunhaprecisa: modalidadeContrato === 'manual',
  };

  const templateResolved = resolveTemplate(
    contract.tipo,
    'download_depois_assinar',
    estadoAssinatura,
    isExcl ? (contract.varianteExclusividade || 'normal') : undefined
  );

  const { sucesso, blob, erro } = await downloadTemplateWithCache(templateResolved.arquivo);
  if (!sucesso || !blob) {
    throw new Error(erro || 'Falha ao carregar o template do contrato.');
  }

  let docxBuffer = await blob.arrayBuffer();

  // 1) Processar selos de assinatura PRIMEIRO (mesma ordem do download real -
  // a substituição de dados abaixo apagaria qualquer {{TAG}} que não reconheça,
  // incluindo os selos).
  const tagsEncontradas = await findSignatureTags(docxBuffer);
  if (tagsEncontradas.length > 0) {
    const usuarioInfo: PartySignatureInfo = {
      assinou: !!sigCorretorAtual,
      modalidade: modalidadeContrato,
      signature: sigCorretorAtual,
      nome: dadosCorretor?.nome || '',
      documento: dadosCorretor?.cpfCnpj || '',
      roleLabel: isExcl ? 'CONTRATADO(A)' : 'VENDEDOR(A)',
    };
    const compradorInfo: PartySignatureInfo = {
      assinou: !!sigClienteAtual,
      modalidade: modalidadeContrato,
      signature: sigClienteAtual,
      nome: dadosCliente?.nome || '',
      documento: dadosCliente?.cpfCnpj || '',
      roleLabel: isExcl ? 'CONTRATANTE' : 'COMPRADOR(A)',
    };

    const tagsConfig = mapTagsToConfig(tagsEncontradas, usuarioInfo, compradorInfo);
    docxBuffer = await processSignatureTags(docxBuffer, tagsConfig);
  }

  // 2) Substituir tags de DADOS do contrato
  const tagsContrato = generateContractTags(contract);
  const docxFinal = await substituirTagsNoDocx(docxBuffer, tagsContrato);

  // 3) Converter o .docx já preenchido em HTML
  const result = await mammoth.convertToHtml({ arrayBuffer: docxFinal });
  return result.value;
}

/**
 * Gera um PDF a partir do MESMO HTML renderizado do .docx real (não mais
 * um texto desenhado manualmente linha a linha - herda automaticamente
 * qualquer correção feita no template Word, sem precisar duplicar lógica).
 */
export async function renderContractDocumentPdf(contract: ContractData): Promise<Blob> {
  const html = await renderContractDocumentHtml(contract);

  // Container temporário fora da tela, com largura/estilo compatíveis com A4
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-1';
  container.style.width = '190mm';
  container.style.fontFamily = "'Times New Roman', Times, serif";
  container.style.fontSize = '11pt';
  container.style.lineHeight = '1.5';
  container.style.color = '#0f172a';
  container.innerHTML = `
    <style>
      p { margin: 0 0 8px 0; text-align: justify; }
      strong { font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
    </style>
    ${html}
  `;
  document.body.appendChild(container);

  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    await new Promise<void>((resolve, reject) => {
      doc.html(container, {
        margin: [15, 12, 15, 12],
        autoPaging: 'text',
        width: 186,
        windowWidth: 794, // ~210mm a 96dpi
        callback: () => resolve(),
        html2canvas: { scale: 0.75 },
      });
    }).catch((err) => {
      throw err;
    });
    return doc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}


/**
 * Extrai texto puro (sem HTML) do contrato renderizado - usado pelo
 * botão "Copiar" do ContractViewer.
 */
export async function renderContractDocumentPlainText(contract: ContractData): Promise<string> {
  const html = await renderContractDocumentHtml(contract);
  // Conversão simples: parágrafos/quebras de linha viram \n, resto some
  return html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

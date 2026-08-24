import * as mammoth from 'mammoth';
import { ContractData } from '../types/contract';
import { resolveTemplate } from './templateResolver';
import { downloadTemplateWithCache } from './supabaseTemplateStorage';
import { generateContractTags, substituirTagsNoDocx } from './dataTagsProcessor';
import { supabase } from './supabaseClient';
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
/**
 * Pega o template .docx real, processa selos de assinatura e dados do
 * contrato, e retorna o .docx final PREENCHIDO (buffer bruto) - sem
 * nenhuma conversão. É a base tanto do preview em HTML (mammoth) quanto
 * do PDF fiel (conversão externa via iLoveAPI, que preserva o layout
 * original do Word - fonte, espaçamento, indentação, tabelas).
 */
async function buildFilledDocx(contract: ContractData): Promise<ArrayBuffer> {
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
  return substituirTagsNoDocx(docxBuffer, tagsContrato);
}

export async function renderContractDocumentHtml(contract: ContractData): Promise<string> {
  const docxFinal = await buildFilledDocx(contract);
  // Conversão simplificada, usada só para o preview em tela.
  const result = await mammoth.convertToHtml({ arrayBuffer: docxFinal });
  return result.value;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Gera o PDF fiel ao template convertendo o .docx real (já preenchido)
 * através do serviço externo iLoveAPI, que preserva fonte, espaçamento,
 * indentação e layout de tabela - diferente da rota antiga
 * (mammoth -> HTML -> jsPDF), que descartava a maior parte da formatação.
 */
export async function renderContractDocumentPdf(contract: ContractData): Promise<Blob> {
  const docxFinal = await buildFilledDocx(contract);
  const docxBase64 = arrayBufferToBase64(docxFinal);

  const { data, error } = await supabase.functions.invoke('convert-docx-to-pdf', {
    body: { docxBase64, filename: 'contrato.docx' },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao converter o contrato em PDF.');
  }
  if (!data?.pdfBase64) {
    throw new Error(data?.error || 'Falha ao converter o contrato em PDF.');
  }

  return base64ToBlob(data.pdfBase64, 'application/pdf');
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

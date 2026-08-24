/**
 * Sistema de substituição de tags de dados em templates DOCX
 * Lê dados do contrato e substitui {{PLACEHOLDERS}} no arquivo
 */

import { ContractData } from '../types/contract';
import JSZip from 'jszip';

interface TagMapping {
  [key: string]: string;
}

/**
 * Gera mapa de tags baseado nos dados do contrato
 */
export function generateContractTags(contract: ContractData): TagMapping {
  const tags: TagMapping = {
    // VENDEDOR/PROPRIETÁRIO
    VENDEDOR_NOME: contract.vendedor.nome || '',
    VENDEDOR_GENERO: contract.vendedor.genero || '',
    VENDEDOR_CPF: contract.vendedor.cpfCnpj || '',
    VENDEDOR_RG: contract.vendedor.rg || '',
    VENDEDOR_RG_ORGAO: contract.vendedor.rgOrgao || '',
    VENDEDOR_NACIONALIDADE: contract.vendedor.nacionalidade || '',
    VENDEDOR_ESTADO_CIVIL: contract.vendedor.estadoCivil || '',
    VENDEDOR_TELEFONE: contract.vendedor.telefone || '',
    VENDEDOR_EMAIL: contract.vendedor.email || '',
    VENDEDOR_ENDERECO: contract.vendedor.endereco || '',
    VENDEDOR_NUMERO: contract.vendedor.numero || '',
    VENDEDOR_BAIRRO: contract.vendedor.bairro || '',
    VENDEDOR_CEP: contract.vendedor.cep || '',
    VENDEDOR_CIDADE: contract.vendedor.cidade || '',
    VENDEDOR_ESTADO: contract.vendedor.uf || '',
    VENDEDOR_UF: contract.vendedor.uf || '',

    // COMPRADOR/CONTRATANTE
    COMPRADOR_NOME: contract.comprador.nome || '',
    COMPRADOR_GENERO: contract.comprador.genero || '',
    COMPRADOR_CPF: contract.comprador.cpfCnpj || '',
    COMPRADOR_RG: contract.comprador.rg || '',
    COMPRADOR_RG_ORGAO: contract.comprador.rgOrgao || '',
    COMPRADOR_NACIONALIDADE: contract.comprador.nacionalidade || '',
    COMPRADOR_ESTADO_CIVIL: contract.comprador.estadoCivil || '',
    COMPRADOR_TELEFONE: contract.comprador.telefone || '',
    COMPRADOR_TELEFONE2: contract.comprador.telefone2 || '',
    COMPRADOR_EMAIL: contract.comprador.email || '',
    COMPRADOR_ENDERECO: contract.comprador.endereco || '',
    COMPRADOR_NUMERO: contract.comprador.numero || '',
    COMPRADOR_BAIRRO: contract.comprador.bairro || '',
    COMPRADOR_CEP: contract.comprador.cep || '',
    COMPRADOR_CIDADE: contract.comprador.cidade || '',
    COMPRADOR_ESTADO: contract.comprador.uf || '',
    COMPRADOR_UF: contract.comprador.uf || '',

    // IMÓVEL
    EMPREENDIMENTO: contract.imovel?.nomeEmpreendimento || '',
    LOTE: contract.imovel?.numeroLote || '',
    QUADRA: contract.imovel?.numeroQuadra || '',
    LOCALIZACAO_IMOVEL: contract.imovel?.localizacaoImovel || '',
    AREA_TOTAL: contract.imovel?.areaTotal || '',
    AREA_TOTAL_M2: contract.imovel?.areaTotal || '',
    CIDADE_IMOVEL: contract.imovel?.cidadeImovel || '',
    UF_IMOVEL: contract.imovel?.ufImovel || '',

    // FINANCEIRO
    VALOR_TOTAL: contract.valorTotal?.toString() || '',
    VALOR_TOTAL_EXTENSO: contract.valorTotalExtensoPT || '',
    VALOR_ENTRADA: contract.financeiro?.valorEntrada?.toString() || '',
    VALOR_PARCELA: contract.financeiro?.valorParcela?.toString() || '',
    QUANTIDADE_PARCELAS: contract.financeiro?.quantidadeParcelas?.toString() || '',
    DATA_PRIMEIRA_PARCELA: contract.financeiro?.dataPrimeiraParcela || '',

    // DATA/LOCAL
    DATA: contract.dataCriacao || new Date().toLocaleDateString('pt-BR'),
    DATA_ASSINATURA: new Date().toLocaleDateString('pt-BR'),
    DIA: new Date().getDate().toString(),
    MES_EXTENSO: getMesExtensoPT(new Date().getMonth()),
    ANO: new Date().getFullYear().toString(),
    CIDADE: contract.comprador.cidade || contract.vendedor.cidade || '',
    ESTADO: contract.comprador.uf || contract.vendedor.uf || '',
    UF: contract.comprador.uf || contract.vendedor.uf || '',

    // CONTRATO
    NUMERO_CONTRATO: contract.numeroContrato || '',
    TIPO_CONTRATO: getTipoContratoExtensoPT(contract.tipo),
    OBJETO_DESCRICAO: contract.objetoDescricao || '',
  };

  return tags;
}

/**
 * Escapa valor para inserção segura em texto XML (preserva formatação dos runs ao redor)
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Substitui tags {{TAG}} em uma string XML, mesmo quando o Word fragmenta a tag
 * em múltiplos nós <w:t> (ex: "{{VEN" + "DEDOR_NOME}}"). Não altera formatação:
 * apenas o conteúdo textual dentro dos nós <w:t> é trocado, os runs e estilos
 * ao redor permanecem intactos.
 */
function replaceTagsPreservingFormat(xml: string, tags: TagMapping): string {
  // Casa {{ ... }} mesmo com marcação XML de runs quebrados no meio (non-greedy)
  let result = xml.replace(/\{\{([\s\S]*?)\}\}/g, (fullMatch, innerRaw: string) => {
    // Remove qualquer marcação XML que o Word tenha inserido entre os fragmentos da tag
    const cleanTag = innerRaw.replace(/<[^>]+>/g, '').trim();

    if (!cleanTag || !/^[A-Za-z0-9_À-ÿ]+$/.test(cleanTag)) {
      // Não parece ser uma tag válida (ex: chaves de código/fórmula) — não mexe
      return fullMatch;
    }

    const upperTag = cleanTag.toUpperCase();
    const matchKey = Object.keys(tags).find((k) => k.toUpperCase() === upperTag);

    if (matchKey === undefined) {
      // Tag desconhecida: remove para não deixar {{...}} residual no documento final
      return '';
    }

    return escapeXml(tags[matchKey] || '');
  });

  return result;
}

/**
 * Substitui tags em documento DOCX
 */
export async function substituirTagsNoDocx(
  docxBuffer: ArrayBuffer,
  tags: TagMapping
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  await zip.loadAsync(docxBuffer);

  const partsToProcess = [
    'word/document.xml',
    'word/document2.xml',
    ...[1, 2, 3, 4, 5].map((i) => `word/header${i}.xml`),
    ...[1, 2, 3, 4, 5].map((i) => `word/footer${i}.xml`),
  ];

  for (const partName of partsToProcess) {
    const originalXml = await zip.file(partName)?.async('string');
    if (originalXml) {
      const processedXml = replaceTagsPreservingFormat(originalXml, tags);
      zip.file(partName, processedXml);
    }
  }

  return await zip.generateAsync({ type: 'arraybuffer' });
}

/**
 * Mês em português extenso
 */
function getMesExtensoPT(mes: number): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return meses[mes] || '';
}

/**
 * Tipo de contrato em português extenso
 */
function getTipoContratoExtensoPT(tipo: string): string {
  const tipos: Record<string, string> = {
    venda_vista: 'Contrato de Compra e Venda à Vista',
    venda_parcelada: 'Contrato de Compra e Venda Parcelada',
    exclusividade: 'Contrato de Intermediação Imobiliária',
  };
  return tipos[tipo] || tipo;
}

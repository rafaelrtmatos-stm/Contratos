import { ContractData } from '../types/contract';

/**
 * Normaliza uma string para o padrão de nomenclatura de arquivos:
 * - Remove acentuação (NFD)
 * - Converte para MAIÚSCULAS
 * - Remove caracteres especiais exceto hífen
 * - Substitui espaços múltiplos por um único underline (_)
 */
export function normalizeFileSlug(str?: string | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Limpa e padroniza o identificador de lote:
 * Ex: "1" -> "L1", "01" -> "L01", "Lote 1" -> "L1", "L1" -> "L1"
 */
export function cleanLoteIdentifier(rawLote?: string | null): string {
  if (!rawLote) return '';
  const trimmed = rawLote.trim();
  if (!trimmed) return '';
  const semPrefixo = trimmed
    .replace(/^lote\s*[:#-]?\s*/i, '')
    .replace(/^l\s*[:#-]?\s*/i, '')
    .trim();
  const slug = normalizeFileSlug(semPrefixo || trimmed);
  return slug ? `L${slug}` : '';
}

/**
 * Limpa e padroniza o identificador de quadra:
 * Ex: "1" -> "Q1", "01" -> "Q01", "Quadra 1" -> "Q1", "Q1" -> "Q1"
 */
export function cleanQuadraIdentifier(rawQuadra?: string | null): string {
  if (!rawQuadra) return '';
  const trimmed = rawQuadra.trim();
  if (!trimmed) return '';
  const semPrefixo = trimmed
    .replace(/^quadra\s*[:#-]?\s*/i, '')
    .replace(/^q\s*[:#-]?\s*/i, '')
    .trim();
  const slug = normalizeFileSlug(semPrefixo || trimmed);
  return slug ? `Q${slug}` : '';
}

/**
 * Gera o nome de arquivo padrão para qualquer download de contrato (PDF, DOCX, DOC):
 * Formato padrão: L{lote}_Q{quadra}_-_{NOME_COMPRADOR}_{DATA: DD-MM-AAAA}_{HORA: HH'H'MM}.{ext}
 * Exemplo: L1_Q1_-_ALACID_LISBOA_LOPES_25-08-2026_19H15.pdf
 */
export function buildContractFileName(
  contractOrName: ContractData | string | undefined | null,
  extension: 'pdf' | 'docx' | 'doc' = 'pdf'
): string {
  const agora = new Date();
  
  // Data em formato DD-MM-YYYY (timezone de Brasília)
  const dataFormatada = agora
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .replace(/\//g, '-');
  
  // Hora em formato HH'H'MM (ex: 19H15)
  const horaFormatada = agora
    .toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    })
    .replace(/:/g, 'H');

  const cleanExt = extension.replace(/^\./, '').toLowerCase();

  // Caso nulo/vazio
  if (!contractOrName) {
    return `CONTRATO_${dataFormatada}_${horaFormatada}.${cleanExt}`;
  }

  // Caso seja passado apenas uma string (ex: nome do cliente)
  if (typeof contractOrName === 'string') {
    const slug = normalizeFileSlug(contractOrName) || 'CONTRATO';
    return `${slug}_${dataFormatada}_${horaFormatada}.${cleanExt}`;
  }

  const contract = contractOrName as ContractData;

  // 1. Extração e padronização de Lote e Quadra (imóveis em geral, vendas à vista/parceladas)
  const lotePart = cleanLoteIdentifier(contract.imovel?.numeroLote);
  const quadraPart = cleanQuadraIdentifier(contract.imovel?.numeroQuadra);

  // 2. Extração do Nome do Cliente
  // Na exclusividade: Vendedor/Contratante é o cliente principal
  // Na venda à vista / parcelada: Comprador é o cliente principal
  const isExcl = contract.tipo === 'exclusividade';
  const nomeClienteRaw = (isExcl ? contract.vendedor?.nome : contract.comprador?.nome) ||
    contract.comprador?.nome ||
    contract.vendedor?.nome ||
    contract.imovel?.nomeEmpreendimento ||
    'CONTRATO';

  const nomeSlug = normalizeFileSlug(nomeClienteRaw) || 'CONTRATO';

  // 3. Composição do identificador de lote/quadra
  const localizacaoParts = [lotePart, quadraPart].filter(Boolean);

  if (localizacaoParts.length > 0) {
    const localizacaoPrefix = localizacaoParts.join('_');
    return `${localizacaoPrefix}_-_${nomeSlug}_${dataFormatada}_${horaFormatada}.${cleanExt}`;
  }

  // Se não houver lote/quadra mas houver nome do empreendimento (imóvel geral/apartamento)
  if (contract.imovel?.nomeEmpreendimento) {
    const empSlug = normalizeFileSlug(contract.imovel.nomeEmpreendimento);
    if (empSlug) {
      return `${empSlug}_-_${nomeSlug}_${dataFormatada}_${horaFormatada}.${cleanExt}`;
    }
  }

  // Se for categoria de outros bens móveis/veículos
  if (contract.subcategoria === 'outros_bens' && contract.bemOutros?.descricao) {
    const bemSlug = normalizeFileSlug(contract.bemOutros.marca || contract.bemOutros.tipoBem || 'BEM');
    if (bemSlug) {
      return `${bemSlug}_-_${nomeSlug}_${dataFormatada}_${horaFormatada}.${cleanExt}`;
    }
  }

  // Fallback padrão com nome do cliente em maiúsculas
  return `${nomeSlug}_${dataFormatada}_${horaFormatada}.${cleanExt}`;
}

/**
 * Atalhos tipados para cada extensão suportada
 */
export function buildPdfFileName(contractOrName: ContractData | string | undefined | null): string {
  return buildContractFileName(contractOrName, 'pdf');
}

export function buildDocxFileName(contractOrName: ContractData | string | undefined | null): string {
  return buildContractFileName(contractOrName, 'docx');
}

export function buildDocFileName(contractOrName: ContractData | string | undefined | null): string {
  return buildContractFileName(contractOrName, 'doc');
}

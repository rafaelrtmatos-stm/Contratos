import {
  ContractData,
  ContractType,
  PartyDetailedInfo,
  ContractTagsMapping,
  ContractParceladoTagsMapping,
  ContractExclusividadeTagsMapping,
  ContractLocacaoTagsMapping,
} from '../types/contract';
import { numeroPorExtensoReais, numeroPorExtensoInteiro, percentualPorExtenso } from './numberToWords';
import jsPDF from 'jspdf';
import { drawDigitalSignatureStamp, STAMP_HEIGHT } from './pdfSignatureStamp';
import { buildDocFileName, buildPdfFileName } from './pdfFileName';

// Formata CPF/CNPJ no mesmo padrão exibido na prévia em tela (DigitalSignatureStamp.tsx),
// para que o selo/texto no PDF baixado mostre exatamente o mesmo formato.
function formatCpfCnpjDoc(doc: string): string {
  const clean = (doc || '').replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }
  if (clean.length === 14) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
  }
  return doc || '';
}

// Formatação de Moeda
export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Formatação de Número em Padrão Brasileiro (ex: 150.000,00)
export function formatDecimalNumber(value: number): string {
  if (isNaN(value)) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Formatação de Data
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export function formatDateExtenso(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  const mIndex = parseInt(month, 10) - 1;
  return `${day} de ${MONTH_NAMES_PT[mIndex] || month} de ${year}`;
}

// Obter a lista completa e ordenada de compradores (Titular + Co-compradores)
export function getAllCompradores(contract: ContractData): PartyDetailedInfo[] {
  const list: PartyDetailedInfo[] = [];
  if (contract.comprador) {
    list.push(contract.comprador);
  }
  if (contract.temMaisCompradores && Array.isArray(contract.compradoresAdicionais)) {
    contract.compradoresAdicionais.forEach((c) => {
      if (c && (c.nome || c.cpfCnpj)) {
        list.push(c);
      }
    });
  }
  return list.length > 0 ? list : [contract.comprador];
}

// Mapeador das tags { } do sistema para o contrato de compra e venda de imóvel à vista
export function getContractTags(contract: ContractData): ContractTagsMapping {
  const v = contract.vendedor;
  const c = contract.comprador;
  const allCompradores = getAllCompradores(contract);
  const im = contract.imovel || {
    nomeEmpreendimento: '',
    localizacaoImovel: '',
    cidadeImovel: contract.cidadeForo || '',
    ufImovel: contract.ufForo || '',
    numeroLote: '',
    numeroQuadra: '',
    enderecoLote: '',
    metragemFrente: '',
    metragemLateralDireita: '',
    metragemLateralEsquerda: '',
    metragemFundos: '',
    areaTotalM2: '',
  };

  const valorExtenso = contract.valorTotalExtenso?.trim() || numeroPorExtensoReais(contract.valorTotal);
  
  // Tratar componentes da data de assinatura
  let dia = contract.diaAssinatura || '';
  let mesExtenso = contract.mesExtensoAssinatura || '';
  let ano = contract.anoAssinatura || '';

  if (!dia || !mesExtenso || !ano) {
    const rawDate = contract.dataCriacao || new Date().toISOString().split('T')[0];
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      dia = dia || String(parseInt(parts[2], 10));
      const mIdx = parseInt(parts[1], 10) - 1;
      mesExtenso = mesExtenso || MONTH_NAMES_PT[mIdx] || parts[1];
      ano = ano || parts[0];
    }
  }

  const compradoresNomes = allCompradores.map(comp => comp.nome).filter(Boolean).join(' e ');
  const compradoresCpfs = allCompradores.map(comp => comp.cpfCnpj).filter(Boolean).join(' / ');

  return {
    // 1. VENDEDOR
    vendedor_nome: v.nome || '',
    vendedor_nacionalidade: v.nacionalidade || 'brasileiro(a)',
    vendedor_estado_civil: v.estadoCivil || 'casado(a)',
    vendedor_rg: v.rg || '',
    vendedor_rg_orgao: v.rgOrgao || 'SSP/PA',
    vendedor_cpf_cnpj: v.cpfCnpj || '',
    vendedor_endereco: v.endereco || '',
    vendedor_numero: v.numero || 'S/N',
    vendedor_bairro: v.bairro || '',
    vendedor_cep: v.cep || '',
    vendedor_cidade: v.cidade || '',
    vendedor_uf: v.uf || '',
    vendedor_telefone: v.telefone || '',

    // 2. COMPRADOR (E CO-COMPRADORES)
    comprador_nome: compradoresNomes || c.nome || '',
    comprador_nacionalidade: c.nacionalidade || 'brasileiro(a)',
    comprador_estado_civil: c.estadoCivil || 'solteiro(a)',
    comprador_rg: c.rg || '',
    comprador_rg_orgao: c.rgOrgao || 'SSP/PA',
    comprador_cpf: compradoresCpfs || c.cpfCnpj || '',
    comprador_endereco: c.endereco || '',
    comprador_numero: c.numero || 'S/N',
    comprador_bairro: c.bairro || '',
    comprador_cep: c.cep || '',
    comprador_cidade: c.cidade || '',
    comprador_uf: c.uf || '',
    comprador_telefone: c.telefone || '',

    // 3. IMÓVEL OU BEM MÓVEL / VEÍCULO
    nome_empreendimento: im.nomeEmpreendimento || '',
    localizacao_imovel: im.localizacaoImovel || '',
    cidade_imovel: im.cidadeImovel || '',
    uf_imovel: im.ufImovel || '',
    numero_lote: im.numeroLote || '',
    numero_quadra: im.numeroQuadra || '',
    endereco_lote: im.enderecoLote || '',
    metragem_frente: im.metragemFrente || '',
    metragem_lateral_direita: im.metragemLateralDireita || '',
    metragem_lateral_esquerda: im.metragemLateralEsquerda || '',
    metragem_fundos: im.metragemFundos || '',
    area_total_m2: im.areaTotalM2 || '',

    // DADOS DE BENS MÓVEIS / VEÍCULOS
    descricao_bem: contract.bemOutros?.descricao || contract.objetoDescricao || '',
    tipo_bem: contract.bemOutros?.tipoBem || 'outro',
    marca_bem: contract.bemOutros?.marca || '',
    modelo_bem: contract.bemOutros?.modelo || '',
    ano_fabricacao_bem: contract.bemOutros?.anoFabricacao || '',
    ano_modelo_bem: contract.bemOutros?.anoModelo || '',
    cor_bem: contract.bemOutros?.cor || '',
    placa_bem: contract.bemOutros?.placa || '',
    chassi_bem: contract.bemOutros?.chassi || '',
    renavam_bem: contract.bemOutros?.renavam || '',
    numero_serie_bem: contract.bemOutros?.numeroSerie || '',
    quilometragem_bem: contract.bemOutros?.quilometragemOuUso || '',
    estado_conservacao_bem: contract.bemOutros?.estadoConservacao || contract.objetoEstadoConservacao || '',
    acessorios_bem: contract.bemOutros?.acessoriosInclusos || '',
    documentacao_bem: contract.bemOutros?.documentacaoSituacao || '',

    // 4. VALOR DA VENDA À VISTA
    valor_total: formatDecimalNumber(contract.valorTotal),
    valor_total_extenso: valorExtenso,

    // 5. FORO
    cidade_foro: contract.cidadeForo || 'Santarém',
    uf_foro: contract.ufForo || 'PA',

    // 6. DATA DE ASSINATURA
    cidade_assinatura: contract.cidadeAssinatura || contract.cidadeForo || 'Santarém',
    uf_assinatura: contract.ufAssinatura || contract.ufForo || 'PA',
    dia,
    mes_extenso: mesExtenso,
    ano,
  };
}

// Mapeador das tags { } padronizadas para o Contrato Parcelado
export function getContractParceladoTags(contract: ContractData): ContractParceladoTagsMapping {
  const v = contract.vendedor;
  const c = contract.comprador;
  const im = contract.imovel || {
    nomeEmpreendimento: '',
    localizacaoImovel: '',
    cidadeImovel: contract.cidadeForo || '',
    ufImovel: contract.ufForo || '',
    numeroLote: '',
    numeroQuadra: '',
    enderecoLote: '',
    metragemFrente: '',
    metragemLateralDireita: '',
    metragemLateralEsquerda: '',
    metragemFundos: '',
    areaTotalM2: '',
  };

  const vp = contract.vendaParcelada;

  // Análise de gênero gramatical para o Vendedor
  const isVendedorPJ = (v.estadoCivil && v.estadoCivil.toLowerCase().includes('jurídica')) || (v.cpfCnpj && v.cpfCnpj.length > 14);
  const isVendedorFeminino = !isVendedorPJ && (
    (v.nacionalidade && v.nacionalidade.toLowerCase().includes('brasileira')) ||
    (v.estadoCivil && (v.estadoCivil.toLowerCase().endsWith('a') || v.estadoCivil.toLowerCase().includes('casada') || v.estadoCivil.toLowerCase().includes('solteira') || v.estadoCivil.toLowerCase().includes('divorciada') || v.estadoCivil.toLowerCase().includes('viúva')))
  );

  let artigo_vendedor = 'O';
  let tratamento_vendedor = 'Sr.';
  let concordancia_vendedor = 'residente e domiciliado';
  let vendedor_termo = 'PROMITENTE VENDEDOR';
  let genero_vendedor = 'ele';
  let genero_vendedor_3 = 'do mesmo';
  let genero_vendedor_4 = 'pelo vendedor';

  if (isVendedorPJ) {
    artigo_vendedor = 'A';
    tratamento_vendedor = 'a empresa';
    concordancia_vendedor = 'com sede';
    vendedor_termo = 'PROMITENTE VENDEDORA';
    genero_vendedor = 'a vendedora';
    genero_vendedor_3 = 'à mesma';
    genero_vendedor_4 = 'pela vendedora';
  } else if (isVendedorFeminino) {
    artigo_vendedor = 'A';
    tratamento_vendedor = 'Sra.';
    concordancia_vendedor = 'residente e domiciliada';
    vendedor_termo = 'PROMITENTE VENDEDORA';
    genero_vendedor = 'ela';
    genero_vendedor_3 = 'da mesma';
    genero_vendedor_4 = 'pela vendedora';
  }

  // Análise de gênero gramatical para o Comprador
  const isCompradorPJ = (c.estadoCivil && c.estadoCivil.toLowerCase().includes('jurídica')) || (c.cpfCnpj && c.cpfCnpj.length > 14);
  const isCompradorFeminino = !isCompradorPJ && (
    (c.nacionalidade && c.nacionalidade.toLowerCase().includes('brasileira')) ||
    (c.estadoCivil && (c.estadoCivil.toLowerCase().endsWith('a') || c.estadoCivil.toLowerCase().includes('casada') || c.estadoCivil.toLowerCase().includes('solteira') || c.estadoCivil.toLowerCase().includes('divorciada') || c.estadoCivil.toLowerCase().includes('viúva')))
  );

  let artigo_comprador = 'O';
  let tratamento_comprador = 'Sr.';
  let concordancia_comprador = 'residente e domiciliado';
  let comprador_termo = 'PROMITENTE COMPRADOR';
  let genero_comprador = 'ele';
  let genero_comprador_3 = 'ao mesmo';
  let preposicao_comprador = 'ao comprador';

  if (isCompradorPJ) {
    artigo_comprador = 'A';
    tratamento_comprador = 'a empresa';
    concordancia_comprador = 'com sede';
    comprador_termo = 'PROMITENTE COMPRADORA';
    genero_comprador = 'a compradora';
    genero_comprador_3 = 'à mesma';
    preposicao_comprador = 'à compradora';
  } else if (isCompradorFeminino) {
    artigo_comprador = 'A';
    tratamento_comprador = 'Sra.';
    concordancia_comprador = 'residente e domiciliada';
    comprador_termo = 'PROMITENTE COMPRADORA';
    genero_comprador = 'ela';
    genero_comprador_3 = 'à mesma';
    preposicao_comprador = 'à compradora';
  }

  // Cálculos Financeiros
  const valorTotalNum = contract.valorTotal || 0;
  const valorEntradaNum = vp?.valorEntrada || 0;
  const saldoRestanteNum = Math.max(0, valorTotalNum - valorEntradaNum);
  const numParcelas = vp?.numeroParcelas || 1;
  const valorParcelaNum = vp?.valorParcela || (numParcelas > 0 ? saldoRestanteNum / numParcelas : 0);

  const valorTotalStr = `${formatCurrency(valorTotalNum)} (${contract.valorTotalExtenso?.trim() || numeroPorExtensoReais(valorTotalNum)})`;
  const entradaStr = `${formatCurrency(valorEntradaNum)} (${numeroPorExtensoReais(valorEntradaNum)})`;
  const restanteStr = `${formatCurrency(saldoRestanteNum)} (${numeroPorExtensoReais(saldoRestanteNum)})`;
  const qtdParcelasStr = `${numParcelas} (${numeroPorExtensoInteiro(numParcelas)})`;
  const modoPagamentoStr = vp?.formaPagamentoParcelas || 'Boleto Bancário';
  const valorParcelaStr = `${formatCurrency(valorParcelaNum)} (${numeroPorExtensoReais(valorParcelaNum)})`;

  let dataVencimentoStr = 'todo dia 10 de cada mês';
  let dataPrimeiraParcelaStr = formatDateExtenso(contract.dataCriacao);

  if (vp?.dataPrimeiroVencimento) {
    const rawVenc = vp.dataPrimeiroVencimento.split('T')[0];
    const parts = rawVenc.split('-');
    if (parts.length === 3) {
      const diaNum = parseInt(parts[2], 10);
      dataVencimentoStr = `todo dia ${diaNum} de cada mês`;
      dataPrimeiraParcelaStr = formatDateExtenso(rawVenc);
    }
  }

  // Data de Assinatura
  let dia = contract.diaAssinatura || '';
  let mesExtenso = contract.mesExtensoAssinatura || '';
  let ano = contract.anoAssinatura || '';

  if (!dia || !mesExtenso || !ano) {
    const rawDate = contract.dataCriacao || new Date().toISOString().split('T')[0];
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      dia = dia || String(parseInt(parts[2], 10));
      const mIdx = parseInt(parts[1], 10) - 1;
      mesExtenso = mesExtenso || MONTH_NAMES_PT[mIdx] || parts[1];
      ano = ano || parts[0];
    }
  }

  return {
    // VENDEDOR
    artigo_vendedor,
    tratamento_vendedor,
    vendedor: v.nome || '',
    nacionalidade_vendedor: v.nacionalidade || 'brasileiro(a)',
    estado_civil_vendedor: v.estadoCivil || 'casado(a)',
    rg_vendedor: v.rg || '',
    emissao_rg_vendedor: v.rgOrgao || 'SSP/PA',
    cpf_vendedor: v.cpfCnpj || '',
    concordancia_vendedor,
    endereco_vendedor: v.endereco || '',
    numero_vendedor: v.numero || 'S/N',
    bairro_vendedor: v.bairro || '',
    cidade_vendedor: v.cidade || '',
    estado_vendedor: v.uf || '',

    // COMPRADOR
    artigo_comprador,
    tratamento_comprador,
    comprador: c.nome || '',
    nacionalidade_comprador: c.nacionalidade || 'brasileiro(a)',
    estado_civil_comprador: c.estadoCivil || 'solteiro(a)',
    rg_comprador: c.rg || '',
    emissao_rg_comprador: c.rgOrgao || 'SSP/PA',
    cpf_comprador: c.cpfCnpj || '', // CPF do comprador sempre padronizado!
    telefone_comprador: c.telefone || '',
    concordancia_comprador,
    endereco_comprador: c.endereco || '',
    numero_comprador: c.numero || 'S/N',
    bairro_comprador: c.bairro || '',
    cep_comprador: c.cep || '',
    cidade_comprador: c.cidade || '',
    estado_comprador: c.uf || '',

    // IMÓVEL
    quantidade_terreno: '01 (um) lote de terreno',
    localidade: im.localizacaoImovel || im.enderecoLote || contract.cidadeForo || '',
    empreendimento: im.nomeEmpreendimento || '',
    lote: im.numeroLote || '',
    quadra: im.numeroQuadra || '',
    rua_do_lote: im.enderecoLote || '',
    frente: im.metragemFrente ? `${im.metragemFrente} metros` : '',
    lateral_direita: im.metragemLateralDireita ? `${im.metragemLateralDireita} metros` : '',
    lateral_esquerda: im.metragemLateralEsquerda ? `${im.metragemLateralEsquerda} metros` : '',
    fundos: im.metragemFundos ? `${im.metragemFundos} metros` : '',
    area_total: im.areaTotalM2 ? `${im.areaTotalM2} m²` : '',

    // DADOS DE BENS MÓVEIS / VEÍCULOS
    descricao_bem: contract.bemOutros?.descricao || contract.objetoDescricao || '',
    tipo_bem: contract.bemOutros?.tipoBem || 'outro',
    marca_bem: contract.bemOutros?.marca || '',
    modelo_bem: contract.bemOutros?.modelo || '',
    ano_fabricacao_bem: contract.bemOutros?.anoFabricacao || '',
    ano_modelo_bem: contract.bemOutros?.anoModelo || '',
    cor_bem: contract.bemOutros?.cor || '',
    placa_bem: contract.bemOutros?.placa || '',
    chassi_bem: contract.bemOutros?.chassi || '',
    renavam_bem: contract.bemOutros?.renavam || '',
    numero_serie_bem: contract.bemOutros?.numeroSerie || '',
    quilometragem_bem: contract.bemOutros?.quilometragemOuUso || '',
    estado_conservacao_bem: contract.bemOutros?.estadoConservacao || contract.objetoEstadoConservacao || '',
    acessorios_bem: contract.bemOutros?.acessoriosInclusos || '',
    documentacao_bem: contract.bemOutros?.documentacaoSituacao || '',

    // VALORES E PAGAMENTO
    valor_total: valorTotalStr,
    entrada: entradaStr,
    restante: restanteStr,
    quantidade_parcelas: qtdParcelasStr,
    modo_pagamento: modoPagamentoStr,
    valor_parcela: valorParcelaStr,
    data_vencimento: dataVencimentoStr,
    data_primeira_parcela: dataPrimeiraParcelaStr,

    // DATA
    dia,
    mes_extenso: mesExtenso,
    ano,

    // TERMOS AUTOMÁTICOS
    vendedor_termo,
    comprador_termo,
    genero_vendedor,
    genero_comprador,
    genero_vendedor_3,
    genero_comprador_3,
    genero_vendedor_4,
    preposicao_comprador,

    // FORO E ASSINATURA
    cidade_foro: contract.cidadeForo || 'Santarém',
    uf_foro: contract.ufForo || 'PA',
    cidade_assinatura: contract.cidadeAssinatura || contract.cidadeForo || 'Santarém',
    uf_assinatura: contract.ufAssinatura || contract.ufForo || 'PA',
  };
}

// Mapeador das tags {{ }} e { } do sistema para o Contrato de Corretagem com Exclusividade
export function getContractExclusividadeTags(contract: ContractData): ContractExclusividadeTagsMapping {
  const v = contract.vendedor; // Contratante (Proprietário)
  const c = contract.comprador; // Contratado (Corretor/Imobiliária)
  const im = contract.imovel;
  const ex = contract.exclusividade;

  // Tratar componentes da data de assinatura
  let dia = contract.diaAssinatura || '';
  let mesExtenso = contract.mesExtensoAssinatura || '';
  let ano = contract.anoAssinatura || '';

  if (!dia || !mesExtenso || !ano) {
    const rawDate = contract.dataCriacao || new Date().toISOString().split('T')[0];
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      dia = dia || String(parseInt(parts[2], 10));
      const mIdx = parseInt(parts[1], 10) - 1;
      mesExtenso = mesExtenso || MONTH_NAMES_PT[mIdx] || parts[1];
      ano = ano || parts[0];
    }
  }

  // Endereço formatado do contratante
  const enderecoContratanteParts = [
    v.endereco ? `${v.endereco}${v.numero ? `, nº ${v.numero}` : ''}` : '',
    v.bairro ? `Bairro ${v.bairro}` : '',
    v.cep ? `CEP ${v.cep}` : '',
    v.cidade ? `na cidade de ${v.cidade}${v.uf ? `/${v.uf}` : ''}` : ''
  ].filter(Boolean);
  const enderecoContratante = enderecoContratanteParts.join(', ') || 'Endereço não informado';

  // Endereço formatado do contratado
  const enderecoContratadoParts = [
    c.endereco ? `${c.endereco}${c.numero ? `, nº ${c.numero}` : ''}` : '',
    c.bairro ? `Bairro ${c.bairro}` : '',
    c.cep ? `CEP ${c.cep}` : '',
    c.cidade ? `na cidade de ${c.cidade}${c.uf ? `/${c.uf}` : ''}` : ''
  ].filter(Boolean);
  const enderecoContratado = enderecoContratadoParts.join(', ') || 'Endereço profissional não informado';

  // Imóvel
  const tipoImovel = im?.tipoImovel || contract.objetoDescricao || 'Lote de terreno';
  const localizacaoImovel = im?.localizacaoImovel || im?.enderecoLote || `${im?.nomeEmpreendimento ? `${im.nomeEmpreendimento}, ` : ''}${im?.cidadeImovel || contract.cidadeForo || 'Santarém'}/${im?.ufImovel || contract.ufForo || 'PA'}`;
  const documentoPropriedade = im?.documentoPropriedade || ex?.documentoPropriedade || contract.objetoIdentificacao || 'Título Definitivo de Propriedade / Matrícula Imobiliária';
  const matricula = im?.matricula || ex?.matricula || 'Sob o nº 00.000 do 1º Ofício de Registro de Imóveis';
  const inscricaoPrefeitura = im?.inscricaoPrefeitura || ex?.inscricaoPrefeitura || 'Cadastrado sob o nº 00.00.000.0000.000';
  
  let outrosDadosImovel = im?.outrosDadosImovel || ex?.outrosDadosImovel || '';
  if (!outrosDadosImovel && im) {
    const specs = [
      im.numeroLote ? `Lote nº ${im.numeroLote}` : '',
      im.numeroQuadra ? `Quadra nº ${im.numeroQuadra}` : '',
      im.metragemFrente ? `Frente: ${im.metragemFrente}m` : '',
      im.metragemLateralDireita ? `Lateral Direita: ${im.metragemLateralDireita}m` : '',
      im.metragemLateralEsquerda ? `Lateral Esquerda: ${im.metragemLateralEsquerda}m` : '',
      im.metragemFundos ? `Fundos: ${im.metragemFundos}m` : '',
      im.areaTotalM2 ? `Área Total: ${im.areaTotalM2} m²` : ''
    ].filter(Boolean);
    outrosDadosImovel = specs.join(', ');
  }

  // Venda e condições
  const valorTotalStr = formatCurrency(contract.valorTotal);
  const valorTotalExtenso = contract.valorTotalExtenso?.trim() || numeroPorExtensoReais(contract.valorTotal);
  const condicoesPagamento = ex?.condicoesPagamento || contract.vendaVista?.formaPagamento || 'À vista, em moeda corrente nacional, via transferência bancária ou PIX no ato da outorga da Escritura Pública/Contrato Definitivo';

  // Corretagem
  const pctCorretagemNum = ex?.percentualComissao !== undefined ? ex.percentualComissao : 6;
  const pctCorretagemStr = `${pctCorretagemNum}%`;
  const pctCorretagemExtenso = ex?.percentualComissaoExtenso || percentualPorExtenso(pctCorretagemNum);

  // Exclusividade
  const prazoDias = ex?.unidadePrazo === 'meses' ? (ex?.prazoMesesOuDias || 3) * 30 : (ex?.prazoMesesOuDias || 90);
  let dataTermino = '';
  if (ex?.dataTermino) {
    dataTermino = formatDateExtenso(ex.dataTermino);
  } else if (ex?.dataInicio) {
    const dIni = new Date(ex.dataInicio);
    const dFim = new Date(dIni.getTime() + prazoDias * 86400000);
    dataTermino = formatDateExtenso(dFim.toISOString().split('T')[0]);
  } else {
    const dFim = new Date(Date.now() + prazoDias * 86400000);
    dataTermino = formatDateExtenso(dFim.toISOString().split('T')[0]);
  }

  const conjuge = v.conjuge;

  return {
    // DADOS DO CONTRATANTE
    CONTRATANTE_NOME: v.nome || 'PROPRIETÁRIO(A) / CONTRATANTE',
    CONTRATANTE_ESTADO_CIVIL: v.estadoCivil || 'casado(a)',
    CONTRATANTE_CPF: v.cpfCnpj || '',
    CONTRATANTE_RG: `${v.rg || ''} ${v.rgOrgao || ''}`.trim() || 'Não informado',
    CONJUGE_NOME: conjuge?.nome || 'Não aplicável / Não informado',
    CONJUGE_CPF: conjuge?.cpf || '',
    CONJUGE_RG: conjuge?.rg || '',
    CONTRATANTE_ENDERECO: enderecoContratante,

    // DADOS DO CONTRATADO
    VENDEDOR_NOME: c.nome || 'CORRETOR(A) / IMOBILIÁRIA',
    VENDEDOR_CPF: c.cpfCnpj || '',
    VENDEDOR_CRECI: c.creci || c.rg || '0000-PA',
    VENDEDOR_ENDERECO: enderecoContratado,
    VENDEDOR_TELEFONE: c.telefone || '',

    // DADOS DO IMÓVEL
    TIPO_IMOVEL: tipoImovel,
    LOCALIZACAO_IMOVEL: localizacaoImovel,
    DOCUMENTO_PROPRIEDADE: documentoPropriedade,
    MATRICULA: matricula,
    INSCRICAO_PREFEITURA: inscricaoPrefeitura,
    OUTROS_DADOS_IMOVEL: outrosDadosImovel || 'Conforme certidão de matrícula e memorial descritivo',

    // DADOS DA VENDA
    VALOR_TOTAL: valorTotalStr,
    VALOR_TOTAL_EXTENSO: valorTotalExtenso,
    CONDICOES_PAGAMENTO: condicoesPagamento,

    // DADOS DA CORRETAGEM
    PERCENTUAL_CORRETAGEM: pctCorretagemStr,
    PERCENTUAL_CORRETAGEM_EXTENSO: pctCorretagemExtenso,

    // DADOS DA EXCLUSIVIDADE
    PRAZO_EXCLUSIVIDADE_DIAS: String(prazoDias),
    DATA_TERMINO_EXCLUSIVIDADE: dataTermino,

    // DADOS DO FORO
    FORO_COMARCA: `${contract.cidadeForo || 'Santarém'}/${contract.ufForo || 'PA'}`,

    // DATA DA ASSINATURA
    CIDADE_ASSINATURA: contract.cidadeAssinatura || contract.cidadeForo || 'Santarém',
    ESTADO_ASSINATURA: contract.ufAssinatura || contract.ufForo || 'PA',
    DIA: dia,
    MES_EXTENSO: mesExtenso,
    ANO: ano,

    // ESPECÍFICO PARA LOCAÇÃO EM EXCLUSIVIDADE (Casas, Galpões, etc.)
    FINALIDADE_EXCLUSIVIDADE: ex?.finalidade === 'locacao' ? 'Locação de Imóvel' : (ex?.finalidade === 'ambos' ? 'Venda e Locação de Imóvel' : 'Venda de Imóvel'),
    VALOR_LOCACAO_SUGERIDO: ex?.valorLocacaoSugerido ? formatCurrency(ex.valorLocacaoSugerido) : (contract.locacao?.valorAluguel ? formatCurrency(contract.locacao.valorAluguel) : (contract.valorTotal ? formatCurrency(contract.valorTotal) : 'A combinar')),
    VALOR_LOCACAO_SUGERIDO_EXTENSO: ex?.valorLocacaoSugeridoExtenso || (ex?.valorLocacaoSugerido ? numeroPorExtensoReais(ex.valorLocacaoSugerido) : (contract.locacao?.valorAluguelExtenso || contract.valorTotalExtenso || '')),
    COMISSAO_LOCACAO: ex?.comissaoLocacao || '100% do primeiro aluguel mensal',
    TAXA_ADMINISTRACAO_LOCACAO: ex?.taxaAdministracaoLocacao || '10% ao mês sobre os aluguéis recebidos',
    GARANTIAS_ACEITAS_LOCACAO: ex?.garantiasAceitasLocacao || 'Caução em dinheiro (até 3 meses), Fiador idôneo ou Seguro-Fiança Locatícia',
    AUTORIZACAO_PROSPECCAO: ex?.autorizaProspeccaoClientes !== false ? 'Autorização expressa para prospecção ativa de clientes/inquilinos e veiculação de anúncios em nome do proprietário' : 'Prospecção sob consulta prévia',
  };
}

/**
 * Gera mapa de tags padronizadas para Contrato de Locação (Aluguel de Casas, Galpões, etc.)
 */
export function getContractLocacaoTags(contract: ContractData): ContractLocacaoTagsMapping {
  const v = contract.vendedor; // Locador / Proprietário
  const c = contract.comprador; // Locatário / Inquilino
  const loc = contract.locacao;
  const im = contract.imovel;

  const dia = contract.diaAssinatura || new Date().getDate().toString();
  const mesExtenso = contract.mesExtensoAssinatura || MONTH_NAMES_PT[new Date().getMonth()] || 'janeiro';
  const ano = contract.anoAssinatura || new Date().getFullYear().toString();
  const dataAssinatura = `${dia} de ${mesExtenso} de ${ano}`;

  // Gênero / concordância Locador
  const isFemLocador = v.genero === 'feminino';
  const artigoLocador = isFemLocador ? 'A' : 'O';
  const tratamentoLocador = isFemLocador ? 'Sra.' : 'Sr.';
  const concordanciaLocador = isFemLocador ? 'residente e domiciliada' : 'residente e domiciliado';

  // Gênero / concordância Locatário
  const isFemLocatario = c.genero === 'feminino';
  const artigoLocatario = isFemLocatario ? 'A' : 'O';
  const tratamentoLocatario = isFemLocatario ? 'Sra.' : 'Sr.';
  const concordanciaLocatario = isFemLocatario ? 'residente e domiciliada' : 'residente e domiciliado';

  // Valores
  const valorAluguelNum = loc?.valorAluguel || contract.valorTotal || 0;
  const valorAluguelStr = formatCurrency(valorAluguelNum);
  const valorAluguelExtenso = loc?.valorAluguelExtenso?.trim() || contract.valorTotalExtenso?.trim() || numeroPorExtensoReais(valorAluguelNum);

  // Caução / Garantia
  const valorCaucaoNum = loc?.valorCaucao || (loc?.numeroMesesCaucao ? valorAluguelNum * loc.numeroMesesCaucao : 0);
  const valorCaucaoStr = valorCaucaoNum > 0 ? formatCurrency(valorCaucaoNum) : 'Não aplicável';
  const valorCaucaoExtenso = valorCaucaoNum > 0 ? numeroPorExtensoReais(valorCaucaoNum) : '';

  let garantiaDescricao = 'Sem garantia locatícia específica';
  if (loc?.garantiaTipo === 'caucao') {
    garantiaDescricao = `Caução em dinheiro no valor de ${valorCaucaoStr} (${valorCaucaoExtenso}), correspondente a ${loc?.numeroMesesCaucao || 1} mês(es) de aluguel, depositada pelo(a) LOCATÁRIO(A) na conta do(a) LOCADOR(A).`;
  } else if (loc?.garantiaTipo === 'fiador' && loc?.fiador?.nome) {
    const f = loc.fiador;
    garantiaDescricao = `Fiança prestada por ${f.nome}, ${f.nacionalidade || 'brasileiro(a)'}, ${f.estadoCivil || 'casado(a)'}, CPF nº ${f.cpfCnpj || 'não informado'}, RG nº ${f.rg || 'não informado'} ${f.rgOrgao || ''}, residente em ${f.endereco || ''}, nº ${f.numero || 'S/N'}, ${f.cidade || ''}/${f.uf || ''}, que assume a responsabilidade solidária por todas as obrigações deste contrato.`;
  } else if (loc?.garantiaTipo === 'seguro_fianca') {
    garantiaDescricao = 'Seguro Fiança Locatícia contratado pelo(a) LOCATÁRIO(A) junto a seguradora idônea.';
  }

  // Descrição do imóvel
  const tipoImovelStr = loc?.tipoImovel === 'galpao' ? 'Galpão Comercial / Industrial' : (loc?.tipoImovel === 'casa' ? 'Casa Residencial' : (loc?.tipoImovel === 'predio' ? 'Prédio Comercial' : (loc?.tipoImovel === 'sala_comercial' ? 'Sala Comercial' : (loc?.tipoImovel === 'apartamento' ? 'Apartamento' : 'Imóvel'))));
  const destinacaoStr = loc?.finalidadeLocacao === 'industrial_galpao' ? 'Armazenamento, logística e atividades industriais/comerciais' : (loc?.finalidadeLocacao === 'comercial' ? 'Comercial e prestação de serviços' : (loc?.finalidadeLocacao === 'residencial' ? 'Exclusivamente Residencial' : 'Comercial/Residencial'));
  
  const enderecoImovelStr = im?.enderecoLote || im?.localizacaoImovel || contract.objetoIdentificacao || `${v.endereco}, nº ${v.numero} - ${v.bairro}`;
  const cidadeImovelStr = im?.cidadeImovel || contract.cidadeForo || v.cidade || 'Santarém';
  const estadoImovelStr = im?.ufImovel || contract.ufForo || v.uf || 'PA';
  const areaImovelStr = im?.areaTotalM2 ? `${im.areaTotalM2} m²` : 'Conforme vistoria';

  const fiador = loc?.fiador;

  return {
    // LOCADOR (PROPRIETÁRIO)
    artigo_locador: artigoLocador,
    tratamento_locador: tratamentoLocador,
    locador: v.nome || 'LOCADOR(A) / PROPRIETÁRIO(A)',
    nacionalidade_locador: v.nacionalidade || 'brasileiro(a)',
    estado_civil_locador: v.estadoCivil || 'solteiro(a)',
    rg_locador: v.rg || '',
    emissao_rg_locador: v.rgOrgao || 'SSP/PA',
    cpf_locador: v.cpfCnpj || '',
    concordancia_locador: concordanciaLocador,
    endereco_locador: v.endereco || '',
    numero_locador: v.numero || 'S/N',
    bairro_locador: v.bairro || '',
    cep_locador: v.cep || '',
    cidade_locador: v.cidade || 'Santarém',
    estado_locador: v.uf || 'PA',
    telefone_locador: v.telefone || '',
    email_locador: v.email || '',

    // LOCATÁRIO (INQUILINO)
    artigo_locatario: artigoLocatario,
    tratamento_locatario: tratamentoLocatario,
    locatario: c.nome || 'LOCATÁRIO(A) / INQUILINO(A)',
    nacionalidade_locatario: c.nacionalidade || 'brasileiro(a)',
    estado_civil_locatario: c.estadoCivil || 'solteiro(a)',
    rg_locatario: c.rg || '',
    emissao_rg_locatario: c.rgOrgao || 'SSP/PA',
    cpf_locatario: c.cpfCnpj || '',
    concordancia_locatario: concordanciaLocatario,
    endereco_locatario: c.endereco || '',
    numero_locatario: c.numero || 'S/N',
    bairro_locatario: c.bairro || '',
    cep_locatario: c.cep || '',
    cidade_locatario: c.cidade || 'Santarém',
    estado_locatario: c.uf || 'PA',
    telefone_locatario: c.telefone || '',
    email_locatario: c.email || '',

    // FIADOR
    tem_fiador: loc?.garantiaTipo === 'fiador' && fiador?.nome ? 'SIM' : 'NÃO',
    fiador_nome: fiador?.nome || '',
    fiador_cpf: fiador?.cpfCnpj || '',
    fiador_rg: `${fiador?.rg || ''} ${fiador?.rgOrgao || ''}`.trim(),
    fiador_nacionalidade: fiador?.nacionalidade || 'brasileiro(a)',
    fiador_estado_civil: fiador?.estadoCivil || 'casado(a)',
    fiador_endereco: fiador?.endereco ? `${fiador.endereco}, nº ${fiador.numero || 'S/N'} - ${fiador.bairro || ''}, ${fiador.cidade || ''}/${fiador.uf || ''}` : '',
    fiador_telefone: fiador?.telefone || '',
    conjuge_fiador_nome: fiador?.conjuge?.nome || '',
    conjuge_fiador_cpf: fiador?.conjuge?.cpf || '',

    // IMÓVEL LOCADO
    tipo_imovel_locado: tipoImovelStr,
    destinacao_locacao: destinacaoStr,
    endereco_imovel_locado: enderecoImovelStr,
    cidade_imovel_locado: cidadeImovelStr,
    estado_imovel_locado: estadoImovelStr,
    area_imovel_locado: areaImovelStr,
    descricao_detalhada_imovel: im?.outrosDadosImovel || contract.objetoDescricao || `${tipoImovelStr} situado em ${enderecoImovelStr}, ${cidadeImovelStr}/${estadoImovelStr}, com área total aproximada de ${areaImovelStr}.`,

    // VALORES E CONDIÇÕES
    valor_aluguel: valorAluguelStr,
    valor_aluguel_extenso: valorAluguelExtenso,
    dia_vencimento: String(loc?.diaVencimento || 10),
    forma_pagamento_aluguel: loc?.formaPagamento || 'Transferência / PIX',
    dados_bancarios_locador: loc?.dadosBancariosLocador || 'Chave PIX a ser informada pelo(a) LOCADOR(A)',
    indice_reajuste: loc?.indiceReajuste || 'IGP-M/FGV (ou IPCA/IBGE na sua falta)',
    periodicidade_reajuste: loc?.periodicidadeReajuste || 'Anual',
    prazo_locacao_meses: String(loc?.prazoMeses || 12),
    data_inicio_locacao: loc?.dataInicio ? formatDateExtenso(loc.dataInicio) : dataAssinatura,
    data_termino_locacao: loc?.dataTermino ? formatDateExtenso(loc.dataTermino) : '',
    garantia_locaticia_tipo: loc?.garantiaTipo === 'caucao' ? 'Caução em Dinheiro' : (loc?.garantiaTipo === 'fiador' ? 'Fiança Solidária' : (loc?.garantiaTipo === 'seguro_fianca' ? 'Seguro Fiança' : 'Sem Garantia')),
    garantia_locaticia_descricao: garantiaDescricao,
    valor_caucao: valorCaucaoStr,
    valor_caucao_extenso: valorCaucaoExtenso,
    multa_atraso_percentual: `${loc?.multaAtrasoPercentual !== undefined ? loc.multaAtrasoPercentual : 10}%`,
    juros_mora_percentual: `${loc?.jurosMoraMensalPercentual !== undefined ? loc.jurosMoraMensalPercentual : 1}% ao mês`,
    multa_rescisoria: loc?.multaRescisao || 'Equivalente a 03 (três) meses de aluguel vigentes à época da infração, cobrada proporcionalmente ao tempo restante de contrato.',
    despesas_locatario: loc?.despesasLocatario || 'Consumo de energia elétrica, abastecimento de água/esgoto, taxa de coleta de lixo, IPTU e despesas ordinárias de condomínio (quando houver).',

    // FORO E DATAS
    cidade_foro: contract.cidadeForo || 'Santarém',
    uf_foro: contract.ufForo || 'PA',
    foro_comarca: `${contract.cidadeForo || 'Santarém'}/${contract.ufForo || 'PA'}`,
    cidade_assinatura: contract.cidadeAssinatura || contract.cidadeForo || 'Santarém',
    uf_assinatura: contract.ufAssinatura || contract.ufForo || 'PA',
    dia: dia,
    mes_extenso: mesExtenso,
    ano: ano,
    data_assinatura: dataAssinatura
  };
}

// Template padrão com as tags { } do Contrato de Locação de Imóvel (Casas, Galpões, etc. - Lei 8.245/91)
export const TEMPLATE_CONTRATO_LOCACAO_IMOVEL = `
INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO DE IMÓVEL

DAS PARTES CONTRATANTES

LOCADOR(A):
{artigo_locador} {tratamento_locador} {locador}, {nacionalidade_locador}, {estado_civil_locador}, portador(a) do RG nº {rg_locador} {emissao_rg_locador}, inscrito(a) no CPF/CNPJ sob o nº {cpf_locador}, {concordancia_locador} na {endereco_locador}, nº {numero_locador}, Bairro {bairro_locador}, CEP {cep_locador}, na cidade de {cidade_locador}/{estado_locador}, telefone {telefone_locador}, doravante denominado(a) simplesmente LOCADOR(A).

LOCATÁRIO(A):
{artigo_locatario} {tratamento_locatario} {locatario}, {nacionalidade_locatario}, {estado_civil_locatario}, portador(a) do RG nº {rg_locatario} {emissao_rg_locatario}, inscrito(a) no CPF/CNPJ sob o nº {cpf_locatario}, {concordancia_locatario} na {endereco_locatario}, nº {numero_locatario}, Bairro {bairro_locatario}, CEP {cep_locatario}, na cidade de {cidade_locatario}/{estado_locatario}, telefone {telefone_locatario}, doravante denominado(a) simplesmente LOCATÁRIO(A).

Têm entre si, justo e acertado, o presente CONTRATO DE LOCAÇÃO DE IMÓVEL, que se regerá pela Lei Federal nº 8.245/1991 (Lei do Inquilinato) e pelas seguintes cláusulas e condições:

CLÁUSULA 1ª – DO OBJETO E DESTINAÇÃO DO IMÓVEL
O presente contrato tem por objeto a locação do imóvel caracterizado como {tipo_imovel_locado}, situado na {endereco_imovel_locado}, na cidade de {cidade_imovel_locado}/{estado_imovel_locado}, com área aproximada de {area_imovel_locado}.
Parágrafo Primeiro: O imóvel ora locado destina-se exclusivamente para fins de {destinacao_locacao}, sendo expressamente vedada a mudança de destinação, cessão, sublocação ou empréstimo sem a prévia e expressa autorização por escrito do(a) LOCADOR(A).
Parágrafo Segundo: O(A) LOCATÁRIO(A) declara que vistoriou o imóvel e o recebe em perfeito estado de conservação, habitabilidade, uso e funcionamento elétrico e hidráulico, obrigando-se a devolvê-lo nas mesmíssimas condições ao término da locação.

CLÁUSULA 2ª – DO VALOR DO ALUGUEL, FORMA E LOCAL DE PAGAMENTO
O valor mensal da locação é fixado em {valor_aluguel} ({valor_aluguel_extenso}), que deverá ser pago impreterivelmente até o dia {dia_vencimento} de cada mês subsequente ao vencido.
Parágrafo Primeiro: O pagamento será efetuado via {forma_pagamento_aluguel}, creditado na seguinte forma: {dados_bancarios_locador}, servindo o respectivo comprovante bancário de quitação plena da mensalidade.

CLÁUSULA 3ª – DO REAJUSTE DO ALUGUEL
O valor do aluguel avençado será reajustado com periodicidade {periodicidade_reajuste}, tomando-se por base a variação positiva acumulada do índice {indice_reajuste}, ou, na sua extinção ou impedimento legal, pelo índice oficial que legalmente vier a substituí-lo.

CLÁUSULA 4ª – DO PRAZO DE VIGÊNCIA
A presente locação vigorará pelo prazo determinado de {prazo_locacao_meses} meses, iniciando-se em {data_inicio_locacao} e findando em {data_termino_locacao}, data em que o(a) LOCATÁRIO(A) obriga-se a restituir o imóvel completamente desocupado, limpo e em perfeito estado de conservação.

CLÁUSULA 5ª – DOS ENCARGOS, TRIBUTOS E DESPESAS DE CONSUMO
Além do aluguel mensal, correrão por conta exclusiva do(a) LOCATÁRIO(A) durante todo o período em que permanecer na posse do imóvel as seguintes despesas e encargos: {despesas_locatario}.

CLÁUSULA 6ª – DA GARANTIA LOCATÍCIA
Para garantia do fiel cumprimento de todas as obrigações assumidas neste contrato, adota-se a modalidade de {garantia_locaticia_tipo}:
{garantia_locaticia_descricao}

CLÁUSULA 7ª – DO INADIMPLEMENTO, MULTA MORATÓRIA E JUROS
O não pagamento do aluguel e encargos até a data de seu respectivo vencimento sujeitará o(a) LOCATÁRIO(A) à incidência automática de multa moratória de {multa_atraso_percentual} sobre o montante do débito, acrescida de juros moratórios de {juros_mora_percentual}, correção monetária e honorários advocatícios em caso de cobrança judicial ou extrajudicial.

CLÁUSULA 8ª – DA RESCISÃO E MULTA CONTRATUAL
A infração a qualquer das cláusulas e condições deste contrato facultará à parte inocente a rescisão de pleno direito deste instrumento, ficando a parte infratora sujeita ao pagamento da multa penal correspondente a: {multa_rescisoria}.

CLÁUSULA 9ª – DO FORO
Para dirimir qualquer questão, dúvida ou litígio decorrente da interpretação ou execução do presente contrato, as partes elegem expressamente o Foro da Comarca de {foro_comarca}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
`.trim();

// Template padrão com as tags { } do Contrato de Compra e Venda de Imóvel à Vista
export const TEMPLATE_CONTRATO_IMOVEL_VISTA = `
INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL

DAS PARTES CONTRATANTES

PROMITENTE VENDEDOR(A):
{vendedor_nome}, {vendedor_nacionalidade}, {vendedor_estado_civil}, portador(a) do RG nº {vendedor_rg} {vendedor_rg_orgao}, inscrito(a) no CPF/CNPJ sob o nº {vendedor_cpf_cnpj}, residente e domiciliado(a) na {vendedor_endereco}, nº {vendedor_numero}, Bairro {vendedor_bairro}, CEP {vendedor_cep}, na cidade de {vendedor_cidade}/{vendedor_uf}, telefone {vendedor_telefone}.

PROMITENTE COMPRADOR(A):
{comprador_nome}, {comprador_nacionalidade}, {comprador_estado_civil}, portador(a) do RG nº {comprador_rg} {comprador_rg_orgao}, inscrito(a) no CPF sob o nº {comprador_cpf}, residente e domiciliado(a) na {comprador_endereco}, nº {comprador_numero}, Bairro {comprador_bairro}, CEP {comprador_cep}, na cidade de {comprador_cidade}/{comprador_uf}, telefone {comprador_telefone}.

Têm entre si, justo e acertado, o presente INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL, que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA 1ª – DO OBJETO DO CONTRATO
O presente contrato tem por objeto a promessa de compra e venda irrevogável e irretratável do Lote de terreno sob o nº {numero_lote}, da Quadra {numero_quadra}, integrante do empreendimento denominado {nome_empreendimento}, situado na {localizacao_imovel}, com endereço de localização no(a) {endereco_lote}, na cidade de {cidade_imovel}/{uf_imovel}, possuindo as seguintes dimensões e confrontações:
- Metragem de Frente: {metragem_frente} metros;
- Metragem de Lateral Direita: {metragem_lateral_direita} metros;
- Metragem de Lateral Esquerda: {metragem_lateral_esquerda} metros;
- Metragem de Fundos: {metragem_fundos} metros;
- Perfazendo uma Área Total de: {area_total_m2} m².

CLÁUSULA 2ª – DO PREÇO, PAGAMENTO À VISTA E DA QUITAÇÃO PLENA
O preço certo, justo e ajustado para a presente compra e venda é de R$ {valor_total} ({valor_total_extenso}), pago integralmente à vista, em moeda corrente nacional.
Parágrafo Único: Com a efetivação e compensação do pagamento integral do valor acima discriminado, o(a) PROMITENTE VENDEDOR(A) confere ao(à) PROMITENTE COMPRADOR(A) a mais ampla, geral, rasa e irrevogável quitação de pago e satisfeito, para nada mais reclamar a qualquer tempo quanto ao preço ora avençado.

CLÁUSULA 3ª – DA IMISSÃO NA POSSE E RESPONSABILIDADES
A imissão na posse direta do imóvel é concedida ao(à) PROMITENTE COMPRADOR(A) a partir da assinatura deste instrumento e integral quitação do preço, passando a correr por sua conta exclusiva todos os tributos, taxas, contribuições e despesas incidentes sobre o imóvel a partir desta data.

CLÁUSULA 4ª – DA ESCRITURAÇÃO DEFINITIVA E EVICÇÃO
O(A) PROMITENTE VENDEDOR(A) compromete-se a outorgar a competente Escritura Pública Definitiva de Compra e Venda em favor do(a) PROMITENTE COMPRADOR(A) ou de quem este expressamente indicar, correndo por conta exclusiva do(a) adquirente todas as despesas relativas a ITBI, certidões, emolumentos cartorários e registros. O(A) PROMITENTE VENDEDOR(A) responde pela evicção de direito nos termos do Código Civil Brasileiro.

CLÁUSULA 5ª – DA IRREVOGABILIDADE E IRRETRATABILIDADE
O presente contrato é celebrado em caráter estritamente irrevogável e irretratável, vedado o arrependimento, obrigando as partes contratantes, seus herdeiros e sucessores a qualquer título ao seu fiel e integral cumprimento.

CLÁUSULA 6ª – DO FORO
Para dirimir quaisquer dúvidas, controvérsias ou litígios decorrentes da interpretação ou execução deste instrumento, as partes elegem expressamente o Foro da Comarca de {cidade_foro}/{uf_foro}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em vias de igual teor e forma, perante as testemunhas abaixo qualificadas.

{cidade_assinatura}/{uf_assinatura}, {dia} de {mes_extenso} de {ano}.

{vendedor_nome}
PROMITENTE VENDEDOR(A)
CPF/CNPJ: {vendedor_cpf_cnpj}

{comprador_nome}
PROMITENTE COMPRADOR(A)
CPF: {comprador_cpf}

TESTEMUNHAS:
1. Nome: {testemunha_1_nome}
CPF: {testemunha_1_cpf}
RG: {testemunha_1_rg}

2. Nome: {testemunha_2_nome}
CPF: {testemunha_2_cpf}
RG: {testemunha_2_rg}
`.trim();

// Template padrão com as tags { } do Contrato Parcelado
export const TEMPLATE_CONTRATO_IMOVEL_PARCELADO = `
INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL PARCELADO COM RESERVA DE DOMÍNIO

DAS PARTES CONTRATANTES

{vendedor_termo}:
{artigo_vendedor} {tratamento_vendedor} {vendedor}, {nacionalidade_vendedor}, {estado_civil_vendedor}, portador(a) do RG nº {rg_vendedor} {emissao_rg_vendedor}, inscrito(a) no CPF sob o nº {cpf_vendedor}, {concordancia_vendedor} na {endereco_vendedor}, nº {numero_vendedor}, Bairro {bairro_vendedor}, na cidade de {cidade_vendedor}/{estado_vendedor}.

{comprador_termo}:
{artigo_comprador} {tratamento_comprador} {comprador}, {nacionalidade_comprador}, {estado_civil_comprador}, portador(a) do RG nº {rg_comprador} {emissao_rg_comprador}, inscrito(a) no CPF sob o nº {cpf_comprador}, telefone/whatsapp {telefone_comprador}, {concordancia_comprador} na {endereco_comprador}, nº {numero_comprador}, Bairro {bairro_comprador}, CEP {cep_comprador}, na cidade de {cidade_comprador}/{estado_comprador}.

Têm entre si, justo e acertado, o presente INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL PARCELADO COM RESERVA DE DOMÍNIO, que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA 1ª – DO OBJETO DO CONTRATO
O presente contrato tem por objeto a promessa de compra e venda irrevogável e irretratável de {quantidade_terreno}, correspondente ao Lote de terreno sob o nº {lote}, da Quadra {quadra}, integrante do empreendimento denominado {empreendimento}, situado na {localidade}, com endereço no(a) {rua_do_lote}, possuindo as seguintes confrontações e dimensões:
- Metragem de Frente: {frente};
- Metragem de Lateral Direita: {lateral_direita};
- Metragem de Lateral Esquerda: {lateral_esquerda};
- Metragem de Fundos: {fundos};
- Perfazendo uma Área Total de: {area_total}.

CLÁUSULA 2ª – DO PREÇO E CONDIÇÕES DE PAGAMENTO PARCELADO
O preço total, certo e ajustado para a presente compra e venda é de {valor_total}, o qual será pago pelo(a) {comprador_termo} {genero_vendedor_3} na seguinte conformidade:
a) ENTRADA / SINAL: O valor de {entrada}, pago a título de sinal e princípio de pagamento;
b) SALDO REMANESCENTE: O saldo restante de {restante}, a ser quitado em {quantidade_parcelas} parcelas no valor de {valor_parcela} cada, com vencimento {data_vencimento}, vencendo a primeira parcela em {data_primeira_parcela}, por meio de {modo_pagamento}.

CLÁUSULA 3ª – DO PACTO DE RESERVA DE DOMÍNIO
Com fulcro nos Arts. 521 a 528 do Código Civil Brasileiro, a presente compra e venda é celebrada sob a expressa cláusula de RESERVA DE DOMÍNIO, pela qual {artigo_vendedor} {vendedor_termo} reserva para si o domínio e propriedade resolúvel do imóvel objeto deste contrato até que seja efetuado o pagamento integral e a quitação definitiva da última parcela do preço estipulado.
Parágrafo Único: A posse transmitida {preposicao_comprador} neste ato dá-se em caráter precário e provisório, consolidando-se a propriedade plena e definitiva somente após a liquidação total de todas as parcelas e encargos decorrentes deste ajuste.

CLÁUSULA 4ª – DO ATRASO, ENCARGOS MORATÓRIOS E RESCISÃO
O atraso no pagamento de qualquer das parcelas sujeitará {artigo_comprador} {comprador_termo} ao pagamento de multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária.
Parágrafo Primeiro: O inadimplemento superior a 30 (trinta) dias facultará {genero_vendedor_3}, independentemente de notificação judicial prévia, declarar rescindido de pleno direito o presente contrato com a imediata reintegração na posse do bem e retenção dos valores previstos em lei a título de indenização pelo uso e fruição do imóvel.

CLÁUSULA 5ª – DOS TRIBUTOS E RESPONSABILIDADES
A partir da assinatura deste instrumento e imissão provisória na posse, correrão por conta exclusiva do(a) {comprador_termo} todos os impostos, taxas, contribuições de melhoria e quaisquer outros encargos que recaiam ou venham a recair sobre o imóvel.

CLÁUSULA 6ª – DA ESCRITURAÇÃO DEFINITIVA
Quitado integralmente o preço pactuado na Cláusula 2ª e comprovado o cumprimento de todas as obrigações acessórias, {artigo_vendedor} {vendedor_termo} obriga-se a outorgar a competente Escritura Pública Definitiva de Compra e Venda em favor do(a) {comprador_termo}, correndo todas as despesas de transmissão (ITBI), certidões, emolumentos e registros cartorários por conta deste último.

CLÁUSULA 7ª – DO FORO
Para dirimir quaisquer dúvidas, controvérsias ou litígios decorrentes da interpretação ou execução deste instrumento, as partes elegem expressamente o Foro da Comarca de {cidade_foro}/{uf_foro}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em vias de igual teor e forma, perante as testemunhas abaixo qualificadas.

{cidade_assinatura}/{uf_assinatura}, {dia} de {mes_extenso} de {ano}.

{vendedor_termo} - {vendedor}
CPF nº {cpf_vendedor}

{comprador_termo} - {comprador}
CPF nº {cpf_comprador}

TESTEMUNHAS:
1. Nome: {testemunha_1_nome}
CPF: {testemunha_1_cpf}
RG: {testemunha_1_rg}

2. Nome: {testemunha_2_nome}
CPF: {testemunha_2_cpf}
RG: {testemunha_2_rg}
`.trim();

// Template padrão com as tags {{ }} e { } do Contrato de Exclusividade
export const TEMPLATE_CONTRATO_EXCLUSIVIDADE = `
CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE

DAS PARTES CONTRATANTES

DADOS DO CONTRATANTE:
{{CONTRATANTE_NOME}}, {{CONTRATANTE_ESTADO_CIVIL}}, inscrito(a) no CPF sob o nº {{CONTRATANTE_CPF}}, portador(a) do RG nº {{CONTRATANTE_RG}}, residente e domiciliado(a) no endereço: {{CONTRATANTE_ENDERECO}}, doravante denominado(a) simplesmente CONTRATANTE.
[Dados do Cônjuge: {{CONJUGE_NOME}}, inscrito(a) no CPF sob o nº {{CONJUGE_CPF}}, portador(a) do RG nº {{CONJUGE_RG}}]

DADOS DO CONTRATADO:
{{VENDEDOR_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{VENDEDOR_CPF}}, registrado(a) no CRECI sob o nº {{VENDEDOR_CRECI}}, estabelecido(a) no endereço: {{VENDEDOR_ENDERECO}}, telefone/contato: {{VENDEDOR_TELEFONE}}, doravante denominado(a) simplesmente CONTRATADO.

Têm entre si, justo e acordado, o presente CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE, mediante as cláusulas e condições seguintes:

CLÁUSULA 1ª – DO OBJETO DO CONTRATO E DADOS DO IMÓVEL
O presente contrato tem por objeto a prestação de serviços de intermediação e corretagem imobiliária com cláusula de exclusividade para a promoção e venda do bem imóvel caracterizado como {{TIPO_IMOVEL}}, situado em {{LOCALIZACAO_IMOVEL}}, de propriedade do(a) CONTRATANTE, com a seguinte especificação documental e registral:
- Documento de Propriedade: {{DOCUMENTO_PROPRIEDADE}};
- Matrícula nº: {{MATRICULA}};
- Inscrição Municipal/Prefeitura nº: {{INSCRICAO_PREFEITURA}};
- Descrição, Dimensões e Confrontações: {{OUTROS_DADOS_IMOVEL}}.

CLÁUSULA 2ª – DO VALOR E CONDIÇÕES DE VENDA
O imóvel objeto deste instrumento será promovido e disponibilizado no mercado imobiliário para venda pelo valor total de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), sob as seguintes condições de pagamento: {{CONDICOES_PAGAMENTO}}.
Parágrafo Único: O(A) CONTRATANTE poderá aceitar propostas com condições ou valores distintos, desde que expressamente autorizados por escrito e de comum acordo.

CLÁUSULA 3ª – DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE
A presente autorização de corretagem é outorgada em caráter irrevogável de EXCLUSIVIDADE pelo prazo de {{PRAZO_EXCLUSIVIDADE_DIAS}} dias, iniciando-se na data de assinatura deste instrumento e com termo final fixado improrrogavelmente em {{DATA_TERMINO_EXCLUSIVIDADE}}.
Parágrafo Primeiro: Durante a vigência da exclusividade, o(a) CONTRATANTE obriga-se a não outorgar poderes de venda a terceiros e a não realizar negociação direta do bem sem a prévia e expressa intermediação do(a) CONTRATADO.
Parágrafo Segundo: Nos termos do Artigo 726 do Código Civil Brasileiro, se a venda do imóvel for consumada durante o prazo de exclusividade, ainda que realizada diretamente pelo proprietário ou por intermédio de outrem, a remuneração integral de corretagem estipulada na Cláusula 4ª será devida ao(à) CONTRATADO.

CLÁUSULA 4ª – DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM
Pelos serviços de intermediação e assessoria na venda, o(a) CONTRATANTE pagará ao(à) CONTRATADO a comissão de corretagem correspondente a {{PERCENTUAL_CORRETAGEM}} ({{PERCENTUAL_CORRETAGEM_EXTENSO}}) calculada sobre o valor total da venda concretizada.
Parágrafo Primeiro: Os honorários de corretagem serão exigíveis no ato do recebimento do sinal/princípio de pagamento ou na celebração do instrumento de compra e venda ou lavratura da escritura definitiva.
Parágrafo Segundo: Em consonância com o Artigo 727 do Código Civil, se o negócio for concluído após o término deste contrato com comprador atraído, apresentado ou negociado pelo(a) CONTRATADO durante a vigência da exclusividade, a remuneração de corretagem permanecerá integralmente devida.

CLÁUSULA 5ª – DAS OBRIGAÇÕES E DIVULGAÇÃO
O(A) CONTRATADO compromete-se a conduzir os trabalhos com probidade, prudência e dedicação, ficando autorizado(a) a afixar placas no imóvel, veicular anúncios em portais imobiliários, redes sociais e mídias do setor, bem como prestar contas de todas as tratativas ao(à) CONTRATANTE.

CLÁUSULA 6ª – DO FORO
Para dirimir quaisquer dúvidas ou litígios decorrentes da aplicação deste contrato, as partes elegem expressamente o Foro da Comarca de {{FORO_COMARCA}}, com renúncia irrevogável a qualquer outro por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em vias de igual teor e forma, perante as testemunhas abaixo qualificadas.

{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.

CONTRATANTE - {{CONTRATANTE_NOME}}
CPF nº {{CONTRATANTE_CPF}}

CONTRATADO - {{VENDEDOR_NOME}}
CRECI nº {{VENDEDOR_CRECI}} | CPF/CNPJ nº {{VENDEDOR_CPF}}

TESTEMUNHAS:
1. Nome: {{TESTEMUNHA_1_NOME}}
CPF: {{TESTEMUNHA_1_CPF}}
RG: {{TESTEMUNHA_1_RG}}

2. Nome: {{TESTEMUNHA_2_NOME}}
CPF: {{TESTEMUNHA_2_CPF}}
RG: {{TESTEMUNHA_2_RG}}
`.trim();

// Template para Contrato de Exclusividade com Finalidade de Locação
export const TEMPLATE_CONTRATO_EXCLUSIVIDADE_LOCACAO = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INTERMEDIAÇÃO DE LOCAÇÃO COM CLÁUSULA DE EXCLUSIVIDADE

DAS PARTES CONTRATANTES

DADOS DO CONTRATANTE (PROPRIETÁRIO / LOCADOR):
{{CONTRATANTE_NOME}}, {{CONTRATANTE_ESTADO_CIVIL}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATANTE_CPF}}, portador(a) do RG nº {{CONTRATANTE_RG}}, residente e domiciliado(a) no endereço: {{CONTRATANTE_ENDERECO}}, doravante denominado(a) simplesmente CONTRATANTE.
[Dados do Cônjuge: {{CONJUGE_NOME}}, inscrito(a) no CPF sob o nº {{CONJUGE_CPF}}, portador(a) do RG nº {{CONJUGE_RG}}]

DADOS DO CONTRATADO (CORRETOR / INTERMEDIADOR):
{{VENDEDOR_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{VENDEDOR_CPF}}, registrado(a) no CRECI sob o nº {{VENDEDOR_CRECI}}, estabelecido(a) no endereço: {{VENDEDOR_ENDERECO}}, telefone/contato: {{VENDEDOR_TELEFONE}}, doravante denominado(a) simplesmente CONTRATADO.

Têm entre si, justo e acordado, o presente CONTRATO DE INTERMEDIAÇÃO DE LOCAÇÃO DE IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE, mediante as cláusulas e condições seguintes:

CLÁUSULA 1ª – DO OBJETO DO CONTRATO E DADOS DO IMÓVEL
O presente contrato tem por objeto a prestação de serviços profissionais de intermediação, corretagem e promoção imobiliária em caráter de EXCLUSIVIDADE visando à LOCAÇÃO do imóvel caracterizado como {{TIPO_IMOVEL}}, situado em {{LOCALIZACAO_IMOVEL}}, de legítima propriedade do(a) CONTRATANTE, com a seguinte especificação documental e registral:
- Documento de Propriedade: {{DOCUMENTO_PROPRIEDADE}};
- Matrícula nº: {{MATRICULA}};
- Inscrição Municipal/Prefeitura: {{INSCRICAO_PREFEITURA}};
- Descrição e Características: {{OUTROS_DADOS_IMOVEL}}.

CLÁUSULA 2ª – DO VALOR DO ALUGUEL PRETENDIDO E CONDIÇÕES LOCATÍCIAS
O imóvel objeto deste instrumento será anunciado e disponibilizado no mercado para locação pelo valor mensal sugerido/pretendido de {{VALOR_LOCACAO_SUGERIDO}} ({{VALOR_LOCACAO_SUGERIDO_EXTENSO}}), sob as seguintes modalidades de garantia aceitas: {{GARANTIAS_ACEITAS_LOCACAO}}.
Parágrafo Único: O(A) CONTRATANTE poderá aceitar propostas com valores ou condições distintas, desde que expressamente autorizadas por escrito e de comum acordo.

CLÁUSULA 3ª – DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE
A presente autorização de intermediação locatícia é outorgada em caráter irrevogável de EXCLUSIVIDADE pelo prazo de {{PRAZO_EXCLUSIVIDADE_DIAS}} dias, iniciando-se na data de assinatura deste instrumento e com termo final fixado improrrogavelmente em {{DATA_TERMINO_EXCLUSIVIDADE}}.
Parágrafo Primeiro: Durante a vigência da exclusividade, o(a) CONTRATANTE obriga-se a não conferir poderes de locação a terceiros e a não realizar negociação direta do bem sem a prévia e expressa intermediação do(a) CONTRATADO.
Parágrafo Segundo: Nos termos do Artigo 726 do Código Civil Brasileiro, se a locação do imóvel for consumada durante o prazo de vigência da exclusividade, ainda que efetuada diretamente pelo proprietário ou por intermédio de outrem, a remuneração integral de corretagem estipulada na Cláusula 4ª será devida ao(à) CONTRATADO.

CLÁUSULA 4ª – DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM DE LOCAÇÃO
Pelos serviços de intermediação e prospecção de inquilino, o(a) CONTRATANTE pagará ao(à) CONTRATADO a comissão de corretagem correspondente a {{COMISSAO_LOCACAO}}, exigível no ato da assinatura do Contrato de Locação ou no primeiro recebimento de aluguel.
Parágrafo Primeiro: Caso convencionada a administração contínua da locação, a taxa mensal de administração corresponderá a {{TAXA_ADMINISTRACAO_LOCACAO}}.
Parágrafo Segundo: Em consonância com o Artigo 727 do Código Civil, se o contrato de locação for firmado após o término deste instrumento com inquilino apresentado, cadastrado ou negociado pelo(a) CONTRATADO durante a vigência da exclusividade, a remuneração de corretagem permanecerá integralmente devida.

CLÁUSULA 5ª – DAS OBRIGAÇÕES, DIVULGAÇÃO E VISTORIA
O(A) CONTRATADO compromete-se a conduzir os trabalhos com zelo, prudência e dedicação profissional, ficando expressamente autorizado(a) a:
a) {{AUTORIZACAO_PROSPECCAO}};
b) Afixar placas e faixas de divulgação no imóvel, bem como veicular anúncios em portais imobiliários e redes sociais;
c) Acompanhar as visitas de proponentes interessados e analisar a documentação e idoneidade cadastral de locatários e fiadores;
d) Realizar laudo minucioso de vistoria inicial do imóvel por ocasião da entrega das chaves ao inquilino.

CLÁUSULA 6ª – DO FORO
Para dirimir quaisquer controvérsias ou litígios decorrentes da interpretação ou execução deste contrato, as partes elegem expressamente o Foro da Comarca de {{FORO_COMARCA}}, com renúncia a qualquer outro por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em vias de igual teor e forma, perante as testemunhas abaixo qualificadas.

{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.

CONTRATANTE - {{CONTRATANTE_NOME}}
CPF nº {{CONTRATANTE_CPF}}

CONTRATADO - {{VENDEDOR_NOME}}
CRECI nº {{VENDEDOR_CRECI}} | CPF/CNPJ nº {{VENDEDOR_CPF}}

TESTEMUNHAS:
1. Nome: {{TESTEMUNHA_1_NOME}}
CPF: {{TESTEMUNHA_1_CPF}}
RG: {{TESTEMUNHA_1_RG}}

2. Nome: {{TESTEMUNHA_2_NOME}}
CPF: {{TESTEMUNHA_2_CPF}}
RG: {{TESTEMUNHA_2_RG}}
`.trim();

// Template para Contrato de Exclusividade com Finalidade Mista (Venda e Locação)
export const TEMPLATE_CONTRATO_EXCLUSIVIDADE_AMBOS = `
CONTRATO DE INTERMEDIAÇÃO DE VENDA E LOCAÇÃO DE IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE

DAS PARTES CONTRATANTES

DADOS DO CONTRATANTE (PROPRIETÁRIO):
{{CONTRATANTE_NOME}}, {{CONTRATANTE_ESTADO_CIVIL}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATANTE_CPF}}, portador(a) do RG nº {{CONTRATANTE_RG}}, residente e domiciliado(a) no endereço: {{CONTRATANTE_ENDERECO}}, doravante denominado(a) simplesmente CONTRATANTE.
[Dados do Cônjuge: {{CONJUGE_NOME}}, inscrito(a) no CPF sob o nº {{CONJUGE_CPF}}, portador(a) do RG nº {{CONJUGE_RG}}]

DADOS DO CONTRATADO (CORRETOR / IMOBILIÁRIA):
{{VENDEDOR_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{VENDEDOR_CPF}}, registrado(a) no CRECI sob o nº {{VENDEDOR_CRECI}}, estabelecido(a) no endereço: {{VENDEDOR_ENDERECO}}, telefone/contato: {{VENDEDOR_TELEFONE}}, doravante denominado(a) simplesmente CONTRATADO.

Têm entre si, justo e acordado, o presente CONTRATO DE INTERMEDIAÇÃO DE VENDA E LOCAÇÃO DE IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE, mediante as cláusulas e condições seguintes:

CLÁUSULA 1ª – DO OBJETO DO CONTRATO E DADOS DO IMÓVEL
O presente contrato tem por objeto a prestação de serviços de corretagem e intermediação imobiliária em caráter de EXCLUSIVIDADE para a promoção de VENDA e/ou LOCAÇÃO do imóvel caracterizado como {{TIPO_IMOVEL}}, situado em {{LOCALIZACAO_IMOVEL}}, de propriedade do(a) CONTRATANTE, com a seguinte especificação:
- Documento de Propriedade: {{DOCUMENTO_PROPRIEDADE}};
- Matrícula nº: {{MATRICULA}};
- Inscrição Municipal/Prefeitura: {{INSCRICAO_PREFEITURA}};
- Descrição e Características: {{OUTROS_DADOS_IMOVEL}}.

CLÁUSULA 2ª – DOS VALORES E CONDIÇÕES DE VENDA E LOCAÇÃO
a) Para Venda: O imóvel será promovido pelo valor total de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}), sob as seguintes condições de pagamento: {{CONDICOES_PAGAMENTO}}.
b) Para Locação: O imóvel será ofertado pelo valor mensal sugerido de {{VALOR_LOCACAO_SUGERIDO}} ({{VALOR_LOCACAO_SUGERIDO_EXTENSO}}), sob as seguintes garantias aceitas: {{GARANTIAS_ACEITAS_LOCACAO}}.

CLÁUSULA 3ª – DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE
A presente autorização de intermediação é concedida com CLÁUSULA DE EXCLUSIVIDADE pelo prazo de {{PRAZO_EXCLUSIVIDADE_DIAS}} dias, iniciando-se na data de assinatura deste instrumento e encerrando-se em {{DATA_TERMINO_EXCLUSIVIDADE}}.
Parágrafo Primeiro: Durante a vigência deste contrato, o(a) CONTRATANTE não poderá autorizar terceiros nem negociar diretamente o imóvel para venda ou locação sem a interveniência do(a) CONTRATADO.
Parágrafo Segundo: Consoante o Artigo 726 do Código Civil, consumada a venda ou locação durante o prazo de vigência deste instrumento, os honorários correspondentes serão devidos ao(à) CONTRATADO.

CLÁUSULA 4ª – DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM
a) Em caso de Venda: A comissão corresponderá a {{PERCENTUAL_CORRETAGEM}} ({{PERCENTUAL_CORRETAGEM_EXTENSO}}) sobre o valor total da venda;
b) Em caso de Locação: A comissão corresponderá a {{COMISSAO_LOCACAO}}, acrescida de taxa de administração de {{TAXA_ADMINISTRACAO_LOCACAO}} caso contratada a gestão do aluguel.
Parágrafo Único: Aplica-se o Artigo 727 do Código Civil caso o negócio se concretize após o término deste contrato com cliente prospectado durante sua vigência.

CLÁUSULA 5ª – DAS OBRIGAÇÕES E DIVULGAÇÃO
O(A) CONTRATADO fica autorizado(a) a veicular publicidade em portais, redes sociais, afixar placas no imóvel e realizar visitas com interessados, prestando contas de todas as atividades ao(à) CONTRATANTE.

CLÁUSULA 6ª – DO FORO
Fica eleito o Foro da Comarca de {{FORO_COMARCA}} para dirimir qualquer dúvida ou litígio decorrente deste instrumento.

{{CIDADE_ASSINATURA}}/{{ESTADO_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.

CONTRATANTE - {{CONTRATANTE_NOME}}
CPF nº {{CONTRATANTE_CPF}}

CONTRATADO - {{VENDEDOR_NOME}}
CRECI nº {{VENDEDOR_CRECI}} | CPF/CNPJ nº {{VENDEDOR_CPF}}

TESTEMUNHAS:
1. Nome: {{TESTEMUNHA_1_NOME}}
CPF: {{TESTEMUNHA_1_CPF}}
RG: {{TESTEMUNHA_1_RG}}

2. Nome: {{TESTEMUNHA_2_NOME}}
CPF: {{TESTEMUNHA_2_CPF}}
RG: {{TESTEMUNHA_2_RG}}
`.trim();

function escapeRegExpPattern(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Função que substitui todas as tags no texto com suporte a variações de grafia e retrocompatibilidade
export function replaceContractTags(template: string, tags: Record<string, string | undefined>): string {
  let result = template;

  // Substituir cada tag do mapeamento {{nome_da_tag}} e {nome_da_tag} (case-insensitive)
  Object.entries(tags).forEach(([key, value]) => {
    if (value !== undefined) {
      const escaped = escapeRegExpPattern(key);
      const regexDouble = new RegExp(`\\{\\{${escaped}\\}\\}`, 'gi');
      const regexSingle = new RegExp(`\\{${escaped}\\}`, 'gi');
      result = result.replace(regexDouble, value).replace(regexSingle, value);
    }
  });

  // Mapeamento de retrocompatibilidade para corrigir tags legadas com colchetes [TAG] e variações
  const legacyReplacements: Record<string, string | undefined> = {
    '\\[CPF1\\]': tags.cpf_comprador || tags.comprador_cpf,
    '\\[QUANTTERRENO\\]': tags.quantidade_terreno || '01 (um) lote de terreno',
    '\\[VENDEDOR_TERMO\\]': tags.vendedor_termo || 'PROMITENTE VENDEDOR(A)',
    '\\[COMPRADOR_TERMO\\]': tags.comprador_termo || 'PROMITENTE COMPRADOR(A)',
    '\\[GENEROV\\]': tags.genero_vendedor || 'ele',
    '\\[GENEROC\\]': tags.genero_comprador || 'ele',
    '\\[GENEROV3\\]': tags.genero_vendedor_3 || 'do mesmo',
    '\\[GENEROC3\\]': tags.genero_comprador_3 || 'ao mesmo',
    '\\[GENEROV4\\]': tags.genero_vendedor_4 || 'pelo vendedor',
    '\\{numero_quadра\\}': tags.quadra || tags.numero_quadra, // 'р' cirílico tolerado
    '\\{numero_quadra\\}': tags.quadra || tags.numero_quadra,
    '\\{comprador_cpf_cnpj\\}': tags.cpf_comprador || tags.comprador_cpf,
  };

  Object.entries(legacyReplacements).forEach(([pattern, val]) => {
    if (val !== undefined) {
      result = result.replace(new RegExp(pattern, 'g'), val);
    }
  });

  return result;
}

// Cálculo de status e dias restantes de exclusividade
export function getExclusivityStatus(contract: ContractData): {
  status: 'ativo' | 'alerta' | 'vencido' | 'nao_aplicavel';
  diasRestantes: number;
  totalDias: number;
  progressoPercentual: number;
  label: string;
  badgeColor: string;
} {
  if (contract.tipo !== 'exclusividade' || !contract.exclusividade) {
    return {
      status: 'nao_aplicavel',
      diasRestantes: 0,
      totalDias: 0,
      progressoPercentual: 0,
      label: 'N/A',
      badgeColor: 'bg-slate-100 text-slate-600',
    };
  }

  const inicio = new Date(contract.exclusividade.dataInicio);
  const termino = new Date(contract.exclusividade.dataTermino);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDias = Math.max(1, Math.round((termino.getTime() - inicio.getTime()) / msPerDay));
  const diasRestantes = Math.round((termino.getTime() - hoje.getTime()) / msPerDay);
  
  const diasDecorridos = Math.max(0, totalDias - Math.max(0, diasRestantes));
  const progressoPercentual = Math.min(100, Math.max(0, Math.round((diasDecorridos / totalDias) * 100)));

  if (diasRestantes < 0) {
    return {
      status: 'vencido',
      diasRestantes,
      totalDias,
      progressoPercentual: 100,
      label: `Vencido há ${Math.abs(diasRestantes)} dia(s)`,
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    };
  }

  if (diasRestantes <= 15) {
    return {
      status: 'alerta',
      diasRestantes,
      totalDias,
      progressoPercentual,
      label: `Vence em ${diasRestantes} dia(s) (Atenção)`,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }

  return {
    status: 'ativo',
    diasRestantes,
    totalDias,
    progressoPercentual,
    label: `${diasRestantes} dias restantes (Vigente)`,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
}

// Gerador de Hash Criptográfico Simulado para Assinatura Digital
export function generateSignatureHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Gerador Estruturado de Texto Completo do Contrato
export function generateContractLegalText(contract: ContractData): {
  titulo: string;
  preambulo: string;
  clausulas: { numero: string; titulo: string; conteudo: string }[];
  foro: string;
  dataLocal: string;
  tagsMapping: ContractTagsMapping;
  textoCompletoRenderizado: string;
} {
  const tags = getContractTags(contract);
  const v = contract.vendedor;
  const c = contract.comprador;
  const allCompradores = getAllCompradores(contract);
  const im = contract.imovel;

  if (contract.tipo === 'venda_vista') {
    const isOutrosBens = contract.subcategoria === 'outros_bens';
    const textoRenderizado = replaceContractTags(TEMPLATE_CONTRATO_IMOVEL_VISTA, tags);

    const compradoresPreambulo = allCompradores.length > 1
      ? `PROMITENTES COMPRADORES(AS):\n` + allCompradores.map((comp, idx) => 
          `${idx + 1}º PROMITENTE COMPRADOR(A): ${comp.nome || '[NOME]'}, ${comp.nacionalidade || 'brasileiro(a)'}, ${comp.estadoCivil || 'solteiro(a)'}, portador(a) do RG nº ${comp.rg || '[RG]'} ${comp.rgOrgao || 'SSP/PA'}, inscrito(a) no CPF sob o nº ${comp.cpfCnpj || '[CPF]'}, residente e domiciliado(a) na ${comp.endereco || '[ENDEREÇO]'}, nº ${comp.numero || 'S/N'}, Bairro ${comp.bairro || '[BAIRRO]'}, CEP ${comp.cep || '[CEP]'}, na cidade de ${comp.cidade || '[CIDADE]'}/${comp.uf || 'UF'}${comp.telefone ? `, telefone ${comp.telefone}` : ''}.`
        ).join('\n\n')
      : `PROMITENTE COMPRADOR(A):
${c.nome || '[NOME DO COMPRADOR]'}, ${c.nacionalidade || 'brasileiro(a)'}, ${c.estadoCivil || 'solteiro(a)'}, portador(a) do RG nº ${c.rg || '[RG]'} ${c.rgOrgao || 'SSP/PA'}, inscrito(a) no CPF sob o nº ${c.cpfCnpj || '[CPF]'}, residente e domiciliado(a) na ${c.endereco || '[ENDEREÇO]'}, nº ${c.numero || 'S/N'}, Bairro ${c.bairro || '[BAIRRO]'}, CEP ${c.cep || '[CEP]'}, na cidade de ${c.cidade || '[CIDADE]'}/${c.uf || 'UF'}, telefone ${c.telefone || '[TELEFONE]'}.`;

    const titulo = isOutrosBens
      ? 'INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE BEM MÓVEL / VEÍCULO À VISTA'
      : 'INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL';
      
    const preambulo = `
DAS PARTES CONTRATANTES

PROMITENTE VENDEDOR(A):
${v.nome || '[NOME DO VENDEDOR]'}, ${v.nacionalidade || 'brasileiro(a)'}, ${v.estadoCivil || 'casado(a)'}, portador(a) do RG nº ${v.rg || '[RG]'} ${v.rgOrgao || 'SSP/PA'}, inscrito(a) no CPF/CNPJ sob o nº ${v.cpfCnpj || '[CPF/CNPJ]'}, residente e domiciliado(a) na ${v.endereco || '[ENDEREÇO]'}, nº ${v.numero || 'S/N'}, Bairro ${v.bairro || '[BAIRRO]'}, CEP ${v.cep || '[CEP]'}, na cidade de ${v.cidade || '[CIDADE]'}/${v.uf || 'UF'}, telefone ${v.telefone || '[TELEFONE]'}.

${compradoresPreambulo}

Têm entre si, justo e acertado, o presente ${titulo}, que se regerá pelas cláusulas e condições seguintes:
    `.trim();

    // Montagem dinâmica das condições de pagamento à vista
    const formaPgtoStr = contract.vendaVista?.formaPagamento
      ? `por meio de ${contract.vendaVista.formaPagamento}${contract.vendaVista.dadosBancariosRecebedor ? ` (${contract.vendaVista.dadosBancariosRecebedor})` : ''}${contract.vendaVista.detalhesPagamento ? `. Condições específicas: ${contract.vendaVista.detalhesPagamento}` : ''}`
      : 'em moeda corrente nacional';

    const b = contract.bemOutros;
    const descBemCompleta = isOutrosBens
      ? `o bem móvel/veículo caracterizado como ${b?.descricao || 'Bem Móvel'}${b?.marca ? `, Marca: ${b.marca}` : ''}${b?.modelo ? `, Modelo: ${b.modelo}` : ''}${b?.anoFabricacao || b?.anoModelo ? `, Ano/Modelo: ${b?.anoFabricacao || ''}/${b?.anoModelo || ''}` : ''}${b?.cor ? `, Cor: ${b.cor}` : ''}${b?.placa ? `, Placa: ${b.placa}` : ''}${b?.renavam ? `, RENAVAM: ${b.renavam}` : ''}${b?.chassi ? `, Chassi: ${b.chassi}` : ''}${b?.numeroSerie ? `, Nº de Série: ${b.numeroSerie}` : ''}${b?.quilometragemOuUso ? `, Uso/Km: ${b.quilometragemOuUso}` : ''}${b?.estadoConservacao ? `, Estado de Conservação: ${b.estadoConservacao}` : ''}${b?.acessoriosInclusos ? `, Acessórios inclusos: ${b.acessoriosInclusos}` : ''}${b?.documentacaoSituacao ? `, Situação Documental: ${b.documentacaoSituacao}` : ''}.`
      : '';

    const clausulas = [
      {
        numero: 'CLÁUSULA 1ª',
        titulo: 'DO OBJETO DO CONTRATO',
        conteudo: isOutrosBens
          ? `O presente contrato tem por objeto a compra e venda definitiva, irrevogável e irretratável de ${descBemCompleta}`
          : `O presente contrato tem por objeto a promessa de compra e venda irrevogável e irretratável do Lote de terreno sob o nº ${tags.numero_lote || '[LOTE]'}, da Quadra ${tags.numero_quadra || '[QUADRA]'}, integrante do empreendimento denominado ${tags.nome_empreendimento || '[EMPREENDIMENTO]'}, situado na ${tags.localizacao_imovel || '[LOCALIZAÇÃO]'}, com endereço de localização no(a) ${tags.endereco_lote || '[ENDEREÇO DO LOTE]'}, na cidade de ${tags.cidade_imovel || tags.cidade_foro}/${tags.uf_imovel || tags.uf_foro}, possuindo as seguintes dimensões e confrontações:\n` +
            `• Metragem de Frente: ${tags.metragem_frente || '0.00'} metros;\n` +
            `• Metragem de Lateral Direita: ${tags.metragem_lateral_direita || '0.00'} metros;\n` +
            `• Metragem de Lateral Esquerda: ${tags.metragem_lateral_esquerda || '0.00'} metros;\n` +
            `• Metragem de Fundos: ${tags.metragem_fundos || '0.00'} metros;\n` +
            `• Perfazendo uma Área Total de: ${tags.area_total_m2 || '0.00'} m².`
      },
      {
        numero: 'CLÁUSULA 2ª',
        titulo: 'DO PREÇO, PAGAMENTO À VISTA E DA QUITAÇÃO PLENA',
        conteudo: `O preço certo, justo e ajustado para a presente compra e venda é de R$ ${tags.valor_total} (${tags.valor_total_extenso}), pago integralmente à vista, ${formaPgtoStr}.\n` +
          `Parágrafo Único: Com a efetivação e compensação do pagamento integral do valor acima discriminado, o(a) PROMITENTE VENDEDOR(A) confere ao(à) PROMITENTE COMPRADOR(A) a mais ampla, geral, rasa e irrevogável quitação de pago e satisfeito, para nada mais reclamar a qualquer tempo quanto ao preço ora avençado.`
      },
      {
        numero: 'CLÁUSULA 3ª',
        titulo: isOutrosBens ? 'DA TRADIÇÃO, POSSE E RESPONSABILIDADES' : 'DA IMISSÃO NA POSSE E RESPONSABILIDADES',
        conteudo: isOutrosBens
          ? `A entrega física (tradição) e transferência da posse direta do bem objeto deste contrato é realizada ao(à) PROMITENTE COMPRADOR(A) na data de assinatura deste instrumento e comprovação do pagamento integral, assumindo este a responsabilidade civil, administrativa e criminal sobre o bem a partir desta data.`
          : `A imissão na posse direta do imóvel é concedida ao(à) PROMITENTE COMPRADOR(A) a partir da assinatura deste instrumento e integral quitação do preço, passando a correr por sua conta exclusiva todos os tributos, taxas, contribuições e despesas incidentes sobre o imóvel a partir desta data.`
      },
      {
        numero: 'CLÁUSULA 4ª',
        titulo: isOutrosBens ? 'DA TRANSFERÊNCIA DE DOCUMENTOS E EVICÇÃO' : 'DA ESCRITURAÇÃO DEFINITIVA E EVICÇÃO',
        conteudo: isOutrosBens
          ? `O(A) PROMITENTE VENDEDOR(A) compromete-se a fornecer toda a documentação necessária para transferência definitiva de titularidade do bem perante os órgãos competentes (DETRAN, Capitania dos Portos ou repartição cabível), declarando que o bem se encontra livre e desembaraçado de quaisquer ônus, gravames judiciais, multas anteriores ou impedimentos, respondendo pelos riscos da evicção.`
          : `O(A) PROMITENTE VENDEDOR(A) compromete-se a outorgar a competente Escritura Pública Definitiva de Compra e Venda em favor do(a) PROMITENTE COMPRADOR(A) ou de quem este expressamente indicar, correndo por conta exclusiva do(a) adquirente todas as despesas relativas a ITBI, certidões, emolumentos cartorários e registros. O(A) PROMITENTE VENDEDOR(A) responde pela evicção de direito nos termos do Código Civil Brasileiro.`
      },
      {
        numero: 'CLÁUSULA 5ª',
        titulo: 'DA IRREVOGABILIDADE E IRRETRATABILIDADE',
        conteudo: `O presente contrato é celebrado em caráter estritamente irrevogável e irretratável, vedado o arrependimento, obrigando as partes contratantes, seus herdeiros e sucessores a qualquer título ao seu fiel e integral cumprimento.`
      },
      {
        numero: 'CLÁUSULA 6ª',
        titulo: 'DO FORO',
        conteudo: `Para dirimir quaisquer dúvidas, controvérsias ou litígios decorrentes da interpretação ou execução deste instrumento, as partes elegem expressamente o Foro da Comarca de ${tags.cidade_foro}/${tags.uf_foro}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`
      }
    ];

    if (contract.clausulasExtras?.trim()) {
      clausulas.push({
        numero: 'CLÁUSULA 7ª',
        titulo: 'DAS DISPOSIÇÕES COMPLEMENTARES',
        conteudo: contract.clausulasExtras.trim()
      });
    }

    const foro = `Foro da Comarca de ${tags.cidade_foro}/${tags.uf_foro}`;
    const dataLocal = `${tags.cidade_assinatura}/${tags.uf_assinatura}, ${tags.dia} de ${tags.mes_extenso} de ${tags.ano}.`;

    return {
      titulo,
      preambulo,
      clausulas,
      foro,
      dataLocal,
      tagsMapping: tags,
      textoCompletoRenderizado: textoRenderizado
    };
  }

  if (contract.tipo === 'venda_parcelada') {
    const isOutrosBens = contract.subcategoria === 'outros_bens';
    const parceladoTags = getContractParceladoTags(contract);
    const textoRenderizado = replaceContractTags(TEMPLATE_CONTRATO_IMOVEL_PARCELADO, parceladoTags);

    const compradoresPreambuloParcelado = allCompradores.length > 1
      ? `PROMITENTES COMPRADORES(AS):\n` + allCompradores.map((comp, idx) => 
          `${idx + 1}º PROMITENTE COMPRADOR(A): ${comp.nome || '[NOME]'}, ${comp.nacionalidade || 'brasileiro(a)'}, ${comp.estadoCivil || 'solteiro(a)'}, portador(a) do RG nº ${comp.rg || '[RG]'} ${comp.rgOrgao || 'SSP/PA'}, inscrito(a) no CPF sob o nº ${comp.cpfCnpj || '[CPF]'}, telefone/whatsapp ${comp.telefone || ''}, residente e domiciliado(a) na ${comp.endereco || '[ENDEREÇO]'}, nº ${comp.numero || 'S/N'}, Bairro ${comp.bairro || '[BAIRRO]'}, CEP ${comp.cep || '[CEP]'}, na cidade de ${comp.cidade || '[CIDADE]'}/${comp.uf || 'PA'}.`
        ).join('\n\n')
      : `${parceladoTags.comprador_termo}:
${parceladoTags.artigo_comprador} ${parceladoTags.tratamento_comprador} ${parceladoTags.comprador}, ${parceladoTags.nacionalidade_comprador}, ${parceladoTags.estado_civil_comprador}, portador(a) do RG nº ${parceladoTags.rg_comprador} ${parceladoTags.emissao_rg_comprador}, inscrito(a) no CPF sob o nº ${parceladoTags.cpf_comprador}, telefone/whatsapp ${parceladoTags.telefone_comprador}, ${parceladoTags.concordancia_comprador} na ${parceladoTags.endereco_comprador}, nº ${parceladoTags.numero_comprador}, Bairro ${parceladoTags.bairro_comprador}, CEP ${parceladoTags.cep_comprador}, na cidade de ${parceladoTags.cidade_comprador}/${parceladoTags.estado_comprador}.`;

    const titulo = isOutrosBens
      ? 'INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE BEM MÓVEL / VEÍCULO PARCELADO COM RESERVA DE DOMÍNIO'
      : 'INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL PARCELADO COM RESERVA DE DOMÍNIO';

    const preambulo = `
DAS PARTES CONTRATANTES

${parceladoTags.vendedor_termo}:
${parceladoTags.artigo_vendedor} ${parceladoTags.tratamento_vendedor} ${parceladoTags.vendedor}, ${parceladoTags.nacionalidade_vendedor}, ${parceladoTags.estado_civil_vendedor}, portador(a) do RG nº ${parceladoTags.rg_vendedor} ${parceladoTags.emissao_rg_vendedor}, inscrito(a) no CPF sob o nº ${parceladoTags.cpf_vendedor}, ${parceladoTags.concordancia_vendedor} na ${parceladoTags.endereco_vendedor}, nº ${parceladoTags.numero_vendedor}, Bairro ${parceladoTags.bairro_vendedor}, na cidade de ${parceladoTags.cidade_vendedor}/${parceladoTags.estado_vendedor}.

${compradoresPreambuloParcelado}
    `.trim();

    const vp = contract.vendaParcelada;
    const formaEntradaStr = vp?.formaPagamentoEntrada ? ` por meio de ${vp.formaPagamentoEntrada}` : '';
    const detalhesPgtoStr = vp?.detalhesPagamento ? `. Condições adicionais: ${vp.detalhesPagamento}` : '';

    const b = contract.bemOutros;
    const descBemCompleta = isOutrosBens
      ? `o bem móvel/veículo caracterizado como ${b?.descricao || 'Bem Móvel'}${b?.marca ? `, Marca: ${b.marca}` : ''}${b?.modelo ? `, Modelo: ${b.modelo}` : ''}${b?.anoFabricacao || b?.anoModelo ? `, Ano/Modelo: ${b?.anoFabricacao || ''}/${b?.anoModelo || ''}` : ''}${b?.cor ? `, Cor: ${b.cor}` : ''}${b?.placa ? `, Placa: ${b.placa}` : ''}${b?.renavam ? `, RENAVAM: ${b.renavam}` : ''}${b?.chassi ? `, Chassi: ${b.chassi}` : ''}${b?.numeroSerie ? `, Nº de Série: ${b.numeroSerie}` : ''}${b?.quilometragemOuUso ? `, Uso/Km: ${b.quilometragemOuUso}` : ''}${b?.estadoConservacao ? `, Estado de Conservação: ${b.estadoConservacao}` : ''}${b?.acessoriosInclusos ? `, Acessórios inclusos: ${b.acessoriosInclusos}` : ''}${b?.documentacaoSituacao ? `, Situação Documental: ${b.documentacaoSituacao}` : ''}.`
      : '';

    const clausulas = [
      {
        numero: 'CLÁUSULA 1ª',
        titulo: 'DO OBJETO DO CONTRATO',
        conteudo: isOutrosBens
          ? `O presente contrato tem por objeto a promessa de compra e venda irrevogável e irretratável de ${descBemCompleta}`
          : `O presente contrato tem por objeto a promessa de compra e venda irrevogável e irretratável de ${parceladoTags.quantidade_terreno}, correspondente ao Lote de terreno sob o nº ${parceladoTags.lote || '[LOTE]'}, da Quadra ${parceladoTags.quadra || '[QUADRA]'}, integrante do empreendimento denominado ${parceladoTags.empreendimento || '[EMPREENDIMENTO]'}, situado na ${parceladoTags.localidade || '[LOCALIZAÇÃO]'}, com endereço no(a) ${parceladoTags.rua_do_lote || '[ENDEREÇO]'}, possuindo as seguintes confrontações e dimensões:\n` +
            `• Metragem de Frente: ${parceladoTags.frente || '0.00 metros'};\n` +
            `• Metragem de Lateral Direita: ${parceladoTags.lateral_direita || '0.00 metros'};\n` +
            `• Metragem de Lateral Esquerda: ${parceladoTags.lateral_esquerda || '0.00 metros'};\n` +
            `• Metragem de Fundos: ${parceladoTags.fundos || '0.00 metros'};\n` +
            `• Perfazendo uma Área Total de: ${parceladoTags.area_total || '0.00 m²'}.`
      },
      {
        numero: 'CLÁUSULA 2ª',
        titulo: 'DO PREÇO E CONDIÇÕES DE PAGAMENTO PARCELADO',
        conteudo: `O preço total, certo e ajustado para a presente compra e venda é de ${parceladoTags.valor_total}, o qual será pago pelo(a) ${parceladoTags.comprador_termo} ${parceladoTags.genero_vendedor_3} na seguinte conformidade:\n` +
          `a) ENTRADA / SINAL: O valor de ${parceladoTags.entrada}, pago a título de sinal e princípio de pagamento${formaEntradaStr};\n` +
          `b) SALDO REMANESCENTE: O saldo restante de ${parceladoTags.restante}, a ser quitado em ${parceladoTags.quantidade_parcelas} parcelas no valor de ${parceladoTags.valor_parcela} cada, com vencimento ${parceladoTags.data_vencimento}, vencendo a primeira parcela em ${parceladoTags.data_primeira_parcela}, por meio de ${parceladoTags.modo_pagamento}${detalhesPgtoStr}.`
      },
      {
        numero: 'CLÁUSULA 3ª',
        titulo: 'DO PACTO DE RESERVA DE DOMÍNIO',
        conteudo: `Com fulcro nos Arts. 521 a 528 do Código Civil Brasileiro, a presente compra e venda é celebrada sob a expressa cláusula de RESERVA DE DOMÍNIO, pela qual ${parceladoTags.artigo_vendedor} ${parceladoTags.vendedor_termo} reserva para si o domínio e propriedade resolúvel do ${isOutrosBens ? 'bem móvel' : 'imóvel'} objeto deste contrato até que seja efetuado o pagamento integral e a quitação definitiva da última parcela do preço estipulado.\n` +
          `Parágrafo Único: A posse transmitida ${parceladoTags.preposicao_comprador} neste ato dá-se em caráter precário e provisório, consolidando-se a propriedade plena e definitiva somente após a liquidação total de todas as parcelas e encargos decorrentes deste ajuste.`
      },
      {
        numero: 'CLÁUSULA 4ª',
        titulo: 'DO ATRASO, ENCARGOS MORATÓRIOS E RESCISÃO',
        conteudo: `O atraso no pagamento de qualquer das parcelas sujeitará ${parceladoTags.artigo_comprador} ${parceladoTags.comprador_termo} ao pagamento de multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária.\n` +
          `Parágrafo Primeiro: O inadimplemento superior a 30 (trinta) dias facultará ${parceladoTags.genero_vendedor_3}, independentemente de notificação judicial prévia, declarar rescindido de pleno direito o presente contrato com a imediata reintegração na posse do bem e retenção dos valores previstos em lei a título de indenização pelo uso e fruição do bem.`
      },
      {
        numero: 'CLÁUSULA 5ª',
        titulo: isOutrosBens ? 'DAS TAXAS, MULTAS E RESPONSABILIDADES' : 'DOS TRIBUTOS E RESPONSABILIDADES',
        conteudo: isOutrosBens
          ? `A partir da assinatura deste instrumento e entrega da posse precária do bem, correrão por conta exclusiva do(a) ${parceladoTags.comprador_termo} todos os impostos (IPVA/taxas), multas de trânsito, seguros, manutenção e quaisquer encargos incidentes sobre o bem.`
          : `A partir da assinatura deste instrumento e imissão provisória na posse, correrão por conta exclusiva do(a) ${parceladoTags.comprador_termo} todos os impostos, taxas, contribuições de melhoria e quaisquer outros encargos que recaiam ou venham a recair sobre o imóvel.`
      },
      {
        numero: 'CLÁUSULA 6ª',
        titulo: isOutrosBens ? 'DA TRANSFERÊNCIA DEFINITIVA DO BEM' : 'DA ESCRITURAÇÃO DEFINITIVA',
        conteudo: isOutrosBens
          ? `Quitado integralmente o preço pactuado na Cláusula 2ª e comprovado o cumprimento de todas as obrigações acessórias, ${parceladoTags.artigo_vendedor} ${parceladoTags.vendedor_termo} obriga-se a assinar e entregar a competente autorização de transferência de propriedade (CRV/ATPV-e ou recibo equivalente) em favor do(a) ${parceladoTags.comprador_termo}, correndo todas as despesas e taxas de transferência por conta deste último.`
          : `Quitado integralmente o preço pactuado na Cláusula 2ª e comprovado o cumprimento de todas as obrigações acessórias, ${parceladoTags.artigo_vendedor} ${parceladoTags.vendedor_termo} obriga-se a outorgar a competente Escritura Pública Definitiva de Compra e Venda em favor do(a) ${parceladoTags.comprador_termo}, correndo todas as despesas de transmissão (ITBI), certidões, emolumentos e registros cartorários por conta deste último.`
      },
      {
        numero: 'CLÁUSULA 7ª',
        titulo: 'DO FORO',
        conteudo: `Para dirimir quaisquer dúvidas, controvérsias ou litígios decorrentes da interpretação ou execução deste instrumento, as partes elegem expressamente o Foro da Comarca de ${parceladoTags.cidade_foro}/${parceladoTags.uf_foro}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`
      }
    ];

    if (contract.clausulasExtras?.trim()) {
      clausulas.push({
        numero: 'CLÁUSULA 8ª',
        titulo: 'DAS DISPOSIÇÕES COMPLEMENTARES',
        conteudo: contract.clausulasExtras.trim()
      });
    }

    const foro = `Foro da Comarca de ${parceladoTags.cidade_foro}/${parceladoTags.uf_foro}`;
    const dataLocal = `${parceladoTags.cidade_assinatura}/${parceladoTags.uf_assinatura}, ${parceladoTags.dia} de ${parceladoTags.mes_extenso} de ${parceladoTags.ano}.`;

    return {
      titulo,
      preambulo,
      clausulas,
      foro,
      dataLocal,
      tagsMapping: parceladoTags as unknown as ContractTagsMapping,
      textoCompletoRenderizado: textoRenderizado
    };
  }

  if (contract.tipo === 'locacao') {
    const locTags = getContractLocacaoTags(contract);
    const textoRenderizado = replaceContractTags(TEMPLATE_CONTRATO_LOCACAO_IMOVEL, locTags as unknown as Record<string, string | undefined>);

    const titulo = `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO DE IMÓVEL (${locTags.tipo_imovel_locado?.toUpperCase() || 'IMÓVEL'})`;

    const preambulo = `
DAS PARTES CONTRATANTES

LOCADOR(A):
${locTags.artigo_locador} ${locTags.tratamento_locador} ${locTags.locador}, ${locTags.nacionalidade_locador}, ${locTags.estado_civil_locador}, portador(a) do RG nº ${locTags.rg_locador} ${locTags.emissao_rg_locador}, inscrito(a) no CPF/CNPJ sob o nº ${locTags.cpf_locador}, ${locTags.concordancia_locador} na ${locTags.endereco_locador}, nº ${locTags.numero_locador}, Bairro ${locTags.bairro_locador}, CEP ${locTags.cep_locador}, na cidade de ${locTags.cidade_locador}/${locTags.estado_locador}, telefone ${locTags.telefone_locador}, doravante denominado(a) simplesmente LOCADOR(A).

LOCATÁRIO(A):
${locTags.artigo_locatario} ${locTags.tratamento_locatario} ${locTags.locatario}, ${locTags.nacionalidade_locatario}, ${locTags.estado_civil_locatario}, portador(a) do RG nº ${locTags.rg_locatario} ${locTags.emissao_rg_locatario}, inscrito(a) no CPF/CNPJ sob o nº ${locTags.cpf_locatario}, ${locTags.concordancia_locatario} na ${locTags.endereco_locatario}, nº ${locTags.numero_locatario}, Bairro ${locTags.bairro_locatario}, CEP ${locTags.cep_locatario}, na cidade de ${locTags.cidade_locatario}/${locTags.estado_locatario}, telefone ${locTags.telefone_locatario}, doravante denominado(a) simplesmente LOCATÁRIO(A).

Têm entre si, justo e acertado, o presente CONTRATO DE LOCAÇÃO DE IMÓVEL, sob a égide da Lei Federal nº 8.245/1991 (Lei do Inquilinato), mediante as cláusulas e condições seguintes:
    `.trim();

    const clausulas = [
      {
        numero: 'CLÁUSULA 1ª',
        titulo: 'DO OBJETO E DESTINAÇÃO DO IMÓVEL',
        conteudo: `O presente contrato tem por objeto a locação do imóvel caracterizado como ${locTags.tipo_imovel_locado}, situado na ${locTags.endereco_imovel_locado}, na cidade de ${locTags.cidade_imovel_locado}/${locTags.estado_imovel_locado}, com área aproximada de ${locTags.area_imovel_locado}.\n` +
          `Parágrafo Primeiro: O imóvel ora locado destina-se exclusivamente para fins de ${locTags.destinacao_locacao}, sendo expressamente vedada a mudança de destinação, cessão, sublocação ou empréstimo sem a prévia e expressa autorização por escrito do(a) LOCADOR(A).\n` +
          `Parágrafo Segundo: O(A) LOCATÁRIO(A) declara que vistoriou o imóvel e o recebe em perfeito estado de conservação, habitabilidade, uso e funcionamento elétrico e hidráulico, obrigando-se a devolvê-lo nas mesmíssimas condições ao término da locação.`
      },
      {
        numero: 'CLÁUSULA 2ª',
        titulo: 'DO VALOR DO ALUGUEL, FORMA E LOCAL DE PAGAMENTO',
        conteudo: `O valor mensal da locação é fixado em ${locTags.valor_aluguel} (${locTags.valor_aluguel_extenso}), que deverá ser pago impreterivelmente até o dia ${locTags.dia_vencimento} de cada mês subsequente ao vencido.\n` +
          `Parágrafo Primeiro: O pagamento será efetuado via ${locTags.forma_pagamento_aluguel}, creditado na seguinte forma: ${locTags.dados_bancarios_locador}, servindo o respectivo comprovante bancário de quitação plena da mensalidade.`
      },
      {
        numero: 'CLÁUSULA 3ª',
        titulo: 'DO REAJUSTE DO ALUGUEL',
        conteudo: `O valor do aluguel avençado será reajustado com periodicidade ${locTags.periodicidade_reajuste}, tomando-se por base a variação positiva acumulada do índice ${locTags.indice_reajuste}, ou, na sua extinção ou impedimento legal, pelo índice oficial que legalmente vier a substituí-lo.`
      },
      {
        numero: 'CLÁUSULA 4ª',
        titulo: 'DO PRAZO DE VIGÊNCIA',
        conteudo: `A presente locação vigorará pelo prazo determinado de ${locTags.prazo_locacao_meses} meses, iniciando-se em ${locTags.data_inicio_locacao} e findando em ${locTags.data_termino_locacao || 'prazo final avençado'}, data em que o(a) LOCATÁRIO(A) obriga-se a restituir o imóvel completamente desocupado, limpo e em perfeito estado de conservação.`
      },
      {
        numero: 'CLÁUSULA 5ª',
        titulo: 'DOS ENCARGOS, TRIBUTOS E DESPESAS DE CONSUMO',
        conteudo: `Além do aluguel mensal, correrão por conta exclusiva do(a) LOCATÁRIO(A) durante todo o período em que permanecer na posse do imóvel as seguintes despesas e encargos: ${locTags.despesas_locatario}.`
      },
      {
        numero: 'CLÁUSULA 6ª',
        titulo: 'DA GARANTIA LOCATÍCIA',
        conteudo: `Para garantia do fiel cumprimento de todas as obrigações assumidas neste contrato, adota-se a modalidade de ${locTags.garantia_locaticia_tipo}:\n${locTags.garantia_locaticia_descricao}`
      },
      {
        numero: 'CLÁUSULA 7ª',
        titulo: 'DO INADIMPLEMENTO, MULTA MORATÓRIA E JUROS',
        conteudo: `O não pagamento do aluguel e encargos até a data de seu respectivo vencimento sujeitará o(a) LOCATÁRIO(A) à incidência automática de multa moratória de ${locTags.multa_atraso_percentual} sobre o montante do débito, acrescida de juros moratórios de ${locTags.juros_mora_percentual}, correção monetária e honorários advocatícios em caso de cobrança judicial ou extrajudicial.`
      },
      {
        numero: 'CLÁUSULA 8ª',
        titulo: 'DA RESCISÃO E MULTA CONTRATUAL',
        conteudo: `A infração a qualquer das cláusulas e condições deste contrato facultará à parte inocente a rescisão de pleno direito deste instrumento, ficando a parte infratora sujeita ao pagamento da multa penal correspondente a: ${locTags.multa_rescisoria}.`
      },
      {
        numero: 'CLÁUSULA 9ª',
        titulo: 'DO FORO',
        conteudo: `Para dirimir qualquer questão, dúvida ou litígio decorrente da interpretação ou execução do presente contrato, as partes elegem expressamente o Foro da Comarca de ${locTags.foro_comarca}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`
      }
    ];

    if (contract.clausulasExtras?.trim()) {
      clausulas.push({
        numero: 'CLÁUSULA 10ª',
        titulo: 'DAS DISPOSIÇÕES COMPLEMENTARES',
        conteudo: contract.clausulasExtras.trim()
      });
    }

    const foro = `Foro da Comarca de ${locTags.foro_comarca}`;
    const dataLocal = `${locTags.cidade_assinatura}/${locTags.uf_assinatura}, ${locTags.dia} de ${locTags.mes_extenso} de ${locTags.ano}.`;

    return {
      titulo,
      preambulo,
      clausulas,
      foro,
      dataLocal,
      tagsMapping: locTags as unknown as ContractTagsMapping,
      textoCompletoRenderizado: textoRenderizado
    };
  }

  // Exclusividade
  const exclTags = getContractExclusividadeTags(contract);
  const isLocacaoExcl = contract.exclusividade?.tipoExclusividade === 'Locação de Imóvel' || contract.exclusividade?.finalidade === 'locacao';
  const isVendaELocacao = contract.exclusividade?.tipoExclusividade === 'Venda e Locação' || contract.exclusividade?.finalidade === 'ambos';

  let templateExcl = TEMPLATE_CONTRATO_EXCLUSIVIDADE;
  if (isLocacaoExcl) {
    templateExcl = TEMPLATE_CONTRATO_EXCLUSIVIDADE_LOCACAO;
  } else if (isVendaELocacao) {
    templateExcl = TEMPLATE_CONTRATO_EXCLUSIVIDADE_AMBOS;
  }
  const textoRenderizado = replaceContractTags(templateExcl, exclTags as unknown as Record<string, string | undefined>);

  const titulo = isLocacaoExcl
    ? 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INTERMEDIAÇÃO DE LOCAÇÃO COM CLÁUSULA DE EXCLUSIVIDADE'
    : (isVendaELocacao
        ? 'CONTRATO DE INTERMEDIAÇÃO DE VENDA E LOCAÇÃO DE IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE'
        : 'CONTRATO DE CORRETAGEM DE VENDA DE BENS IMÓVEIS COM CLÁUSULA DE EXCLUSIVIDADE');

  const preambulo = isLocacaoExcl
    ? `
DAS PARTES CONTRATANTES

DADOS DO CONTRATANTE (PROPRIETÁRIO / LOCADOR):
${exclTags.CONTRATANTE_NOME}, ${exclTags.CONTRATANTE_ESTADO_CIVIL}, inscrito(a) no CPF/CNPJ sob o nº ${exclTags.CONTRATANTE_CPF}, portador(a) do RG nº ${exclTags.CONTRATANTE_RG}, residente e domiciliado(a) no endereço: ${exclTags.CONTRATANTE_ENDERECO}, doravante denominado(a) simplesmente CONTRATANTE.
[Dados do Cônjuge: ${exclTags.CONJUGE_NOME}, CPF nº ${exclTags.CONJUGE_CPF}, RG nº ${exclTags.CONJUGE_RG}]

DADOS DO CONTRATADO (CORRETOR / INTERMEDIADOR):
${exclTags.VENDEDOR_NOME}, inscrito(a) no CPF/CNPJ sob o nº ${exclTags.VENDEDOR_CPF}, registrado(a) no CRECI sob o nº ${exclTags.VENDEDOR_CRECI}, estabelecido(a) no endereço: ${exclTags.VENDEDOR_ENDERECO}, telefone/contato: ${exclTags.VENDEDOR_TELEFONE}, doravante denominado(a) simplesmente CONTRATADO.
    `.trim()
    : `
DAS PARTES CONTRATANTES

DADOS DO CONTRATANTE:
${exclTags.CONTRATANTE_NOME}, ${exclTags.CONTRATANTE_ESTADO_CIVIL}, inscrito(a) no CPF sob o nº ${exclTags.CONTRATANTE_CPF}, portador(a) do RG nº ${exclTags.CONTRATANTE_RG}, residente e domiciliado(a) no endereço: ${exclTags.CONTRATANTE_ENDERECO}, doravante denominado(a) simplesmente CONTRATANTE.
[Dados do Cônjuge: ${exclTags.CONJUGE_NOME}, CPF nº ${exclTags.CONJUGE_CPF}, RG nº ${exclTags.CONJUGE_RG}]

DADOS DO CONTRATADO:
${exclTags.VENDEDOR_NOME}, inscrito(a) no CPF/CNPJ sob o nº ${exclTags.VENDEDOR_CPF}, registrado(a) no CRECI sob o nº ${exclTags.VENDEDOR_CRECI}, estabelecido(a) no endereço: ${exclTags.VENDEDOR_ENDERECO}, telefone/contato: ${exclTags.VENDEDOR_TELEFONE}, doravante denominado(a) simplesmente CONTRATADO.
    `.trim();

  let clausulas: Array<{ numero: string; titulo: string; conteudo: string }> = [];

  if (isLocacaoExcl) {
    clausulas = [
      {
        numero: 'CLÁUSULA 1ª',
        titulo: 'DO OBJETO DO CONTRATO E DADOS DO IMÓVEL',
        conteudo: `O presente contrato tem por objeto a prestação de serviços profissionais de intermediação, corretagem e promoção imobiliária em caráter de EXCLUSIVIDADE visando à LOCAÇÃO do imóvel caracterizado como ${exclTags.TIPO_IMOVEL}, situado em ${exclTags.LOCALIZACAO_IMOVEL}, de legítima propriedade do(a) CONTRATANTE, com a seguinte especificação documental e registral:\n` +
          `• Documento de Propriedade: ${exclTags.DOCUMENTO_PROPRIEDADE};\n` +
          `• Matrícula nº: ${exclTags.MATRICULA};\n` +
          `• Inscrição Municipal/Prefeitura: ${exclTags.INSCRICAO_PREFEITURA};\n` +
          `• Descrição e Características: ${exclTags.OUTROS_DADOS_IMOVEL}.`
      },
      {
        numero: 'CLÁUSULA 2ª',
        titulo: 'DO VALOR DO ALUGUEL PRETENDIDO E CONDIÇÕES LOCATÍCIAS',
        conteudo: `O imóvel objeto deste instrumento será anunciado e disponibilizado no mercado para locação pelo valor mensal sugerido/pretendido de ${exclTags.VALOR_LOCACAO_SUGERIDO} (${exclTags.VALOR_LOCACAO_SUGERIDO_EXTENSO}), sob as seguintes modalidades de garantia aceitas: ${exclTags.GARANTIAS_ACEITAS_LOCACAO}.\n` +
          `Parágrafo Único: O(A) CONTRATANTE poderá aceitar propostas com valores ou condições distintas, desde que expressamente autorizadas por escrito e de comum acordo.`
      },
      {
        numero: 'CLÁUSULA 3ª',
        titulo: 'DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE',
        conteudo: `A presente autorização de intermediação locatícia é outorgada em caráter irrevogável de EXCLUSIVIDADE pelo prazo de ${exclTags.PRAZO_EXCLUSIVIDADE_DIAS} dias, iniciando-se na data de assinatura deste instrumento e com termo final fixado improrrogavelmente em ${exclTags.DATA_TERMINO_EXCLUSIVIDADE}.\n` +
          `Parágrafo Primeiro: Durante a vigência da exclusividade, o(a) CONTRATANTE obriga-se a não conferir poderes de locação a terceiros e a não realizar negociação direta do bem sem a prévia e expressa intermediação do(a) CONTRATADO.\n` +
          `Parágrafo Segundo: Nos termos do Artigo 726 do Código Civil Brasileiro, se a locação do imóvel for consumada durante o prazo de vigência da exclusividade, ainda que efetuada diretamente pelo proprietário ou por intermédio de outrem, a remuneração integral de corretagem estipulada na Cláusula 4ª será devida ao(à) CONTRATADO.`
      },
      {
        numero: 'CLÁUSULA 4ª',
        titulo: 'DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM DE LOCAÇÃO',
        conteudo: `Pelos serviços de intermediação e prospecção de inquilino, o(a) CONTRATANTE pagará ao(à) CONTRATADO a comissão de corretagem correspondente a ${exclTags.COMISSAO_LOCACAO}, exigível no ato da assinatura do Contrato de Locação ou no primeiro recebimento de aluguel.\n` +
          `Parágrafo Primeiro: Caso convencionada a administração contínua da locação, a taxa mensal de administração corresponderá a ${exclTags.TAXA_ADMINISTRACAO_LOCACAO}.\n` +
          `Parágrafo Segundo: Em consonância com o Artigo 727 do Código Civil, se o contrato de locação for firmado após o término deste instrumento com inquilino apresentado, cadastrado ou negociado pelo(a) CONTRATADO durante a vigência da exclusividade, a remuneração de corretagem permanecerá integralmente devida.`
      },
      {
        numero: 'CLÁUSULA 5ª',
        titulo: 'DAS OBRIGAÇÕES, DIVULGAÇÃO E VISTORIA',
        conteudo: `O(A) CONTRATADO compromete-se a conduzir os trabalhos com zelo, prudência e dedicação profissional, ficando expressamente autorizado(a) a:\n` +
          `a) ${exclTags.AUTORIZACAO_PROSPECCAO};\n` +
          `b) Afixar placas e faixas de divulgação no imóvel, bem como veicular anúncios em portais imobiliários e redes sociais;\n` +
          `c) Acompanhar as visitas de proponentes interessados e analisar a documentação e idoneidade cadastral de locatários e fiadores;\n` +
          `d) Realizar laudo minucioso de vistoria inicial do imóvel por ocasião da entrega das chaves ao inquilino.`
      },
      {
        numero: 'CLÁUSULA 6ª',
        titulo: 'DO FORO',
        conteudo: `Para dirimir quaisquer controvérsias ou litígios decorrentes da interpretação ou execução deste contrato, as partes elegem expressamente o Foro da Comarca de ${exclTags.FORO_COMARCA}, com renúncia a qualquer outro por mais privilegiado que seja.`
      }
    ];
  } else if (isVendaELocacao) {
    clausulas = [
      {
        numero: 'CLÁUSULA 1ª',
        titulo: 'DO OBJETO DO CONTRATO E DADOS DO IMÓVEL',
        conteudo: `O presente contrato tem por objeto a prestação de serviços de corretagem e intermediação imobiliária em caráter de EXCLUSIVIDADE para a promoção de VENDA e/ou LOCAÇÃO do imóvel caracterizado como ${exclTags.TIPO_IMOVEL}, situado em ${exclTags.LOCALIZACAO_IMOVEL}, de propriedade do(a) CONTRATANTE, com a seguinte especificação:\n` +
          `• Documento de Propriedade: ${exclTags.DOCUMENTO_PROPRIEDADE};\n` +
          `• Matrícula nº: ${exclTags.MATRICULA};\n` +
          `• Inscrição Municipal/Prefeitura: ${exclTags.INSCRICAO_PREFEITURA};\n` +
          `• Descrição e Características: ${exclTags.OUTROS_DADOS_IMOVEL}.`
      },
      {
        numero: 'CLÁUSULA 2ª',
        titulo: 'DOS VALORES E CONDIÇÕES DE VENDA E LOCAÇÃO',
        conteudo: `a) Para Venda: O imóvel será promovido pelo valor total de ${exclTags.VALOR_TOTAL} (${exclTags.VALOR_TOTAL_EXTENSO}), sob as seguintes condições de pagamento: ${exclTags.CONDICOES_PAGAMENTO}.\n` +
          `b) Para Locação: O imóvel será ofertado pelo valor mensal sugerido de ${exclTags.VALOR_LOCACAO_SUGERIDO} (${exclTags.VALOR_LOCACAO_SUGERIDO_EXTENSO}), sob as seguintes garantias aceitas: ${exclTags.GARANTIAS_ACEITAS_LOCACAO}.`
      },
      {
        numero: 'CLÁUSULA 3ª',
        titulo: 'DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE',
        conteudo: `A presente autorização de intermediação é concedida com CLÁUSULA DE EXCLUSIVIDADE pelo prazo de ${exclTags.PRAZO_EXCLUSIVIDADE_DIAS} dias, iniciando-se na data de assinatura deste instrumento e encerrando-se em ${exclTags.DATA_TERMINO_EXCLUSIVIDADE}.\n` +
          `Parágrafo Primeiro: Durante a vigência deste contrato, o(a) CONTRATANTE não poderá autorizar terceiros nem negociar diretamente o imóvel para venda ou locação sem a interveniência do(a) CONTRATADO.\n` +
          `Parágrafo Segundo: Consoante o Artigo 726 do Código Civil, consumada a venda ou locação durante o prazo de vigência deste instrumento, os honorários correspondentes serão devidos ao(à) CONTRATADO.`
      },
      {
        numero: 'CLÁUSULA 4ª',
        titulo: 'DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM',
        conteudo: `a) Em caso de Venda: A comissão corresponderá a ${exclTags.PERCENTUAL_CORRETAGEM} (${exclTags.PERCENTUAL_CORRETAGEM_EXTENSO}) sobre o valor total da venda;\n` +
          `b) Em caso de Locação: A comissão corresponderá a ${exclTags.COMISSAO_LOCACAO}, acrescida de taxa de administração de ${exclTags.TAXA_ADMINISTRACAO_LOCACAO} caso contratada a gestão do aluguel.\n` +
          `Parágrafo Único: Aplica-se o Artigo 727 do Código Civil caso o negócio se concretize após o término deste contrato com cliente prospectado durante sua vigência.`
      },
      {
        numero: 'CLÁUSULA 5ª',
        titulo: 'DAS OBRIGAÇÕES E DIVULGAÇÃO',
        conteudo: `O(A) CONTRATADO fica autorizado(a) a veicular publicidade em portais, redes sociais, afixar placas no imóvel e realizar visitas com interessados, prestando contas de todas as atividades ao(à) CONTRATANTE.`
      },
      {
        numero: 'CLÁUSULA 6ª',
        titulo: 'DO FORO',
        conteudo: `Fica eleito o Foro da Comarca de ${exclTags.FORO_COMARCA} para dirimir qualquer dúvida ou litígio decorrente deste instrumento.`
      }
    ];
  } else {
    clausulas = [
      {
        numero: 'CLÁUSULA 1ª',
        titulo: 'DO OBJETO DO CONTRATO E DADOS DO IMÓVEL',
        conteudo: `O presente contrato tem por objeto a prestação de serviços de intermediação e corretagem imobiliária com cláusula de exclusividade para a promoção e venda do bem imóvel caracterizado como ${exclTags.TIPO_IMOVEL}, situado em ${exclTags.LOCALIZACAO_IMOVEL}, de propriedade do(a) CONTRATANTE, com a seguinte especificação documental e registral:\n` +
          `• Documento de Propriedade: ${exclTags.DOCUMENTO_PROPRIEDADE};\n` +
          `• Matrícula nº: ${exclTags.MATRICULA};\n` +
          `• Inscrição Municipal/Prefeitura: ${exclTags.INSCRICAO_PREFEITURA};\n` +
          `• Descrição e Confrontações: ${exclTags.OUTROS_DADOS_IMOVEL}.`
      },
      {
        numero: 'CLÁUSULA 2ª',
        titulo: 'DO VALOR E CONDIÇÕES DE VENDA',
        conteudo: `O imóvel objeto deste instrumento será promovido e disponibilizado no mercado imobiliário para venda pelo valor total de ${exclTags.VALOR_TOTAL} (${exclTags.VALOR_TOTAL_EXTENSO}), sob as seguintes condições de pagamento: ${exclTags.CONDICOES_PAGAMENTO}.\n` +
          `Parágrafo Único: O(A) CONTRATANTE poderá aceitar propostas com condições ou valores distintos, desde que expressamente autorizados por escrito e de comum acordo.`
      },
      {
        numero: 'CLÁUSULA 3ª',
        titulo: 'DO PRAZO E DA CLÁUSULA DE EXCLUSIVIDADE',
        conteudo: `A presente autorização de corretagem é outorgada em caráter irrevogável de EXCLUSIVIDADE pelo prazo de ${exclTags.PRAZO_EXCLUSIVIDADE_DIAS} dias, iniciando-se na data de assinatura deste instrumento e com termo final fixado improrrogavelmente em ${exclTags.DATA_TERMINO_EXCLUSIVIDADE}.\n` +
          `Parágrafo Primeiro: Durante a vigência da exclusividade, o(a) CONTRATANTE obriga-se a não outorgar poderes de venda a terceiros e a não realizar negociação direta do bem sem a prévia e expressa intermediação do(a) CONTRATADO.\n` +
          `Parágrafo Segundo: Nos termos do Artigo 726 do Código Civil Brasileiro, se a venda do imóvel for consumada durante o prazo de exclusividade, ainda que realizada diretamente pelo proprietário ou por intermédio de outrem, a remuneração integral de corretagem estipulada na Cláusula 4ª será devida ao(à) CONTRATADO.`
      },
      {
        numero: 'CLÁUSULA 4ª',
        titulo: 'DA REMUNERAÇÃO E COMISSÃO DE CORRETAGEM',
        conteudo: `Pelos serviços de intermediação e assessoria na venda, o(a) CONTRATANTE pagará ao(à) CONTRATADO a comissão de corretagem correspondente a ${exclTags.PERCENTUAL_CORRETAGEM} (${exclTags.PERCENTUAL_CORRETAGEM_EXTENSO}) calculada sobre o valor total da venda concretizada.\n` +
          `Parágrafo Primeiro: Os honorários de corretagem serão exigíveis no ato do recebimento do sinal/princípio de pagamento ou na celebração do instrumento de compra e venda ou lavratura da escritura definitiva.\n` +
          `Parágrafo Segundo: Em consonância com o Artigo 727 do Código Civil, se o negócio for concluído após o término deste contrato com comprador atraído, apresentado ou negociado pelo(a) CONTRATADO durante a vigência da exclusividade, a remuneração de corretagem permanecerá integralmente devida.`
      },
      {
        numero: 'CLÁUSULA 5ª',
        titulo: 'DAS OBRIGAÇÕES E DIVULGAÇÃO',
        conteudo: `O(A) CONTRATADO compromete-se a conduzir os trabalhos com probidade, prudência e dedicação, ficando autorizado(a) a afixar placas no imóvel, veicular anúncios em portais imobiliários, redes sociais e mídias do setor, bem como prestar contas de todas as tratativas ao(à) CONTRATANTE.`
      },
      {
        numero: 'CLÁUSULA 6ª',
        titulo: 'DO FORO',
        conteudo: `Para dirimir quaisquer dúvidas ou litígios decorrentes da aplicação deste contrato, as partes elegem expressamente o Foro da Comarca de ${exclTags.FORO_COMARCA}, com renúncia irrevogável a qualquer outro por mais privilegiado que seja.`
      }
    ];
  }

  if (contract.clausulasExtras?.trim()) {
    clausulas.push({
      numero: 'CLÁUSULA 7ª',
      titulo: 'DAS DISPOSIÇÕES COMPLEMENTARES',
      conteudo: contract.clausulasExtras.trim()
    });
  }

  const foro = `Foro da Comarca de ${exclTags.FORO_COMARCA}`;
  const dataLocal = `${exclTags.CIDADE_ASSINATURA}/${exclTags.ESTADO_ASSINATURA}, ${exclTags.DIA} de ${exclTags.MES_EXTENSO} de ${exclTags.ANO}.`;

  return {
    titulo,
    preambulo,
    clausulas,
    foro,
    dataLocal,
    tagsMapping: exclTags as unknown as ContractTagsMapping,
    textoCompletoRenderizado: textoRenderizado
  };
}

// Exportação para DOC (.doc) compatível com Word e Google Docs
export function exportToDoc(contract: ContractData): void {
  const legal = generateContractLegalText(contract);
  const tags = legal.tagsMapping as unknown as Record<string, string>;

  let signaturesHtml = '';
  if (contract.assinaturas && contract.assinaturas.length > 0) {
    signaturesHtml = `
      <div style="margin-top: 30px;">
        ${contract.assinaturas.map(ass => `
          <div style="margin-top: 25px; border-top: 1px solid #333; padding-top: 8px; width: 320px; display: inline-block; vertical-align: top; margin-right: 30px;">
            ${ass.assinaturaDataUrl ? `<img src="${ass.assinaturaDataUrl}" style="height: 50px; max-width: 250px; object-fit: contain;" /><br/>` : ''}
            <strong>${ass.nomeSignatario}</strong><br/>
            <span>Doc: ${ass.documentoSignatario} (${ass.role.toUpperCase()})</span><br/>
            <small style="color: #666; font-size: 9px;">Assinado Digitalmente em: ${formatDate(ass.assinadoEm)}<br/>Hash SHA-256: ${ass.hashAutenticacao.slice(0, 28)}...</small>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    const isExcl = contract.tipo === 'exclusividade';
    const isLoc = contract.tipo === 'locacao';

    let corretorNome = tags.vendedor_nome || tags.vendedor || 'PROMITENTE VENDEDOR(A)';
    let corretorDoc = tags.vendedor_cpf_cnpj || tags.cpf_vendedor || '';
    let corretorTermo = tags.vendedor_termo || 'PROMITENTE VENDEDOR(A)';

    let clienteNome = tags.comprador_nome || tags.comprador || 'PROMITENTE COMPRADOR(A)';
    let clienteDoc = tags.comprador_cpf || tags.cpf_comprador || '';
    let clienteTermo = tags.comprador_termo || 'PROMITENTE COMPRADOR(A)';

    if (isExcl) {
      corretorNome = tags.VENDEDOR_NOME || tags.comprador_nome || tags.comprador || 'CONTRATADO(A)';
      corretorDoc = tags.VENDEDOR_CRECI ? `CRECI nº ${tags.VENDEDOR_CRECI} | CPF/CNPJ: ${tags.VENDEDOR_CPF || ''}` : (tags.VENDEDOR_CPF || '');
      corretorTermo = 'CONTRATADO(A)';
      clienteNome = tags.CONTRATANTE_NOME || tags.vendedor_nome || tags.vendedor || 'CONTRATANTE';
      clienteDoc = tags.CONTRATANTE_CPF || tags.vendedor_cpf_cnpj || tags.cpf_vendedor || '';
      clienteTermo = 'CONTRATANTE';
    } else if (isLoc) {
      corretorNome = tags.locador || tags.vendedor_nome || tags.vendedor || 'LOCADOR(A)';
      corretorDoc = tags.cpf_locador || tags.vendedor_cpf_cnpj || tags.cpf_vendedor || '';
      corretorTermo = 'LOCADOR(A)';
      clienteNome = tags.locatario || tags.comprador_nome || tags.comprador || 'LOCATÁRIO(A)';
      clienteDoc = tags.cpf_locatario || tags.comprador_cpf || tags.cpf_comprador || '';
      clienteTermo = 'LOCATÁRIO(A)';
    }

    const t1 = contract.testemunha1;
    const t2 = contract.testemunha2;

    signaturesHtml = `
      <table style="width: 100%; margin-top: 40px; border-collapse: collapse;">
        <tr>
          <td style="width: 45%; text-align: center; padding-top: 10px; vertical-align: top;">
            <strong>${corretorNome}</strong><br/>
            ${corretorTermo}<br/>
            ${corretorDoc ? `CPF/CNPJ: ${corretorDoc}` : ''}
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; text-align: center; padding-top: 10px; vertical-align: top;">
            <strong>${clienteNome}</strong><br/>
            ${clienteTermo}<br/>
            ${clienteDoc ? (isExcl ? clienteDoc : `CPF/CNPJ: ${clienteDoc}`) : ''}
          </td>
        </tr>
      </table>

      <div style="margin-top: 40px;">
        <strong>TESTEMUNHAS:</strong><br/><br/>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 45%; vertical-align: top;">
              1. Nome: ${t1?.nome || ''}<br/>
              CPF: ${t1?.cpf || ''}<br/>
              RG: ${t1?.rg || ''}
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; vertical-align: top;">
              2. Nome: ${t2?.nome || ''}<br/>
              CPF: ${t2?.cpf || ''}<br/>
              RG: ${t2?.rg || ''}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${legal.titulo}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; padding: 40px; }
        h1 { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
        p { text-align: justify; margin-bottom: 12px; }
        .clausula-header { font-weight: bold; margin-top: 16px; margin-bottom: 4px; text-transform: uppercase; }
        .footer-date { text-align: right; margin-top: 30px; margin-bottom: 30px; font-weight: bold; }
        .contract-number { text-align: right; font-size: 10pt; color: #555; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="contract-number">Ref: Contrato nº ${contract.numeroContrato}</div>
      <h1>${legal.titulo}</h1>
      
      <p>${legal.preambulo.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>

      ${legal.clausulas.map(c => `
        <div class="clausula-header">${c.numero} – ${c.titulo}</div>
        <p>${c.conteudo.replace(/\n/g, '<br/>')}</p>
      `).join('')}

      <div class="footer-date">${legal.dataLocal}</div>

      ${signaturesHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildDocFileName(contract);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function signatureIdFromHash(hash?: string): string {
  const h = (hash || '').toUpperCase();
  if (h.length < 16) return (h || 'PENDENTE').padEnd(16, '0').replace(/(.{4})/g, '$1-').slice(0, 19);
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

function buildValidationUrl(numeroContrato: string, signatureId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/validar?contrato=${encodeURIComponent(numeroContrato)}&sig=${encodeURIComponent(signatureId)}`;
}

// Gerador de PDF em formato Blob via jsPDF
export async function generateContractPdfBlob(contract: ContractData): Promise<Blob> {
  const legal = generateContractLegalText(contract);
  const tags = legal.tagsMapping;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Header / Número
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`Ref: Contrato nº ${contract.numeroContrato}`, pageWidth - margin, y, { align: 'right' });
  y += 9;

  // Título
  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(legal.titulo, contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += (titleLines.length * 6) + 6;

  // Preâmbulo
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const preambuloLines = doc.splitTextToSize(legal.preambulo, contentWidth);
  
  for (let i = 0; i < preambuloLines.length; i++) {
    if (y > pageHeight - margin - 15) {
      doc.addPage();
      y = margin;
    }
    doc.text(preambuloLines[i], margin, y);
    y += 4.8;
  }
  y += 3;

  // Cláusulas
  legal.clausulas.forEach((c) => {
    if (y > pageHeight - margin - 25) {
      doc.addPage();
      y = margin;
    }
    
    // Título da Cláusula
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`${c.numero} – ${c.titulo}`, margin, y);
    y += 5.2;

    // Conteúdo da Cláusula
    doc.setFont('times', 'normal');
    const conteudoLines = doc.splitTextToSize(c.conteudo, contentWidth);
    for (let i = 0; i < conteudoLines.length; i++) {
      if (y > pageHeight - margin - 15) {
        doc.addPage();
        y = margin;
      }
      doc.text(conteudoLines[i], margin, y);
      y += 4.8;
    }
    y += 3;
  });

  // Data Local
  if (y > pageHeight - margin - 25) {
    doc.addPage();
    y = margin;
  }
  y += 3;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text(legal.dataLocal, pageWidth - margin, y, { align: 'right' });
  y += 16;

  // Assinaturas e Finalização do Contrato conforme Modalidade
  const isDigital = contract.modalidadeAssinatura === 'digital' || (contract.modalidadeAssinatura !== 'manual' && contract.assinaturas && contract.assinaturas.length > 0);

  const isExcl = contract.tipo === 'exclusividade';
  const isLoc = contract.tipo === 'locacao';
  const allCompradores = getAllCompradores(contract);
  const anyTags = tags as unknown as Record<string, string>;

  let vNome = anyTags.vendedor_nome || anyTags.vendedor || 'PROMITENTE VENDEDOR(A)';
  let cNome = anyTags.comprador_nome || anyTags.comprador || 'PROMITENTE COMPRADOR(A)';
  let vDoc = anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '';
  let cDoc = anyTags.comprador_cpf || anyTags.cpf_comprador || '';
  let vTermo = anyTags.vendedor_termo || 'PROMITENTE VENDEDOR(A)';
  let cTermo = anyTags.comprador_termo || 'PROMITENTE COMPRADOR(A)';

  if (isExcl) {
    vNome = anyTags.CONTRATANTE_NOME || anyTags.vendedor_nome || anyTags.vendedor || 'CONTRATANTE';
    cNome = anyTags.VENDEDOR_NOME || anyTags.comprador_nome || anyTags.comprador || 'CONTRATADO(A)';
    vDoc = anyTags.CONTRATANTE_CPF || anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '';
    cDoc = anyTags.VENDEDOR_CRECI ? `CRECI nº ${anyTags.VENDEDOR_CRECI} | CPF/CNPJ: ${anyTags.VENDEDOR_CPF || ''}` : (anyTags.VENDEDOR_CPF || '');
    vTermo = 'CONTRATANTE';
    cTermo = 'CONTRATADO(A)';
  } else if (isLoc) {
    vNome = anyTags.locador || anyTags.vendedor_nome || anyTags.vendedor || 'LOCADOR(A)';
    cNome = anyTags.locatario || anyTags.comprador_nome || anyTags.comprador || 'LOCATÁRIO(A)';
    vDoc = anyTags.cpf_locador || anyTags.vendedor_cpf_cnpj || anyTags.cpf_vendedor || '';
    cDoc = anyTags.cpf_locatario || anyTags.comprador_cpf || anyTags.cpf_comprador || '';
    vTermo = 'LOCADOR(A)';
    cTermo = 'LOCATÁRIO(A)';
  }

  if (isDigital) {
    // =========================================================================
    // MODALIDADE 1: ASSINATURA DIGITAL / ELETRÔNICA
    // =========================================================================
    if (y > pageHeight - margin - 55) {
      doc.addPage();
      y = margin + 10;
    }

    y += 5;

    const drawPartyStamp = async (sig: typeof contract.assinaturas[number] | undefined, fallbackName: string, fallbackDoc: string, roleLabel: string) => {
      const neededHeight = sig ? STAMP_HEIGHT + 19 : 14;
      if (y > pageHeight - margin - neededHeight) {
        doc.addPage();
        y = margin + 10;
      }
      if (sig) {
        const dt = new Date(sig.assinadoEm);
        const signatureId = signatureIdFromHash(sig.hashAutenticacao);
        y = await drawDigitalSignatureStamp(doc, y, pageWidth, {
          signerName: sig.nomeSignatario,
          cpfCnpj: formatCpfCnpjDoc(sig.documentoSignatario),
          dateStr: dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          timeStr: dt.toLocaleTimeString('pt-BR', { hour12: true, timeZone: 'America/Sao_Paulo' }),
          signatureId,
          hash: sig.hashAutenticacao,
          validationUrl: buildValidationUrl(contract.numeroContrato, signatureId),
        });

        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(sig.nomeSignatario, pageWidth / 2, y, { align: 'center' });
        y += 4.5;
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`CPF: ${formatCpfCnpjDoc(sig.documentoSignatario)}`, pageWidth / 2, y, { align: 'center' });
        doc.setTextColor(30, 30, 30);
        y += 6;
      } else {
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text(fallbackName, pageWidth / 2, y, { align: 'center' });
        y += 4.5;
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text(`${roleLabel}${fallbackDoc ? ` — CPF/CNPJ: ${fallbackDoc}` : ''}`, pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`[Pendente de Autenticação Digital - ${roleLabel}]`, pageWidth / 2, y, { align: 'center' });
        doc.setTextColor(30, 30, 30);
        y += 10;
      }
    };

    // Signatário 1: Vendedor / Contratante
    const cleanDocVendedor = (vDoc || '').replace(/\D/g, '');
    const cleanNomeVendedor = (vNome || '').toLowerCase().trim();
    const sigVendedor = contract.assinaturas?.find(a =>
      a.role === 'vendedor' ||
      (!isExcl && (a.role === 'usuario' || a.role === 'corretor')) ||
      (cleanDocVendedor && (a.documentoSignatario || '').replace(/\D/g, '') === cleanDocVendedor) ||
      (cleanNomeVendedor && (a.nomeSignatario || '').toLowerCase().trim() === cleanNomeVendedor)
    );
    await drawPartyStamp(sigVendedor, vNome, vDoc, vTermo);

    // Contratante / Compradores
    const primerComp = allCompradores[0] || contract.comprador;
    const cleanDocPrimer = (primerComp.cpfCnpj || cDoc || '').replace(/\D/g, '');
    const cleanNomePrimer = (primerComp.nome || cNome || '').toLowerCase().trim();
    const sigPrimerComp = contract.assinaturas?.find(a =>
      (a !== sigVendedor) && (
        a.role === 'comprador' ||
        a.role === 'contratado' ||
        a.role === 'usuario' ||
        (a.role === 'comprador_adicional' && (a.signerIndex === 0 || a.documentoSignatario === primerComp.cpfCnpj)) ||
        (cleanDocPrimer && (a.documentoSignatario || '').replace(/\D/g, '') === cleanDocPrimer) ||
        (cleanNomePrimer && (a.nomeSignatario || '').toLowerCase().trim() === cleanNomePrimer)
      )
    );
    const primerLabel = isExcl
      ? 'CONTRATADO(A)'
      : (allCompradores.length > 1 ? '1º PROMITENTE COMPRADOR(A)' : cTermo);
    await drawPartyStamp(sigPrimerComp, primerComp.nome || cNome, primerComp.cpfCnpj || cDoc, primerLabel);

    // Compradores Adicionais
    if (allCompradores.length > 1) {
      for (let i = 1; i < allCompradores.length; i++) {
        const compAdic = allCompradores[i];
        const sigComp = contract.assinaturas?.find(a =>
          (a.role === 'comprador_adicional' && (a.signerIndex === i || a.documentoSignatario === compAdic.cpfCnpj)) ||
          a.documentoSignatario === compAdic.cpfCnpj
        );
        const compLabel = `${i + 1}º PROMITENTE COMPRADOR(A)`;
        await drawPartyStamp(sigComp, compAdic.nome || `COMPRADOR ${i + 1}`, compAdic.cpfCnpj || '', compLabel);
      }
    }
  } else {
    // =========================================================================
    // MODALIDADE 2: PDF PARA ASSINATURA MANUAL
    // =========================================================================
    if (y > pageHeight - margin - 65) {
      doc.addPage();
      y = margin + 10;
    }

    const colWidth = (contentWidth - 10) / 2;
    const primerComp = allCompradores[0] || contract.comprador;
    const primerLabel = isExcl 
      ? 'CONTRATADO(A)' 
      : (allCompradores.length > 1 ? '1º PROMITENTE COMPRADOR(A)' : cTermo);

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text(vNome, margin, y);
    doc.text(primerComp.nome || cNome, margin + colWidth + 10, y);
    y += 3.8;
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(`${vTermo}${vDoc ? ` - CPF/CNPJ: ${vDoc}` : ''}`, margin, y);
    doc.text(`${primerLabel}${primerComp.cpfCnpj ? (isExcl ? ` - ${primerComp.cpfCnpj}` : ` - CPF: ${primerComp.cpfCnpj}`) : (cDoc ? ` - ${cDoc}` : '')}`, margin + colWidth + 10, y);
    y += 10;

    if (allCompradores.length > 1) {
      for (let i = 1; i < allCompradores.length; i++) {
        const compAdic = allCompradores[i];
        if (y > pageHeight - margin - 45) {
          doc.addPage();
          y = margin + 10;
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.text(compAdic.nome || `COMPRADOR ${i + 1}`, margin, y);
        y += 3.8;
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text(`${i + 1}º PROMITENTE COMPRADOR(A) - CPF: ${compAdic.cpfCnpj || '---'}`, margin, y);
        y += 10;
      }
    }

    // Bloco de Testemunhas
    if (y > pageHeight - margin - 45) {
      doc.addPage();
      y = margin + 10;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('TESTEMUNHAS:', margin, y);
    y += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.text(`1. Nome: ${contract.testemunha1?.nome || ''}    CPF: ${contract.testemunha1?.cpf || ''}    RG: ${contract.testemunha1?.rg || ''}`, margin, y);
    doc.text(`2. Nome: ${contract.testemunha2?.nome || ''}    CPF: ${contract.testemunha2?.cpf || ''}    RG: ${contract.testemunha2?.rg || ''}`, margin + colWidth + 10, y);
    y += 10;
  }

  // Página Extra: Manifesto de Auditoria e Assinaturas (se houver assinaturas digitais registradas)
  if (contract.assinaturas && contract.assinaturas.length > 0) {
    doc.addPage();
    let my = margin;

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, my, contentWidth, 14, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('MANIFESTO DE ASSINATURAS E TRILHA DE AUDITORIA', pageWidth / 2, my + 9, { align: 'center' });
    my += 20;

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Documento formalizado eletronicamente com validade jurídica plena nos termos da Lei Federal nº 14.063/2020 e Art. 10, § 2º da MP 2.200-2/2001.',
      margin,
      my,
      { maxWidth: contentWidth }
    );
    my += 9;

    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Identificador do Contrato: nº ${contract.numeroContrato || '---'}`, margin, my);
    my += 8;

    contract.assinaturas.forEach((sig, idx) => {
      if (my > pageHeight - margin - 40) {
        doc.addPage();
        my = margin;
      }

      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, my, contentWidth, 34, 2, 2, 'FD');

      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const roleText = sig.role === 'vendedor' ? 'Contratante/Vendedor' : sig.role === 'comprador' ? 'Contratado/Comprador' : 'Parte Signatária';
      doc.text(`${idx + 1}. Signatário(a): ${sig.nomeSignatario} (${roleText})`, margin + 4, my + 6);

      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`CPF/Documento: ${formatCpfCnpjDoc(sig.documentoSignatario)}    |    Data/Hora: ${new Date(sig.assinadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)`, margin + 4, my + 12);
      doc.text(`Endereço IP: ${sig.ipAssinatura || 'Registrado'}    |    Autenticação: ${sig.meioAutenticacao || 'Token Seguro + Código Único'}`, margin + 4, my + 17);
      doc.text(`Dispositivo / Navegador: ${sig.metadadosNavegador ? sig.metadadosNavegador.slice(0, 80) : 'Navegador Web Seguro'}`, margin + 4, my + 22);

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Hash Criptográfico (SHA-256): ${sig.hashAutenticacao || '---'}`, margin + 4, my + 28);

      my += 38;
    });
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Página ${i} de ${pageCount} — Contrato nº ${contract.numeroContrato} — Sistema de Gestão de Contratos 360`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

// Exportação para PDF via jsPDF com download automático
export async function exportToPdf(contract: ContractData): Promise<void> {
  const blob = await generateContractPdfBlob(contract);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildPdfFileName(contract);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Modelos Iniciais com Todas as Tags Preenchidas (incluindo o exemplo de Santarém/PA à vista)
export const INITIAL_SAMPLE_CONTRACTS: ContractData[] = [
  {
    id: 'ct-001',
    tipo: 'venda_vista',
    titulo: 'Venda de Terreno Lote 14 Quadra 08 - Residencial Tapajós',
    numeroContrato: 'CT-VISTA-2026-001',
    dataCriacao: '2026-08-23',
    cidadeForo: 'Santarém',
    ufForo: 'PA',
    cidadeAssinatura: 'Santarém',
    ufAssinatura: 'PA',
    diaAssinatura: '23',
    mesExtensoAssinatura: 'agosto',
    anoAssinatura: '2026',
    vendedor: {
      nome: 'José Maria Figueira de Alencar',
      nacionalidade: 'brasileiro',
      estadoCivil: 'casado',
      rg: '3456789',
      rgOrgao: 'SSP/PA',
      cpfCnpj: '234.567.890-12',
      endereco: 'Av. Mendonça Furtado',
      numero: '1420',
      bairro: 'Aldeia',
      cep: '68040-050',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 99122-3344',
      email: 'jose.alencar@email.com',
    },
    comprador: {
      nome: 'Cláudia Beatriz Menezes Silva',
      nacionalidade: 'brasileira',
      estadoCivil: 'solteira',
      rg: '4567890',
      rgOrgao: 'SSP/PA',
      cpfCnpj: '678.901.234-55',
      endereco: 'Travessa dos Mártires',
      numero: '580',
      bairro: 'Centro',
      cep: '68005-090',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 98400-5566',
      email: 'claudia.menezes@email.com',
    },
    imovel: {
      nomeEmpreendimento: 'Loteamento Residencial Tapajós',
      localizacaoImovel: 'Rodovia Fernando Guilhon, Km 06',
      cidadeImovel: 'Santarém',
      ufImovel: 'PA',
      numeroLote: '14',
      numeroQuadra: '08',
      enderecoLote: 'Rua das Palmeiras, Quadra 08, Lote 14',
      metragemFrente: '12,00',
      metragemLateralDireita: '30,00',
      metragemLateralEsquerda: '30,00',
      metragemFundos: '12,00',
      areaTotalM2: '360,00',
    },
    valorTotal: 180000,
    valorTotalExtenso: 'cento e oitenta mil reais',
    vendaVista: {
      formaPagamento: 'PIX',
      dadosBancariosRecebedor: 'Chave PIX (CPF): 234.567.890-12 - Banco do Brasil',
      dataQuitacao: '2026-08-23',
      prazoEntregaPosse: 'Imediatamente após a confirmação do pagamento integral.',
    },
    status: 'assinado_total',
    assinaturas: [
      {
        role: 'vendedor',
        nomeSignatario: 'José Maria Figueira de Alencar',
        documentoSignatario: '234.567.890-12',
        assinaturaDataUrl: '',
        assinadoEm: '2026-08-23T10:15:00Z',
        hashAutenticacao: '8f4c2e1b9a7d3f5e2c1a8b9d7e6f5c4b3a2d1e0f9c8b7a6e5d4c3b2a1f0e9d8c',
        metadadosNavegador: 'Chrome 128.0 (Santarém, PA)',
      },
      {
        role: 'comprador',
        nomeSignatario: 'Cláudia Beatriz Menezes Silva',
        documentoSignatario: '678.901.234-55',
        assinaturaDataUrl: '',
        assinadoEm: '2026-08-23T11:30:00Z',
        hashAutenticacao: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        metadadosNavegador: 'Safari iOS 18 (Santarém, PA)',
      }
    ],
  },
  {
    id: 'ct-002',
    tipo: 'venda_parcelada',
    titulo: 'Venda Parcelada de Lote Comercial com Reserva de Domínio',
    numeroContrato: 'CT-PARC-2026-002',
    dataCriacao: '2026-08-15',
    cidadeForo: 'Santarém',
    ufForo: 'PA',
    cidadeAssinatura: 'Santarém',
    ufAssinatura: 'PA',
    diaAssinatura: '15',
    mesExtensoAssinatura: 'agosto',
    anoAssinatura: '2026',
    vendedor: {
      nome: 'Empreendimentos Imobiliários Tapajós Ltda',
      nacionalidade: 'brasileira',
      estadoCivil: 'Pessoa Jurídica',
      rg: 'IE 15.234.567-8',
      rgOrgao: 'SEFA/PA',
      cpfCnpj: '12.345.678/0001-90',
      endereco: 'Av. Rui Barbosa',
      numero: '1020',
      bairro: 'Prainha',
      cep: '68005-080',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 3522-1000',
    },
    comprador: {
      nome: 'Marcos Vinícius Andrade',
      nacionalidade: 'brasileiro',
      estadoCivil: 'casado',
      rg: '5678901',
      rgOrgao: 'SSP/PA',
      cpfCnpj: '345.678.901-23',
      endereco: 'Rua Floriano Peixoto',
      numero: '310',
      bairro: 'Centro',
      cep: '68005-000',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 99188-7766',
    },
    imovel: {
      nomeEmpreendimento: 'Parque Comercial Norte',
      localizacaoImovel: 'Av. Sérgio Henn, s/n',
      cidadeImovel: 'Santarém',
      ufImovel: 'PA',
      numeroLote: '05',
      numeroQuadra: '12',
      enderecoLote: 'Av. Sérgio Henn, Lote 05, Quadra 12',
      metragemFrente: '15,00',
      metragemLateralDireita: '40,00',
      metragemLateralEsquerda: '40,00',
      metragemFundos: '15,00',
      areaTotalM2: '600,00',
    },
    valorTotal: 300000,
    valorTotalExtenso: 'trezentos mil reais',
    vendaParcelada: {
      valorEntrada: 60000,
      formaPagamentoEntrada: 'Transferência PIX',
      dataEntrada: '2026-08-15',
      numeroParcelas: 24,
      valorParcela: 10000,
      periodicidade: 'Mensal',
      dataPrimeiroVencimento: '2026-09-15',
      formaPagamentoParcelas: 'Boleto Bancário',
      multaAtrasoPercentual: 2,
      jurosMoraMensalPercentual: 1,
      clausulaReservaDominio: true,
    },
    status: 'assinado_parcial',
    assinaturas: [
      {
        role: 'vendedor',
        nomeSignatario: 'Empreendimentos Imobiliários Tapajós Ltda',
        documentoSignatario: '12.345.678/0001-90',
        assinaturaDataUrl: '',
        assinadoEm: '2026-08-15T10:00:00Z',
        hashAutenticacao: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        metadadosNavegador: 'Chrome 128.0 (Santarém, PA)',
      }
    ],
  },
  {
    id: 'ct-003',
    tipo: 'exclusividade',
    titulo: 'Exclusividade de Venda de Imóvel Residencial Orla de Santarém',
    numeroContrato: 'CT-EXCL-2026-003',
    dataCriacao: '2026-08-01',
    cidadeForo: 'Santarém',
    ufForo: 'PA',
    cidadeAssinatura: 'Santarém',
    ufAssinatura: 'PA',
    diaAssinatura: '01',
    mesExtensoAssinatura: 'agosto',
    anoAssinatura: '2026',
    vendedor: {
      nome: 'Roberto Mansur de Albuquerque',
      nacionalidade: 'brasileiro',
      estadoCivil: 'casado',
      rg: '1987654',
      rgOrgao: 'SSP/PA',
      cpfCnpj: '456.789.012-34',
      endereco: 'Av. Tapajós',
      numero: '2100',
      bairro: 'Laguinho',
      cep: '68010-000',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 98111-2233',
    },
    comprador: {
      nome: 'Amazon Prime Imóveis & Consultoria Ltda',
      nacionalidade: 'brasileira',
      estadoCivil: 'Pessoa Jurídica',
      rg: 'CRECI 1234-J',
      rgOrgao: 'CRECI/PA',
      cpfCnpj: '44.333.222/0001-55',
      endereco: 'Av. São Sebastião',
      numero: '1450',
      bairro: 'Santa Clara',
      cep: '68005-310',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 3523-8000',
    },
    imovel: {
      nomeEmpreendimento: 'Residencial Mirante do Tapajós',
      localizacaoImovel: 'Av. Tapajós, 2100',
      cidadeImovel: 'Santarém',
      ufImovel: 'PA',
      numeroLote: 'Cobertura 801',
      numeroQuadra: '01',
      enderecoLote: 'Av. Tapajós, 2100, Apto 801',
      metragemFrente: '15,00',
      metragemLateralDireita: '25,00',
      metragemLateralEsquerda: '25,00',
      metragemFundos: '15,00',
      areaTotalM2: '375,00',
    },
    valorTotal: 1200000,
    valorTotalExtenso: 'um milhão e duzentos mil reais',
    exclusividade: {
      tipoExclusividade: 'Venda de Imóvel',
      dataInicio: '2026-08-01',
      dataTermino: '2026-09-10', // Vencendo em breve para exibir alerta
      prazoMesesOuDias: 40,
      unidadePrazo: 'dias',
      percentualComissao: 6,
      valorComissaoEstimado: 72000,
      multaRescisaoOuQuebra: 10,
      renovacaoAutomatica: false,
      autorizaDivulgacaoPlacasRedes: true,
    },
    status: 'assinado_total',
    assinaturas: [
      {
        role: 'vendedor',
        nomeSignatario: 'Roberto Mansur de Albuquerque',
        documentoSignatario: '456.789.012-34',
        assinaturaDataUrl: '',
        assinadoEm: '2026-08-01T11:20:00Z',
        hashAutenticacao: '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
        metadadosNavegador: 'Chrome Desktop 128.0',
      },
      {
        role: 'comprador',
        nomeSignatario: 'Amazon Prime Imóveis & Consultoria Ltda',
        documentoSignatario: '44.333.222/0001-55',
        assinaturaDataUrl: '',
        assinadoEm: '2026-08-01T11:45:00Z',
        hashAutenticacao: 'ffeeddccbbaa00112233445566778899ffeeddccbbaa00112233445566778899',
        metadadosNavegador: 'Firefox 130.0',
      }
    ],
  }
];

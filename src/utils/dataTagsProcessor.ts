/**
 * Sistema de substituição de tags de dados em templates DOCX
 * Lê dados do contrato e substitui {{PLACEHOLDERS}} no arquivo
 */

import { ContractData } from '../types/contract';
import { getContractExclusividadeTags } from './contractGenerators';
import { getTratamento } from './tratamento';
import JSZip from 'jszip';

interface TagMapping {
  [key: string]: string;
}

/**
 * Reconhece se o documento informado é CPF (11 dígitos) ou CNPJ (14 dígitos)
 * e devolve o rótulo correto para exibir no contrato - evita a duplicidade
 * "CPF(MF) ou CNPJ(MF)" quando já se sabe qual dos dois é.
 * Default "CPF Nº" quando o campo ainda não foi preenchido/está fora do padrão.
 */
function getDocLabel(doc: string): string {
  const clean = (doc || '').replace(/\D/g, '');
  if (clean.length === 14) return 'CNPJ Nº';
  return 'CPF Nº';
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
    AREA_TOTAL: contract.imovel?.areaTotalM2 || '',
    AREA_TOTAL_M2: contract.imovel?.areaTotalM2 || '',
    CIDADE_IMOVEL: contract.imovel?.cidadeImovel || '',
    UF_IMOVEL: contract.imovel?.ufImovel || '',

    // FINANCEIRO
    VALOR_TOTAL: contract.valorTotal?.toString() || '',
    VALOR_TOTAL_EXTENSO: contract.valorTotalExtenso || '',
    VALOR_ENTRADA: contract.vendaParcelada?.valorEntrada?.toString() || '',
    VALOR_PARCELA: contract.vendaParcelada?.valorParcela?.toString() || '',
    QUANTIDADE_PARCELAS: contract.vendaParcelada?.numeroParcelas?.toString() || '',
    DATA_PRIMEIRA_PARCELA: contract.vendaParcelada?.dataPrimeiroVencimento || '',

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

  // TAGS DO CONTRATO DE EXCLUSIVIDADE (templates usam {tag} em minúsculo, chave única)
  // Reaproveita os cálculos já existentes de getContractExclusividadeTags
  // (contratante = vendedor/proprietário, contratado = comprador/corretor)
  if (contract.tipo === 'exclusividade') {
    const ex = getContractExclusividadeTags(contract);
    Object.assign(tags, {
      contratante: ex.CONTRATANTE_NOME,
      estado_civil_contratante: ex.CONTRATANTE_ESTADO_CIVIL,
      cpf_contratante: ex.CONTRATANTE_CPF,
      doc_label_contratante: getDocLabel(ex.CONTRATANTE_CPF),
      rg_contratante: ex.CONTRATANTE_RG,
      endereco_contratante: ex.CONTRATANTE_ENDERECO,

      contratado: ex.VENDEDOR_NOME,
      cpf_contratado: ex.VENDEDOR_CPF,
      doc_label_contratado: getDocLabel(ex.VENDEDOR_CPF),
      creci_contratado: ex.VENDEDOR_CRECI,
      endereco_contratado: ex.VENDEDOR_ENDERECO,
      telefone_contratado: ex.VENDEDOR_TELEFONE,
      NOME_PAPEL_CONTRATADO: getTratamento('contratado', contract.comprador.genero),

      tipo_imovel: ex.TIPO_IMOVEL,
      localizacao_imovel: ex.LOCALIZACAO_IMOVEL,
      documento_propriedade: ex.DOCUMENTO_PROPRIEDADE,
      matricula: ex.MATRICULA,
      inscricao_prefeitura: ex.INSCRICAO_PREFEITURA,
      outros_dados_imovel: ex.OUTROS_DADOS_IMOVEL,

      valor_total: ex.VALOR_TOTAL,
      valor_total_extenso: ex.VALOR_TOTAL_EXTENSO,
      condicoes_pagamento: ex.CONDICOES_PAGAMENTO,

      percentual_corretagem: ex.PERCENTUAL_CORRETAGEM,
      percentual_corretagem_extenso: ex.PERCENTUAL_CORRETAGEM_EXTENSO,

      prazo_exclusividade_dias: ex.PRAZO_EXCLUSIVIDADE_DIAS,
      data_termino_exclusividade: ex.DATA_TERMINO_EXCLUSIVIDADE,

      cidade: ex.CIDADE_ASSINATURA,
      estado: ex.ESTADO_ASSINATURA,
      dia: ex.DIA,
      mes_extenso: ex.MES_EXTENSO,
      ano: ex.ANO,
    });
  }

  // TAGS DE VENDA À VISTA E VENDA PARCELADA (templates usam {tag} em minúsculo,
  // snake_case e ordem "campo_papel" - ex: {cpf_comprador}, {artigo_vendedor}).
  // Faltava esse bloco inteiro: os templates .docx reais de venda_vista e
  // venda_parcelada usam essas chaves, mas só existiam os equivalentes em
  // MAIÚSCULO/ordem invertida acima (ex: COMPRADOR_CPF) - por isso nenhuma
  // tag do contrato era substituída (chave não batia, tag ficava intocada).
  if (contract.tipo === 'venda_vista' || contract.tipo === 'venda_parcelada') {
    const v = contract.vendedor;
    const c = contract.comprador;
    const im = contract.imovel;

    const dia = contract.diaAssinatura || new Date().getDate().toString();
    const mesExtenso = contract.mesExtensoAssinatura || getMesExtensoPT(new Date().getMonth());
    const ano = contract.anoAssinatura || new Date().getFullYear().toString();
    const cidadeAssinatura = contract.cidadeAssinatura || contract.cidadeForo || '';
    const estadoAssinatura = contract.ufAssinatura || contract.ufForo || '';

    const formatBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const valorExtenso = contract.valorTotalExtenso || '';
    const valorTotalStr = `${formatBRL(contract.valorTotal || 0)}${valorExtenso ? ` (${valorExtenso})` : ''}`;

    Object.assign(tags, {
      vendedor: v.nome || '',
      comprador: c.nome || '',
      VENDEDOR: v.nome || '',
      COMPRADOR: c.nome || '',
      NOME_PAPEL_VENDEDOR: getTratamento('vendedor', v.genero),
      NOME_PAPEL_COMPRADOR: getTratamento('comprador', c.genero),

      nacionalidade_vendedor: v.nacionalidade || 'brasileiro(a)',
      nacionalidade_comprador: c.nacionalidade || 'brasileiro(a)',
      estado_civil_vendedor: v.estadoCivil || '',
      estado_civil_comprador: c.estadoCivil || '',
      cpf_vendedor: v.cpfCnpj || '',
      cpf_comprador: c.cpfCnpj || '',
      rg_vendedor: v.rg || '',
      rg_comprador: c.rg || '',
      emissao_rg_vendedor: v.rgOrgao || 'SSP/PA',
      emissao_rg_comprador: c.rgOrgao || 'SSP/PA',
      endereco_vendedor: v.endereco || '',
      endereco_comprador: c.endereco || '',
      numero_vendedor: v.numero || 'S/N',
      numero_comprador: c.numero || 'S/N',
      bairro_vendedor: v.bairro || '',
      bairro_comprador: c.bairro || '',
      cep_vendedor: v.cep || '',
      cep_comprador: c.cep || '',
      cidade_vendedor: v.cidade || '',
      cidade_comprador: c.cidade || '',
      estado_vendedor: v.uf || '',
      estado_comprador: c.uf || '',
      telefone_vendedor: v.telefone || '',
      telefone_comprador: c.telefone || '',

      empreendimento: im?.nomeEmpreendimento || '',
      lote: im?.numeroLote || '',
      quadra: im?.numeroQuadra || '',
      localizacao_imovel: im?.localizacaoImovel || '',
      cidade_imovel: im?.cidadeImovel || '',
      estado_imovel: im?.ufImovel || '',
      rua_do_lote: im?.enderecoLote || '',
      quantidade_terreno: '01 (um) lote de terreno',
      frente: im?.metragemFrente ? `${im.metragemFrente} metros` : '',
      fundos: im?.metragemFundos ? `${im.metragemFundos} metros` : '',
      lateral_direita: im?.metragemLateralDireita ? `${im.metragemLateralDireita} metros` : '',
      lateral_esquerda: im?.metragemLateralEsquerda ? `${im.metragemLateralEsquerda} metros` : '',
      area_total: im?.areaTotalM2 ? `${im.areaTotalM2} m²` : '',

      valor_total: valorTotalStr,
      valor_total_extenso: valorExtenso,
      dia,
      mes_extenso: mesExtenso,
      ano,
      cidade_assinatura: cidadeAssinatura,
      estado_assinatura: estadoAssinatura,

      ...getGrammarTags(v.genero, 'vendedor'),
      ...getGrammarTags(c.genero, 'comprador'),
    });

    if (contract.tipo === 'venda_parcelada') {
      const vp = contract.vendaParcelada;
      const valorTotalNum = contract.valorTotal || 0;
      const valorEntradaNum = vp?.valorEntrada || 0;
      const saldoRestanteNum = Math.max(0, valorTotalNum - valorEntradaNum);
      const numParcelas = vp?.numeroParcelas || 1;
      const valorParcelaNum = vp?.valorParcela || (numParcelas > 0 ? saldoRestanteNum / numParcelas : 0);

      Object.assign(tags, {
        entrada: formatBRL(valorEntradaNum),
        restante: formatBRL(saldoRestanteNum),
        quantidade_parcelas: `${numParcelas}`,
        modo_pagamento: vp?.formaPagamentoParcelas || 'Boleto Bancário',
        valor_parcela: formatBRL(valorParcelaNum),
        data_vencimento: vp?.dataPrimeiroVencimento || '',
        data_primeira_parcela: vp?.dataPrimeiroVencimento || '',
      });
    }
  }

  return tags;
}

/**
 * Tags de concordância gramatical (gênero) para um papel contratual
 * (vendedor/comprador), com base no campo genero ('M' | 'F') salvo no
 * cadastro da parte. Sem gênero definido, cai no masculino (comportamento
 * anterior/neutro).
 */
function getGrammarTags(genero: string | undefined, papel: 'vendedor' | 'comprador'): TagMapping {
  const isF = genero === 'F';
  return {
    [`artigo_${papel}`]: isF ? 'A' : 'O',
    [`tratamento_${papel}`]: isF ? 'Sra.' : 'Sr.',
    [`chamado_${papel}`]: isF ? 'chamada' : 'chamado',
    [`domiciliado_${papel}`]: isF ? 'domiciliada' : 'domiciliado',
    [`portador_${papel}`]: isF ? 'portadora' : 'portador',
    [`possessivo_${papel}`]: isF ? 'sua' : 'seu',
    [`pronome_${papel}`]: isF ? 'ela' : 'ele',
    [`este_${papel}`]: isF ? 'esta' : 'este',
    [`de_${papel}`]: isF ? 'da' : 'do',
    [`ao_${papel}`]: isF ? 'à' : 'ao',
  };
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
  // Casa {{ ... }} (duplo) mesmo com marcação XML de runs quebrados no meio (non-greedy)
  let result = xml.replace(/\{\{([\s\S]*?)\}\}/g, (fullMatch, innerRaw: string) => {
    // Remove qualquer marcação XML que o Word tenha inserido entre os fragmentos da tag
    const cleanTag = innerRaw.replace(/<[^>]+>/g, '').trim();

    if (!cleanTag || !/^[A-Za-z0-9_À-ÿ]+$/.test(cleanTag)) {
      // Não parece ser uma tag válida (ex: chaves de código/fórmula) — não mexe
      return fullMatch;
    }

    // Nunca mexe em tags de SELO de assinatura ({{USUARIO_ASSINATURA_DIGITAL}},
    // {{CONTRATANTE_ASSINATURA_DIGITAL}} etc.) — essas são de responsabilidade
    // exclusiva do signatureTagProcessor, processado ANTES desta função.
    if (cleanTag.toUpperCase().includes('ASSINATURA')) {
      return fullMatch;
    }

    const upperTag = cleanTag.toUpperCase();
    // Usa a ÚLTIMA chave inserida que bate (case-insensitive), não a
    // primeira: quando o mesmo tag existe em mais de uma variação de
    // caixa (ex: VALOR_TOTAL cru no bloco genérico e valor_total
    // formatado certo no bloco específico de venda_vista/parcelada,
    // inserido depois), a versão mais recente/específica é a correta.
    const matchingKeys = Object.keys(tags).filter((k) => k.toUpperCase() === upperTag);
    const matchKey = matchingKeys.length > 0 ? matchingKeys[matchingKeys.length - 1] : undefined;

    if (matchKey === undefined) {
      // Tag desconhecida: remove para não deixar {{...}} residual no documento final
      return '';
    }

    return escapeXml(tags[matchKey] || '');
  });

  // Casa { ... } (simples) - usado pelos templates de exclusividade (ex: {contratante}, {tipo_imovel})
  result = result.replace(/\{([\s\S]*?)\}/g, (fullMatch, innerRaw: string) => {
    const cleanTag = innerRaw.replace(/<[^>]+>/g, '').trim();

    if (!cleanTag || !/^[A-Za-z0-9_À-ÿ]+$/.test(cleanTag)) {
      return fullMatch;
    }

    // Preserva tags de selo de assinatura não processadas (não deveria sobrar nenhuma aqui,
    // mas por segurança nunca apaga algo com "ASSINATURA" no nome)
    if (cleanTag.toUpperCase().includes('ASSINATURA')) {
      return fullMatch;
    }

    const upperTag = cleanTag.toUpperCase();
    const matchingKeys = Object.keys(tags).filter((k) => k.toUpperCase() === upperTag);
    const matchKey = matchingKeys.length > 0 ? matchingKeys[matchingKeys.length - 1] : undefined;

    if (matchKey === undefined) {
      // Tag simples desconhecida: deixa como está (pode ser texto legítimo entre chaves)
      return fullMatch;
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

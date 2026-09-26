// Mapeamento ContractData (app) <-> linha da tabela `contracts`.
// Cópia server-side do mesmo mapeamento que existia em
// src/utils/contractsRepository.ts - mantido idêntico de propósito pra
// não introduzir divergência entre o que o front-end espera e o que a
// API agora devolve.

import type { ContractData } from '../../src/types/contract.ts';

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function toRow(contract: ContractData) {
  return {
    id: contract.id,
    tipo: contract.tipo,
    subcategoria: contract.subcategoria ?? null,
    titulo: contract.titulo,
    numero_contrato: contract.numeroContrato,
    status: contract.status,

    cidade_foro: contract.cidadeForo,
    uf_foro: contract.ufForo,
    cidade_assinatura: contract.cidadeAssinatura,
    uf_assinatura: contract.ufAssinatura,

    vendedor: contract.vendedor,
    comprador: contract.comprador,
    compradores_adicionais: contract.compradoresAdicionais ?? null,

    imovel: contract.imovel ?? null,
    bem_outros: contract.bemOutros ?? null,
    objeto_descricao: contract.objetoDescricao ?? null,

    valor_total: contract.valorTotal,
    valor_total_extenso: contract.valorTotalExtenso ?? null,
    venda_vista: contract.vendaVista ?? null,
    venda_parcelada: contract.vendaParcelada ?? null,
    exclusividade: contract.exclusividade ?? null,

    clausulas_extras: contract.clausulasExtras ?? null,
    modalidade_assinatura: contract.modalidadeAssinatura ?? null,
    testemunhas: {
      testemunha1: contract.testemunha1 ?? null,
      testemunha2: contract.testemunha2 ?? null,
      testemunha3: contract.testemunha3 ?? null,
    },
  };
}

export function fromRow(row: any): ContractData {
  const dataBase = row.data_criacao || row.created_at;
  let diaAss: string | undefined = row.dia_assinatura;
  let mesAss: string | undefined = row.mes_extenso_assinatura;
  let anoAss: string | undefined = row.ano_assinatura;

  if ((!diaAss || !mesAss || !anoAss) && dataBase) {
    try {
      const d = new Date(dataBase);
      if (!isNaN(d.getTime())) {
        diaAss = diaAss || String(d.getDate()).padStart(2, '0');
        mesAss = mesAss || MONTH_NAMES_PT[d.getMonth()];
        anoAss = anoAss || String(d.getFullYear());
      }
    } catch {
      // fallback ignore
    }
  }

  return {
    id: row.id,
    tipo: row.tipo,
    subcategoria: row.subcategoria ?? undefined,
    titulo: row.titulo,
    numeroContrato: row.numero_contrato,
    dataCriacao: row.created_at,
    status: row.status,

    cidadeForo: row.cidade_foro,
    ufForo: row.uf_foro,
    cidadeAssinatura: row.cidade_assinatura,
    ufAssinatura: row.uf_assinatura,
    diaAssinatura: diaAss,
    mesExtensoAssinatura: mesAss,
    anoAssinatura: anoAss,

    vendedor: row.vendedor,
    comprador: row.comprador,
    compradoresAdicionais: row.compradores_adicionais ?? undefined,
    temMaisCompradores: !!(row.compradores_adicionais && row.compradores_adicionais.length),

    imovel: row.imovel ?? undefined,
    bemOutros: row.bem_outros ?? undefined,
    objetoDescricao: row.objeto_descricao ?? undefined,
    objetoIdentificacao: row.objeto_identificacao ?? undefined,
    objetoEstadoConservacao: row.objeto_estado_conservacao ?? undefined,

    valorTotal: Number(row.valor_total),
    valorTotalExtenso: row.valor_total_extenso ?? undefined,
    vendaVista: row.venda_vista ?? undefined,
    vendaParcelada: row.venda_parcelada ?? undefined,
    exclusividade: row.exclusividade ?? undefined,
    varianteExclusividade: row.variante_exclusividade ?? (row.exclusividade ? 'sem_conjuge' : undefined),

    clausulasExtras: row.clausulas_extras ?? undefined,
    modalidadeAssinatura: row.modalidade_assinatura ?? undefined,
    testemunha1: row.testemunhas?.testemunha1 ?? undefined,
    testemunha2: row.testemunhas?.testemunha2 ?? undefined,
    testemunha3: row.testemunhas?.testemunha3 ?? undefined,

    documentoStoragePath: row.documento_storage_path ?? undefined,
    documentoUrl: row.documento_url ?? undefined,

    assinaturas: [], // carregadas separadamente (signatures endpoint / merge em GET /api/contracts)
  };
}

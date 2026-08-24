export type ContractType = 'venda_vista' | 'venda_parcelada' | 'exclusividade';
export type ContractSubtype = 'imovel' | 'outros_bens';

export interface VehicleOrGoodsDetails {
  tipoBem?: 'veiculo' | 'moto' | 'carro' | 'caminhao' | 'embarcacao' | 'maquinario' | 'eletronico' | 'outro';
  descricao: string;
  marca?: string;
  modelo?: string;
  anoFabricacao?: string;
  anoModelo?: string;
  cor?: string;
  placa?: string;
  chassi?: string;
  renavam?: string;
  numeroSerie?: string;
  quilometragemOuUso?: string;
  estadoConservacao?: string;
  acessoriosInclusos?: string;
  documentacaoSituacao?: string;
}

export interface PartyDetailedInfo {
  nome: string;
  genero?: string;
  nacionalidade: string;
  estadoCivil: string;
  rg: string;
  rgOrgao: string;
  cpfCnpj: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  telefone: string;
  telefone2?: string;
  email?: string;
  creci?: string;
  conjuge?: {
    nome: string;
    cpf: string;
    rg: string;
  };
}

export interface PropertyDetails {
  nomeEmpreendimento: string;
  localizacaoImovel: string;
  cidadeImovel: string;
  ufImovel: string;
  numeroLote: string;
  numeroQuadra: string;
  enderecoLote: string;
  metragemFrente: string;
  metragemLateralDireita: string;
  metragemLateralEsquerda: string;
  metragemFundos: string;
  areaTotalM2: string;
  tipoImovel?: string;
  documentoPropriedade?: string;
  matricula?: string;
  inscricaoPrefeitura?: string;
  outrosDadosImovel?: string;
}

export interface InstallmentPlan {
  numero: number;
  valor: number;
  dataVencimento: string;
}

export interface DigitalSignature {
  role: 'vendedor' | 'comprador' | 'comprador_adicional' | 'ambos' | 'testemunha1' | 'testemunha2' | string;
  signerIndex?: number;
  nomeSignatario: string;
  documentoSignatario: string;
  assinaturaDataUrl: string;
  assinadoEm: string; // ISO string
  hashAutenticacao: string;
  ipAssinatura?: string;
  metadadosNavegador: string;
}

export interface ContractData {
  id: string;
  tipo: ContractType;
  subcategoria?: ContractSubtype;
  titulo: string;
  numeroContrato: string;
  dataCriacao: string;
  
  // Foro
  cidadeForo: string;
  ufForo: string;

  // Assinatura / Data do Contrato
  cidadeAssinatura: string;
  ufAssinatura: string;
  diaAssinatura?: string;
  mesExtensoAssinatura?: string;
  anoAssinatura?: string;

  // Partes Detalhadas (Promitente Vendedor e Promitente Comprador)
  vendedor: PartyDetailedInfo;
  comprador: PartyDetailedInfo;
  temMaisCompradores?: boolean;
  compradoresAdicionais?: PartyDetailedInfo[];

  // Dados do Imóvel (se for imóvel / lote / terreno)
  imovel?: PropertyDetails;

  // Dados de Veículos ou Outros Bens Móveis
  bemOutros?: VehicleOrGoodsDetails;

  // Objeto Geral do Contrato (para bens diversos, veículos ou descrição livre)
  objetoDescricao?: string;
  objetoIdentificacao?: string;
  objetoEstadoConservacao?: string;

  // Condições Financeiras Gerais
  valorTotal: number;
  valorTotalExtenso?: string;
  
  // Específico Venda à Vista
  vendaVista?: {
    formaPagamento: 'PIX' | 'TED/DOC' | 'Dinheiro' | 'Cheque' | 'Transferência Bancária' | 'Boleto Bancário' | 'Financiamento Imobiliário' | 'Permuta / Dação' | 'Cartão' | 'Outro' | string;
    formaPagamentoPersonalizada?: string;
    dadosBancariosRecebedor?: string;
    detalhesPagamento?: string;
    dataQuitacao: string;
    prazoEntregaPosse: string;
  };

  // Específico Venda Parcelada
  vendaParcelada?: {
    valorEntrada: number;
    formaPagamentoEntrada: string;
    formaPagamentoEntradaPersonalizada?: string;
    dataEntrada: string;
    numeroParcelas: number;
    valorParcela: number;
    periodicidade: 'Mensal' | 'Quinzenal' | 'Semanal' | 'Bimestral';
    dataPrimeiroVencimento: string;
    formaPagamentoParcelas: 'Boleto Bancário' | 'PIX Recorrente' | 'Transferência' | 'Cheques Pré-datados' | 'Promissórias' | 'Financiamento Bancário' | 'Cartão Recorrente' | 'Outro' | string;
    formaPagamentoParcelasPersonalizada?: string;
    detalhesPagamento?: string;
    multaAtrasoPercentual: number; // Ex: 2%
    jurosMoraMensalPercentual: number; // Ex: 1%
    clausulaReservaDominio: boolean;
    parcelas?: InstallmentPlan[];
  };

  // Específico Exclusividade
  exclusividade?: {
    tipoExclusividade: 'Venda de Imóvel' | 'Representação Comercial' | 'Prestação de Serviços' | 'Venda de Veículo/Bem';
    dataInicio: string;
    dataTermino: string;
    prazoMesesOuDias: number;
    unidadePrazo: 'dias' | 'meses';
    percentualComissao: number;
    percentualComissaoExtenso?: string;
    valorComissaoEstimado?: number;
    multaRescisaoOuQuebra: number;
    renovacaoAutomatica: boolean;
    autorizaDivulgacaoPlacasRedes: boolean;
    condicoesPagamento?: string;
    documentoPropriedade?: string;
    matricula?: string;
    inscricaoPrefeitura?: string;
    outrosDadosImovel?: string;
  };

  // Cláusulas Adicionais Personalizadas
  clausulasExtras?: string;

  // Modalidade de Finalização / Assinatura do Contrato
  modalidadeAssinatura?: 'digital' | 'manual';

  // Variante de exclusividade (com ou sem cônjuge)
  varianteExclusividade?: 'normal' | 'sem_conjuge';

  // Testemunhas (utilizadas na modalidade manual: 1, 2 e 3)
  testemunha1?: { nome: string; cpf: string; rg: string };
  testemunha2?: { nome: string; cpf: string; rg: string };
  testemunha3?: { nome: string; cpf: string; rg: string };

  // Assinaturas Digitais
  assinaturas: DigitalSignature[];
  status: 'rascunho' | 'assinado_parcial' | 'assinado_total';

  // URL pública do documento (.docx) salvo no Supabase Storage
  // (preenchida após o upload feito em contractDocumentsStorage.ts)
  documentoUrl?: string;

  // Configuração de Blocos do Contrato (para exclusividade e outros)
  blockConfig?: Record<string, boolean>;
}

export interface ContractFilter {
  tipo?: ContractType | 'todos';
  statusExclusividade?: 'todos' | 'ativo' | 'alerta' | 'vencido';
  termoBusca?: string;
}

// Mapeamento de Tags do Sistema para o Modelo à Vista
export interface ContractTagsMapping {
  [key: string]: string | undefined;
  // 1. VENDEDOR
  vendedor_nome: string;
  vendedor_nacionalidade: string;
  vendedor_estado_civil: string;
  vendedor_rg: string;
  vendedor_rg_orgao: string;
  vendedor_cpf_cnpj: string;
  vendedor_endereco: string;
  vendedor_numero: string;
  vendedor_bairro: string;
  vendedor_cep: string;
  vendedor_cidade: string;
  vendedor_uf: string;
  vendedor_telefone: string;

  // 2. COMPRADOR
  comprador_nome: string;
  comprador_nacionalidade: string;
  comprador_estado_civil: string;
  comprador_rg: string;
  comprador_rg_orgao: string;
  comprador_cpf: string;
  comprador_endereco: string;
  comprador_numero: string;
  comprador_bairro: string;
  comprador_cep: string;
  comprador_cidade: string;
  comprador_uf: string;
  comprador_telefone: string;

  // 3. IMÓVEL
  nome_empreendimento: string;
  localizacao_imovel: string;
  cidade_imovel: string;
  uf_imovel: string;
  numero_lote: string;
  numero_quadra: string;
  endereco_lote: string;
  metragem_frente: string;
  metragem_lateral_direita: string;
  metragem_lateral_esquerda: string;
  metragem_fundos: string;
  area_total_m2: string;

  // 4. VALOR
  valor_total: string;
  valor_total_extenso: string;

  // 5. FORO
  cidade_foro: string;
  uf_foro: string;

  // 6. DATA DE ASSINATURA
  cidade_assinatura: string;
  uf_assinatura: string;
  dia: string;
  mes_extenso: string;
  ano: string;
}

// Mapeamento de Tags Padronizadas { } do Contrato Parcelado
export interface ContractParceladoTagsMapping {
  [key: string]: string | undefined;
  // VENDEDOR
  artigo_vendedor: string;
  tratamento_vendedor: string;
  vendedor: string;
  nacionalidade_vendedor: string;
  estado_civil_vendedor: string;
  rg_vendedor: string;
  emissao_rg_vendedor: string;
  cpf_vendedor: string;
  concordancia_vendedor: string;
  endereco_vendedor: string;
  numero_vendedor: string;
  bairro_vendedor: string;
  cidade_vendedor: string;
  estado_vendedor: string;

  // COMPRADOR
  artigo_comprador: string;
  tratamento_comprador: string;
  comprador: string;
  nacionalidade_comprador: string;
  estado_civil_comprador: string;
  rg_comprador: string;
  emissao_rg_comprador: string;
  cpf_comprador: string;
  telefone_comprador: string;
  concordancia_comprador: string;
  endereco_comprador: string;
  numero_comprador: string;
  bairro_comprador: string;
  cep_comprador: string;
  cidade_comprador: string;
  estado_comprador: string;

  // IMÓVEL
  quantidade_terreno: string;
  localidade: string;
  empreendimento: string;
  lote: string;
  quadra: string;
  rua_do_lote: string;
  frente: string;
  lateral_direita: string;
  lateral_esquerda: string;
  fundos: string;
  area_total: string;

  // VALORES E PAGAMENTO
  valor_total: string;
  entrada: string;
  restante: string;
  quantidade_parcelas: string;
  modo_pagamento: string;
  valor_parcela: string;
  data_vencimento: string;
  data_primeira_parcela: string;

  // DATA
  dia: string;
  mes_extenso: string;
  ano: string;

  // TERMOS AUTOMÁTICOS
  vendedor_termo: string;
  comprador_termo: string;
  genero_vendedor: string;
  genero_comprador: string;
  genero_vendedor_3: string;
  genero_comprador_3: string;
  genero_vendedor_4: string;
  preposicao_comprador: string;

  // FORO E ASSINATURA
  cidade_foro: string;
  uf_foro: string;
  cidade_assinatura: string;
  uf_assinatura: string;
}

// Mapeamento de Tags Padronizadas {{ }} do Contrato de Exclusividade
export interface ContractExclusividadeTagsMapping {
  [key: string]: string | undefined;
  // DADOS DO CONTRATANTE
  CONTRATANTE_NOME: string;
  CONTRATANTE_ESTADO_CIVIL: string;
  CONTRATANTE_CPF: string;
  CONTRATANTE_RG: string;
  CONJUGE_NOME: string;
  CONJUGE_CPF: string;
  CONJUGE_RG: string;
  CONTRATANTE_ENDERECO: string;

  // DADOS DO CONTRATADO
  VENDEDOR_NOME: string;
  VENDEDOR_CPF: string;
  VENDEDOR_CRECI: string;
  VENDEDOR_ENDERECO: string;
  VENDEDOR_TELEFONE: string;

  // DADOS DO IMÓVEL
  TIPO_IMOVEL: string;
  LOCALIZACAO_IMOVEL: string;
  DOCUMENTO_PROPRIEDADE: string;
  MATRICULA: string;
  INSCRICAO_PREFEITURA: string;
  OUTROS_DADOS_IMOVEL: string;

  // DADOS DA VENDA
  VALOR_TOTAL: string;
  VALOR_TOTAL_EXTENSO: string;
  CONDICOES_PAGAMENTO: string;

  // DADOS DA CORRETAGEM
  PERCENTUAL_CORRETAGEM: string;
  PERCENTUAL_CORRETAGEM_EXTENSO: string;

  // DADOS DA EXCLUSIVIDADE
  PRAZO_EXCLUSIVIDADE_DIAS: string;
  DATA_TERMINO_EXCLUSIVIDADE: string;

  // DADOS DO FORO
  FORO_COMARCA: string;

  // DATA DA ASSINATURA
  CIDADE_ASSINATURA: string;
  ESTADO_ASSINATURA: string;
  DIA: string;
  MES_EXTENSO: string;
  ANO: string;
}

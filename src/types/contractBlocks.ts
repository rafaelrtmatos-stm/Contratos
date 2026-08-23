/**
 * Definições de blocos/seções para contratos
 */

export type ContractBlockKey = 
  // Partes
  | 'dados_contratante'
  | 'dados_conjuge'
  | 'dados_corretor'
  | 'dados_terceiros'
  
  // Imóvel
  | 'dados_imovel'
  | 'documentacao_imovel'
  
  // Condições Financeiras
  | 'preco_condicoes'
  | 'comissao_corretagem'
  
  // Autorizações
  | 'autorizacao_visitas'
  | 'autorizacao_divulgacao'
  | 'clausula_exclusividade'
  
  // Parcerias
  | 'parceria_corretores'
  | 'protecao_interessados'
  
  // Legais
  | 'prazo_contrato'
  | 'rescisao'
  | 'foro'
  | 'assinaturas';

export interface ContractBlock {
  id: ContractBlockKey;
  titulo: string;
  descricao: string;
  categoria: 'partes' | 'imovel' | 'financeiro' | 'autorizacoes' | 'parceria' | 'legal';
  ativo: boolean;
  obrigatorio?: boolean; // Alguns blocos não podem ser desmarcados
}

export type ContractBlocksConfig = Record<ContractBlockKey, boolean>;

export const DEFAULT_EXCLUSIVIDADE_BLOCKS: ContractBlocksConfig = {
  // Partes - obrigatório
  dados_contratante: true,
  dados_conjuge: false,
  dados_corretor: true,
  dados_terceiros: false,
  
  // Imóvel - obrigatório
  dados_imovel: true,
  documentacao_imovel: true,
  
  // Financeiro
  preco_condicoes: false,
  comissao_corretagem: true,
  
  // Autorizações
  autorizacao_visitas: true,
  autorizacao_divulgacao: true,
  clausula_exclusividade: true,
  
  // Parceria
  parceria_corretores: false,
  protecao_interessados: true,
  
  // Legal
  prazo_contrato: true,
  rescisao: true,
  foro: true,
  assinaturas: true,
};

export const CONTRACT_BLOCKS_CATALOG: Record<ContractBlockKey, ContractBlock> = {
  // ===================== PARTES =====================
  dados_contratante: {
    id: 'dados_contratante',
    titulo: 'Dados do Contratante',
    descricao: 'Nome completo, CPF, RG, endereço e contatos do proprietário do imóvel',
    categoria: 'partes',
    ativo: true,
    obrigatorio: true,
  },
  dados_conjuge: {
    id: 'dados_conjuge',
    titulo: 'Dados do Cônjuge',
    descricao: 'Informações do cônjuge caso o proprietário seja casado',
    categoria: 'partes',
    ativo: false,
  },
  dados_corretor: {
    id: 'dados_corretor',
    titulo: 'Dados do Corretor/Contratado',
    descricao: 'CRECI, empresa, telefone e e-mail do corretor responsável',
    categoria: 'partes',
    ativo: true,
    obrigatorio: true,
  },
  dados_terceiros: {
    id: 'dados_terceiros',
    titulo: 'Dados de Terceiros',
    descricao: 'Informações adicionais de outras partes envolvidas',
    categoria: 'partes',
    ativo: false,
  },

  // ===================== IMÓVEL =====================
  dados_imovel: {
    id: 'dados_imovel',
    titulo: 'Dados do Imóvel',
    descricao: 'Endereço completo, metragem, características do imóvel',
    categoria: 'imovel',
    ativo: true,
    obrigatorio: true,
  },
  documentacao_imovel: {
    id: 'documentacao_imovel',
    titulo: 'Documentação do Imóvel',
    descricao: 'Referências de matrícula, IPTU, certidões e documentação legal',
    categoria: 'imovel',
    ativo: true,
    obrigatorio: true,
  },

  // ===================== FINANCEIRO =====================
  preco_condicoes: {
    id: 'preco_condicoes',
    titulo: 'Preço e Condições de Pagamento',
    descricao: 'Valor de venda, forma de pagamento e cronograma',
    categoria: 'financeiro',
    ativo: false,
  },
  comissao_corretagem: {
    id: 'comissao_corretagem',
    titulo: 'Comissão de Corretagem',
    descricao: 'Percentual e forma de pagamento da comissão do corretor',
    categoria: 'financeiro',
    ativo: true,
  },

  // ===================== AUTORIZAÇÕES =====================
  autorizacao_visitas: {
    id: 'autorizacao_visitas',
    titulo: 'Autorização para Visitas',
    descricao: 'Permissão para que terceiros visitem o imóvel',
    categoria: 'autorizacoes',
    ativo: true,
  },
  autorizacao_divulgacao: {
    id: 'autorizacao_divulgacao',
    titulo: 'Autorização para Divulgação',
    descricao: 'Permissão para publicar o imóvel em portais, redes sociais, etc',
    categoria: 'autorizacoes',
    ativo: true,
  },
  clausula_exclusividade: {
    id: 'clausula_exclusividade',
    titulo: 'Cláusula de Exclusividade',
    descricao: 'Contrato exclusivo com um único corretor/imobiliária',
    categoria: 'autorizacoes',
    ativo: true,
    obrigatorio: true,
  },

  // ===================== PARCERIA =====================
  parceria_corretores: {
    id: 'parceria_corretores',
    titulo: 'Parceria com Outros Corretores',
    descricao: 'Condições para rede de cooperação entre corretores',
    categoria: 'parceria',
    ativo: false,
  },
  protecao_interessados: {
    id: 'protecao_interessados',
    titulo: 'Proteção de Interessados',
    descricao: 'Cláusulas de proteção para pessoas que demonstrem interesse na compra',
    categoria: 'parceria',
    ativo: true,
  },

  // ===================== LEGAL =====================
  prazo_contrato: {
    id: 'prazo_contrato',
    titulo: 'Prazo do Contrato',
    descricao: 'Data de início e término da exclusividade',
    categoria: 'legal',
    ativo: true,
  },
  rescisao: {
    id: 'rescisao',
    titulo: 'Rescisão',
    descricao: 'Condições e multas para rescisão antecipada',
    categoria: 'legal',
    ativo: true,
  },
  foro: {
    id: 'foro',
    titulo: 'Foro',
    descricao: 'Comarca e foro competente para resolver disputas',
    categoria: 'legal',
    ativo: true,
  },
  assinaturas: {
    id: 'assinaturas',
    titulo: 'Assinaturas',
    descricao: 'Espaço para assinatura digital ou manuscrita das partes',
    categoria: 'legal',
    ativo: true,
    obrigatorio: true,
  },
};

export const BLOCK_CATEGORIES = {
  partes: '👥 Partes do Contrato',
  imovel: '🏠 Dados do Imóvel',
  financeiro: '💰 Condições Financeiras',
  autorizacoes: '✅ Autorizações',
  parceria: '🤝 Parceria e Proteção',
  legal: '⚖️ Disposições Legais',
};

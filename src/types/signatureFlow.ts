/**
 * Estado de assinatura de um contrato
 */
export type SignatureModalidade = 'digital' | 'manual' | null;

export interface SignatureState {
  // Usuário (pessoa que vende/intermedia)
  usuarioAssinou: boolean;
  usuarioModalidade: SignatureModalidade;
  usuarioAssinaturaDigitalUrl?: string; // URL do selo digital (após assinado)

  // Comprador/Contratante (segunda parte)
  compradorAssinou: boolean;
  compradorModalidade: SignatureModalidade;
  compradorAssinaturaDigitalUrl?: string;

  // Testemunhas (se necessário)
  testemunhaprecisa: boolean; // True se alguém vai assinar manual
  testemunhasAssinadas?: boolean;
}

/**
 * Ação do usuário que dispara seleção de template
 */
export type DownloadAction =
  | 'download_antes_assinar' // Baixar antes de qualquer assinatura
  | 'gerar_link_digital' // Gerar link para assinatura digital do comprador
  | 'download_depois_assinar'; // Baixar depois de ter assinado

/**
 * Tipo de contrato (define qual variação de template)
 */
export type TipoContrato =
  | 'venda_vista'
  | 'venda_parcelada'
  | 'exclusividade'
  | 'locacao';

/**
 * Variante de contrato (para exclusividade com/sem cônjuge)
 */
export type VarianteContrato = 'normal' | 'sem_conjuge';

/**
 * Mapa de qual template usar
 */
export interface TemplateSelection {
  tipo: TipoContrato;
  variante?: VarianteContrato;
  arquivo: string; // Nome do arquivo .docx no storage
  testemunhas: boolean;
  tagsAssinatura: string[]; // Tags de assinatura que existem neste template
}

/**
 * Resultado da resolução de template
 */
export interface TemplateResolved {
  arquivo: string;
  testemunhas: boolean;
  tagsAssinatura: string[];
  motivacao?: string; // Por que este template foi escolhido
}

/**
 * Interface para processar tags de assinatura
 */
export interface AssinaturaTag {
  tag: string;
  tipo: 'digital' | 'manual';
  parte: 'usuario' | 'comprador';
  processado: boolean;
  seloDgitalUrl?: string; // Se digital, URL do selo após processado
}

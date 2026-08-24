import {
  TipoContrato,
  VarianteContrato,
  DownloadAction,
  SignatureState,
  TemplateResolved,
} from '../types/signatureFlow';

/**
 * Mapa de templates disponíveis
 * Chave: tipo_contrato_variacao_modalidade
 */
const TEMPLATES: Record<string, TemplateResolved> = {
  // VENDA À VISTA
  'venda_vista_digital': {
    arquivo: 'venda_vista_assinatura_digital.docx',
    testemunhas: false,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}', '{{COMPRADOR_ASSINATURA_DIGITAL}}'],
  },
  'venda_vista_manual': {
    arquivo: 'venda_vista_assinatura_manual_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_MANUAL}}', '{{COMPRADOR_ASSINATURA_MANUAL}}'],
  },
  'venda_vista_mista': {
    arquivo: 'venda_vista_mista_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}', '{{COMPRADOR_ASSINATURA_MANUAL}}'],
  },

  // VENDA PARCELADA
  'venda_parcelada_digital': {
    arquivo: 'parcelado_assinatura_digital_sem_testemunhas.docx',
    testemunhas: false,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}', '{{COMPRADOR_ASSINATURA_DIGITAL}}'],
  },
  'venda_parcelada_manual': {
    arquivo: 'parcelado_ambos_manuais_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_MANUAL}}', '{{COMPRADOR_ASSINATURA_MANUAL}}'],
  },
  'venda_parcelada_mista': {
    arquivo: 'parcelado_usuario_digital_comprador_manual_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}', '{{COMPRADOR_ASSINATURA_MANUAL}}'],
  },

  // EXCLUSIVIDADE
  'exclusividade_digital': {
    arquivo: 'exclusividade_digital_sem_testemunhas.docx',
    testemunhas: false,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}'],
  },
  'exclusividade_mista': {
    arquivo: 'exclusividade_usuario_digital_contratante_manual_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}', '{{CONTRATANTE_ASSINATURA_MANUAL}}'],
  },
  // Totalmente manual (nenhuma das partes assina digitalmente): só linhas,
  // nome e CPF de cada parte + testemunhas. Arquivo já existia no bucket,
  // mas nunca era referenciado aqui - por isso o download "manual" sempre
  // caía no template misto (com o aviso de assinatura eletrônica pendente).
  'exclusividade_manual': {
    arquivo: 'exclusividade_ambos_manuais_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: [],
  },
  // "sem_conjuge_mista" precisa ser um arquivo MISTO (um digital, um
  // manual) - a lógica de determinarModalidade() pra exclusividade nunca
  // escolhe "totalmente manual", então nunca aponte esta chave pro
  // arquivo "ambos_manuais". Arquivo dedicado voltou a existir no bucket.
  'exclusividade_sem_conjuge_mista': {
    arquivo: 'exclusividade_sem_conjuge_mista_2_testemunhas.docx',
    testemunhas: true,
    tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}'],
  },
};

/**
 * Regra de ouro: Se qualquer parte assinar manual → precisa testemunhas
 */
function precisaDeTestemunhas(state: SignatureState): boolean {
  return (
    state.usuarioModalidade === 'manual' ||
    state.compradorModalidade === 'manual'
  );
}

/**
 * Determina qual modalidade escolher baseado no estado
 * Retorna: 'digital' | 'manual' | 'mista'
 */
function determinarModalidade(
  state: SignatureState,
  tipo: TipoContrato
): 'digital' | 'manual' | 'mista' {
  // Exclusividade: sempre usuario digital, contratante manual/digital
  if (tipo === 'exclusividade') {
    if (state.usuarioModalidade === 'digital') {
      if (state.compradorModalidade === 'manual' || !state.compradorModalidade) {
        return 'mista';
      }
      return 'digital';
    }
    // usuarioModalidade === 'manual': se o contratante também é manual (ou
    // ainda não definido), o contrato é totalmente manual - só linhas,
    // nome e CPF de cada parte. Antes disso sempre caía em 'mista' aqui,
    // usando por engano o template com o selo/pendência digital do usuário.
    if (state.compradorModalidade === 'manual' || !state.compradorModalidade) {
      return 'manual';
    }
    return 'mista'; // Corretor manual + contratante digital (caso raro)
  }

  // Venda (à vista ou parcelada)
  const ambosDigital =
    state.usuarioModalidade === 'digital' &&
    state.compradorModalidade === 'digital';

  const ambosManual =
    state.usuarioModalidade === 'manual' &&
    state.compradorModalidade === 'manual';

  const mista = !(ambosDigital || ambosManual);

  if (ambosDigital) return 'digital';
  if (ambosManual) return 'manual';
  return 'mista';
}

/**
 * Resolve qual template usar baseado na ação do usuário
 *
 * @param tipo Tipo do contrato (venda_vista, venda_parcelada, exclusividade)
 * @param acao Ação do usuário (download_antes, gerar_link, download_depois)
 * @param state Estado de assinatura (quem assinou, como, etc)
 * @param variante Para exclusividade: normal ou sem_conjuge
 * @returns Template a ser usado
 */
export function resolveTemplate(
  tipo: TipoContrato,
  acao: DownloadAction,
  state: SignatureState,
  variante?: VarianteContrato
): TemplateResolved {
  /**
   * REGRA 1: Baixar ANTES de assinar nada
   * → Assume o pior caso (manual) → COM testemunhas
   */
  if (acao === 'download_antes_assinar') {
    if (tipo === 'exclusividade') {
      const key = variante === 'sem_conjuge' 
        ? 'exclusividade_sem_conjuge_mista'
        : 'exclusividade_mista';
      return {
        ...TEMPLATES[key],
        motivacao: 'Baixar antes de assinar - assume modalidade manual (pior caso)',
      };
    }
    const key = `${tipo}_mista`;
    return {
      ...TEMPLATES[key],
      motivacao: 'Baixar antes de assinar - assume modalidade manual (pior caso)',
    };
  }

  /**
   * REGRA 2: Gerar link para assinatura 100% digital
   * → Ambos vão assinar digitalmente
   */
  if (acao === 'gerar_link_digital') {
    const key = `${tipo}_digital`;
    return {
      ...TEMPLATES[key],
      motivacao: 'Link de assinatura 100% digital - ambos digital, sem testemunhas',
    };
  }

  /**
   * REGRA 3: Baixar DEPOIS de já ter assinado
   * → Decide baseado em quem já assinou e como
   */
  if (acao === 'download_depois_assinar') {
    // Se ambos já assinaram digitalmente
    if (state.usuarioAssinou && state.compradorAssinou) {
      if (
        state.usuarioModalidade === 'digital' &&
        state.compradorModalidade === 'digital'
      ) {
        const key = `${tipo}_digital`;
        return {
          ...TEMPLATES[key],
          motivacao: 'Ambos assinaram digitalmente - sem testemunhas',
        };
      }
    }

    // Caso geral: verifica se precisa testemunhas
    const modalidade = determinarModalidade(state, tipo);
    let key = variante === 'sem_conjuge' && tipo === 'exclusividade'
      ? `exclusividade_sem_conjuge_${modalidade}`
      : `${tipo}_${modalidade}`;

    // "sem_conjuge" não tem arquivo dedicado pra modalidade 'manual' (só
    // pra 'mista') - cai no template manual genérico da exclusividade,
    // que não depende de cláusula de cônjuge.
    if (!TEMPLATES[key]) {
      key = `exclusividade_${modalidade}`;
    }

    return {
      ...TEMPLATES[key],
      motivacao: `Depois de assinar - modalidade: ${modalidade}${precisaDeTestemunhas(state) ? ' - COM testemunhas' : ' - SEM testemunhas'}`,
    };
  }

  // Fallback
  throw new Error(
    `Combinação inválida: tipo=${tipo}, acao=${acao}, variante=${variante}`
  );
}

/**
 * Verifica se um template específico precisa de testemunhas
 */
export function templatePrecisaTestemunhas(arquivo: string): boolean {
  return arquivo.includes('testemunhas') || arquivo.includes('manual');
}

/**
 * Obtém todas as tags de assinatura de um template
 */
export function getAssinaturaTags(arquivo: string): string[] {
  const template = Object.values(TEMPLATES).find(
    (t) => t.arquivo === arquivo
  );
  return template?.tagsAssinatura || [];
}

/**
 * Mapa de templates por tipo e modalidade (para referência)
 */
export const TEMPLATE_MAP = {
  venda_vista: {
    digital: TEMPLATES['venda_vista_digital'],
    manual: TEMPLATES['venda_vista_manual'],
    mista: TEMPLATES['venda_vista_mista'],
  },
  venda_parcelada: {
    digital: TEMPLATES['venda_parcelada_digital'],
    manual: TEMPLATES['venda_parcelada_manual'],
    mista: TEMPLATES['venda_parcelada_mista'],
  },
  exclusividade: {
    digital: TEMPLATES['exclusividade_digital'],
    manual: TEMPLATES['exclusividade_manual'],
    mista: TEMPLATES['exclusividade_mista'],
    sem_conjuge_mista: TEMPLATES['exclusividade_sem_conjuge_mista'],
  },
};

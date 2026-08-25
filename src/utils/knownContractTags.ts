/**
 * Lista de referência de todas as tags que o sistema sabe preencher
 * automaticamente (usada só para orientar o corretor no assistente de
 * importação de modelo — "Verificar Tags"). Não é usada na geração real
 * do contrato (isso é feito por dataTagsProcessor.ts); serve apenas para
 * dizer se uma tag encontrada no .docx enviado é conhecida ou não.
 */

export const SIGNATURE_TAGS: Record<string, string> = {
  USUARIO_ASSINATURA_DIGITAL: 'Selo de assinatura digital do corretor (não mexer)',
  COMPRADOR_ASSINATURA_DIGITAL: 'Selo de assinatura digital do comprador/cliente (não mexer)',
  COMPRADOR_ASSINATURA_MANUAL: 'Linha de assinatura manual do comprador/cliente (não mexer)',
  CONTRATANTE_ASSINATURA_DIGITAL: 'Selo de assinatura digital do contratante (não mexer)',
  CONTRATANTE_ASSINATURA_MANUAL: 'Linha de assinatura manual do contratante (não mexer)',
};

export const KNOWN_CONTRACT_TAGS: Record<string, string> = {
  // Vendedor
  vendedor: 'Nome do vendedor',
  VENDEDOR: 'Nome do vendedor (maiúsculo)',
  cpf_vendedor: 'CPF/CNPJ do vendedor',
  rg_vendedor: 'RG do vendedor',
  emissao_rg_vendedor: 'Órgão emissor do RG do vendedor',
  nacionalidade_vendedor: 'Nacionalidade do vendedor',
  estado_civil_vendedor: 'Estado civil do vendedor',
  endereco_vendedor: 'Endereço do vendedor',
  numero_vendedor: 'Número do endereço do vendedor',
  bairro_vendedor: 'Bairro do vendedor',
  cep_vendedor: 'CEP do vendedor',
  cidade_vendedor: 'Cidade do vendedor',
  estado_vendedor: 'UF do vendedor',
  telefone_vendedor: 'Telefone do vendedor',
  artigo_vendedor: 'Artigo (O/A) referente ao vendedor',
  tratamento_vendedor: 'Tratamento (Sr./Sra.) do vendedor',
  chamado_vendedor: 'Concordância "chamado/chamada" do vendedor',
  domiciliado_vendedor: 'Concordância "domiciliado/domiciliada" do vendedor',
  portador_vendedor: 'Concordância "portador/portadora" do vendedor',
  possessivo_vendedor: 'Pronome possessivo (seu/sua) do vendedor',
  pronome_vendedor: 'Pronome pessoal (ele/ela) do vendedor',
  este_vendedor: 'Concordância "este/esta" do vendedor',
  de_vendedor: 'Concordância "do/da" do vendedor',
  ao_vendedor: 'Concordância "ao/à" do vendedor',
  NOME_PAPEL_VENDEDOR: 'Rótulo do papel contratual do vendedor (VENDEDOR/VENDEDORA)',

  // Comprador
  comprador: 'Nome do comprador',
  COMPRADOR: 'Nome do comprador (maiúsculo)',
  cpf_comprador: 'CPF/CNPJ do comprador',
  rg_comprador: 'RG do comprador',
  emissao_rg_comprador: 'Órgão emissor do RG do comprador',
  nacionalidade_comprador: 'Nacionalidade do comprador',
  estado_civil_comprador: 'Estado civil do comprador',
  endereco_comprador: 'Endereço do comprador',
  numero_comprador: 'Número do endereço do comprador',
  bairro_comprador: 'Bairro do comprador',
  cep_comprador: 'CEP do comprador',
  cidade_comprador: 'Cidade do comprador',
  estado_comprador: 'UF do comprador',
  telefone_comprador: 'Telefone do comprador',
  artigo_comprador: 'Artigo (O/A) referente ao comprador',
  tratamento_comprador: 'Tratamento (Sr./Sra.) do comprador',
  chamado_comprador: 'Concordância "chamado/chamada" do comprador',
  domiciliado_comprador: 'Concordância "domiciliado/domiciliada" do comprador',
  portador_comprador: 'Concordância "portador/portadora" do comprador',
  possessivo_comprador: 'Pronome possessivo (seu/sua) do comprador',
  pronome_comprador: 'Pronome pessoal (ele/ela) do comprador',
  este_comprador: 'Concordância "este/esta" do comprador',
  de_comprador: 'Concordância "do/da" do comprador',
  ao_comprador: 'Concordância "ao/à" do comprador',
  NOME_PAPEL_COMPRADOR: 'Rótulo do papel contratual do comprador (COMPRADOR/COMPRADORA)',

  // Imóvel
  empreendimento: 'Nome do empreendimento/loteamento',
  EMPREENDIMENTO: 'Nome do empreendimento/loteamento (maiúsculo)',
  lote: 'Número do lote',
  LOTE: 'Número do lote (maiúsculo)',
  quadra: 'Número da quadra',
  QUADRA: 'Número da quadra (maiúsculo)',
  localizacao_imovel: 'Localização do imóvel',
  cidade_imovel: 'Cidade do imóvel',
  estado_imovel: 'UF do imóvel',
  rua_do_lote: 'Endereço completo do lote',
  quantidade_terreno: 'Descrição padrão "01 (um) lote de terreno"',
  frente: 'Metragem de frente',
  fundos: 'Metragem de fundos',
  lateral_direita: 'Metragem lateral direita',
  lateral_esquerda: 'Metragem lateral esquerda',
  area_total: 'Área total (m²)',

  // Financeiro / Data
  valor_total: 'Valor total da negociação (formatado + por extenso)',
  valor_total_extenso: 'Valor total por extenso',
  dia: 'Dia da assinatura',
  mes_extenso: 'Mês da assinatura por extenso',
  ano: 'Ano da assinatura',
  cidade_assinatura: 'Cidade da assinatura',
  estado_assinatura: 'UF da assinatura',

  // Parcelamento (só contrato parcelado)
  entrada: 'Valor da entrada',
  restante: 'Saldo restante a parcelar',
  quantidade_parcelas: 'Quantidade de parcelas',
  modo_pagamento: 'Forma de cobrança das parcelas',
  valor_parcela: 'Valor de cada parcela',
  data_vencimento: 'Dia de vencimento mensal das parcelas',
  data_primeira_parcela: 'Data da primeira parcela',

  // Exclusividade
  contratante: 'Nome do contratante (proprietário)',
  estado_civil_contratante: 'Estado civil do contratante',
  cpf_contratante: 'CPF/CNPJ do contratante',
  rg_contratante: 'RG do contratante',
  endereco_contratante: 'Endereço do contratante',
  contratado: 'Nome do contratado (corretor)',
  cpf_contratado: 'CPF/CNPJ do contratado',
  creci_contratado: 'CRECI do contratado',
  endereco_contratado: 'Endereço do contratado',
  telefone_contratado: 'Telefone do contratado',
  tipo_imovel: 'Tipo do imóvel',
  documento_propriedade: 'Documento de propriedade',
  matricula: 'Número da matrícula',
  inscricao_prefeitura: 'Inscrição na prefeitura',
  outros_dados_imovel: 'Outros dados do imóvel',
  condicoes_pagamento: 'Condições de pagamento',
  percentual_corretagem: 'Percentual de corretagem',
  percentual_corretagem_extenso: 'Percentual de corretagem por extenso',
  prazo_exclusividade_dias: 'Prazo de exclusividade em dias',
  data_termino_exclusividade: 'Data de término da exclusividade',
};

/**
 * Extrai as tags {tag} e {{TAG}} de um texto (já sem marcação XML) e
 * devolve a lista de nomes únicos encontrados.
 */
export function extractTagsFromText(text: string): string[] {
  const matches = text.match(/\{\{?\s*[A-Za-z0-9_À-ÿ]+\s*\}?\}/g) || [];
  const clean = matches.map((m) => m.replace(/[{}]/g, '').trim());
  return Array.from(new Set(clean));
}

export function isKnownTag(tag: string): 'signature' | 'known' | 'unknown' {
  if (SIGNATURE_TAGS[tag] || tag.toUpperCase().includes('ASSINATURA')) return 'signature';
  if (KNOWN_CONTRACT_TAGS[tag]) return 'known';
  // Fallback: aceitar variações de caixa (ex: valor_total vs VALOR_TOTAL)
  const lower = tag.toLowerCase();
  const found = Object.keys(KNOWN_CONTRACT_TAGS).find((k) => k.toLowerCase() === lower);
  return found ? 'known' : 'unknown';
}

export function describeTag(tag: string): string {
  if (SIGNATURE_TAGS[tag]) return SIGNATURE_TAGS[tag];
  if (KNOWN_CONTRACT_TAGS[tag]) return KNOWN_CONTRACT_TAGS[tag];
  const lower = tag.toLowerCase();
  const foundKey = Object.keys(KNOWN_CONTRACT_TAGS).find((k) => k.toLowerCase() === lower);
  return foundKey ? KNOWN_CONTRACT_TAGS[foundKey] : 'Tag não reconhecida pelo sistema - não será preenchida';
}

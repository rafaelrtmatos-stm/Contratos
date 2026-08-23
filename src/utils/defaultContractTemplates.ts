/**
 * Templates padrão para os 3 tipos de contrato
 * Armazenados no localStorage ou banco para ser usado sempre
 * 
 * Estas são estruturas DOCX pré-compiladas em base64
 * que servem como modelos para substituição de tags
 */

export const DEFAULT_CONTRACT_TEMPLATES = {
  /**
   * VENDA À VISTA - Contém todas as tags para substituição automática
   */
  venda_vista: {
    // Template padrão em HTML que será convertido para DOCX
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Venda à Vista</title>
  <style>
    body { font-family: Times New Roman; line-height: 1.5; margin: 2cm; }
    h1 { text-align: center; font-size: 14pt; margin-bottom: 2cm; }
    h2 { font-size: 12pt; margin-top: 1cm; margin-bottom: 0.5cm; }
    p { text-align: justify; font-size: 11pt; margin-bottom: 0.5cm; }
    .divider { margin: 2cm 0; }
  </style>
</head>
<body>
  <h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL À VISTA</h1>

  <h2>1. PARTES CONTRATANTES</h2>
  <p><strong>VENDEDOR:</strong> {{VENDEDOR_NOME}}, nacionalidade {{NACIONALIDADE_VENDEDOR}}, estado civil {{ESTADO_CIVIL_VENDEDOR}}, profissão {{PROFISSAO_VENDEDOR}}, portador(a) do RG nº {{RG_VENDEDOR}} expedido por {{ORGAO_RG_VENDEDOR}}, inscrito(a) no CPF nº {{CPF_VENDEDOR}}, residente à {{ENDERECO_VENDEDOR}}, nº {{NUMERO_VENDEDOR}}, {{BAIRRO_VENDEDOR}}, {{CIDADE_VENDEDOR}}/{{UF_VENDEDOR}}, CEP {{CEP_VENDEDOR}}.</p>
  
  <p><strong>COMPRADOR:</strong> {{COMPRADOR_NOME}}, nacionalidade {{NACIONALIDADE_COMPRADOR}}, estado civil {{ESTADO_CIVIL_COMPRADOR}}, profissão {{PROFISSAO_COMPRADOR}}, portador(a) do RG nº {{RG_COMPRADOR}} expedido por {{ORGAO_RG_COMPRADOR}}, inscrito(a) no CPF nº {{CPF_COMPRADOR}}, residente à {{ENDERECO_COMPRADOR}}, nº {{NUMERO_COMPRADOR}}, {{BAIRRO_COMPRADOR}}, {{CIDADE_COMPRADOR}}/{{UF_COMPRADOR}}, CEP {{CEP_COMPRADOR}}.</p>

  <h2>2. DO OBJETO DO CONTRATO</h2>
  <p>O VENDEDOR é legítimo proprietário e possuidor do imóvel sito no empreendimento/loteamento <strong>{{EMPREENDIMENTO}}</strong>, localizado em {{CIDADE_IMOVEL}}/{{UF_IMOVEL}}, caracterizado como <strong>Lote nº {{LOTE}}</strong>, <strong>Quadra nº {{QUADRA}}</strong>, perfazendo a área total de <strong>{{AREA_TOTAL_M2}} m²</strong>.</p>

  <h2>3. DO PREÇO E CONDIÇÕES DE PAGAMENTO</h2>
  <p>O preço ajustado para a alienação é de <strong>{{VALOR_TOTAL}}</strong> ({{VALOR_TOTAL_EXTENSO}}), pago integralmente à vista através de {{CONDICOES_PAGAMENTO}}, na data da assinatura deste contrato, pelo qual o VENDEDOR dá plena, geral e irrevogável quitação.</p>

  <h2>4. DA POSSE E TRANSMISSÃO</h2>
  <p>A posse direta, mansa e pacífica do imóvel é transmitida ao COMPRADOR nesta data, livre e desembaraçado de quaisquer dúvidas, ônus reais, hipotecas ou gravames.</p>

  <h2>5. DAS DISPOSIÇÕES GERAIS</h2>
  <p>Este contrato é celebrado sob as leis brasileiras, sendo o foro competente o da Comarca de {{COMARCA}}/{{UF_FORO}}, expressamente eleito.</p>

  <p style="margin-top: 3cm; text-align: center;">{{CIDADE_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</p>

  <div style="margin-top: 2cm;">
    <p style="text-align: center; margin-top: 2cm;">_________________________________________<br>{{VENDEDOR_NOME}}<br>CPF: {{CPF_VENDEDOR}}</p>
    <p style="text-align: center; margin-top: 2cm;">_________________________________________<br>{{COMPRADOR_NOME}}<br>CPF: {{CPF_COMPRADOR}}</p>
  </div>
</body>
</html>
    `,
    description: 'Modelo padrão para Venda à Vista'
  },

  /**
   * VENDA PARCELADA - Contém tags específicas para parcelamento
   */
  venda_parcelada: {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Venda Parcelada</title>
  <style>
    body { font-family: Times New Roman; line-height: 1.5; margin: 2cm; }
    h1 { text-align: center; font-size: 14pt; margin-bottom: 2cm; }
    h2 { font-size: 12pt; margin-top: 1cm; margin-bottom: 0.5cm; }
    p { text-align: justify; font-size: 11pt; margin-bottom: 0.5cm; }
  </style>
</head>
<body>
  <h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA COM PARCELAMENTO E RESERVA DE DOMÍNIO</h1>

  <h2>1. PARTES CONTRATANTES</h2>
  <p><strong>VENDEDOR:</strong> {{VENDEDOR_NOME}}, CPF nº {{CPF_VENDEDOR}}, residente à {{ENDERECO_VENDEDOR}}, {{CIDADE_VENDEDOR}}/{{UF_VENDEDOR}}.</p>
  <p><strong>COMPRADOR:</strong> {{COMPRADOR_NOME}}, CPF nº {{CPF_COMPRADOR}}, residente à {{ENDERECO_COMPRADOR}}, {{CIDADE_COMPRADOR}}/{{UF_COMPRADOR}}.</p>

  <h2>2. DO OBJETO</h2>
  <p>Empreendimento/Loteamento: <strong>{{EMPREENDIMENTO}}</strong><br>
  Localização: {{CIDADE_IMOVEL}}/{{UF_IMOVEL}}<br>
  Lote nº: <strong>{{LOTE}}</strong> | Quadra nº: <strong>{{QUADRA}}</strong><br>
  Área Total: <strong>{{AREA_TOTAL_M2}} m²</strong></p>

  <h2>3. DO PREÇO E FORMA DE PAGAMENTO</h2>
  <p><strong>Valor Total:</strong> {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}})</p>
  <p><strong>Entrada:</strong> {{VALOR_ENTRADA}} - Forma de pagamento: {{FORMA_PAGAMENTO_ENTRADA}} - Data: {{DATA_ENTRADA}}</p>
  <p><strong>Saldo:</strong> {{SALDO_PARCELADO}}</p>
  <p><strong>Parcelamento:</strong> {{NUMERO_PARCELAS}} parcelas de {{VALOR_PARCELA}} {{PERIODICIDADE}} começando em {{DATA_PRIMEIRO_VENCIMENTO}}</p>
  <p><strong>Forma de Pagamento das Parcelas:</strong> {{FORMA_PAGAMENTO_PARCELAS}}</p>

  <h2>4. DAS PENALIDADES</h2>
  <p><strong>Multa por Atraso:</strong> {{MULTA_ATRASO}}% ao mês<br>
  <strong>Juros de Mora:</strong> {{JUROS_MORA}}% ao mês</p>

  <h2>5. DA CLÁUSULA DE RESERVA DE DOMÍNIO</h2>
  <p>O VENDEDOR permanece como proprietário do imóvel até o pagamento integral de todas as parcelas. Após o pagamento total, será feita a transferência de domínio ao COMPRADOR.</p>

  <h2>6. ASSINATURAS</h2>
  <p style="margin-top: 3cm; text-align: center;">{{CIDADE_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</p>
  <p style="text-align: center; margin-top: 2cm;">_________________________________________<br>{{VENDEDOR_NOME}}<br>CPF: {{CPF_VENDEDOR}}</p>
  <p style="text-align: center; margin-top: 2cm;">_________________________________________<br>{{COMPRADOR_NOME}}<br>CPF: {{CPF_COMPRADOR}}</p>
</body>
</html>
    `,
    description: 'Modelo padrão para Venda Parcelada'
  },

  /**
   * EXCLUSIVIDADE - Contém tags para intermediação imobiliária
   */
  exclusividade: {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Exclusividade</title>
  <style>
    body { font-family: Times New Roman; line-height: 1.5; margin: 2cm; }
    h1 { text-align: center; font-size: 14pt; margin-bottom: 2cm; }
    h2 { font-size: 12pt; margin-top: 1cm; margin-bottom: 0.5cm; }
    p { text-align: justify; font-size: 11pt; margin-bottom: 0.5cm; }
  </style>
</head>
<body>
  <h1>CONTRATO PARTICULAR DE INTERMEDIAÇÃO IMOBILIÁRIA EM REGIME DE EXCLUSIVIDADE</h1>

  <h2>1. CONTRATANTE (PROPRIETÁRIO)</h2>
  <p><strong>Nome:</strong> {{CONTRATANTE_NOME}}<br>
  <strong>CPF:</strong> {{CONTRATANTE_CPF}}<br>
  <strong>Endereço:</strong> {{ENDERECO_CONTRATANTE}}, {{CIDADE_CONTRATANTE}}/{{UF_CONTRATANTE}}</p>

  <h2>2. CONTRATADO (CORRETOR/IMOBILIÁRIA)</h2>
  <p><strong>Nome:</strong> {{CORRETOR_NOME}}<br>
  <strong>CRECI:</strong> {{CRECI}}<br>
  <strong>Empresa:</strong> {{EMPRESA_IMOBILIARIA}}<br>
  <strong>CNPJ:</strong> {{CNPJ_EMPRESA}}</p>

  <h2>3. DO IMÓVEL OBJETO DE INTERMEDIAÇÃO</h2>
  <p><strong>Empreendimento:</strong> {{EMPREENDIMENTO}}<br>
  <strong>Lote/Unidade:</strong> {{LOTE}} - Quadra {{QUADRA}}<br>
  <strong>Área:</strong> {{AREA_TOTAL_M2}} m²<br>
  <strong>Localização:</strong> {{CIDADE_IMOVEL}}/{{UF_IMOVEL}}</p>

  <h2>4. DA CLÁUSULA DE EXCLUSIVIDADE</h2>
  <p>O CONTRATANTE concede exclusividade ao CONTRATADO para intermediar a venda do imóvel acima descrito, vedando-se ao proprietário comercializar o imóvel durante o período de vigência deste contrato.</p>

  <h2>5. DO PRAZO</h2>
  <p><strong>Início:</strong> {{DATA_INICIO}}<br>
  <strong>Término:</strong> {{DATA_TERMINO}}<br>
  <strong>Prazo:</strong> {{PRAZO}} {{UNIDADE_PRAZO}}</p>

  <h2>6. DA COMISSÃO</h2>
  <p><strong>Percentual:</strong> {{PERCENTUAL_COMISSAO}}%<br>
  <strong>Base de Cálculo:</strong> Sobre o valor total de venda do imóvel</p>

  <h2>7. DA RESCISÃO</h2>
  <p><strong>Multa por Rescisão Antecipada:</strong> {{MULTA_RESCISAO}}% do valor estimado do imóvel</p>

  <h2>8. DAS AUTORIZAÇÕES</h2>
  <p>✓ Autorizo divulgação em portais imobiliários<br>
  ✓ Autorizo visitas de interessados<br>
  ✓ Autorizo publicação em redes sociais e placas</p>

  <h2>9. ASSINATURAS</h2>
  <p style="margin-top: 3cm; text-align: center;">{{CIDADE_ASSINATURA}}, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.</p>
  <p style="text-align: center; margin-top: 2cm;">_________________________________________<br>{{CONTRATANTE_NOME}}<br>CPF: {{CONTRATANTE_CPF}}</p>
  <p style="text-align: center; margin-top: 2cm;">_________________________________________<br>{{CORRETOR_NOME}}<br>CRECI: {{CRECI}}</p>
</body>
</html>
    `,
    description: 'Modelo padrão para Exclusividade'
  }
};

/**
 * Função para inicializar os templates padrão no localStorage
 * Deve ser chamada uma vez na primeira carga do app
 */
export function initializeDefaultTemplates() {
  const templates = ['venda_vista_imovel', 'venda_parcelada_imovel', 'exclusividade'];
  
  templates.forEach(templateKey => {
    const storageKey = `custom_word_template_meta_${templateKey}`;
    const existingMeta = localStorage.getItem(storageKey);
    
    // Só inicializa se não houver template customizado do usuário
    if (!existingMeta) {
      console.log(`Inicializando template padrão: ${templateKey}`);
      // Os templates serão gerados sob demanda em generateBaseDocxTemplate()
    }
  });
}

/**
 * Lista de tags OBRIGATÓRIAS por tipo de contrato
 * Usado para validação antes de gerar/salvar documento
 */
export const REQUIRED_TAGS_BY_TYPE = {
  venda_vista: [
    'VENDEDOR_NOME', 'CPF_VENDEDOR', 'ENDERECO_VENDEDOR', 'CIDADE_VENDEDOR',
    'COMPRADOR_NOME', 'CPF_COMPRADOR', 'ENDERECO_COMPRADOR', 'CIDADE_COMPRADOR',
    'EMPREENDIMENTO', 'LOTE', 'QUADRA', 'AREA_TOTAL_M2',
    'VALOR_TOTAL', 'VALOR_TOTAL_EXTENSO',
    'DATA_ASSINATURA', 'CIDADE_ASSINATURA'
  ],
  venda_parcelada: [
    'VENDEDOR_NOME', 'CPF_VENDEDOR',
    'COMPRADOR_NOME', 'CPF_COMPRADOR',
    'EMPREENDIMENTO', 'LOTE', 'QUADRA', 'AREA_TOTAL_M2',
    'VALOR_TOTAL', 'VALOR_ENTRADA', 'NUMERO_PARCELAS', 'VALOR_PARCELA',
    'MULTA_ATRASO', 'JUROS_MORA',
    'DATA_ASSINATURA'
  ],
  exclusividade: [
    'CONTRATANTE_NOME', 'CONTRATANTE_CPF',
    'CORRETOR_NOME', 'CRECI',
    'EMPREENDIMENTO', 'LOTE', 'AREA_TOTAL_M2',
    'DATA_INICIO', 'DATA_TERMINO', 'PRAZO',
    'PERCENTUAL_COMISSAO', 'MULTA_RESCISAO',
    'DATA_ASSINATURA'
  ]
};

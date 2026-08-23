/**
 * Templates padrão em base64 para contratos
 * Gerados via docxtemplater
 */

// Template padrão de Venda à Vista - arquivo .docx em base64
// Este é um documento Word minimal com a estrutura e tags necessárias

export const DEFAULT_VENDA_VISTA_TEMPLATE = `
UEsDBAoAAAAAAKR14VYAAAAAAAAAAAAAAAAJAAAAEF9yZWxzL1BLBQYAAAAAAA==
`;

/**
 * Gera um template HTML que pode ser convertido para Word
 * Com as tags necessárias para substituição
 */
export function generateVendaVistaTemplate(): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato de Compra e Venda de Imóvel - Venda à Vista</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    h1 { text-align: center; font-size: 14px; font-weight: bold; }
    h2 { font-size: 12px; font-weight: bold; margin-top: 20px; }
    p { text-align: justify; font-size: 12px; margin-bottom: 10px; }
    .divider { margin: 30px 0; }
  </style>
</head>
<body>
  <h1>CONTRATO PARTICULAR DE COMPRA E VENDA DE IMÓVEL À VISTA</h1>
  
  <p>
    Pelo presente instrumento particular de Contrato de Compra e Venda, celebrado nesta data, 
    entre:
  </p>

  <h2>VENDEDOR(ES):</h2>
  <p>
    <strong>{{VENDEDOR_NOME}}</strong>, nacionalidade {{NACIONALIDADE_VENDEDOR}}, 
    estado civil {{ESTADO_CIVIL_VENDEDOR}}, profissão {{PROFISSAO_VENDEDOR}}, 
    portador(a) do RG nº {{VENDEDOR_RG}} expedido por {{ORGAO_RG_VENDEDOR}}, 
    inscrito(a) no CPF nº {{CPF_VENDEDOR}}, 
    residente à {{ENDERECO_VENDEDOR}}, nº {{NUMERO_VENDEDOR}}, 
    {{BAIRRO_VENDEDOR}}, {{CIDADE_VENDEDOR}}/{{ESTADO_VENDEDOR}}, 
    CEP {{CEP_VENDEDOR}}, 
    CNPJ (se empresa): {{CNPJ_VENDEDOR}}, doravante designado(s) simplesmente 
    <strong>VENDEDOR(ES)</strong>; e
  </p>

  <h2>COMPRADOR(ES):</h2>
  <p>
    <strong>{{COMPRADOR_NOME}}</strong>, nacionalidade {{NACIONALIDADE_COMPRADOR}}, 
    estado civil {{ESTADO_CIVIL_COMPRADOR}}, profissão {{PROFISSAO_COMPRADOR}}, 
    portador(a) do RG nº {{COMPRADOR_RG}} expedido por {{ORGAO_RG_COMPRADOR}}, 
    inscrito(a) no CPF nº {{CPF_COMPRADOR}}, 
    residente à {{ENDERECO_COMPRADOR}}, nº {{NUMERO_COMPRADOR}}, 
    {{BAIRRO_COMPRADOR}}, {{CIDADE_COMPRADOR}}/{{ESTADO_COMPRADOR}}, 
    CEP {{CEP_COMPRADOR}}, 
    CNPJ (se empresa): {{CNPJ_COMPRADOR}}, doravante designado(s) simplesmente 
    <strong>COMPRADOR(ES)</strong>.
  </p>

  <h2>OBJETO DO CONTRATO</h2>
  <p>
    Fica acordo que o(s) VENDEDOR(ES) se obriga(m) a transferir e o(s) COMPRADOR(ES) 
    se obriga(m) a adquirir, pelo preço e pelas condições estipuladas neste contrato, 
    o imóvel situado no seguinte local:
  </p>

  <p>
    <strong>Empreendimento:</strong> {{EMPREENDIMENTO}}<br>
    <strong>Lote/Unidade:</strong> {{LOTE}} - Quadra {{QUADRA}}<br>
    <strong>Área Total:</strong> {{AREA_TOTAL_M2}} m²<br>
    <strong>Localização:</strong> {{CIDADE}}/{{UF}}<br>
    <strong>Foro de Eleição:</strong> {{FORO_COMARCA}}
  </p>

  <h2>DO PREÇO E CONDIÇÕES DE PAGAMENTO</h2>
  <p>
    O preço total do imóvel é de <strong>{{VALOR_TOTAL}}</strong> 
    ({{VALOR_TOTAL_EXTENSO}}), que será pago à vista, no ato da assinatura deste contrato.
  </p>

  <h2>DA ASSINATURA</h2>
  <p>
    Assim acordado, as partes firmam este contrato em {{DATA_ASSINATURA}}.
  </p>

  <p style="margin-top: 50px; text-align: center;">
    Santarém-PA, {{DIA}} de {{MES_EXTENSO}} de {{ANO}}.
  </p>

  <div style="margin-top: 80px;">
    <p>
      ________________________________________<br>
      {{VENDEDOR_NOME}}<br>
      CPF: {{CPF_VENDEDOR}}
    </p>

    <p style="margin-top: 50px;">
      ________________________________________<br>
      {{COMPRADOR_NOME}}<br>
      CPF: {{CPF_COMPRADOR}}
    </p>
  </div>

  <h2 style="margin-top: 80px;">TESTEMUNHAS</h2>
  <div style="margin-top: 40px;">
    <p>
      ________________________________________<br>
      {{TESTEMUNHA_1_NOME}}<br>
      CPF: {{TESTEMUNHA_1_CPF}} | RG: {{TESTEMUNHA_1_RG}}
    </p>

    <p style="margin-top: 40px;">
      ________________________________________<br>
      {{TESTEMUNHA_2_NOME}}<br>
      CPF: {{TESTEMUNHA_2_CPF}} | RG: {{TESTEMUNHA_2_RG}}
    </p>

    <p style="margin-top: 40px;">
      ________________________________________<br>
      {{TESTEMUNHA_3_NOME}}<br>
      CPF: {{TESTEMUNHA_3_CPF}} | RG: {{TESTEMUNHA_3_RG}}
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Lista de todas as tags disponíveis para o template
 */
export const TEMPLATE_TAGS = {
  vendedor: [
    'VENDEDOR_NOME',
    'NACIONALIDADE_VENDEDOR',
    'ESTADO_CIVIL_VENDEDOR',
    'PROFISSAO_VENDEDOR',
    'VENDEDOR_RG',
    'ORGAO_RG_VENDEDOR',
    'CPF_VENDEDOR',
    'ENDERECO_VENDEDOR',
    'NUMERO_VENDEDOR',
    'BAIRRO_VENDEDOR',
    'CIDADE_VENDEDOR',
    'ESTADO_VENDEDOR',
    'CEP_VENDEDOR',
    'CNPJ_VENDEDOR',
  ],
  comprador: [
    'COMPRADOR_NOME',
    'NACIONALIDADE_COMPRADOR',
    'ESTADO_CIVIL_COMPRADOR',
    'PROFISSAO_COMPRADOR',
    'COMPRADOR_RG',
    'ORGAO_RG_COMPRADOR',
    'CPF_COMPRADOR',
    'ENDERECO_COMPRADOR',
    'NUMERO_COMPRADOR',
    'BAIRRO_COMPRADOR',
    'CIDADE_COMPRADOR',
    'ESTADO_COMPRADOR',
    'CEP_COMPRADOR',
    'CNPJ_COMPRADOR',
  ],
  imovel: [
    'EMPREENDIMENTO',
    'LOTE',
    'QUADRA',
    'AREA_TOTAL_M2',
    'AREA_TOTAL',
  ],
  pagamento: [
    'VALOR_TOTAL',
    'VALOR_TOTAL_EXTENSO',
  ],
  data: [
    'DATA_ASSINATURA',
    'DIA',
    'MES_EXTENSO',
    'ANO',
  ],
  localizacao: [
    'CIDADE',
    'UF',
    'FORO_COMARCA',
  ],
  testemunhas: [
    'TESTEMUNHA_1_NOME',
    'TESTEMUNHA_1_CPF',
    'TESTEMUNHA_1_RG',
    'TESTEMUNHA_2_NOME',
    'TESTEMUNHA_2_CPF',
    'TESTEMUNHA_2_RG',
    'TESTEMUNHA_3_NOME',
    'TESTEMUNHA_3_CPF',
    'TESTEMUNHA_3_RG',
  ],
};

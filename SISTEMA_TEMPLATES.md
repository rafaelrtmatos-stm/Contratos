# Sistema de Geração de Documentos DOCX

## Como Funciona

O sistema utiliza **templates DOCX personalizados** que você envia. Cada template:
- ✅ Tem a formatação desejada (sua identidade visual)
- ✅ Contém **tags para substituição** (ex: `{{VENDEDOR_NOME}}`, `{{VALOR_TOTAL}}`)
- ✅ É salvo no sistema por tipo de contrato

Quando você gera um contrato:
1. Sistema busca o template do tipo (ex: `venda_vista_imovel`)
2. Substitui todas as tags `{{}}` pelos dados preenchidos no formulário
3. Gera o DOCX preenchido para download

---

## Tipos de Template

### VENDA À VISTA

```
venda_vista_assinatura_digital.docx
└─ Ambos assinam DIGITALMENTE (SEM testemunhas)

venda_vista_assinatura_manual_2_testemunhas.docx
└─ Ambos assinam MANUALMENTE (COM 2 testemunhas)

venda_vista_mista_2_testemunhas.docx
└─ Você digital + Pessoa manual (COM 2 testemunhas)
```

### VENDA PARCELADA

```
venda_parcelada_assinatura_digital.docx
└─ Ambos assinam DIGITALMENTE (SEM testemunhas)

venda_parcelada_assinatura_manual_2_testemunhas.docx
└─ Ambos assinam MANUALMENTE (COM 2 testemunhas)

venda_parcelada_mista_2_testemunhas.docx
└─ Você digital + Pessoa manual (COM 2 testemunhas)
```

---

## Como Enviar um Template

1. **Abra um documento em Word**
2. **Formate como deseja** (cores, logos, espaçamento, fontes)
3. **Adicione as tags** onde os dados devem aparecer
4. **Salve como .docx**
5. **Envie via interface do sistema**

---

## Exemplo de Tags

### Contato de Venda à Vista (Imóvel)

```
INSTRUMENTO PARTICULAR DE COMPRA E VENDA

VENDEDOR:
{{VENDEDOR_NOME}} 
CPF: {{VENDEDOR_CPF}}
Endereço: {{VENDEDOR_ENDERECO}}
Cidade: {{CIDADE_VENDEDOR}}

COMPRADOR:
{{COMPRADOR_NOME}}
CPF: {{COMPRADOR_CPF}}
Endereço: {{COMPRADOR_ENDERECO}}

IMÓVEL:
Lote nº {{LOTE}} | Quadra nº {{QUADRA}}
Empreendimento: {{EMPREENDIMENTO}}
Área: {{AREA_TOTAL_M2}} m²
Localização: {{CIDADE_IMOVEL}}/{{UF_IMOVEL}}

PREÇO:
Valor Total: {{VALOR_TOTAL}}
({{VALOR_TOTAL_EXTENSO}})

DATA:
{{DIA}} de {{MES_EXTENSO}} de {{ANO}}
```

---

## Tags Disponíveis

### Vendedor
- `{{VENDEDOR_NOME}}`
- `{{VENDEDOR_CPF}}`
- `{{VENDEDOR_RG}}`
- `{{VENDEDOR_ENDERECO}}`
- `{{VENDEDOR_NUMERO}}`
- `{{VENDEDOR_BAIRRO}}`
- `{{VENDEDOR_CIDADE}}`
- `{{VENDEDOR_UF}}`
- `{{VENDEDOR_CEP}}`
- `{{VENDEDOR_PROFISSAO}}`
- `{{VENDEDOR_NACIONALIDADE}}`
- `{{VENDEDOR_ESTADO_CIVIL}}`

### Comprador
- `{{COMPRADOR_NOME}}`
- `{{COMPRADOR_CPF}}`
- `{{COMPRADOR_RG}}`
- `{{COMPRADOR_ENDERECO}}`
- `{{COMPRADOR_NUMERO}}`
- `{{COMPRADOR_BAIRRO}}`
- `{{COMPRADOR_CIDADE}}`
- `{{COMPRADOR_UF}}`
- `{{COMPRADOR_CEP}}`
- `{{COMPRADOR_PROFISSAO}}`
- `{{COMPRADOR_NACIONALIDADE}}`
- `{{COMPRADOR_ESTADO_CIVIL}}`

### Imóvel
- `{{EMPREENDIMENTO}}`
- `{{LOTE}}`
- `{{QUADRA}}`
- `{{AREA_TOTAL_M2}}`
- `{{CIDADE_IMOVEL}}`
- `{{UF_IMOVEL}}`

### Bem Móvel (Veículo)
- `{{DESCRICAO_BEM}}`
- `{{MARCA_BEM}}`
- `{{MODELO_BEM}}`
- `{{ANO_FABRICACAO_BEM}}`
- `{{ANO_MODELO_BEM}}`
- `{{COR_BEM}}`
- `{{PLACA_BEM}}`
- `{{CHASSI_BEM}}`
- `{{RENAVAM_BEM}}`

### Valores Financeiros
- `{{VALOR_TOTAL}}`
- `{{VALOR_TOTAL_EXTENSO}}`
- `{{VALOR_ENTRADA}}`
- `{{VALOR_ENTRADA_EXTENSO}}`
- `{{NUMERO_PARCELAS}}`
- `{{VALOR_PARCELA}}`
- `{{VALOR_PARCELA_EXTENSO}}`

### Data
- `{{DIA}}`
- `{{MES_EXTENSO}}`
- `{{ANO}}`
- `{{CIDADE_ASSINATURA}}`
- `{{ESTADO_ASSINATURA}}`

### Foro
- `{{FORO_COMARCA}}`

---

## Processamento

Quando você clica "Salvar" e depois "Download Word":

1. **Sistema lê o template salvo** (ex: `venda_vista_imovel.docx`)
2. **Pega todos os dados do contrato** (vendedor, comprador, imovel, valores)
3. **Substitui cada tag** pela informação correspondente
   - `{{VENDEDOR_NOME}}` → "João Silva"
   - `{{VALOR_TOTAL}}` → "R$ 250.000,00"
   - Etc...
4. **Gera novo DOCX** com dados preenchidos
5. **Download automático** no navegador

---

## Fluxo Completo

```
1. VOCÊ ENVIA TEMPLATE
   └─ Arquivo DOCX formatado com tags {{}}

2. USUÁRIO PREENCHE CONTRATO
   └─ Formulário no app com dados de vendedor, comprador, valores

3. USUÁRIO CLICA "DOWNLOAD WORD"
   └─ Sistema processa template + dados

4. DOCX GERADO
   └─ Todas as tags substituídas pelos dados
   └─ Mesma formatação do seu template
   └─ Download automático

5. USUÁRIO ABRE NO WORD
   └─ Documento totalmente preenchido
   └─ Pronto para assinatura/impressão
```

---

## Requisitos do Template

✅ **Arquivo .docx** (Word 2007+)
✅ **Tags entre {{ }}** (ex: `{{VENDEDOR_NOME}}`)
✅ **Sem caracteres especiais** nas tags (apenas letras, números, _)
✅ **Tags em MAIÚSCULAS** (obrigatório)

❌ Não use: `{{ VENDEDOR_NOME }}` (espaços internos)
❌ Não use: `{VENDEDOR_NOME}` (chaves simples)
❌ Não use: `{{vendedor_nome}}` (minúsculas)

---

## Suporte

Se um documento não gerar corretamente:

1. **Verifique se o template foi enviado** para esse tipo
2. **Confirme que todos os dados obrigatórios foram preenchidos** no formulário
3. **Abra o DOCX gerado no Word** e procure por `{{` com CTRL+F
   - Se encontrar tags não substituídas, o template pode ter caracteres especiais
4. **Re-envie o template** se precisar fazer mudanças na formatação

---

## Vantagens

✅ **Total controle visual** - você cria o design
✅ **Mantém formatação** - cores, logos, fontes
✅ **Modelos independentes** - cada tipo tem seu próprio template
✅ **Sem conflitos** - templates não se sobrescrevem
✅ **Flexibilidade** - pode usar qualquer layout desejado


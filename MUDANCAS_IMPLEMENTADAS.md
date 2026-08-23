# Mudanças Implementadas - Sistema de Contratos

## 🔴 Erros Corrigidos

### 1. Erro 406 no Supabase (profiles)
- **Causa**: Falta de headers `Accept` na requisição
- **Solução**: Atualizado `supabaseClient.ts` com headers personalizados
- **Arquivo**: `/src/utils/supabaseClient.ts`

### 2. Erro ao Salvar Contrato (UUID inválido)
- **Causa**: ID do contrato era `contract-{timestamp}` mas Supabase espera UUID
- **Solução**: Usar `crypto.randomUUID()` para gerar IDs válidos
- **Arquivo**: `/src/utils/validators.ts` (função `generateUUID()`)
- **Atualizado**: `/src/components/ContractForm.tsx` (linha 322)

---

## ✨ Novas Funcionalidades

### 1. **Validações de Documentos**
Arquivo: `/src/utils/validators.ts`

Funções disponíveis:
- `formatCPF()` - Formata: 000.000.000-00
- `isValidCPF()` - Valida usando algoritmo de dígito verificador
- `formatRG()` - Formata: 00.000.000-00
- `isValidRG()` - Valida tamanho (7-9 dígitos)
- `formatPhone()` - Formata: (00) 00000-0000
- `isValidPhone()` - Valida (10-11 dígitos)
- `formatCNPJ()` - Formata: 00.000.000/0000-00
- `isValidCNPJ()` - Valida usando algoritmo de dígito verificador

**Exemplo de uso:**
```typescript
import { formatCPF, isValidCPF } from '../utils/validators';

const cpf = '12345678900';
const formatted = formatCPF(cpf); // "123.456.789-00"
const valid = isValidCPF(cpf); // true/false
```

---

### 2. **Busca de Endereço por CEP**
Arquivo: `/src/utils/validators.ts`

Funções:
- `formatCEP(value)` - Formata: 00000-000
- `isValidCEP(cep)` - Valida (8 dígitos)
- `fetchAddressByCEP(cep)` - Busca na API ViaCEP (retorna logradouro, bairro, cidade, UF)

**Exemplo:**
```typescript
import { fetchAddressByCEP } from '../utils/validators';

const address = await fetchAddressByCEP('68040100');
// Retorna: { logradouro, bairro, localidade, uf, ... }
```

---

### 3. **Componente CEPSearch**
Arquivo: `/src/components/CEPSearch.tsx`

Componente pronto para usar em formulários:
```tsx
<CEPSearch
  initialCEP=""
  onAddressFound={(data) => {
    setRua(data.logradouro);
    setBairro(data.bairro);
    setCidade(data.localidade);
    setEstado(data.uf);
  }}
/>
```

---

### 4. **Componente ValidatedInput**
Arquivo: `/src/components/ValidatedInput.tsx`

Input com validação integrada:
```tsx
<ValidatedInput
  label="CPF"
  value={cpf}
  onChange={setCPF}
  validationType="cpf"
  required={true}
  showValidation={true}
/>
```

Tipos suportados:
- `cpf` - Valida CPF com dígito verificador
- `cnpj` - Valida CNPJ com dígito verificador
- `rg` - Valida RG (7-9 dígitos)
- `phone` - Valida telefone (10-11 dígitos)
- `cep` - Valida CEP (8 dígitos)
- `text` - Texto comum

---

### 5. **Conversão para MAIÚSCULA**
Arquivo: `/src/utils/validators.ts`

Funções:
- `toUpperCase(value)` - Converte string para maiúscula
- `toUpperCaseObject(obj)` - Converte campos específicos de um objeto

Campos automaticamente convertidos:
- nome, sobrenome, nomeCompleto
- rua, avenida, logradouro, endereco
- bairro, cidade, municipio
- nomeEmpreendimento, empreendimento
- profissao, nacionalidade
- titulo

**Exemplo:**
```typescript
import { toUpperCaseObject } from '../utils/validators';

const vendedor = { nome: 'joão silva', ... };
const upper = toUpperCaseObject(vendedor);
// { nome: 'JOÃO SILVA', ... }
```

---

## 🎨 Mudanças de Cores

Arquivo: `/tailwind.config.ts` (novo) e `/src/index.css`

Paleta definida:
- **Verde Principal**: #22c55e (bg-green-500, text-green-500)
- **Cinza Grafite**: #1e293b (bg-slate-800, text-slate-800)
- **Branco**: #ffffff (bg-white)

Todos os componentes foram atualizados:
- Azul → Verde
- Roxo/Índigo → Cinza Grafite
- Backgrounds neutros mantidos em branco

---

## 📋 Templates de Contrato

Arquivo: `/src/utils/defaultTemplates.ts`

Contém:
- Template padrão para "Venda à Vista"
- Lista completa de tags disponíveis organizadas por categoria

**Tags disponíveis por categoria:**
```
vendedor: VENDEDOR_NOME, NACIONALIDADE_VENDEDOR, ...
comprador: COMPRADOR_NOME, NACIONALIDADE_COMPRADOR, ...
imovel: EMPREENDIMENTO, LOTE, QUADRA, AREA_TOTAL_M2
pagamento: VALOR_TOTAL, VALOR_TOTAL_EXTENSO
data: DATA_ASSINATURA, DIA, MES_EXTENSO, ANO
localizacao: CIDADE, UF, FORO_COMARCA
testemunhas: TESTEMUNHA_1_NOME, TESTEMUNHA_1_CPF, ...
```

---

## 🚀 Como Usar no ContractForm

### Exemplo de integração:

```tsx
import { ValidatedInput } from './ValidatedInput';
import { CEPSearch } from './CEPSearch';
import { toUpperCaseObject } from '../utils/validators';

// No formulário:
<ValidatedInput
  label="CPF Vendedor"
  value={vendedor.cpfCnpj}
  onChange={(val) => setVendedor({ ...vendedor, cpfCnpj: val })}
  validationType="cpf"
  required
/>

<ValidatedInput
  label="RG Vendedor"
  value={vendedor.rg}
  onChange={(val) => setVendedor({ ...vendedor, rg: val })}
  validationType="rg"
  required
/>

<CEPSearch
  onAddressFound={(data) => {
    setVendedor({
      ...vendedor,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    });
  }}
/>

// Ao salvar:
const contractData = {
  ...formData,
  vendedor: toUpperCaseObject(vendedor),
  comprador: toUpperCaseObject(comprador),
  imovel: toUpperCaseObject(imovel),
};
```

---

## 📝 Arquivos Criados/Modificados

### Criados:
- ✅ `/src/utils/validators.ts` - Validadores e formatadores
- ✅ `/src/utils/defaultTemplates.ts` - Templates padrão
- ✅ `/src/components/CEPSearch.tsx` - Componente de busca CEP
- ✅ `/src/components/ValidatedInput.tsx` - Componente de input validado
- ✅ `/tailwind.config.ts` - Configuração de cores Tailwind
- ✅ `/COLOR_SCHEME.md` - Documentação de cores
- ✅ `/MUDANCAS_IMPLEMENTADAS.md` - Este arquivo

### Modificados:
- ✅ `/src/utils/supabaseClient.ts` - Adicionado headers
- ✅ `/src/components/ContractForm.tsx` - Atualizado ID para UUID
- ✅ `/src/index.css` - Cores atualizadas
- ✅ Todos os componentes `.tsx` - Cores atualizadas (blue→green, purple→slate)

---

## 🧪 Próximos Passos

1. **Integrar ValidatedInput no ContractForm**
   - Substituir inputs comuns por ValidatedInput onde apropriado
   - Adicionar validação em tempo real

2. **Integrar CEPSearch no ContractForm**
   - Adicionar para vendedor, comprador, empreendimento

3. **Upload de Template .docx**
   - User pode fazer upload do seu próprio modelo
   - Sistema substitui tags automaticamente

4. **Gerar Contrato PDF**
   - Integrar com docxtemplater
   - Gerar arquivo .docx preenchido

5. **Testar no Supabase**
   - Verificar se as tabelas existem e têm permissões corretas
   - Validar estrutura de dados

---

## 🐛 Problemas Conhecidos

1. **Erro 406 no Profiles**
   - Pode ser permissão de acesso a tabela `profiles`
   - Verificar políticas de segurança (RLS) no Supabase

2. **Erro 400 ao Salvar**
   - Agora corrigido com UUID válido
   - Se persistir: verificar estrutura da tabela `contracts`

---

## 💡 Dicas

- Sempre use `toUpperCaseObject()` ao salvar dados de pessoas e endereços
- Validações podem ser desabilitadas com `showValidation={false}` se necessário
- CEP busca automaticamente endereço (ViaCEP é grátis e rápido)
- IDs agora são UUIDs válidos, compatíveis com qualquer banco PostgreSQL


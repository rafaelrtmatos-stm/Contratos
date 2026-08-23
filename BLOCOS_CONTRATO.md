# Sistema de Blocos de Contrato

## O que é?

Um sistema flexível que permite ao usuário **selecionar quais seções/blocos aparecerão em um contrato de exclusividade**. Cada bloco representa um conjunto de campos e cláusulas específicas.

---

## Arquivos Criados

### 1. `/src/types/contractBlocks.ts`
Define os tipos e catálogo de blocos disponíveis.

**Tipos principais:**
- `ContractBlockKey` - Identificador único de cada bloco
- `ContractBlock` - Estrutura completa de um bloco
- `ContractBlocksConfig` - Configuração de blocos selecionados
- `DEFAULT_EXCLUSIVIDADE_BLOCKS` - Configuração padrão para exclusividade

**Blocos disponíveis (15 no total):**

```
👥 PARTES DO CONTRATO
├─ dados_contratante ✅ Obrigatório
├─ dados_conjuge
├─ dados_corretor ✅ Obrigatório
└─ dados_terceiros

🏠 DADOS DO IMÓVEL
├─ dados_imovel ✅ Obrigatório
└─ documentacao_imovel ✅ Obrigatório

💰 CONDIÇÕES FINANCEIRAS
├─ preco_condicoes
└─ comissao_corretagem

✅ AUTORIZAÇÕES
├─ autorizacao_visitas
├─ autorizacao_divulgacao
└─ clausula_exclusividade ✅ Obrigatório

🤝 PARCERIA E PROTEÇÃO
├─ parceria_corretores
└─ protecao_interessados

⚖️ DISPOSIÇÕES LEGAIS
├─ prazo_contrato
├─ rescisao
├─ foro
└─ assinaturas ✅ Obrigatório
```

---

### 2. `/src/components/ContractBlockSelector.tsx`
Componente visual para seleção de blocos.

**Features:**
- ✅ Seleção/deselecção visual com checkboxes
- ✅ Categorização por tipo (Partes, Imóvel, Financeiro, etc)
- ✅ Blocos obrigatórios não podem ser desmarcados
- ✅ Ações rápidas: "Marcar Todos", "Desmarcar Todos", "Padrão"
- ✅ Contador de blocos selecionados por categoria
- ✅ Expandir/recolher categorias
- ✅ Descrição detalhada de cada bloco

**Props:**
```typescript
interface ContractBlockSelectorProps {
  selectedBlocks: ContractBlocksConfig;
  onBlocksChange: (blocks: ContractBlocksConfig) => void;
  titulo?: string;
  descricao?: string;
}
```

**Exemplo de uso:**
```tsx
<ContractBlockSelector
  selectedBlocks={blockConfig}
  onBlocksChange={setBlockConfig}
  titulo="1. Seleção dos Blocos do Contrato"
  descricao="Marque as caixas para incluir os blocos..."
/>
```

---

## Como Integrar no ContractForm

### Passo 1: Importar e adicionar estado
```tsx
import { ContractBlockSelector } from './ContractBlockSelector';
import { ContractBlocksConfig, DEFAULT_EXCLUSIVIDADE_BLOCKS } from '../types/contractBlocks';

function ContractForm() {
  const [blockConfig, setBlockConfig] = useState<ContractBlocksConfig>(
    initialData?.blockConfig || DEFAULT_EXCLUSIVIDADE_BLOCKS
  );
  
  // ...
}
```

### Passo 2: Renderizar o componente
```tsx
{tipo === 'exclusividade' && (
  <ContractBlockSelector
    selectedBlocks={blockConfig}
    onBlocksChange={setBlockConfig}
  />
)}
```

### Passo 3: Salvar a configuração
```tsx
const contractData: ContractData = {
  // ... outros campos
  blockConfig: blockConfig,
};
```

---

## Estrutura de um Bloco

```typescript
interface ContractBlock {
  id: ContractBlockKey;              // Identificador único
  titulo: string;                    // Título exibido
  descricao: string;                 // Descrição/ajuda
  categoria: 'partes' | 'imovel' | ...; // Categoria
  ativo: boolean;                    // Se está marcado
  obrigatorio?: boolean;             // Se não pode desmarcar
}
```

---

## Blocos Obrigatórios

Alguns blocos **não podem ser desmarcados** porque são essenciais para a validade do contrato:

```
✅ dados_contratante
✅ dados_corretor
✅ dados_imovel
✅ documentacao_imovel
✅ clausula_exclusividade
✅ assinaturas
```

---

## Configuração Padrão para Exclusividade

```typescript
DEFAULT_EXCLUSIVIDADE_BLOCKS = {
  // Partes
  dados_contratante: true,       // ✅
  dados_conjuge: false,
  dados_corretor: true,          // ✅
  dados_terceiros: false,
  
  // Imóvel
  dados_imovel: true,            // ✅
  documentacao_imovel: true,      // ✅
  
  // Financeiro
  preco_condicoes: false,
  comissao_corretagem: true,
  
  // Autorizações
  autorizacao_visitas: true,
  autorizacao_divulgacao: true,
  clausula_exclusividade: true,   // ✅
  
  // Parceria
  parceria_corretores: false,
  protecao_interessados: true,
  
  // Legal
  prazo_contrato: true,
  rescisao: true,
  foro: true,
  assinaturas: true,             // ✅
};
```

---

## Adicionar Novo Bloco

Para adicionar um novo bloco, edite `/src/types/contractBlocks.ts`:

### 1. Adicione a chave ao tipo
```typescript
export type ContractBlockKey = 
  | 'dados_contratante'
  | 'novo_bloco'  // ← Novo
  | /* ... resto ... */;
```

### 2. Adicione ao catálogo
```typescript
export const CONTRACT_BLOCKS_CATALOG = {
  novo_bloco: {
    id: 'novo_bloco',
    titulo: 'Título do Bloco',
    descricao: 'Descrição completa',
    categoria: 'partes', // ou outra
    ativo: true,
    obrigatorio: false,
  },
  // ... resto ...
};
```

### 3. Adicione à configuração padrão (opcional)
```typescript
novo_bloco: true,  // ou false
```

---

## Usar blockConfig no Contrato

Quando gerar o contrato (PDF, DOCX, etc), verifique quais blocos estão ativados:

```typescript
function gerarContrato(contract: ContractData) {
  const blocks = contract.blockConfig || DEFAULT_EXCLUSIVIDADE_BLOCKS;
  
  // Incluir seção de dados do contratante?
  if (blocks.dados_contratante) {
    // Incluir dados...
  }
  
  // Incluir cláusula de exclusividade?
  if (blocks.clausula_exclusividade) {
    // Incluir cláusula...
  }
  
  // ... mais validações ...
}
```

---

## Casos de Uso

### 1. Contrato Minimalista
Desmarcar tudo exceto obrigatórios:
- dados_contratante ✅
- dados_corretor ✅
- dados_imovel ✅
- documentacao_imovel ✅
- clausula_exclusividade ✅
- assinaturas ✅

**Resultado**: Contrato básico, rápido de preencher

### 2. Contrato Completo
Marcar tudo:
- Todos os 15 blocos ✅

**Resultado**: Contrato robusto com todas as proteções

### 3. Contrato com Parceria
Marcar: padrão + `parceria_corretores`

**Resultado**: Contrato com cláusulas de rede/cooperação

### 4. Contrato sem Comissão
Desmarcar: `comissao_corretagem`

**Resultado**: Contrato sem seção de comissão

---

## Benefícios

✅ **Flexibilidade**: Usuário escolhe o que precisa
✅ **Clareza**: Blocos desmarcados não exigem preenchimento
✅ **Segurança**: Blocos obrigatórios não podem ser removidos
✅ **Performance**: Contrato menor, apenas com o necessário
✅ **Manutenção**: Fácil adicionar/remover blocos
✅ **UX**: Interface intuitiva com categorias e descrições

---

## Próximas Melhorias

- [ ] Salvar presets de blocos frequentemente usados
- [ ] Historar qual configuração foi usada em cada contrato
- [ ] Validar blocos interdependentes (ex: não permitir protocolo sem comissão)
- [ ] Gerar template Word dinamicamente baseado em blocos
- [ ] Amostra de preview do contrato gerado


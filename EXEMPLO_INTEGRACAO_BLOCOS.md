# Exemplo: Como Integrar o ContractBlockSelector no ContractForm

## 1. Importar necessário

```tsx
import { ContractBlockSelector } from './ContractBlockSelector';
import { 
  ContractBlocksConfig, 
  DEFAULT_EXCLUSIVIDADE_BLOCKS 
} from '../types/contractBlocks';
```

---

## 2. Adicionar estado no ContractForm

Dentro da função `ContractForm`:

```tsx
function ContractForm({ initialData, defaultType, onSave, onCancel }: ContractFormProps) {
  const [tipo, setTipo] = useState<ContractType>(defaultType || 'venda_vista');
  
  // ← ADICIONAR ESTE ESTADO
  const [blockConfig, setBlockConfig] = useState<ContractBlocksConfig>(
    initialData?.blockConfig || DEFAULT_EXCLUSIVIDADE_BLOCKS
  );

  // ... resto do estado ...
}
```

---

## 3. Atualizar blockConfig quando tipo muda

```tsx
const handleTipoChange = (newTipo: ContractType) => {
  setTipo(newTipo);
  
  // Se mudar para exclusividade, carregar ou definir blocos
  if (newTipo === 'exclusividade') {
    if (!initialData?.blockConfig) {
      setBlockConfig(DEFAULT_EXCLUSIVIDADE_BLOCKS);
    }
  }
};
```

---

## 4. Renderizar o componente (no JSX)

Adicionar em alguma seção lógica do formulário, após seleção do tipo:

```tsx
{/* Seleção do Tipo de Contrato */}
<div className="grid grid-cols-3 gap-3 mb-6">
  <button
    type="button"
    onClick={() => handleTipoChange('venda_vista')}
    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
      tipo === 'venda_vista'
        ? 'bg-green-100 border-green-500 text-green-900'
        : 'bg-white border-slate-300 text-slate-700'
    }`}
  >
    Venda à Vista
  </button>
  
  <button
    type="button"
    onClick={() => handleTipoChange('venda_parcelada')}
    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
      tipo === 'venda_parcelada'
        ? 'bg-green-100 border-green-500 text-green-900'
        : 'bg-white border-slate-300 text-slate-700'
    }`}
  >
    Venda Parcelada
  </button>
  
  <button
    type="button"
    onClick={() => handleTipoChange('exclusividade')}
    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
      tipo === 'exclusividade'
        ? 'bg-green-100 border-green-500 text-green-900'
        : 'bg-white border-slate-300 text-slate-700'
    }`}
  >
    Exclusividade
  </button>
</div>

{/* ← ADICIONAR AQUI: Seletor de Blocos para Exclusividade */}
{tipo === 'exclusividade' && (
  <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
    <ContractBlockSelector
      selectedBlocks={blockConfig}
      onBlocksChange={setBlockConfig}
      titulo="1. Seleção dos Blocos do Contrato"
      descricao="Marque as caixas para incluir os blocos. Blocos desmarcados não aparecem no contrato nem exigem campos."
    />
  </div>
)}

{/* Resto do formulário ... */}
```

---

## 5. Salvar blockConfig no contrato

Na função `handleSubmit` ou similar:

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const contractData: ContractData = {
    // ... todos os outros campos ...
    
    // ← ADICIONAR ESTE CAMPO
    blockConfig: tipo === 'exclusividade' ? blockConfig : undefined,
    
    // ... resto ...
  };

  onSave(contractData);
};
```

---

## 6. Atualizar estado ao carregar contrato existente

Na função `useEffect` que carrega dados iniciais:

```tsx
useEffect(() => {
  if (initialData) {
    setTipo(initialData.tipo);
    
    // ← ADICIONAR ISTO
    if (initialData.blockConfig) {
      setBlockConfig(initialData.blockConfig);
    } else if (initialData.tipo === 'exclusividade') {
      setBlockConfig(DEFAULT_EXCLUSIVIDADE_BLOCKS);
    }
    
    // ... carregar outros dados ...
  }
}, [initialData]);
```

---

## Estrutura Completa no ContractForm

```tsx
import React, { useState, useEffect } from 'react';
import { ContractBlockSelector } from './ContractBlockSelector';
import { 
  ContractBlocksConfig, 
  DEFAULT_EXCLUSIVIDADE_BLOCKS 
} from '../types/contractBlocks';

export const ContractForm: React.FC<ContractFormProps> = ({
  initialData,
  defaultType,
  onSave,
  onCancel,
}) => {
  const [tipo, setTipo] = useState<ContractType>(defaultType || 'venda_vista');
  const [blockConfig, setBlockConfig] = useState<ContractBlocksConfig>(
    initialData?.blockConfig || DEFAULT_EXCLUSIVIDADE_BLOCKS
  );

  // ... resto do estado ...

  useEffect(() => {
    if (initialData) {
      setTipo(initialData.tipo);
      if (initialData.blockConfig) {
        setBlockConfig(initialData.blockConfig);
      }
      // ... carregar outros dados ...
    }
  }, [initialData]);

  const handleTipoChange = (newTipo: ContractType) => {
    setTipo(newTipo);
    if (newTipo === 'exclusividade' && !initialData?.blockConfig) {
      setBlockConfig(DEFAULT_EXCLUSIVIDADE_BLOCKS);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const contractData: ContractData = {
      id: initialData?.id || generateUUID(),
      tipo,
      blockConfig: tipo === 'exclusividade' ? blockConfig : undefined,
      // ... todos os outros campos ...
    };

    onSave(contractData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seleção do Tipo de Contrato */}
      <div className="grid grid-cols-3 gap-3">
        {/* botões ... */}
      </div>

      {/* Seletor de Blocos (apenas para Exclusividade) */}
      {tipo === 'exclusividade' && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <ContractBlockSelector
            selectedBlocks={blockConfig}
            onBlocksChange={setBlockConfig}
          />
        </div>
      )}

      {/* Resto do formulário ... */}

      {/* Botões de ação */}
      <div className="flex gap-3 pt-6 border-t border-slate-200">
        <button type="submit" className="px-6 py-2 bg-green-500 text-white rounded-lg">
          Salvar Contrato
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-slate-300 text-slate-900 rounded-lg">
          Cancelar
        </button>
      </div>
    </form>
  );
};
```

---

## Usando blockConfig na Geração do Contrato

Ao gerar o contrato (em docxProcessor.ts ou similar):

```typescript
export function gerarContratoExclusividade(contract: ContractData): string {
  const blocks = contract.blockConfig || DEFAULT_EXCLUSIVIDADE_BLOCKS;
  
  let conteudo = '';
  
  // Título
  conteudo += '<h1>CONTRATO DE EXCLUSIVIDADE</h1>\n';
  
  // Dados do Contratante
  if (blocks.dados_contratante) {
    conteudo += '<h2>CONTRATANTE</h2>\n';
    conteudo += `<p>Nome: ${contract.vendedor.nome}</p>\n`;
    conteudo += `<p>CPF: ${contract.vendedor.cpfCnpj}</p>\n`;
    conteudo += `<p>Endereço: ${contract.vendedor.endereco}</p>\n`;
  }
  
  // Dados do Corretor
  if (blocks.dados_corretor) {
    conteudo += '<h2>CORRETOR/CONTRATADO</h2>\n';
    conteudo += `<p>Nome: ${contract.comprador.nome}</p>\n`;
    conteudo += `<p>CRECI: ${contract.comprador.creci}</p>\n`;
  }
  
  // Dados do Imóvel
  if (blocks.dados_imovel && contract.imovel) {
    conteudo += '<h2>DO IMÓVEL</h2>\n';
    conteudo += `<p>Empreendimento: ${contract.imovel.nomeEmpreendimento}</p>\n`;
    conteudo += `<p>Área: ${contract.imovel.areaTotalM2} m²</p>\n`;
  }
  
  // Cláusula de Exclusividade
  if (blocks.clausula_exclusividade) {
    conteudo += '<h2>DA CLÁUSULA DE EXCLUSIVIDADE</h2>\n';
    conteudo += '<p>O contratante concede exclusividade ao corretor...</p>\n';
  }
  
  // Comissão
  if (blocks.comissao_corretagem && contract.exclusividade) {
    conteudo += '<h2>COMISSÃO</h2>\n';
    conteudo += `<p>Percentual: ${contract.exclusividade.percentualComissao}%</p>\n`;
  }
  
  // ... mais blocos ...
  
  return conteudo;
}
```

---

## Checklist de Integração

- [ ] Importar `ContractBlockSelector` e tipos
- [ ] Adicionar estado `blockConfig` no componente
- [ ] Adicionar efeito para carregar blocos ao inicializar
- [ ] Renderizar `<ContractBlockSelector />` quando `tipo === 'exclusividade'`
- [ ] Salvar `blockConfig` no `ContractData`
- [ ] Usar `blockConfig` ao gerar o contrato
- [ ] Testar seleção de blocos
- [ ] Testar salvamento e carregamento
- [ ] Validar que blocos obrigatórios estão sempre selecionados


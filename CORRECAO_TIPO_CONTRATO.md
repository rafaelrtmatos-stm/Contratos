# Correção: Seletor de Tipo de Contrato

## Problema
Quando um usuário salvava um contrato de um tipo (ex: "Venda à Vista") e depois criava um contrato de outro tipo (ex: "Venda Parcelada"), o primeiro contrato era perdido.

## Causa
Os botões de tipo SEMPRE apareciam, permitindo ao usuário mudar o tipo de um contrato existente. Isso causava conflitos e sobrescrita de dados.

---

## Solução Implementada

### 1. Esconder Botão do Tipo Atual
**Novo Comportamento:**

**CRIANDO NOVO CONTRATO:**
```
┌─────────────────────────────────────────┐
│ [🏦 Venda à Vista] [📅 Venda Parcelada] │
│              [🔒 Exclusividade]         │
└─────────────────────────────────────────┘
```
Aparecem os 3 botões → Usuário escolhe um tipo

---

**EDITANDO CONTRATO DE "VENDA À VISTA":**
```
┌─────────────────────────────────────────────────────┐
│ 🟢 Tipo de Contrato: Venda à Vista (não pode ser... │
│    alterado)                                        │
├─────────────────────────────────────────────────────┤
│         [📅 Venda Parcelada] [🔒 Exclusividade]    │
└─────────────────────────────────────────────────────┘
```
Aparecem apenas os outros 2 tipos como opções

---

### 2. Adicionar Badge Visual
- ✅ Badge verde mostrando qual é o tipo atual
- ✅ Texto dizendo "(não pode ser alterado)"
- ✅ Clareza para o usuário sobre o tipo selecionado

---

### 3. Proteção na Função
```typescript
const handleTipoChange = (newTipo: ContractType) => {
  // Impedir mudança de tipo se está editando um contrato existente
  if (initialData) {
    console.warn('Não é permitido alterar o tipo de um contrato existente');
    return; // Sair sem fazer nada
  }
  // ... resto da lógica ...
};
```

Se um usuário tentar clicar em um botão de tipo (mesmo que apareça), nada acontece.

---

## Cenários Possíveis

### Cenário 1: Novo Contrato
```
1. Usuário acessa o formulário sem initialData
2. Ve os 3 botões de tipo
3. Escolhe "Venda à Vista"
4. Preenche os dados
5. Clica em "Salvar Contrato"
6. Um novo contrato é criado com ID único
```

### Cenário 2: Contrato Existente
```
1. Usuário acessa um contrato existente (com initialData)
2. Ve o badge: "Tipo de Contrato: Venda à Vista"
3. Ve apenas 2 botões (Parcelada e Exclusividade)
4. NÃO pode clicar neles (estão desabilitados logicamente)
5. Edita os dados do tipo atual
6. Clica em "Salvar Contrato"
7. O contrato é ATUALIZADO (não criado novo)
```

### Cenário 3: Criar Novo Contrato Diferente
```
1. Depois de criar "Venda à Vista", usuário volta ao menu
2. Clica em "Novo Contrato"
3. Ve novamente os 3 botões (novo formulário = novo initialData)
4. Escolhe "Venda Parcelada"
5. Isso é um CONTRATO COMPLETAMENTE NOVO (ID diferente)
6. Não afeta o contrato anterior
```

---

## Mudanças de Código

### Arquivo: `src/components/ContractForm.tsx`

#### 1. Função `handleTipoChange` (linhas ~202)
```tsx
// ANTES: Permitia mudar tipo sempre
const handleTipoChange = (newTipo: ContractType) => {
  setTipo(newTipo);
  // ...
};

// DEPOIS: Bloqueia mudança em contrato existente
const handleTipoChange = (newTipo: ContractType) => {
  if (initialData) {
    console.warn('Não é permitido alterar o tipo de um contrato existente');
    return;
  }
  setTipo(newTipo);
  // ...
};
```

#### 2. Renderização de Botões (linhas ~439-498)
```tsx
// ANTES: Sempre mostrava os 3 botões
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <button onClick={() => handleTipoChange('venda_vista')}> ... </button>
  <button onClick={() => handleTipoChange('venda_parcelada')}> ... </button>
  <button onClick={() => handleTipoChange('exclusividade')}> ... </button>
</div>

// DEPOIS: Mostra apenas os que não são o tipo atual
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {tipo !== 'venda_vista' && <button> ... </button>}
  {tipo !== 'venda_parcelada' && <button> ... </button>}
  {tipo !== 'exclusividade' && <button> ... </button>}
</div>
```

#### 3. Badge Visual (novo, linhas ~439-449)
```tsx
{initialData && (
  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
    <span className="text-sm font-bold text-green-900">
      Tipo de Contrato: <strong>Venda à Vista</strong> (não pode ser alterado)
    </span>
  </div>
)}
```

---

## Benefícios

✅ **Impossível mudar tipo acidentalmente**  
✅ **Cada tipo de contrato é independente**  
✅ **Contrato A (Venda à Vista) não interfere com Contrato B (Parcelada)**  
✅ **UI clara: badge mostra qual tipo está sendo editado**  
✅ **Botões de tipo desaparecem quando estão fora de uso**  
✅ **Proteção dupla: UI + lógica na função**  

---

## Teste a Mudança

1. **Criar "Venda à Vista"**
   - Novo formulário → Aparecem 3 botões
   - Escolhe "Venda à Vista"
   - Preenche e salva
   - ✅ Contrato criado

2. **Criar "Venda Parcelada"**
   - Novo formulário novamente → Aparecem 3 botões
   - Escolhe "Venda Parcelada"
   - Preenche e salva
   - ✅ Novo contrato criado (não afetou anterior)

3. **Editar "Venda à Vista"**
   - Clica em editar do contrato "Venda à Vista"
   - Badge verde: "Tipo: Venda à Vista"
   - Aparecem apenas: "Venda Parcelada" e "Exclusividade" (botões)
   - Tenta clicar em um deles → Nada acontece (bloqueado)
   - Edita dados e clica "Salvar"
   - ✅ Contrato atualizado (não criado novo)

---

## Commit GitHub

```
32ca764+ (não subido ainda)

Refactor: Impedir mudança de tipo em contrato existente

- Adicionar proteção em handleTipoChange
- Esconder botão do tipo atual na UI
- Adicionar badge visual mostrando tipo
- Cada contrato tem tipo fixo após criação
- Impossível sobrescrever contratos diferentes
```


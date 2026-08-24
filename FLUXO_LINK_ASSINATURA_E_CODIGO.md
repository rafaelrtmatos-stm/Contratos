# Fluxo de Links de Assinatura e Código de Acesso

## 📋 Resumo
Sistema completo de geração, validação e compartilhamento de links de assinatura digital com código de acesso baseado nos últimos 4 dígitos do CPF/CNPJ.

---

## 🔄 Fluxo Completo

### 1️⃣ **Vendedor Gera Link**
- Acessa o contrato no Dashboard
- Clica em "Gerar Código para Cliente"
- Escolhe validade: 24h, 48h, 7 dias ou customizado
- Sistema gera link único com token

```
Exemplo: https://contratos.app/assinar/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 2️⃣ **Código de Acesso é Gerado**
Automaticamente, o sistema extrai os **últimos 4 dígitos do CPF/CNPJ** do comprador como código de acesso:

```
CPF do comprador: 123.456.789-00
Código de acesso: 8900 ✅
```

### 3️⃣ **Vendedor Copia e Compartilha**
Ao clicar em **"Copiar"**, a mensagem copiada inclui:

```
https://contratos.app/assinar/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

💡 Código de acesso: 8900
```

### 4️⃣ **Cliente Abre o Link**
- Recebe link + código por WhatsApp, SMS, email, etc.
- Abre o link no navegador
- **Primeira tela**: Pede os últimos 4 dígitos do CPF (validação)
- Digite: `8900`
- Sistema valida se corresponde ao `cliente_cpf_last_4` armazenado

### 5️⃣ **Cliente Lê o Contrato**
- Após validação do CPF ✅
- Vê a segunda tela: visualização do contrato
- Pode ler, descer, revisar tudo
- Caixas de seleção: "Li e Entendi" e "Concordo com os Termos"

### 6️⃣ **Cliente Assina Digitalmente**
- Clica em "Assinar Contrato"
- Modal abre com OTP gerado
- Sistema pede:
  - **Nome completo** (já preenchido com nome do comprador)
  - **OTP** (código de 6 dígitos que foi gerado e está na tela)
- Cliente digita o OTP e clica "Confirmar Assinatura"

### 7️⃣ **Assinatura Registrada**
- Hash SHA-256 gerado com dados do contrato + timestamp
- Selo de assinatura digital criado com:
  - ✅ Nome completo do signatário (visível)
  - ✅ CPF completo (visível, sem mascaramento)
  - ✅ Data e hora da assinatura
  - ✅ ID da assinatura
  - ✅ QR Code de validação
- Link marcado como `status = 'signed'`

### 8️⃣ **Após Assinado**
**Se cliente reabre o link:**
- Sistema detecta `status = 'signed'`
- Pula a validação de CPF
- Mostra só a visualização do contrato
- Botão: **"Baixar PDF"** com assinatura digital

**Se vendedor reabre no Dashboard:**
- Contrato mostra `status: 'assinado_total'` ou `'assinado_parcial'`
- Mostra opção de copiar o link (para referência/auditoria)
- Mostra botão de download

---

## 🔐 Validações e Segurança

### ✅ Validações Implementadas

| Validação | Onde | Condição |
|-----------|------|----------|
| **Link não encontrado** | RPC `get_contract_for_signature_token` | Token não existe na BD |
| **Link expirado** | RPC `get_contract_for_signature_token` | `validade < NOW()` |
| **Já assinado** | RPC `get_contract_for_signature_token` | `status = 'signed'` |
| **CPF inválido** | RPC `validate_signature_link_cpf` | `cliente_cpf_last_4 ≠ input` |
| **CPF com link expirado** | RPC `validate_signature_link_cpf` | `validade > NOW()` AND `status ≠ 'signed'` |
| **OTP inválido** | RPC `sign_contract_via_link` | OTP não corresponde |

### 🛡️ Proteções

1. **Expiração de Link** ⏰
   - Padrão: 24 horas
   - Customizável: 1-999 dias
   - Após expirar: "Este link expirou. Solicite um novo ao vendedor."

2. **Código de Acesso** 🔑
   - Últimos 4 dígitos do CPF
   - Validado antes de visualizar contrato
   - Impede acesso aleatório ao link

3. **OTP (One-Time Password)** 📱
   - Gerado única vez quando link é criado
   - Exibido na tela do cliente
   - Deve ser digitado para confirmar assinatura
   - Não é reaproveitável

4. **Hash SHA-256** 🔒
   - Criado com: `contract_id | nome | CPF | timestamp`
   - Garante autenticidade e integridade
   - Impede alterações após assinatura

5. **IP Logger** 🌐
   - IP do cliente é registrado no momento da assinatura
   - Para auditoria e segurança

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `contract_signature_links`

```sql
CREATE TABLE contract_signature_links (
  id BIGINT PRIMARY KEY,
  contract_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,           -- Token único do link
  otp_code TEXT NOT NULL,               -- OTP para confirmação
  vendedor_id UUID NOT NULL,            -- Quem criou o link
  vendedor_name TEXT,
  cliente_cpf_last_4 TEXT NOT NULL,     -- Últimos 4 dígitos do CPF
  cliente_name TEXT,
  validade TIMESTAMP NOT NULL,          -- Data/hora de expiração
  status TEXT DEFAULT 'pending',        -- 'pending' ou 'signed'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Tabela: `contract_signatures`

```sql
CREATE TABLE contract_signatures (
  id BIGINT PRIMARY KEY,
  contract_id UUID NOT NULL,
  signature_link_id BIGINT,            -- Referência ao link
  nome_signatario TEXT NOT NULL,
  documento_signatario TEXT NOT NULL,
  role TEXT,                            -- 'corretor', 'cliente', 'comprador'
  hash_autenticacao TEXT,               -- SHA-256 do contrato
  ip_address TEXT,                      -- IP de onde foi assinado
  assinado_em TIMESTAMP DEFAULT now()
);
```

---

## 📱 Fluxo Visual do Cliente

```
┌─────────────────────────────────────────┐
│ Cliente recebe link + código no WhatsApp │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Clica no link                            │
│ https://...../assinar/TOKEN             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 🔐 TELA 1: Validar CPF                  │
│                                          │
│ Últimos 4 dígitos do CPF: ____          │
│                                          │
│ [Validar]                               │
└──────────────┬──────────────────────────┘
               │ ✅ Validado
               ▼
┌─────────────────────────────────────────┐
│ 📄 TELA 2: Visualizar Contrato          │
│                                          │
│ [Contrato completo aqui...]            │
│                                          │
│ ☑ Li e Entendi                          │
│ ☑ Concordo com os Termos                │
│                                          │
│ [Assinar Contrato]                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ✍️ TELA 3: Modal de Assinatura          │
│                                          │
│ Nome: [Cliente Silva]                  │
│ OTP: ______                            │
│                                          │
│ [Confirmar Assinatura]                  │
└──────────────┬──────────────────────────┘
               │ ✅ Assinado
               ▼
┌─────────────────────────────────────────┐
│ ✅ TELA 4: Contrato Assinado            │
│                                          │
│ [Selo de Assinatura Digital]           │
│ [Baixar PDF com Assinatura]            │
└─────────────────────────────────────────┘
```

---

## 🎯 Respostas às Perguntas

### ❓ "O link nunca morre, sempre pede CPF"
**Status: ✅ IMPLEMENTADO CORRETAMENTE**
- Link expira conforme `validade` definida pelo vendedor (padrão 24h)
- Após expirar, mostra: "Este link expirou. Solicite um novo ao vendedor."
- Sempre pede CPF na primeira abertura (camada de segurança)
- Após assinado, não pede mais CPF (reabertura só mostra download)

### ❓ "Depois de assinado aparece só o botão de download"
**Status: ✅ IMPLEMENTADO CORRETAMENTE**
- RPC valida se `status = 'signed'`
- Se assinado: pula para visualização + download
- Se não assinado: vai para tela de CPF primeiro

### ❓ "Dentro da visualização do contrato ainda tem opção de copiar o link"
**Status: ✅ IMPLEMENTADO CORRETAMENTE**
- Dashboard permite copiar link para referência
- Útil para vendedor compartilhar novamente
- Não afeta o contrato já assinado

### ❓ "Ao copiar o link sempre venha dizendo que o código para abrir é os últimos dígitos do CPF"
**Status: ✅ IMPLEMENTADO AGORA**
- ✨ **NOVO**: Quando copia o link, inclui automaticamente:
  ```
  https://contratos.app/assinar/TOKEN
  
  💡 Código de acesso: XXXX
  ```
- ✨ **NOVO**: Modal mostra o código em destaque após gerar
- Cliente recebe tudo junto no WhatsApp/SMS/email

---

## 🚀 Commits

```
1163ba3 - feat: Incluir código de acesso ao copiar link
1eeb41a - feat: Exibir CPF completo no selo de assinatura
e76afc4 - docs: Documentação de mudanças
```

---

## ⚙️ Configuração

### Validadepadrões (em GenerateSignatureCodeModal.tsx)
```javascript
const getValidadeMs = (): number => {
  switch (validade) {
    case '24h':   return 24 * 60 * 60 * 1000;     // 1 dia
    case '48h':   return 48 * 60 * 60 * 1000;     // 2 dias
    case '7d':    return 7 * 24 * 60 * 60 * 1000; // 7 dias
    case 'custom': return parseInt(customDias) * 24 * 60 * 60 * 1000;
  }
};
```

### Validação de CPF (em SignatureLink.tsx)
```typescript
if (cpfInput.length !== 4 || !/^\d{4}$/.test(cpfInput)) {
  // Só aceita 4 dígitos numéricos
}
```

---

## 📋 Checklist de Funcionalidades

- ✅ Gerar link único para cada cliente
- ✅ Definir validade do link (24h, 48h, 7d, custom)
- ✅ Exibir código de acesso (últimos 4 CPF)
- ✅ Incluir código ao copiar link
- ✅ Validar CPF antes de visualizar contrato
- ✅ Link expira automaticamente
- ✅ Gerar OTP para confirmação
- ✅ Criar hash SHA-256 com dados da assinatura
- ✅ Gerar selo digital com nome + CPF (não mascarado)
- ✅ Registrar IP da assinatura
- ✅ Marcar link como assinado
- ✅ Reabertura só mostra download (sem pedir CPF)
- ✅ Vendedor pode copiar link (para referência)

---

## 🔗 Referências no Código

### Geração do Link
- `src/utils/signatureLinksRepository.ts` - `createSignatureLink()`
- `src/components/GenerateSignatureCodeModal.tsx` - Modal de geração

### Validação do Link
- `sql/migrations/create_signature_link_rpcs.sql` - RPCs de validação
- `src/pages/SignatureLink.tsx` - Página de assinatura do cliente

### Componentes
- `src/components/ClientSignatureModal.tsx` - Modal de assinatura
- `src/components/DigitalSignatureStamp.tsx` - Selo digital

---

**Última atualização:** 24/08/2026
**Status:** Pronto para produção ✅

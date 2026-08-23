# Paleta de Cores - Sistema de Contratos

## Cores Definidas

### 🟢 Verde (Primária)
- **Verde Principal**: `#22c55e` (bg-green-500, text-green-500)
- **Verde Escuro**: `#16a34a` (bg-green-600, text-green-600)
- **Verde Claro**: `#86efac` (bg-green-300, text-green-300)
- **Verde Muito Claro**: `#dcfce7` (bg-green-100, text-green-100)

**Uso**: Botões de ação principal, links ativos, destaques, accents.

---

### 🩶 Cinza Grafite (Secundária)
- **Grafite Escuro**: `#1e293b` (bg-slate-800, text-slate-800)
- **Grafite Médio**: `#475569` (bg-slate-600, text-slate-600)
- **Grafite Claro**: `#cbd5e1` (bg-slate-300, text-slate-300)
- **Grafite Muito Claro**: `#f1f5f9` (bg-slate-100, text-slate-100)

**Uso**: Texto secundário, backgrounds neutros, borders, divisores.

---

### ⚪ Branco (Neutro)
- **Branco Puro**: `#ffffff` (bg-white, text-white)

**Uso**: Backgrounds principais, áreas de conteúdo, cards.

---

## Mapeamento de Classes Tailwind

| Tailwind | Hex | Uso |
|----------|-----|-----|
| `bg-green-500` | #22c55e | Fundo principal verde |
| `text-green-600` | #16a34a | Texto verde |
| `border-green-300` | #86efac | Bordas verdes |
| `bg-slate-800` | #1e293b | Fundo escuro (nav, footer) |
| `text-slate-900` | #0f172a | Texto principal (preto) |
| `bg-white` | #ffffff | Fundo branco |
| `bg-slate-50` | #f8fafc | Fundo cinza bem claro |
| `bg-slate-100` | #f1f5f9 | Fundo cinza claro |

---

## Exemplo de Uso em Componentes

### Botão Primário (Verde)
```tsx
<button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
  Ação Principal
</button>
```

### Botão Secundário (Cinza)
```tsx
<button className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-2 rounded-lg">
  Ação Secundária
</button>
```

### Card Neutro
```tsx
<div className="bg-white border border-slate-200 rounded-lg p-4">
  Conteúdo
</div>
```

### Navegação
```tsx
<nav className="bg-slate-800 text-white">
  Navegação
</nav>
```

---

## Acessibilidade

- ✅ Contraste suficiente entre verde-500 e branco (WCAG AA)
- ✅ Contraste suficiente entre slate-800 e branco (WCAG AAA)
- ✅ Cores não são o único indicador visual (usar text, icons, etc)

---

## Atualizado em
Agosto 2026

import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Personalizada: Verde, Cinza Grafite, Branco
        brand: {
          // Verde
          'green': {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#145231',
            950: '#052e16',
          },
          // Cinza Grafite
          'slate': {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
            950: '#020617',
          },
          // Branco (base)
          'white': '#ffffff',
        },
      },
      backgroundColor: {
        // Atalhos para usar bg-brand-green-500, etc
        'primary': '#22c55e',
        'secondary': '#1e293b',
        'light': '#ffffff',
      },
      textColor: {
        'primary': '#22c55e',
        'secondary': '#1e293b',
        'light': '#ffffff',
      },
      borderColor: {
        'primary': '#22c55e',
        'secondary': '#1e293b',
        'light': '#e2e8f0',
      },
    },
  },
  plugins: [],
} satisfies Config

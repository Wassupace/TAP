import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080A0F',
        court: '#0E131C',
        panel: '#141B26',
        'panel-2': '#1B2431',
        'panel-3': '#222D3C',
        chalk: '#F3F6FC',
        dim: '#93A1B5',
        faint: '#5C6A7E',
        orange: '#FF5A1F',
        'orange-2': '#FF7C40',
        teamA: '#3B82F6',
        teamB: '#EF4444',
        hit: '#22C55E',
        warn: '#EAB308',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        heading: ['"Archivo Expanded"', 'Archivo', 'sans-serif'],
        body: ['Archivo', 'sans-serif'],
      },
      borderRadius: {
        lg: '26px',
        md: '18px',
        sm: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config

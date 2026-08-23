import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:       'var(--ink)',
        court:     'var(--court)',
        panel:     'var(--panel)',
        'panel-2': 'var(--panel-2)',
        'panel-3': 'var(--panel-3)',
        chalk:     'var(--chalk)',
        dim:       'var(--dim)',
        faint:     'var(--faint)',
        orange:    'var(--orange)',
        'orange-2':'var(--orange-2)',
        teamA:     'var(--blue)',
        teamB:     'var(--red)',
        hit:       'var(--green)',
        warn:      'var(--yellow)',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        heading: ['"Archivo Expanded"', 'Archivo', 'sans-serif'],
        body:    ['Archivo', 'sans-serif'],
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
    },
  },
  plugins: [],
} satisfies Config

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:       '#111827',
        court:     '#111827',
        panel:     '#1F2937',
        'panel-2': '#374151',
        'panel-3': '#4B5563',
        chalk:     '#F9FAFB',
        dim:       '#9CA3AF',
        faint:     '#6B7280',
        orange:    '#FF5A1F',
        'orange-2':'#FF7C40',
        teamA:     '#3B82F6',
        teamB:     '#EF4444',
        hit:       '#10B981',
        warn:      '#F59E0B',
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

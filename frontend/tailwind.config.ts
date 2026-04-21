import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:     '#2779a7',
        'primary-c': '#1e6090',
        brand:       '#3491be',
        'primary-f': '#a8d8f0',
        accent:      '#ECD06F',
        'accent-dim':'#d4b84e',
        'on-accent': '#1a1200',
        surface: {
          lowest:  '#ffffff',
          low:     '#f0f7fc',
          DEFAULT: '#e3f0f8',
          high:    '#d6e8f4',
          highest: '#c9e0f0',
        },
        'on-surface':         '#0a1f2e',
        'on-surface-variant': '#2d4a5e',
        'on-primary':         '#ffffff',
        error:                '#ba1a1a',
        tertiary:             '#a72d51',
        'secondary-c':        '#dbeef8',
      },
      fontFamily: {
        display: ['var(--font-manrope)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        sm:   '2px',
        md:   '6px',
        lg:   '8px',
        xl:   '12px',
        '2xl':'16px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(10, 31, 46, 0.06)',
      },
    },
  },
  plugins: [],
}

export default config

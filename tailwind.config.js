/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-muted) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted-foreground) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        glass: 'rgb(var(--glass) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        // Legacy ("terra") token aliases
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Raleway', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgb(15 23 42 / 0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-24px) scale(1.05)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        float: 'float 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: 'var(--primary-color)',
                        background: 'var(--background)',
                        foreground: 'var(--foreground)',
                        card: 'var(--card)',
                        'card-foreground': 'var(--card-foreground)',
                        'primary-theme': 'var(--primary)',
                        'primary-foreground': 'var(--primary-foreground)',
                        secondary: 'var(--secondary)',
                        'secondary-foreground': 'var(--secondary-foreground)',
                        muted: 'var(--muted)',
                        'muted-foreground': 'var(--muted-foreground)',
                        accent: 'var(--accent)',
                        border: 'var(--border)',
                        ring: 'var(--ring)',
                        sky: {
                            50: '#f0f9ff',
                            100: '#e0f2fe',
                            200: '#bae6fd',
                            300: '#7dd3fc',
                            400: '#38bdf8',
                            500: '#0ea5e9',
                            600: '#0284c7',
                            700: '#0369a1',
                            800: '#075985',
                            900: '#0c4a6e',
                        }
                    },
                    fontFamily: {
                        serif: ['Fraunces', 'serif'],
                        sans: ['Inter', 'sans-serif'],
                        raleway: ['Raleway', 'sans-serif'],
                    },
                    boxShadow: {
                        'terra-sm': '0 2px 8px rgba(46, 50, 48, 0.04)',
                        'terra': '0 4px 20px rgba(46, 50, 48, 0.06)',
                        'terra-lg': '0 8px 32px rgba(46, 50, 48, 0.08)',
                    }
                }
            },
            plugins: [
                function ({ addVariant }) {
                    addVariant('sepia', '.sepia &')
                }
            ]
        };

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── 60% Dominant Background ── */
        ivory: {
          50: '#FDFCFA',
          100: '#FAF8F5',
          200: '#F7F5F2',  // Light-mode primary bg
          300: '#EDE9E3',
          400: '#E0DBD3',
        },
        charcoal: {
          700: '#2A2A2A',
          800: '#1A1A1A',  // Dark-mode surface
          900: '#121212',  // Dark-mode primary bg
          950: '#0A0A0A',
        },

        /* ── 30% Structural Secondary ── */
        bordeaux: {
          50: '#FBF0F2',
          100: '#F5DCE1',
          200: '#E8B5BF',
          300: '#D48B9B',
          400: '#9E4A5D',
          500: '#6E2C3A',  // Primary structural
          600: '#5A1E2A',  // Darker structural
          700: '#481824',
          800: '#3A1220',
          900: '#2D0D18',
        },
        olive: {
          400: '#5A6B5C',
          500: '#3E4A3F',  // Dark-mode structural
          600: '#2F382F',
        },
        stone: {
          200: '#E8E2DA',
          300: '#D8D2C8',  // Light-mode card/surface
          400: '#C8C0B4',
          500: '#B0A898',
        },

        /* ── 10% Accent ── */
        ruby: {
          50: '#FEF0F0',
          100: '#FDD8D8',
          200: '#FAB0B2',
          300: '#E86B6F',
          400: '#C93035',
          500: '#A6192E',  // Primary CTA accent
          600: '#8B1526',
          700: '#70101E',
          800: '#560C16',
          900: '#3C080F',
        },
        copper: {
          50: '#FDF5EC',
          100: '#FAEBD5',
          200: '#F0D4A8',
          300: '#D4A872',
          400: '#B87333',  // Secondary accent
          500: '#9A5F28',
          600: '#7C4C20',
          700: '#5E3918',
        },
        garnet: {
          500: '#8B0000',
          600: '#700000',
        },

        /* ── Legacy wine palette (for backward compat) ── */
        wine: {
          50: '#FBF0F2',
          100: '#F5DCE1',
          200: '#E8B5BF',
          300: '#D48B9B',
          400: '#B86A7A',
          500: '#9E4A5D',
          600: '#7A3347',
          700: '#5A1E2A',
          800: '#481824',
          900: '#5A1E2A',
          950: '#2D0D18',
        },
        gold: {
          50: '#FFFCEB',
          100: '#FDF5D0',
          200: '#FAEAA0',
          300: '#F5D96A',
          400: '#E8C43A',
          500: '#D4A21A',
          600: '#A78B0E',
          700: '#7A6509',
          800: '#544708',
          900: '#3b3207',
        },
        cream: {
          50: '#FDFCFA',
          100: '#FAF8F5',
          200: '#F7F5F2',
          300: '#EDE9E3',
          400: '#E0DBD3',
        },

        /* ── Semantic colors (CSS variable based) ── */
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          foreground: 'rgb(var(--success-foreground) / <alpha-value>)',
          muted: 'rgb(var(--success-muted) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          foreground: 'rgb(var(--warning-foreground) / <alpha-value>)',
          muted: 'rgb(var(--warning-muted) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          foreground: 'rgb(var(--info-foreground) / <alpha-value>)',
          muted: 'rgb(var(--info-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-heebo)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        hebrew: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      spacing: {
        section: '48px',
        'card-gap': '24px',
        inner: '16px',
        tight: '8px',
      },
      boxShadow: {
        'soft': '0 2px 16px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 4px 24px rgba(0, 0, 0, 0.08)',
        'lift': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        subtleScale: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'subtle-scale': 'subtleScale 0.3s ease-out',
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      lineHeight: {
        relaxed: '1.6',
        loose: '1.7',
      },
    },
  },
  plugins: [],
};

export default config;

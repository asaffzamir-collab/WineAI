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
        // Wine-inspired color palette
        wine: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a9ba',
          400: '#ec7896',
          500: '#df4d75',
          600: '#c93260',
          700: '#a8254f',
          800: '#8c2246',
          900: '#722040',  // Primary wine/burgundy color
          950: '#470d22',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#d4a21a',  // Warm gold accent
          600: '#a78b0e',
          700: '#7a6509',
          800: '#544708',
          900: '#3b3207',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf8f0',  // Light cream background
          200: '#faf0e1',
          300: '#f5e3c8',
          400: '#efd1a5',
        },
      },
      fontFamily: {
        sans: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;

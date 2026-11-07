import type { Config } from 'tailwindcss';

/** Token lấy từ Stitch design system "L'Amour Editorial". */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#fdf8f6', surface: '#fdf8f6', 'surface-dim': '#ddd9d7',
        'surface-container-lowest': '#ffffff', 'surface-container-low': '#f7f3f0',
        'surface-container': '#f1edeb', 'surface-container-high': '#ece7e5', 'surface-container-highest': '#e6e2df',
        'surface-variant': '#e6e2df',
        'on-surface': '#1c1b1a', 'on-surface-variant': '#4d463c',
        'inverse-surface': '#31302f', 'inverse-on-surface': '#f4f0ee',
        outline: '#7f766a', 'outline-variant': '#d1c5b8',
        primary: '#725b38', 'on-primary': '#ffffff', 'primary-container': '#c5a880',
        'on-primary-container': '#513d1d', 'primary-fixed': '#fedeb2', 'primary-fixed-dim': '#e0c298',
        secondary: '#675c57', 'secondary-container': '#ecddd6', 'on-secondary-container': '#6b605b',
        tertiary: '#735c00', 'tertiary-container': '#cda931', 'tertiary-fixed': '#ffe088',
        error: '#ba1a1a', 'error-container': '#ffdad6',
      },
      borderRadius: { DEFAULT: '0.125rem', lg: '0.25rem', xl: '0.5rem', full: '0.75rem', pill: '9999px' },
      spacing: {
        'space-xs': '0.25rem', 'space-sm': '0.5rem', 'space-md': '1rem', 'space-lg': '1.5rem',
        'space-xl': '2.5rem', 'space-2xl': '4rem',
        'gutter-sm': '0.75rem', gutter: '1.5rem', 'gutter-lg': '2.5rem',
        'margin-mobile': '1.25rem', margin: '2rem', 'margin-desktop': '4rem',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

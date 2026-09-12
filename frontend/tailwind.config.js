/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F172A',
          dark: '#0B1120',
          container: '#131B2E',
        },
        'primary-container': '#131B2E',
        'on-primary': '#FFFFFF',
        'on-primary-container': '#7C839B',
        secondary: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          container: '#DC2626',
        },
        'secondary-container': '#DC2626',
        'on-secondary': '#FFFFFF',
        'on-secondary-container': '#FFFBFF',
        royal: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#DBEAFE',
        },
        'on-tertiary-container': '#497CFF',
        surface: {
          DEFAULT: '#F8FAFC',
          bright: '#F8FAFC',
          dim: '#D8DADC',
          variant: '#E0E3E5',
        },
        'surface-container-lowest': '#FFFFFF',
        'surface-container-low': '#F2F4F6',
        'surface-container': '#ECEEF0',
        'surface-container-high': '#E6E8EA',
        'surface-container-highest': '#E0E3E5',
        'on-surface': '#191C1E',
        'on-surface-variant': '#45464D',
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        badminton: {
          primary: '#0ea5e9',
          secondary: '#f97316',
          dark: '#0f172a',
          court: '#059669',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      maxWidth: {
        'container-max': '80rem',
      },
      boxShadow: {
        'card-rest': '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        'card-hover': '0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
        'header-sticky': '0 4px 20px rgba(15, 23, 42, 0.25)',
        'elevated-flyout': '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        badminton: {
          primary: '#0ea5e9',    // Electric sky blue
          secondary: '#f97316',  // Energetic court orange
          dark: '#0f172a',       // Deep navy
          court: '#059669',      // Badminton court green
        }
      }
    },
  },
  plugins: [],
}

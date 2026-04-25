/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(167, 139, 250, 0.35)',
        'glow': '0 0 24px rgba(167, 139, 250, 0.45)',
        'glow-lg': '0 0 40px rgba(167, 139, 250, 0.55)',
      },
      colors: {
        accent: {
          DEFAULT: '#a78bfa',
          light: '#7c3aed',
          dark: '#a78bfa',
        },
        steel: {
          light: '#9CA3AF',
        },
      },
    },
  },
  plugins: [],
};

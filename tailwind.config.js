const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  colors: {
    // Build your palette here
    transparent: 'transparent',
    current: 'currentColor',
    black: colors.black,
    white: colors.white,
    blueGray: colors.slate,
    gray: colors.gray,
    trueGray: colors.neutral,
    warmGray: colors.stone,
    red: colors.red,
    orange: colors.orange,
    amber: colors.amber,
    yellow: colors.amber,
    lime: colors.lime,
    green: colors.green,
    emerald: colors.emerald,
    teal: colors.teal,
    cyan: colors.cyan,
    sky: colors.sky,
    blue: colors.blue,
    indigo: colors.indigo,
    violet: colors.violet,
    purple: colors.purple,
    fuchsia: colors.fuchsia,
    pink: colors.pink,
    rose: colors.rose,
    steel: {
      light: '#9CA3AF',
    },
  },
  plugins: [],
}

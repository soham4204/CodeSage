/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cs-black': '#1a1a1a',
        'cs-red': '#e53e3e',
        'cs-red-dark': '#c53030',
        'cs-gray': '#a0aec0',
      },
      fontFamily: {
        'exo2': ['"Exo 2"', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}
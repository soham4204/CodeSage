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
      },
      backgroundImage: {
        'volcanic-ember': `
          radial-gradient(ellipse 120% 70% at 70% 80%, rgba(185, 28, 28, 0.25), transparent 52%),
          radial-gradient(ellipse 160% 45% at 30% 30%, rgba(220, 38, 38, 0.2), transparent 58%),
          radial-gradient(ellipse 85% 100% at 10% 60%, rgba(127, 29, 29, 0.22), transparent 46%),
          #1c1917
        `,
      },
    },
  },
  plugins: [],
}

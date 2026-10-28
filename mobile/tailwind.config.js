/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--fw-accent) / <alpha-value>)',
        primary: 'rgb(var(--fw-primary) / <alpha-value>)',
        game: 'rgb(var(--fw-game) / <alpha-value>)',
        onselection: 'rgb(var(--fw-actionText) / <alpha-value>)',
        selection: 'rgb(var(--fw-actionBackground) / <alpha-value>)',
        canvas: 'rgb(var(--fw-canvas) / <alpha-value>)',
        surface: 'rgb(var(--fw-surface) / <alpha-value>)',
        ink: 'rgb(var(--fw-text) / <alpha-value>)',
        muted: 'rgb(var(--fw-muted) / <alpha-value>)',
        line: 'rgb(var(--fw-border) / <alpha-value>)',
        negative: 'rgb(var(--fw-negative) / <alpha-value>)',
        danger: 'rgb(var(--fw-danger) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

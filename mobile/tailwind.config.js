/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: require('../shared/design-tokens.json').light.accent,
        canvas: require('../shared/design-tokens.json').light.canvas,
        surface: require('../shared/design-tokens.json').light.surface,
        ink: require('../shared/design-tokens.json').light.text,
        muted: require('../shared/design-tokens.json').light.muted,
        line: require('../shared/design-tokens.json').light.border,
      },
    },
  },
  plugins: [],
}

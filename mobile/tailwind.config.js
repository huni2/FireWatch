/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // web/src/lib/theme.ts BRAND_GREEN과 동일 — 웹·모바일 브랜드 컬러 일치
        brand: '#00754A',
      },
    },
  },
  plugins: [],
}

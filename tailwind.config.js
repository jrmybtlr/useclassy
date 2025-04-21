/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,vue}',
    './src/**/*.{js,ts,jsx,tsx,vue}',
    './.classy/**/*.{js,ts,jsx,tsx,vue,css}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwindcss-motion'),
  ],
} 
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,vue}',
    './src/**/*.{js,ts,jsx,tsx,vue}',
    './.classy/**/*.{js,ts,jsx,tsx,vue,css}',
  ],
  safelist: [
    "hover:text-zinc-100",
    "dark:bg-zinc-950",
    "dark:text-white",
    "group-hover:-rotate-6",
    "group-hover:-translate-y-8",
    "hover:rotate-12",
    "hover:-translate-y-4",
    "max-md:text-4xl",
    "md:text-7xl",
    "lg:text-8xl"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwindcss-motion'),
  ],
} 
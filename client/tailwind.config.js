/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#09090b', // zinc-950
        card: '#18181b', // zinc-900
        'card-hover': '#27272a', // zinc-800
        primary: '#3b82f6', // blue-500
        'primary-hover': '#2563eb', // blue-600
        border: '#27272a', // zinc-800
        muted: '#a1a1aa', // zinc-400
        foreground: '#fafafa', // zinc-50
      }
    },
  },
  plugins: [],
}
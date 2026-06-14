/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rasci: {
          R: '#ef4444',
          A: '#f97316',
          S: '#3b82f6',
          C: '#8b5cf6',
          I: '#10b981',
        },
      },
    },
  },
  plugins: [],
}


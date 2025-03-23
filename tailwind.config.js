/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        trebuchet: ['Trebuchet MS', 'sans-serif'], // Add the custom font
        baloo: ['Baloo 2', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      gridTemplateColumns: {
        '5': 'repeat(5, minmax(0, 1fr))', // Add a 20-column grid
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      backdropSaturate: {
        0: '0',
        50: '.5',
        100: '1',
        150: '1.5',
        200: '2',
      },
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
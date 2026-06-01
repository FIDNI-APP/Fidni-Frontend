/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Lavender / indigo palette from new design
        lavender: {
          50: '#f8f7ff',
          100: '#f0effe',
          200: '#e4e2f5',
          300: '#d0ceec',
          400: '#b0adcd',
          500: '#9391b8',
          600: '#7068a8',
          700: '#4b4880',
          800: '#1e1b4b',
          900: '#1a1635',
        },
        ink: {
          DEFAULT: '#1e1b4b',
          soft: '#4b4880',
          muted: '#7068a8',
          faint: '#9391b8',
        },
        accent: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          soft: '#eef2ff',
          softer: '#f5f4ff',
          border: '#c7d2fe',
        },
        // Subject themes
        subject: {
          analyse: { from: '#4f46e5', to: '#818cf8', light: '#eef2ff', text: '#4338ca' },
          algebre: { from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490' },
          proba:   { from: '#059669', to: '#34d399', light: '#ecfdf5', text: '#047857' },
          physics: { from: '#d97706', to: '#fbbf24', light: '#fffbeb', text: '#a16207' },
          svt:     { from: '#059669', to: '#34d399', light: '#ecfdf5', text: '#047857' },
          fr:      { from: '#be185d', to: '#f472b6', light: '#fdf2f8', text: '#9d174d' },
          philo:   { from: '#6d28d9', to: '#a78bfa', light: '#f5f3ff', text: '#5b21b6' },
          en:      { from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490' },
        },
      },
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
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
        // legacy
        trebuchet: ['Trebuchet MS', 'sans-serif'],
        baloo: ['Baloo 2', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        'card': '20px',
        'pill': '99px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(90,70,200,.06)',
        'card-hover': '0 10px 36px rgba(90,70,200,.13)',
        'glow': '0 14px 40px rgba(79,70,229,.2)',
      },
      gridTemplateColumns: {
        '5': 'repeat(5, minmax(0, 1fr))',
      },
      keyframes: {
        fadeUp: {
          'from': { opacity: '0', transform: 'translateY(16px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { opacity: '0', transform: 'translateX(20px)' },
          'to':   { opacity: '1', transform: 'translateX(0)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-7px)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp .4s cubic-bezier(.25,.46,.45,.94) both',
        'slide-in': 'slideIn .35s ease both',
        'floaty':   'floaty 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

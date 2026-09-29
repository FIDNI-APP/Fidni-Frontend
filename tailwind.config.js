/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Ink & paper" warm-neutral scale (replaces the old lavender ramp)
        lavender: {
          50:  '#faf9f7',
          100: '#f7f6f3',
          200: '#f2f1ee',
          300: '#e7e3dc',
          400: '#cfcdc8',
          500: '#9a958c',
          600: '#6b6862',
          700: '#33302b',
          800: '#1a1a1a',
          900: '#141414',
        },
        // ── Canonical palette. Direct hex (NOT var()) so Tailwind utilities
        //    always render regardless of CSS-var resolution. These mirror the
        //    :root values in src/index.css (kept in sync; :root drives the
        //    inline `var(--…)` styles in Landing/Home).
        paper:   '#faf9f7',
        surface: '#ffffff',
        line:    '#e7e3dc',
        ink: {
          DEFAULT: '#1a1a1a',
          soft:    '#33302b',
          muted:   '#4b4843',
          faint:   '#6b6862',
        },
        // Brand green — marks action / progress only. Prefer this over the
        // legacy `accent` token below (which is INK BLACK, kept for back-compat).
        brand: {
          DEFAULT: '#1a7a4a',
          hover:   '#15633c',
          soft:    '#eaf3ed',
          line:    '#cfe6d8',
        },
        // Gold — BRAND IDENTITY only (logo echo): active tab, section/structure
        // labels, title accent bar, brand badges. NOT for actions (use brand
        // green) or success. Refined deeper than the bright logo so it reads.
        gold: {
          DEFAULT: '#c0892f',
          strong:  '#9a6e1c',
          soft:    '#faf3e2',
          line:    '#ecdcb4',
        },
        accent: {
          DEFAULT: '#1a1a1a', // ⚠ black, not the brand — use `brand` for green
          hover: '#000000',
          soft: '#f2f1ee',
          softer: '#f7f6f3',
          border: '#e7e3dc',
        },
        // Subject themes — monochrome (identified by label, not colour)
        subject: {
          analyse: { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          algebre: { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          proba:   { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          physics: { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          svt:     { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          fr:      { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          philo:   { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
          en:      { from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
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
        'card': '16px',
        'pill': '99px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(20,18,16,.05)',
        'card-hover': '0 4px 14px rgba(20,18,16,.08)',
        'glow': '0 4px 14px rgba(20,18,16,.10)',
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

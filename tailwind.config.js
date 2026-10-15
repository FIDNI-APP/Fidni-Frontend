/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Ink & paper" warm-neutral scale (replaces the old lavender ramp)
        lavender: {
          50:  'rgb(var(--c-lav-50) / <alpha-value>)',
          100: 'rgb(var(--c-lav-100) / <alpha-value>)',
          200: 'rgb(var(--c-lav-200) / <alpha-value>)',
          300: 'rgb(var(--c-lav-300) / <alpha-value>)',
          400: 'rgb(var(--c-lav-400) / <alpha-value>)',
          500: 'rgb(var(--c-lav-500) / <alpha-value>)',
          600: 'rgb(var(--c-lav-600) / <alpha-value>)',
          700: 'rgb(var(--c-lav-700) / <alpha-value>)',
          800: 'rgb(var(--c-lav-800) / <alpha-value>)',
          900: 'rgb(var(--c-lav-900) / <alpha-value>)',
        },
        // ── Canonical palette. Mode sombre (15/10/2026) : variables CSS en canaux RVB (--c-*, index.css :root et
        //    .dark), l'opacité Tailwind (bg-ink/10…) reste possible avec <alpha-value>.
        paper:   'rgb(var(--c-paper) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        line:    'rgb(var(--c-line) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft:    'rgb(var(--c-ink-soft) / <alpha-value>)',
          muted:   'rgb(var(--c-ink-muted) / <alpha-value>)',
          faint:   'rgb(var(--c-ink-faint) / <alpha-value>)',
        },
        // Brand green — marks action / progress only. Prefer this over the
        // legacy `accent` token below (which is INK BLACK, kept for back-compat).
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          hover:   'rgb(var(--c-brand-hover) / <alpha-value>)',
          soft:    'rgb(var(--c-brand-soft) / <alpha-value>)',
          line:    'rgb(var(--c-brand-line) / <alpha-value>)',
        },
        // Gold — BRAND IDENTITY only (logo echo): active tab, section/structure
        // labels, title accent bar, brand badges. NOT for actions (use brand
        // green) or success. Refined deeper than the bright logo so it reads.
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          strong:  'rgb(var(--c-gold-strong) / <alpha-value>)',
          soft:    'rgb(var(--c-gold-soft) / <alpha-value>)',
          line:    'rgb(var(--c-gold-line) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)', // ⚠ black, not the brand — use `brand` for green
          hover: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-lav-200) / <alpha-value>)',
          softer: 'rgb(var(--c-lav-100) / <alpha-value>)',
          border: 'rgb(var(--c-line) / <alpha-value>)',
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
        sans: ['DM Sans', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
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
        // Fenêtre « Nouveautés » (14/10/2026) : barres qui montent, s'étirent, courbes qui se tracent.
        grandir: { 'from': { transform: 'scaleY(0)' }, 'to': { transform: 'scaleY(1)' } },
        etirer:  { 'from': { transform: 'scaleX(0)' }, 'to': { transform: 'scaleX(1)' } },
        trace:   { 'from': { strokeDashoffset: '200' }, 'to': { strokeDashoffset: '0' } },
      },
      animation: {
        'fade-up': 'fadeUp .4s cubic-bezier(.25,.46,.45,.94) both',
        'slide-in': 'slideIn .35s ease both',
        'floaty':   'floaty 4s ease-in-out infinite',
        'grandir':  'grandir .55s cubic-bezier(.22,1,.36,1) both',
        'etirer':   'etirer .7s cubic-bezier(.22,1,.36,1) both',
        'trace':    'trace 1.1s cubic-bezier(.45,0,.2,1) both',
      },
    },
  },
  plugins: [],
};

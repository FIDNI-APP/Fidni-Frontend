import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Bouton partagé, aligné sur le système « encre & papier » (mêmes rendus que .fd-btn-primary
 * et .fd-btn-ghost d'index.css). Remplace l'ancien style « liquid glass » (verre flou, reflet
 * qui balaie au survol, zoom) qui détonnait avec le reste du site et rendait le texte blanc
 * illisible sur fond clair. `className` reste prioritaire (tailwind-merge).
 */
type Variant = 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
  /** React 19 : `ref` est une prop ordinaire, transmise au <button> par le spread. */
  ref?: React.Ref<HTMLButtonElement>;
}

const VARIANTS: Record<Variant, string> = {
  default: 'bg-brand text-white border border-brand hover:bg-brand-hover hover:border-brand-hover',
  primary: 'bg-brand text-white border border-brand hover:bg-brand-hover hover:border-brand-hover',
  secondary: 'bg-brand-soft text-brand-hover border border-brand-line hover:bg-[#dcede2]',
  outline: 'bg-white text-ink-soft border border-[#d8d4cc] hover:border-ink hover:text-ink hover:bg-[#f7f6f3]',
  ghost: 'bg-transparent text-ink-soft border border-transparent hover:bg-[#f2f1ee] hover:text-ink',
  destructive: 'bg-[#c2564f] text-white border border-[#c2564f] hover:bg-[#a8463f] hover:border-[#a8463f]',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
  loading = false,
  disabled,
  ...props
}) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
      VARIANTS[variant] ?? VARIANTS.default,
      SIZES[size],
      (disabled || loading) && 'opacity-50 cursor-not-allowed',
      className
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <>
        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" aria-hidden="true" />
        <span>Chargement…</span>
      </>
    ) : (
      children
    )}
  </button>
);

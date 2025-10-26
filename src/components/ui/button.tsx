import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
  loading = false,
  disabled,
  ...props
}) => {
  const baseClasses = 'liquid-glass-button font-medium transition-all duration-300 rounded-xl liquid-effect justify-center flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
  
  const variantClasses = {
    default: 'text-white',
    primary: 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white hover:from-indigo-500/30 hover:to-purple-500/30',
    secondary: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 hover:from-emerald-500/30 hover:to-teal-500/30',
    ghost: 'liquid-glass !backdrop-filter-none !bg-transparent border-transparent hover:border-gray-200'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg'
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
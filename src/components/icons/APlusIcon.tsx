import React from 'react';

interface APlusIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const APlusIcon: React.FC<APlusIconProps> = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Letter A */}
    <path d="M2 20L6 4h2l4 16" />
    <path d="M3.5 14h7" />
    {/* Plus sign */}
    <path d="M17 6v8" />
    <path d="M13 10h8" />
  </svg>
);

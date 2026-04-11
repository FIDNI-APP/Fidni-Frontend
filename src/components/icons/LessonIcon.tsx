import React from 'react';

interface LessonIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const LessonIcon: React.FC<LessonIconProps> = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Blackboard */}
    <rect x="2" y="2" width="18" height="12" rx="1.5" />
    {/* Text lines on board */}
    <path d="M4.5 6h8" />
    <path d="M4.5 8h10" />
    <path d="M4.5 10h6" />
    {/* Wavy line */}
    <path d="M4.5 12 Q6 11 7.5 12 T10.5 12" strokeWidth={1.5} />
    {/* Pencil — diagonal, resting on the board */}
    <path d="M13 4l4 5" strokeWidth={2} />
    <path d="M14.2 3.2l4 5" strokeWidth={1.2} />
    <path d="M13 4l-1 1.3" strokeWidth={1.5} />
    {/* Tripod legs */}
    <path d="M6 14l-3 8" />
    <path d="M11 14v8" />
    <path d="M16 14l3 8" />
    {/* Book at bottom-right */}
    <rect x="17" y="19" width="5" height="3.5" rx="0.5" />
    <path d="M19.5 19v3.5" />
  </svg>
);

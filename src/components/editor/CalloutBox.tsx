/**
 * CalloutBox - Professional callout component for educational content
 * Displays theorems, properties, definitions, etc. in standardized boxes
 */

import React from 'react';
import { CALLOUT_CONFIGS, CalloutType } from '@/types/callout';

interface CalloutBoxProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
  numbered?: boolean;
  number?: string;
}

export const CalloutBox: React.FC<CalloutBoxProps> = ({
  type,
  title,
  children,
  numbered = false,
  number,
}) => {
  const config = CALLOUT_CONFIGS[type];

  return (
    <div
      className={`callout-box my-4 rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} p-4 shadow-sm`}
      data-callout-type={type}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <span className={`text-2xl ${config.iconColor} flex-shrink-0`} aria-hidden="true">
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`font-bold text-sm uppercase tracking-wide ${config.textColor}`}>
              {config.label}
              {numbered && number && ` ${number}`}
            </span>
            {title && (
              <span className={`font-semibold text-base ${config.textColor}`}>
                {title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`callout-content pl-11 ${config.textColor} text-sm leading-relaxed`}>
        {children}
      </div>
    </div>
  );
};

export default CalloutBox;

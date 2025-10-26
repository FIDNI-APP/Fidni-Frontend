import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingStateProps {
  /**
   * Message to display below the spinner
   * @default 'Loading...'
   */
  message?: string;

  /**
   * Whether to render in full-screen mode with gradient background
   * @default true
   */
  fullScreen?: boolean;

  /**
   * Custom icon to display in the center (replaces default Loader2)
   */
  icon?: React.ReactNode;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Show animated dots below the message
   * @default true
   */
  showDots?: boolean;
}

/**
 * Reusable loading state component with spinner animation
 *
 * Provides a consistent loading experience across the application
 * with optional full-screen mode and customizable messaging.
 *
 * @example
 * // Full-screen loading
 * if (loading) return <LoadingState message="Loading exercise..." />;
 *
 * @example
 * // Inline loading
 * <LoadingState fullScreen={false} message="Saving..." showDots={false} />
 *
 * @example
 * // Custom icon
 * <LoadingState icon={<BookOpen className="w-8 h-8" />} message="Loading content..." />
 */
export function LoadingState({
  message = 'Loading...',
  fullScreen = true,
  icon,
  className = '',
  showDots = true,
}: LoadingStateProps) {
  const content = (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Spinner */}
      <div className="relative w-20 h-20">
        {/* Outer ring - static */}
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
        {/* Animated ring */}
        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
          {icon || <Loader2 className="w-8 h-8" />}
        </div>
      </div>

      {/* Message */}
      <p className="mt-6 text-lg font-medium text-indigo-900">{message}</p>

      {/* Animated dots */}
      {showDots && (
        <div className="mt-2 flex items-center space-x-2">
          <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
          <div
            className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '0.4s' }}
          ></div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline loading spinner for use within components
 *
 * @example
 * <div className="flex justify-center p-4">
 *   <InlineLoader message="Loading more..." />
 * </div>
 */
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
      {message && <p className="text-gray-600 text-sm">{message}</p>}
    </div>
  );
}

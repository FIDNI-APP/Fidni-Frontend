import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

interface ErrorStateProps {
  /**
   * Title of the error message
   * @default 'Error'
   */
  title?: string;

  /**
   * Detailed error message to display
   */
  message: string;

  /**
   * Optional callback for retry button
   */
  onRetry?: () => void;

  /**
   * Optional path to navigate back to
   */
  backLink?: string;

  /**
   * Label for the back button
   * @default 'Go Back'
   */
  backLabel?: string;

  /**
   * Whether to render in full-screen mode with gradient background
   * @default true
   */
  fullScreen?: boolean;

  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * Reusable error state component
 *
 * Provides a consistent error display across the application
 * with optional retry and navigation actions.
 *
 * @example
 * // Simple error
 * if (error) return <ErrorState message={error} />;
 *
 * @example
 * // With retry
 * <ErrorState
 *   title="Failed to Load"
 *   message="Could not fetch exercises"
 *   onRetry={refetch}
 * />
 *
 * @example
 * // With back navigation
 * <ErrorState
 *   title="Exercise Not Found"
 *   message="The exercise you're looking for doesn't exist"
 *   backLink="/exercises"
 *   backLabel="Back to Exercises"
 * />
 */
export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  backLink,
  backLabel = 'Go Back',
  fullScreen = true,
  className = '',
}: ErrorStateProps) {
  const navigate = useNavigate();

  const content = (
    <div className={`max-w-4xl mx-auto px-4 ${className}`}>
      {/* Error Card */}
      <div className="bg-white border-l-4 border-red-500 text-red-700 p-6 rounded-xl shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="ml-6 flex-1">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-base leading-relaxed">{message}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(onRetry || backLink) && (
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {backLink && (
            <Button
              onClick={() => navigate(backLink)}
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-24 pb-16">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline error banner for use within components
 *
 * @example
 * {error && <InlineError message={error} onDismiss={() => setError(null)} />}
 */
export function InlineError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

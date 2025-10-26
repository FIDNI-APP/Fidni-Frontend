import { useState, useCallback } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseAsyncStateReturn<T> extends AsyncState<T> {
  /**
   * Execute the async function
   */
  execute: (...args: any[]) => Promise<T>;

  /**
   * Reset the state to initial values
   */
  reset: () => void;

  /**
   * Set data manually
   */
  setData: (data: T | null) => void;

  /**
   * Set error manually
   */
  setError: (error: string | null) => void;
}

/**
 * Generic hook for managing async operations state
 *
 * Handles loading, error, and data states automatically for async functions.
 * Eliminates the need for manual useState + try/catch patterns.
 *
 * @param asyncFunction - The async function to execute
 * @param initialData - Optional initial data value
 *
 * @example
 * const { data, loading, error, execute } = useAsyncState(
 *   async (id: string) => await fetchExercise(id)
 * );
 *
 * // In component
 * useEffect(() => {
 *   execute(exerciseId);
 * }, [exerciseId]);
 *
 * if (loading) return <LoadingState />;
 * if (error) return <ErrorState message={error} />;
 * return <div>{data?.title}</div>;
 */
export function useAsyncState<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  initialData: T | null = null
): UseAsyncStateReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await asyncFunction(...args);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'An error occurred';
        setState((prev) => ({ ...prev, loading: false, error }));
        throw err;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

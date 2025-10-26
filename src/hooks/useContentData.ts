/**
 * Custom Hook: useContentData
 *
 * Simplifies data fetching and state management for content pages
 * Extracts loading/error/data logic
 */

import { useState, useEffect } from 'react';

export interface UseContentDataProps<T> {
  contentId: string;
  fetchFunction: (id: string) => Promise<T>;
  markViewedFunction?: (id: string) => Promise<void>;
  dependencies?: any[];
}

/**
 * Generic hook for fetching and managing content data
 */
export function useContentData<T>({
  contentId,
  fetchFunction,
  markViewedFunction,
  dependencies = [],
}: UseContentDataProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const fetchData = async () => {
    if (!contentId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction(contentId);
      setData(result);

      // Mark as viewed if function provided
      if (markViewedFunction) {
        await markViewedFunction(contentId);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount or when dependencies change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, ...dependencies]);

  // Refresh data
  const refresh = () => {
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refresh,
    setData, // Allow manual updates
  };
}

/**
 * Hook: useContentStatistics
 *
 * Fetches and manages statistics for exercises and exams
 * Handles loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ContentStatistics,
  getContentStatistics
} from '@/lib/api/statisticsApi';

interface UseContentStatisticsProps {
  contentType: 'exercise' | 'exam';
  contentId: string | undefined;
  enabled?: boolean;
}

export function useContentStatistics({
  contentType,
  contentId,
  enabled = true
}: UseContentStatisticsProps) {
  const [statistics, setStatistics] = useState<ContentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    if (!enabled || !contentId) {
      setStatistics(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getContentStatistics(contentType, contentId);
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('Failed to load statistics');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId, enabled]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const refetch = useCallback(() => {
    loadStatistics();
  }, [loadStatistics]);

  return {
    statistics,
    loading,
    error,
    refetch
  };
}

/**
 * Hook: useSolutionTracking
 *
 * Manages tracking when a user views the solution
 * Automatically detects if solution is viewed before completion
 * Sends signal to backend and shows notification to user
 */

import { useState, useCallback } from 'react';
import { markSolutionViewed, SolutionViewTrackingResponse } from '@/lib/api/statisticsApi';

interface UseSolutionTrackingProps {
  contentType: 'exercise' | 'exam';
  contentId: string;
  isCompleted: 'success' | 'review' | null;
  onSolutionViewed?: () => void;
  onRefetchStatistics?: () => void;
}

export function useSolutionTracking({
  contentType,
  contentId,
  isCompleted,
  onSolutionViewed,
  onRefetchStatistics
}: UseSolutionTrackingProps) {
  const [solutionMarkedAsViewed, setSolutionMarkedAsViewed] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const trackSolutionView = useCallback(async () => {
    // Don't track if already marked or if content ID is missing
    if (solutionMarkedAsViewed || !contentId) {
      return;
    }

    try {
      setLoading(true);

      // Mark as viewed in backend
      const response = await markSolutionViewed(contentType, contentId);

      setSolutionMarkedAsViewed(true);

      // Show appropriate notification based on completion status
      if (isCompleted) {
        setNotificationMessage(
          "✓ Vous avez regardé la solution après avoir réussi l'exercice. Vos statistiques restent valides."
        );
      } else {
        setNotificationMessage(
          "👀 Solution vue avant completion. Cet exercice sera marqué comme ayant consulté la solution. Si vous le complétez maintenant, vos statistiques en tiendront compte."
        );
      }

      setShowNotification(true);

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);

      // Refetch statistics to update the UI with the new solution view flag
      onRefetchStatistics?.();

      onSolutionViewed?.();
    } catch (error) {
      console.error('Failed to track solution view:', error);
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId, isCompleted, solutionMarkedAsViewed, onSolutionViewed, onRefetchStatistics]);

  const closeNotification = () => {
    setShowNotification(false);
  };

  return {
    solutionMarkedAsViewed,
    showNotification,
    notificationMessage,
    loading,
    trackSolutionView,
    closeNotification,
    setSolutionMarkedAsViewed
  };
}

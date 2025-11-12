/**
 * Hook: usePageTimeTracker
 *
 * Automatically tracks time spent on a page and sends it to the backend ONCE when leaving
 * This hook starts tracking when the component mounts and stops when it unmounts
 * It also handles page visibility changes (when user switches tabs)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';

interface UsePageTimeTrackerProps {
  contentType: 'exercise' | 'lesson' | 'exam';
  contentId: string | undefined;
  enabled?: boolean;
}
export function usePageTimeTracker({
  contentType,
  contentId,
  enabled = true
}: UsePageTimeTrackerProps) {
  const { isAuthenticated } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const totalTimeRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  // Use refs to store latest values for cleanup function
  const isAuthenticatedRef = useRef(isAuthenticated);
  const contentIdRef = useRef(contentId);
  const enabledRef = useRef(enabled);
  const contentTypeRef = useRef(contentType);

  // Update refs whenever values change
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    contentIdRef.current = contentId;
  }, [contentId]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    contentTypeRef.current = contentType;
  }, [contentType]);

  // Function to send time to backend
  const sendStudyTime = useCallback(async (timeSpentSeconds: number) => {
    if (!isAuthenticated || !contentId || !enabled || timeSpentSeconds < 1) {
      return;
    }
    try {
      await api.post('/study-time/track/', {
        content_type: contentType,
        content_id: contentId,
        time_spent_seconds: Math.floor(timeSpentSeconds)
      });
      console.log(`[PageTimeTracker] Sent ${Math.floor(timeSpentSeconds)}s for ${contentType} ${contentId}`);
    } catch (error) {
      console.error('[PageTimeTracker] Failed to send study time:', error);
    }
  }, [isAuthenticated, contentId, enabled, contentType]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        // Page became hidden - calculate and add time
        if (isVisibleRef.current) {
          const sessionTime = (now - startTimeRef.current) / 1000; // Convert to seconds
          totalTimeRef.current += sessionTime;
          isVisibleRef.current = false;
        }
      } else {
        // Page became visible - restart timer
        if (!isVisibleRef.current) {
          startTimeRef.current = now;
          isVisibleRef.current = true;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  // Track when contentId changes to send time for previous content
  const previousContentIdRef = useRef<string | undefined>(contentId);
  useEffect(() => {
    // If contentId changed and we have a previous one, send its time
    if (previousContentIdRef.current && previousContentIdRef.current !== contentId) {
      const totalTime = totalTimeRef.current + (Date.now() - startTimeRef.current) / 1000;
      if (totalTime >= 1 && isAuthenticated && enabled) {
        console.log(`[PageTimeTracker] Content changed - sending ${Math.floor(totalTime)}s for previous content`);
        sendStudyTime(totalTime).then(() => {
          // Reset for new content
          startTimeRef.current = Date.now();
          totalTimeRef.current = 0;
          isVisibleRef.current = true;
        });
      }
    }

    previousContentIdRef.current = contentId;
  }, [contentId, isAuthenticated, enabled, sendStudyTime]);

  // Send time when component unmounts
  useEffect(() => {
    // This cleanup runs when component unmounts
    return () => {
      // Use refs to get latest values at unmount time
      const latestIsAuthenticated = isAuthenticatedRef.current;
      const latestContentId = contentIdRef.current;
      const latestEnabled = enabledRef.current;
      const latestContentType = contentTypeRef.current;

      if (isVisibleRef.current && latestIsAuthenticated && latestContentId && latestEnabled) {
        const now = Date.now();
        const sessionTime = (now - startTimeRef.current) / 1000;
        const totalTime = totalTimeRef.current + sessionTime;

        if (totalTime >= 1) {
          console.log(`[PageTimeTracker] Unmounting - total time: ${Math.floor(totalTime)}s for ${latestContentType} ${latestContentId}`);

          // Use sendBeacon with token in FormData (since headers don't work with sendBeacon)
          try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('content_type', latestContentType);
            data.append('content_id', latestContentId);
            data.append('time_spent_seconds', Math.floor(totalTime).toString());
            data.append('token', token || ''); // Send token in body

            const url = `${api.defaults.baseURL}/study-time/track/`;
            navigator.sendBeacon(url, data);
            console.log(`[PageTimeTracker] Sent ${Math.floor(totalTime)}s via sendBeacon with token`);
          } catch (error) {
            console.error('[PageTimeTracker] sendBeacon failed:', error);
          }
        }
      }
    };
  }, []); // Empty deps so it only runs on true unmount
  return {
    // No return values needed - tracking is automatic
  };
}
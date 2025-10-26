/**
 * Hook: usePageTimeTracker
 *
 * Automatically tracks time spent on a page and sends it to the backend ONCE when leaving
 * This hook starts tracking when the component mounts and stops when it unmounts
 * It also handles page visibility changes (when user switches tabs)
 */

import { useEffect, useRef } from 'react';
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

  // Debug log on mount
  useEffect(() => {
    console.log(`[PageTimeTracker] MOUNTED - contentType: ${contentType}, contentId: ${contentId}, enabled: ${enabled}, authenticated: ${isAuthenticated}`);
    return () => {
      console.log(`[PageTimeTracker] UNMOUNTED - contentType: ${contentType}, contentId: ${contentId}`);
    };
  }, []);

  // Function to send time to backend
  const sendStudyTime = async (timeSpentSeconds: number) => {
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
  };

  // Handle page visibility changes
  useEffect(() => {
    console.log('[PageTimeTracker] Setting up visibility change listener');

    const handleVisibilityChange = () => {
      const now = Date.now();

      if (document.hidden) {
        // Page became hidden - calculate and add time
        if (isVisibleRef.current) {
          const sessionTime = (now - startTimeRef.current) / 1000; // Convert to seconds
          totalTimeRef.current += sessionTime;
          isVisibleRef.current = false;
          console.log(`[PageTimeTracker] Page hidden - session: ${Math.floor(sessionTime)}s, total: ${Math.floor(totalTimeRef.current)}s`);
        }
      } else {
        // Page became visible - restart timer
        if (!isVisibleRef.current) {
          startTimeRef.current = now;
          isVisibleRef.current = true;
          console.log('[PageTimeTracker] Page visible - restarting timer');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      console.log('[PageTimeTracker] Removing visibility change listener');
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
  }, [contentId]);

  // Send time when component unmounts
  useEffect(() => {
    // This cleanup runs when component unmounts OR when dependencies change
    return () => {
      if (isVisibleRef.current && isAuthenticated && contentId && enabled) {
        const now = Date.now();
        const sessionTime = (now - startTimeRef.current) / 1000;
        const totalTime = totalTimeRef.current + sessionTime;

        if (totalTime >= 1) {
          console.log(`[PageTimeTracker] Unmounting - total time: ${Math.floor(totalTime)}s for ${contentType} ${contentId}`);

          // Use sendBeacon with token in FormData (since headers don't work with sendBeacon)
          try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('content_type', contentType);
            data.append('content_id', contentId);
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

/**
 * Unified Content Time Tracker Hook
 *
 * Handles time tracking and session management for all content types.
 * Consolidates duplicate time tracking logic from detail pages.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { saveTimeSpent, getTimeSpent, saveSession, getSessionHistory, type TimeSession, type ContentType } from '@/lib/api';

interface UseContentTimeTrackerProps {
  contentId: string | undefined;
  contentType: ContentType;
  autoSaveInterval?: number; // Auto-save every N seconds (default: 30)
  minSaveThreshold?: number; // Minimum seconds before saving (default: 10)
}

/**
 * Comprehensive time tracking hook for content
 *
 * Features:
 * - Automatic timer with start/stop/reset
 * - Auto-save at intervals
 * - Session history management
 * - Session statistics
 *
 * @example
 * ```tsx
 * const {
 *   currentTime,
 *   isRunning,
 *   startTimer,
 *   stopTimer,
 *   saveCurrentSession,
 *   sessions
 * } = useContentTimeTracker({
 *   contentId: id,
 *   contentType: 'exercise'
 * });
 * ```
 */
export function useContentTimeTracker({
  contentId,
  contentType,
  autoSaveInterval = 30,
  minSaveThreshold = 10,
}: UseContentTimeTrackerProps) {
  // Timer state
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  // Session state
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refs for intervals and tracking
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTime = useRef(0);
  const sessionStartTime = useRef<Date | null>(null);

  // ============ LOAD INITIAL DATA ============

  useEffect(() => {
    if (contentId) {
      loadTimeData();
      loadSessionHistory();
    }

    return () => {
      // Cleanup timers on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [contentId, contentType]);

  const loadTimeData = async () => {
    if (!contentId) return;

    try {
      const data = await getTimeSpent(contentType, contentId);
      setTotalTimeSpent(data.total_time_spent || 0);
    } catch (err) {
      console.error('Failed to load time spent:', err);
    }
  };

  const loadSessionHistory = async () => {
    if (!contentId) return;

    try {
      setLoading(true);
      const history = await getSessionHistory(contentType, contentId);
      setSessions(history || []);
    } catch (err) {
      console.error('Failed to load session history:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============ TIMER CONTROL ============

  const startTimer = useCallback(() => {
    if (isRunning || !contentId) return;

    setIsRunning(true);
    sessionStartTime.current = new Date();

    // Start main timer (updates every second)
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => prev + 1);
    }, 1000);

    // Start auto-save timer
    autoSaveRef.current = setInterval(() => {
      autoSave();
    }, autoSaveInterval * 1000);
  }, [isRunning, contentId, autoSaveInterval]);

  const stopTimer = useCallback(() => {
    if (!isRunning) return;

    setIsRunning(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }

    // Final save on stop
    autoSave();
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    stopTimer();
    setCurrentTime(0);
    lastSavedTime.current = 0;
    sessionStartTime.current = null;
  }, [stopTimer]);

  // ============ AUTO-SAVE ============

  const autoSave = async () => {
    if (!contentId) return;

    const timeToSave = currentTime - lastSavedTime.current;

    if (timeToSave >= minSaveThreshold) {
      try {
        await saveTimeSpent(contentType, contentId, timeToSave);
        lastSavedTime.current = currentTime;
        setTotalTimeSpent((prev) => prev + timeToSave);
      } catch (err) {
        console.warn('Auto-save failed:', err);
      }
    }
  };

  // ============ SESSION MANAGEMENT ============

  const saveCurrentSession = async (sessionType: string = 'study', notes: string = '') => {
    if (!contentId) return;

    try {
      setSaving(true);

      // Save any remaining time
      await autoSave();

      // Save the session
      await saveSession(contentType, contentId, sessionType, notes);

      // Reload session history
      await loadSessionHistory();

      // Reset timer
      resetTimer();
    } catch (err) {
      console.error('Failed to save session:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ============ UTILITIES ============

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Calculate session statistics
  const sessionStats = {
    totalSessions: sessions.length,
    totalTime: sessions.reduce((sum, s) => sum + s.session_duration, 0),
    averageSessionTime: sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.session_duration, 0) / sessions.length
      : 0,
    longestSession: sessions.length > 0
      ? Math.max(...sessions.map((s) => s.session_duration))
      : 0,
  };

  // Calculate improvement over time
  const calculateImprovement = () => {
    if (sessions.length < 2) return null;

    const recentSessions = sessions.slice(0, 5);
    const olderSessions = sessions.slice(5, 10);

    if (olderSessions.length === 0) return null;

    const recentAvg = recentSessions.reduce((sum, s) => sum + s.session_duration, 0) / recentSessions.length;
    const olderAvg = olderSessions.reduce((sum, s) => sum + s.session_duration, 0) / olderSessions.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  };

  return {
    // Timer state
    currentTime,
    isRunning,
    totalTimeSpent,

    // Session data
    sessions,
    sessionStats,
    loading,
    saving,

    // Timer controls
    startTimer,
    stopTimer,
    resetTimer,

    // Session management
    saveCurrentSession,
    loadSessionHistory,

    // Utilities
    formatTime,
    calculateImprovement,
  };
}

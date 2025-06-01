import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';

interface TimeSession {
  id: string;
  duration_seconds: number;
  session_type: string;
  started_at: string;
  ended_at: string;
  notes: string;
  created_at: string;
}

interface SessionStats {
  total_sessions: number;
  best_time: number;
  worst_time: number;
  average_time: number;
  last_session: TimeSession | null;
  improvement_percentage: number | null;
}

interface UseAdvancedTimeTrackerProps {
  contentType: 'exercise' | 'exam';
  contentId: string;
  enabled?: boolean;
}

export const useAdvancedTimeTracker = ({
  contentType,
  contentId,
  enabled = true
}: UseAdvancedTimeTrackerProps) => {
  const { isAuthenticated } = useAuth();
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Load session history and statistics
  const loadSessionHistory = useCallback(async () => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      setLoading(true);
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/session_stats/`
        : `/exams/${contentId}/session_stats/`;
        
      const response = await api.get(endpoint);
      
      setSessions(response.data.sessions || []);
      setSessionStats(response.data.stats || null);
      
    } catch (error) {
      console.warn('Failed to load session history:', error);
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId, isAuthenticated, enabled]);

  // Start timer
  const startTimer = useCallback(() => {
    if (!enabled || isRunning) return;
    
    setIsRunning(true);
    startTimeRef.current = new Date();
    
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);
  }, [enabled, isRunning]);

  // Stop timer
  const stopTimer = useCallback(() => {
    setIsRunning(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    stopTimer();
    setCurrentTime(0);
    startTimeRef.current = null;
  }, [stopTimer]);

  // Save current session
  const saveSession = useCallback(async (notes: string = '') => {
    if (!isAuthenticated || !enabled || !contentId || currentTime === 0) {
      return null;
    }
    
    try {
      setSaving(true);
      
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/save_session/`
        : `/exams/${contentId}/save_session/`;
        
      const response = await api.post(endpoint, {
        duration_seconds: currentTime,
        session_type: 'practice',
        notes: notes
      });
      
      // Reload session history to get updated stats
      await loadSessionHistory();
      
      // Reset timer after saving
      resetTimer();
      
      return response.data;
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [contentType, contentId, isAuthenticated, enabled, currentTime, loadSessionHistory, resetTimer]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/delete_session/${sessionId}/`
        : `/exams/${contentId}/delete_session/${sessionId}/`;
        
      await api.delete(endpoint);
      
      // Reload session history
      await loadSessionHistory();
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }, [contentType, contentId, isAuthenticated, enabled, loadSessionHistory]);

  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate improvement
  const calculateImprovement = useCallback((currentSeconds: number, previousSeconds: number) => {
    if (previousSeconds === 0) return null;
    
    const improvement = ((previousSeconds - currentSeconds) / previousSeconds) * 100;
    return Math.round(improvement * 10) / 10; // Round to 1 decimal
  }, []);

  // Load initial data
  useEffect(() => {
    loadSessionHistory();
  }, [loadSessionHistory]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    // Current session state
    currentTime,
    isRunning,
    
    // Session history
    sessions,
    sessionStats,
    
    // Loading states
    loading,
    saving,
    
    // Actions
    startTimer,
    stopTimer,
    resetTimer,
    saveSession,
    deleteSession,
    loadSessionHistory,
    
    // Utilities
    formatTime,
    calculateImprovement,
    
    // Formatted values
    formatCurrentTime: () => formatTime(currentTime),
    getBestTime: () => sessionStats?.best_time ? formatTime(sessionStats.best_time) : null,
    getLastTime: () => sessionStats?.last_session ? formatTime(sessionStats.last_session.duration_seconds) : null,
    getAverageTime: () => sessionStats?.average_time ? formatTime(Math.round(sessionStats.average_time)) : null,
    getSessionCount: () => sessionStats?.total_sessions || 0,
    
    // Comparison with last session
    getTimeComparison: () => {
      if (!sessionStats?.last_session || currentTime === 0) return null;
      
      const lastTime = sessionStats.last_session.duration_seconds;
      const diff = currentTime - lastTime;
      const improvement = calculateImprovement(currentTime, lastTime);
      
      return {
        difference: diff,
        differenceFormatted: formatTime(Math.abs(diff)),
        improvement: improvement,
        isFaster: diff < 0,
        isSlower: diff > 0,
        isSame: diff === 0
      };
    }
  };
};
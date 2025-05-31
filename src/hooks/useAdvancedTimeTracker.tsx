// src/hooks/useAdvancedTimeTracker.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';

interface TimeStatus {
  totalTimeSeconds: number;
  currentSessionSeconds: number;
  resumePreference: 'continue' | 'restart' | 'ask';
  lastSessionStart: string | null;
  recentSessions: TimeSession[];
  sessionsCount: number;
}

interface TimeSession {
  id: string;
  durationSeconds: number;
  sessionType: string;
  startedAt: string;
  endedAt: string;
  notes: string;
}

interface UseAdvancedTimeTrackerProps {
  contentType: 'exercise' | 'exam';
  contentId: string;
  autoSaveInterval?: number;
  enabled?: boolean;
}

export const useAdvancedTimeTracker = ({
  contentType,
  contentId,
  autoSaveInterval = 30,
  enabled = true
}: UseAdvancedTimeTrackerProps) => {
  const { isAuthenticated } = useAuth();
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Charger le statut du temps
  const loadTimeStatus = useCallback(async () => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      setLoading(true);
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/time_status/`
        : `/exams/${contentId}/time_status/`;
        
      const response = await api.get(endpoint);
      setTimeStatus(response.data);
      
      // Si l'utilisateur a une session en cours et que la préférence est "ask"
      if (response.data.currentSessionSeconds > 0 && response.data.resumePreference === 'ask') {
        setShowResumeDialog(true);
      } else if (response.data.resumePreference === 'continue') {
        setCurrentSessionTime(response.data.currentSessionSeconds);
      }
      
    } catch (error) {
      console.warn('Failed to load time status:', error);
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId, isAuthenticated, enabled]);

  // Mettre à jour le temps de session
  const updateSessionTime = useCallback(async (timeSeconds: number, action: 'update' | 'reset' | 'start' = 'update') => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/update_session_time/`
        : `/exams/${contentId}/update_session_time/`;
        
      const response = await api.post(endpoint, {
        time_seconds: timeSeconds,
        action
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to update session time:', error);
      throw error;
    }
  }, [contentType, contentId, isAuthenticated, enabled]);

  // Sauvegarder la session
  const saveSession = useCallback(async (sessionType: string = 'study', notes: string = '') => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/save_session/`
        : `/exams/${contentId}/save_session/`;
        
      const response = await api.post(endpoint, {
        session_type: sessionType,
        notes
      });
      
      // Recharger le statut après la sauvegarde
      await loadTimeStatus();
      setCurrentSessionTime(0);
      lastSaveTimeRef.current = 0;
      
      return response.data;
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }, [contentType, contentId, isAuthenticated, enabled, loadTimeStatus]);

  // Définir la préférence de reprise
  const setResumePreference = useCallback(async (preference: 'continue' | 'restart' | 'ask') => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/set_resume_preference/`
        : `/exams/${contentId}/set_resume_preference/`;
        
      const response = await api.post(endpoint, { preference });
      await loadTimeStatus();
      return response.data;
    } catch (error) {
      console.error('Failed to set resume preference:', error);
      throw error;
    }
  }, [contentType, contentId, isAuthenticated, enabled, loadTimeStatus]);

  // Charger l'historique des sessions
  const getSessionsHistory = useCallback(async (page: number = 1, pageSize: number = 10) => {
    if (!isAuthenticated || !enabled || !contentId) return;
    
    try {
      const endpoint = contentType === 'exercise' 
        ? `/exercises/${contentId}/sessions_history/`
        : `/exams/${contentId}/sessions_history/`;
        
      const response = await api.get(endpoint, {
        params: { page, page_size: pageSize }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get sessions history:', error);
      throw error;
    }
  }, [contentType, contentId, isAuthenticated, enabled]);

  // Démarrer le tracking
  const startTracking = useCallback(async (resumeSession: boolean = false) => {
    if (!enabled || !isAuthenticated) return;

    try {
      if (!resumeSession) {
        await updateSessionTime(0, 'reset');
        setCurrentSessionTime(0);
      } else if (timeStatus) {
        setCurrentSessionTime(timeStatus.currentSessionSeconds);
      }
      
      await updateSessionTime(currentSessionTime, 'start');
      setIsActive(true);
      
      // Timer principal
      intervalRef.current = setInterval(() => {
        setCurrentSessionTime(prev => prev + 1);
      }, 1000);

      // Auto-sauvegarde
      autoSaveRef.current = setInterval(async () => {
        const currentTime = currentSessionTime + (Date.now() - lastSaveTimeRef.current) / 1000;
        try {
          await updateSessionTime(Math.floor(currentTime));
          lastSaveTimeRef.current = Date.now();
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }, autoSaveInterval * 1000);
      
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  }, [enabled, isAuthenticated, timeStatus, currentSessionTime, updateSessionTime, autoSaveInterval]);

  // Arrêter le tracking
  const stopTracking = useCallback(async () => {
    setIsActive(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }

    // Sauvegarde finale
    if (currentSessionTime > 0) {
      try {
        await updateSessionTime(currentSessionTime);
      } catch (error) {
        console.warn('Final save failed:', error);
      }
    }
  }, [currentSessionTime, updateSessionTime]);

  // Gérer la réponse du dialogue de reprise
  const handleResumeDialog = useCallback(async (action: 'continue' | 'restart' | 'save_and_restart') => {
    setShowResumeDialog(false);
    
    switch (action) {
      case 'continue':
        await startTracking(true);
        break;
      case 'restart':
        await startTracking(false);
        break;
      case 'save_and_restart':
        await saveSession();
        await startTracking(false);
        break;
    }
  }, [startTracking, saveSession]);

  // Formater le temps
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Charger le statut initial
  useEffect(() => {
    loadTimeStatus();
  }, [loadTimeStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  return {
    // État
    timeStatus,
    currentSessionTime,
    isActive,
    loading,
    showResumeDialog,
    
    // Actions
    startTracking,
    stopTracking,
    saveSession,
    setResumePreference,
    getSessionsHistory,
    handleResumeDialog,
    loadTimeStatus,
    
    // Utilitaires
    formatTime,
    formatCurrentTime: () => formatTime(currentSessionTime),
    formatTotalTime: () => timeStatus ? formatTime(timeStatus.totalTimeSeconds) : '00:00'
  };
};
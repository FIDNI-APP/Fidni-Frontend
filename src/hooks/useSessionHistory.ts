import { useState } from 'react';
import { getSessionHistory, TimeSession } from '@/lib/api/interactionApi';

export function useSessionHistory() {
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [fullSessionHistory, setFullSessionHistory] = useState<TimeSession[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async (contentType: 'exercise' | 'exam', contentId: string) => {
    try {
      setLoading(true);
      const history = await getSessionHistory(contentType, contentId);
      setFullSessionHistory(history);
      setShowSessionHistory(true);
    } catch (error) {
      console.error('Failed to load session history:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeHistory = () => setShowSessionHistory(false);

  return {
    showSessionHistory,
    fullSessionHistory,
    loading,
    loadHistory,
    closeHistory,
    setFullSessionHistory
  };
}

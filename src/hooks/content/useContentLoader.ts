import { useState, useEffect, useRef } from 'react';
import { getContentById, markContentViewed } from '@/lib/api';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UseContentLoaderProps {
  contentId: string | undefined;
  autoMarkViewed?: boolean;
}

export function useContentLoader({ contentId, autoMarkViewed = true }: UseContentLoaderProps) {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasMarkedViewed = useRef<Set<string>>(new Set());

  const loadContent = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContentById(id);
      setContent(data);
      return data;
    } catch (err) {
      console.error('Failed to load content:', err);
      setError('Failed to load content. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    if (contentId) {
      return loadContent(contentId);
    }
    return Promise.resolve(null);
  };

  useEffect(() => {
    if (contentId) {
      loadContent(contentId);

      // Only mark viewed once per content ID
      if (autoMarkViewed && !hasMarkedViewed.current.has(contentId)) {
        hasMarkedViewed.current.add(contentId);
        markContentViewed(contentId).catch(console.error);
      }
    }
  }, [contentId, isAuthenticated, autoMarkViewed]);

  return {
    content,
    setContent,
    loading,
    error,
    reload
  };
}

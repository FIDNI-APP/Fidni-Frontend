import {api} from './apiClient';
import { exerciseContentAPI, examContentAPI, lessonContentAPI, VoteValue } from '../factories/contentApiFactory';

// Re-export VoteValue type for backwards compatibility
export type { VoteValue };

// Use factory-generated vote functions instead of duplicating code
export const voteExercise = exerciseContentAPI.vote;

export const voteSolution = async (id: string, value: VoteValue) => {
  try {
    const response = await api.post(`/solutions/${id}/vote/`, { value });
    return response.data.item; // Return the updated exercise
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

export const voteComment = async (id: string, value: VoteValue) => {
  try {
    const response = await api.post(`/comments/${id}/vote/`, { value });
    return response.data.item; // Return the updated exercise
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

// Solution API
export const getSolution = async (id: string) => {
  const response = await api.get(`/solutions/${id}/`);
  return response.data;
};

export const updateSolution = async (id: string, data: { content: string }) => {
  const response = await api.put(`/solutions/${id}/`, data);
  return response.data;
};

export const deleteSolution = async (id: string) => {
  await api.delete(`/solutions/${id}/`);
};

export const addSolution = async (exerciseId: string, data: { content: string }) => {
  const response = await api.post(`/exercises/${exerciseId}/solution/`, data);
  return response.data;
};

// Comment API - use factory function
export const addComment = exerciseContentAPI.addComment;

export const updateComment = async (commentId: string, content: string) => {
  const response = await api.put(`/comments/${commentId}/`, { content });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/comments/${commentId}/`);
};


// Time spent API functions - simplified with factory
export const saveTimeSpent = async (contentType: 'exercise' | 'exam', contentId: string, timeSeconds: number) => {
  const contentAPI = contentType === 'exercise' ? exerciseContentAPI : examContentAPI;
  return contentAPI.saveTimeSpent(contentId, timeSeconds);
};

export const getTimeSpent = async (contentType: 'exercise' | 'exam', contentId: string) => {
  const contentAPI = contentType === 'exercise' ? exerciseContentAPI : examContentAPI;
  return contentAPI.getTimeSpent(contentId);
};

// Session API functions
export interface TimeSession {
  id: string;
  session_duration: number; // in seconds
  started_at: string;
  ended_at: string;
  created_at: string;
  session_type: string;
  notes: string;
}

// Session API - simplified with factory
export const saveSession = async (
  contentType: 'exercise' | 'exam',
  contentId: string,
  sessionType: string = 'study',
  notes: string = ''
) => {
  const contentAPI = contentType === 'exercise' ? exerciseContentAPI : examContentAPI;
  return contentAPI.saveSession(contentId, sessionType, notes);
};

export const getSessionHistory = async (contentType: 'exercise' | 'exam', contentId: string): Promise<TimeSession[]> => {
  const contentAPI = contentType === 'exercise' ? exerciseContentAPI : examContentAPI;
  return contentAPI.getSessionHistory(contentId);
};

// Fonction utilitaire pour sauvegarder automatiquement le temps
export const autoSaveTimeSpent = async (
  contentType: 'exercise' | 'exam', 
  contentId: string, 
  timeSeconds: number,
  minTimeThreshold: number = 10 // Sauvegarder seulement si plus de 10 secondes
) => {
  if (timeSeconds >= minTimeThreshold) {
    try {
      await saveTimeSpent(contentType, contentId, timeSeconds);
      console.log(`Auto-saved ${timeSeconds}s for ${contentType} ${contentId}`);
    } catch (error) {
      console.warn('Failed to auto-save time spent:', error);
    }
  }
};
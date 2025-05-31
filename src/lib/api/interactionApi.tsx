import {api} from './apiClient';
import { Solution } from '@/types/index';

// Vote types and functions
type VoteValue = 1 | -1 | 0;  // Matches Vote.UP, Vote.DOWN, Vote.UNVOTE

export const voteExercise = async (id: string, value: VoteValue) => {
  try {
    const response = await api.post(`/exercises/${id}/vote/`, { value });
    return response.data.item; // Return the updated exercise
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

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

export const addSolution = async (exerciseId: string, data: { content: string }): Promise<Solution> => {
  const response = await api.post(`/exercises/${exerciseId}/solution/`, data);
  return response.data;
};

// Comment API
export const addComment = async (exerciseId: string, content: string, parentId?: string) => {
  const response = await api.post(`/exercises/${exerciseId}/comment/`, { 
    content,
    parent: parentId
  });
  return response.data;
};

export const updateComment = async (commentId: string, content: string) => {
  const response = await api.put(`/comments/${commentId}/`, { content });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/comments/${commentId}/`);
};


// Time spent API functions
export const saveTimeSpent = async (contentType: 'exercise' | 'exam', contentId: string, timeSeconds: number) => {
  try {
    const endpoint = contentType === 'exercise' 
      ? `/exercises/${contentId}/save_time_spent/`
      : `/exams/${contentId}/save_time_spent/`;
      
    const response = await api.post(endpoint, { 
      time_spent: timeSeconds 
    });
    
    return response.data;
  } catch (error) {
    console.error('Error saving time spent:', error);
    throw error;
  }
};

export const getTimeSpent = async (contentType: 'exercise' | 'exam', contentId: string) => {
  try {
    const endpoint = contentType === 'exercise' 
      ? `/exercises/${contentId}/get_time_spent/`
      : `/exams/${contentId}/get_time_spent/`;
      
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error getting time spent:', error);
    throw error;
  }
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
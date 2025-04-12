import api from './apiClient';
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

// Time spent API
export const addTimeSpent = async (exerciseId: string, time: number) => {
  const response = await api.post(`/exercises/${exerciseId}/time_spent/`, { time });
  return response.data;
};

export const deleteTimeSpent = async (exerciseId: string) => {
  await api.delete(`/exercises/${exerciseId}/time_spent/`);
}

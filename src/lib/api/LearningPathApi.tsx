// src/lib/api/learningpathApi.ts
import api from './index';
import { LearningPath } from '@/types/index';

// Get all learning paths with optional filtering
export const getLearningPaths = async (params = {}): Promise<LearningPath[]> => {
  const response = await api.get('/learning-paths/', { params });
  return response.data.results || response.data || [];
};

// Get a specific learning path by ID
export const getLearningPath = async (id: string): Promise<LearningPath> => {
  const response = await api.get(`/learning-paths/${id}/`);
  return response.data;
};

// Create a new learning path
export const createLearningPath = async (data: any): Promise<LearningPath> => {
  const response = await api.post('/learning-paths/', data);
  return response.data;
};

// Update an existing learning path
export const updateLearningPath = async (id: string, data: any): Promise<LearningPath> => {
  const response = await api.put(`/learning-paths/${id}/`, data);
  return response.data;
};

// Delete a learning path
export const deleteLearningPath = async (id: string): Promise<void> => {
  await api.delete(`/learning-paths/${id}/`);
};

export const createPathChapter = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/path-chapters/', data);
    console.log('Raw API response:', response); // Debug the full response
    console.log('Response data:', response.data); // Debug the response data
    return response.data; // This should include the ID
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Get all chapters for a learning path
export const getPathChapters = async (params = {}): Promise<LearningPath[]> => {
  const response = await api.get('/path-chapters/', { params });
  return response.data.results || response.data || [];
};

// Get a specific path chapter by ID
export const getPathChapter = async (id: string): Promise<LearningPath> => {
  const response = await api.get(`/path-chapters/${id}/`);
  return response.data;
};

// Update a path chapter
export const updatePathChapter = async (id: string, data: any): Promise<any> => {
  const response = await api.put(`/path-chapters/${id}/`, data);
  return response.data;
};

export const deletePathChapter = async (id: string): Promise<void> => {
  await api.delete(`/path-chapters/${id}/`);
};

// User progress tracking
export const startLearningPath = async (id: string): Promise<any> => {
  const response = await api.post(`/learning-paths/${id}/start_path/`);
  return response.data;
};

export const startChapter = async (id: string): Promise<any> => {
  const response = await api.post(`/path-chapters/${id}/start_chapter/`);
  return response.data;
};

// Video operations
export const createVideo = async (data: any): Promise<any> => {
  const response = await api.post('/videos/', data);
  return response.data;
};

export const updateVideoProgress = async (id: string, data: { watched_seconds: number; is_completed?: boolean }): Promise<any> => {
  const response = await api.post(`/videos/${id}/update_progress/`, data);
  return response.data;
};

// Quiz operations
export const createQuiz = async (data: any): Promise<any> => {
  const response = await api.post('/chapter-quizzes/', data);
  return response.data;
};

export const createQuizQuestion = async (quizId: string, data: any): Promise<any> => {
  // Assuming you have an endpoint for creating questions for a specific quiz
  const response = await api.post(`/chapter-quizzes/${quizId}/questions/`, data);
  return response.data;
};

export const startQuizAttempt = async (quizId: string): Promise<any> => {
  const response = await api.post(`/chapter-quizzes/${quizId}/start_attempt/`);
  return response.data;
};

export const submitQuizAttempt = async (quizId: string, data: any): Promise<any> => {
  const response = await api.post(`/chapter-quizzes/${quizId}/submit_attempt/`, data);
  return response.data;
};
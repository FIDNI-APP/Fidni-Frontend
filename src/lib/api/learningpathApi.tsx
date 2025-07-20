// src/lib/learningPathApi.ts
import api from '@/lib/api';
import { LearningPath, PathChapter, Video, ChapterQuiz } from '@/types/index';

// Learning Path endpoints
export const getLearningPaths = async (params?: {
  class_level?: string;
  subject?: string;
}) => {
  const response = await api.get('/learning-paths/', { params });
  return response.data;
};

export const getLearningPath = async (id: string) => {
  const response = await api.get(`/learning-paths/${id}/`);
  return response.data;
};

export const createLearningPath = async (data: any) => {
  const response = await api.post('/learning-paths/', data);
  return response.data;
};

export const updateLearningPath = async (id: string, data: any) => {
  const response = await api.patch(`/learning-paths/${id}/`, data);
  return response.data;
};

export const deleteLearningPath = async (id: string) => {
  await api.delete(`/learning-paths/${id}/`);
};

export const startLearningPath = async (id: string) => {
  const response = await api.post(`/learning-paths/${id}/start_path/`);
  return response.data;
};

export const getLearningPathStats = async (id: string) => {
  const response = await api.get(`/learning-paths/${id}/stats/`);
  return response.data;
};

// Chapter endpoints
export const startChapter = async (chapterId: string) => {
  const response = await api.post(`/path-chapters/${chapterId}/start_path/`);
  return response.data;
};

export const completeChapter = async (chapterId: string) => {
  const response = await api.post(`/path-chapters/${chapterId}/complete/`);
  return response.data;
};

// Video endpoints
export const updateVideoProgress = async (videoId: string, data: {
  watched_seconds: number;
  is_completed?: boolean;
  notes?: string;
}) => {
  const response = await api.post(`/videos/${videoId}/update_progress/`, data);
  return response.data;
};

// Quiz endpoints
export const startQuizAttempt = async (quizId: string) => {
  const response = await api.post(`/chapter-quizzes/${quizId}/start_attempt/`);
  return response.data;
};

export const submitQuizAttempt = async (quizId: string, data: {
  attempt_id: string;
  answers: Array<{
    question_id: string;
    answer_index: number;
  }>;
}) => {
  const response = await api.post(`/chapter-quizzes/${quizId}/submit_attempt/`, data);
  return response.data;
};

// Admin endpoints
export const createPathChapter = async (data: any) => {
  const response = await api.post('/path-chapters/', data);
  return response.data;
};

export const createVideo = async (data: any) => {
  const response = await api.post('/videos/', data);
  return response.data;
};

export const createQuiz = async (data: any) => {
  const response = await api.post('/chapter-quizzes/', data);
  return response.data;
};

export const createQuizQuestion = async (quizId: string, data: any) => {
  const response = await api.post(`/chapter-quizzes/${quizId}/questions/`, data);
  return response.data;
};
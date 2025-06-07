import { api } from './apiClient';
import { 
  LearningPathStats,
} from '@/types/learningPath';

// Get user's learning paths for a specific class level
export const getUserLearningPaths = async (classLevelId?: string): Promise<any[]> => {
  const params = classLevelId ? { class_level: classLevelId } : {};
  const response = await api.get('/learning-paths/', { params });
  return response.data;
};

// Get specific learning path with chapters
export const getLearningPath = async (pathId: string): Promise<any> => {
  const response = await api.get(`/learning-paths/${pathId}/`);
  return response.data;
};

// Start a learning path
export const startLearningPath = async (pathId: string): Promise<any> => {
  const response = await api.post(`/learning-paths/${pathId}/start_path/`);
  return response.data;
};

// Get user's active learning paths
export const getMyLearningPaths = async (): Promise<any[]> => {
  const response = await api.get('/learning-paths/my_paths/');
  return response.data;
};

// Get learning path statistics
export const getLearningPathStats = async (pathId: string): Promise<LearningPathStats> => {
  const response = await api.get(`/learning-paths/${pathId}/stats/`);
  return response.data;
};

// Start a chapter
export const startChapter = async (chapterId: string): Promise<any> => {
  const response = await api.post(`/path-chapters/${chapterId}/start/`);
  return response.data;
};

// Complete a chapter
export const completeChapter = async (chapterId: string): Promise<any> => {
  const response = await api.post(`/path-chapters/${chapterId}/complete/`);
  return response.data;
};

// Update video progress
export const updateVideoProgress = async (
  videoId: string,
  watchedSeconds: number,
  isCompleted?: boolean,
  notes?: string
): Promise<any> => {
  const response = await api.post(`/videos/${videoId}/update_progress/`, {
    watched_seconds: watchedSeconds,
    is_completed: isCompleted,
    notes
  });
  return response.data;
};

// Start quiz attempt
export const startQuizAttempt = async (quizId: string): Promise<{
  attempt_id: string;
  questions: any[];
  time_limit_minutes: number | null;
}> => {
  const response = await api.post(`/chapter-quizzes/${quizId}/start_attempt/`);
  return response.data;
};

// Submit quiz answers
export const submitQuizAttempt = async (
  quizId: string,
  attemptId: string,
  answers: { question_id: string; answer_index: number }[]
): Promise<{
  score: number;
  passed: boolean;
  correct_answers: number;
  total_questions: number;
  results?: any[];
  xp_earned: number;
}> => {
  const response = await api.post(`/chapter-quizzes/${quizId}/submit_attempt/`, {
    attempt_id: attemptId,
    answers
  });
  return response.data;
};
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

// Get all learning paths (admin function)
export const getLearningPaths = async (params?: any): Promise<any[]> => {
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


// src/lib/api/learningPathApi.tsx (additions for admin functions)

// Add these functions to your existing learningPathApi.tsx file

// Learning Path Management
export const createLearningPath = async (data: {
  title: string;
  description: string;
  subject_id: string;
  class_level_id: string;
  estimated_hours: number;
  is_active: boolean;
}): Promise<any> => {
  const response = await api.post('/learning-paths/', data);
  return response.data;
};

export const updateLearningPath = async (pathId: string, data: any): Promise<any> => {
  const response = await api.put(`/learning-paths/${pathId}/`, data);
  return response.data;
};

export const deleteLearningPath = async (pathId: string): Promise<void> => {
  await api.delete(`/learning-paths/${pathId}/`);
};

// Chapter Management
export const addChapterToPath = async (pathId: string, data: {
  chapter_id: string;
  order?: number;
  title?: string;
  description?: string;
  estimated_minutes?: number;
  prerequisites?: string[];
  is_milestone?: boolean;
}): Promise<any> => {
  const response = await api.post(`/learning-paths/${pathId}/add_chapter/`, data);
  return response.data;
};

export const getPathChapter = async (chapterId: string): Promise<any> => {
  const response = await api.get(`/path-chapters/${chapterId}/`);
  return response.data;
};

export const updatePathChapter = async (chapterId: string, data: any): Promise<any> => {
  const response = await api.put(`/path-chapters/${chapterId}/`, data);
  return response.data;
};

export const deletePathChapter = async (chapterId: string): Promise<void> => {
  await api.delete(`/path-chapters/${chapterId}/`);
};

export const reorderChapters = async (pathId: string, chapters: { id: string; order: number }[]): Promise<any> => {
  const response = await api.post(`/learning-paths/${pathId}/reorder_chapters/`, { chapters });
  return response.data;
};

// Video Management
export const createVideo = async (data: {
  path_chapter: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  video_type: 'lesson' | 'summary' | 'exercise' | 'bonus';
  duration_seconds: number;
  order?: number;
  transcript?: string;
}): Promise<any> => {
  const response = await api.post('/videos/', data);
  return response.data;
};

export const updateVideo = async (videoId: string, data: any): Promise<any> => {
  const response = await api.put(`/videos/${videoId}/`, data);
  return response.data;
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  await api.delete(`/videos/${videoId}/`);
};

export const addVideoResource = async (videoId: string, data: {
  title: string;
  resource_type: 'pdf' | 'link' | 'exercise' | 'code';
  url: string;
  order?: number;
}): Promise<any> => {
  const response = await api.post(`/videos/${videoId}/add_resource/`, data);
  return response.data;
};

// Quiz Management
export const createChapterQuiz = async (data: {
  path_chapter: string;
  title?: string;
  description?: string;
  passing_score?: number;
  time_limit_minutes?: number | null;
  max_attempts?: number;
  shuffle_questions?: boolean;
  show_correct_answers?: boolean;
}): Promise<any> => {
  const response = await api.post('/chapter-quizzes/', data);
  return response.data;
};

export const updateChapterQuiz = async (quizId: string, data: any): Promise<any> => {
  const response = await api.put(`/chapter-quizzes/${quizId}/`, data);
  return response.data;
};

export const addQuizQuestion = async (quizId: string, data: {
  question_text: string
  // src/lib/api/learningPathApi.tsx (continued)

 options: string[];
 correct_answer_index: number;
 explanation: string;
 difficulty: 'easy' | 'medium' | 'hard';
 points: number;
 order?: number;
}): Promise<any> => {
 const response = await api.post(`/chapter-quizzes/${quizId}/add_question/`, data);
 return response.data;
};

export const updateQuizQuestions = async (quizId: string, data: {
 questions: any[]
}): Promise<any> => {
 const response = await api.put(`/chapter-quizzes/${quizId}/update_questions/`, data);
 return response.data;
};

export const deleteQuizQuestion = async (questionId: string): Promise<void> => {
 await api.delete(`/quiz-questions/${questionId}/`);
};

// Achievement Management
export const createAchievement = async (data: {
 name: string;
 description: string;
 icon?: string;
 achievement_type: string;
 points?: number;
 required_value?: number;
 related_path?: string;
 related_chapter?: string;
}): Promise<any> => {
 const response = await api.post('/achievements/', data);
 return response.data;
};

export const updateAchievement = async (achievementId: string, data: any): Promise<any> => {
 const response = await api.put(`/achievements/${achievementId}/`, data);
 return response.data;
};

export const deleteAchievement = async (achievementId: string): Promise<void> => {
 await api.delete(`/achievements/${achievementId}/`);
};
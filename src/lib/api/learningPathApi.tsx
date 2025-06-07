// src/lib/api/learningPathApi.tsx
import { api } from './apiClient';
import { 
  SubjectProgress, 
  ChapterProgress, 
  VideoContent,
  LearningPathStats 
} from '@/types/learningPath';

// Get user's learning path for a specific class level
export const getUserLearningPath = async (
  userId: string, 
  classLevelId: string
): Promise<SubjectProgress[]> => {
  const response = await api.get(`/learning-paths/user/${userId}/class/${classLevelId}`);
  return response.data;
};

// Get detailed chapter content
export const getChapterContent = async (chapterId: string): Promise<ChapterProgress> => {
  const response = await api.get(`/learning-paths/chapters/${chapterId}`);
  return response.data;
};

// Mark video as completed
export const markVideoCompleted = async (
  userId: string,
  videoId: string
): Promise<void> => {
  await api.post(`/learning-paths/videos/${videoId}/complete`, { userId });
};

// Submit quiz answer
export const submitQuizAnswer = async (
  userId: string,
  quizId: string,
  questionId: string,
  answer: number
): Promise<{
  correct: boolean;
  explanation: string;
}> => {
  const response = await api.post(`/learning-paths/quiz/${quizId}/answer`, {
    userId,
    questionId,
    answer
  });
  return response.data;
};

// Complete quiz and get results
export const completeQuiz = async (
  userId: string,
  quizId: string,
  answers: { questionId: string; answer: number }[]
): Promise<{
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
}> => {
  const response = await api.post(`/learning-paths/quiz/${quizId}/complete`, {
    userId,
    answers
  });
  return response.data;
};

// Get user's learning path statistics
export const getLearningPathStats = async (userId: string): Promise<LearningPathStats> => {
  const response = await api.get(`/learning-paths/user/${userId}/stats`);
  return response.data;
};

// Get recommended next content
export const getRecommendedContent = async (
  userId: string,
  currentChapterId: string
): Promise<{
  nextChapter: ChapterProgress | null;
  recommendedVideos: VideoContent[];
}> => {
  const response = await api.get(`/learning-paths/recommendations/${userId}`, {
    params: { currentChapterId }
  });
  return response.data;
};
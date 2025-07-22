// src/lib/api/learningpathApi.tsx
import api from '@/lib/api';
import { LearningPath, PathChapter, Video, ChapterQuiz } from '@/types/index';

// Add proper error handling wrapper
const handleApiError = (error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    throw {
      message: error.response.data.message || error.response.data.detail || defaultMessage,
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // The request was made but no response was received
    throw {
      message: 'No response from server. Please check your connection.',
      status: 0
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    throw {
      message: error.message || defaultMessage,
      status: 0
    };
  }
};

// Learning Path endpoints with proper error handling
export const getLearningPaths = async (params?: {
  class_level?: string;
  subject?: string;
  search?: string;
}) => {
  try {
    const response = await api.get('/learning-paths/', { params });
    return response.data.results || response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch learning paths');
  }
};

export const getLearningPath = async (id: string): Promise<LearningPath | undefined> => {
  try {
    const response = await api.get(`/learning-paths/${id}/`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch learning path details');
    return undefined;
  }
};

export const createLearningPath = async (data: any): Promise<LearningPath | undefined> => {
  try {
    // Ensure data is properly formatted
    const formattedData = {
      ...data,
      subject: data.subject_id,
      class_level: data.class_level_id,
      // Remove the _id suffix fields as backend expects different names
    };
    delete formattedData.subject_id;
    delete formattedData.class_level_id;
    
    const response = await api.post('/learning-paths/', formattedData);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create learning path');
    return undefined;
  }
};

export const updateLearningPath = async (id: string, data: any): Promise<LearningPath | undefined> => {
  try {
    const formattedData = {
      ...data,
      subject: data.subject_id,
      class_level: data.class_level_id,
    };
    delete formattedData.subject_id;
    delete formattedData.class_level_id;
    
    const response = await api.patch(`/learning-paths/${id}/`, formattedData);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to update learning path');
  }
};

export const deleteLearningPath = async (id: string): Promise<void> => {
  try {
    await api.delete(`/learning-paths/${id}/`);
  } catch (error) {
    handleApiError(error, 'Failed to delete learning path');
  }
};

export const startLearningPath = async (id: string) => {
  try {
    const response = await api.post(`/learning-paths/${id}/start_path/`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to start learning path');
  }
};

export const getLearningPathStats = async (id: string) => {
  try {
    const response = await api.get(`/learning-paths/${id}/stats/`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch learning path statistics');
  }
};

// Chapter endpoints
export const startChapter = async (chapterId: string) => {
  try {
    const response = await api.post(`/path-chapters/${chapterId}/start_chapter/`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to start chapter');
  }
};

export const completeChapter = async (chapterId: string) => {
  try {
    const response = await api.post(`/path-chapters/${chapterId}/complete/`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to complete chapter');
  }
};

// Video endpoints
export const updateVideoProgress = async (videoId: string, data: {
  watched_seconds: number;
  is_completed?: boolean;
  notes?: string;
}) => {
  try {
    const response = await api.post(`/videos/${videoId}/update_progress/`, data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to update video progress');
  }
};

// Quiz endpoints
export const startQuizAttempt = async (quizId: string) => {
  try {
    const response = await api.post(`/chapter-quizzes/${quizId}/start_attempt/`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to start quiz');
  }
};

export const submitQuizAttempt = async (quizId: string, data: {
  attempt_id: string;
  answers: Array<{
    question_id: string;
    answer_index: number;
  }>;
}) => {
  try {
    const response = await api.post(`/chapter-quizzes/${quizId}/submit_attempt/`, data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to submit quiz attempt');
  }
};

// Admin endpoints
export const createPathChapter = async (data: any) => {
  try {
    const response = await api.post('/path-chapters/', data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create chapter');
  }
};

export const createVideo = async (data: any) => {
  try {
    const response = await api.post('/videos/', data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create video');
  }
};

export const createQuiz = async (data: any) => {
  try {
    const response = await api.post('/chapter-quizzes/', data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create quiz');
  }
};

export const createQuizQuestion = async (quizId: string, data: any) => {
  try {
    const response = await api.post(`/chapter-quizzes/${quizId}/questions/`, data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create quiz question');
  }
};
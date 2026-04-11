import {api} from './apiClient';
import { SortOption, Difficulty } from '@/types/index';

export const getContents = async (params: {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  difficulties?: Difficulty[];
  subfields?: string[];
  theorems?: string[];
  sort?: SortOption;
  page?: number;
  type?: string;
  per_page?: number;
}) => {
  const response = await api.get('/contents/', {
    params: {
      type: params.type,
      class_levels: params.classLevels,
      subjects: params.subjects,
      chapters: params.chapters,
      difficulties: params.difficulties,
      subfields: params.subfields,
      theorems: params.theorems
    }
  });
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

export const createContent = async (data: {
  title: string;
  content: string;
  type: string;
  class_level: string[];
  subject: string;
  chapters: string[];
  difficulty: string;
  solution_content?: string;
}) => {
  const response = await api.post('/contents/', data);
  return response.data;
};

export const getContentById = async (id: string) => {
  const response = await api.get(`/contents/${id}/`);
  return response.data;
};

export const updateContent = async (id: string, data: {
  title: string;
  content: string;
  class_levels: string;
  subject: string;
  chapters: string[];
  difficulty: string;
  solution_content?: string;
}) => {
  const response = await api.put(`/contents/${id}/`, data);
  return response.data;
};

export const deleteContent = async (id: string) => {
  await api.delete(`/contents/${id}/`);
};

// Content Tracking
export const markContentViewed = async (contentId: string) => {
  const response = await api.post(`/contents/${contentId}/view/`);
  return response.data;
};


export const markExerciseProgress = async (exerciseId: string, status: 'success' | 'review') => {
  const response = await api.post(`/contents/${exerciseId}/mark_progress/`, { status });
  return response.data;
};

export const removeExerciseProgress = async (exerciseId: string) => {
  await api.delete(`/contents/${exerciseId}/remove_progress/`);
};

export const saveExercise = async (exerciseId: string) => {
  const response = await api.post(`/contents/${exerciseId}/save/`);
  return response.data;
};

export const unsaveExercise = async (exerciseId: string) => {
  await api.delete(`/contents/${exerciseId}/unsave/`);
};

// Image Upload
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/image/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.url;
};

// Get all lessons with optional filtering
export const getLessons = async (params: {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  subfields?: string[];
  theorems?: string[];
  sort?: SortOption;
  page?: number;
  per_page?: number;
}) => {
  const response = await api.get('/contents/', {
    params: {
      type: 'lesson',
      class_levels: params.classLevels,
      subjects: params.subjects,
      chapters: params.chapters,
      subfields: params.subfields,
      theorems: params.theorems,
      sort: params.sort,
      page: params.page,
      per_page: params.per_page
    }
  });

  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

// Create a new lesson
export const createLesson = async (data: {
  title: string;
  content: string;
  class_levels: string[];
  subject: string;
  chapters: string[];
  subfields: string[];
  theorems?: string[];
}) => {
  const response = await api.post('/contents/', { ...data, type: 'lesson' });
  return response.data;
};

// Get a specific lesson by ID
export const getLessonById = async (id: string) => {
  const response = await api.get(`/contents/${id}/`);
  return response.data;
};

// Update an existing lesson
export const updateLesson = async (id: string, data: {
  title: string;
  content: string;
  class_levels: string[];
  subject: string;
  chapters: string[];
  subfields: string[];
  theorems?: string[];
}) => {
  const response = await api.put(`/contents/${id}/`, data);
  return response.data;
};

// Delete a lesson
export const deleteLesson = async (id: string) => {
  await api.delete(`/contents/${id}/`);
};

// Vote on a lesson
export const voteLesson = async (id: string, value: 1 | -1) => {
  try {
    const response = await api.post(`/contents/${id}/vote/`, { value });
    return response.data.item; // Return the updated lesson
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

// Comment on a lesson
export const addLessonComment = async (lessonId: string, content: string, parentId?: string) => {
  const response = await api.post(`/contents/${lessonId}/comment/`, {
    content,
    parent: parentId
  });
  return response.data;
};

// Track lesson view
export const markLessonViewed = async (lessonId: string) => {
  const response = await api.post(`/contents/${lessonId}/view/`);
  return response.data;
};

// Get filter counts for any content type
export const getFilterCounts = async (params: {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  difficulties?: Difficulty[];
  subfields?: string[];
  theorems?: string[];
  filterType: 'classLevels' | 'subjects' | 'subfields' | 'chapters' | 'theorems' | 'difficulties';
  contentType?: 'exercise' | 'lesson' | 'exam';
}) => {
  const endpoint = '/contents/';

  // Make a request with current filters to get counts for the specified filter type
  const response = await api.get(endpoint, {
    params: {
      type: params.contentType,
      class_levels: params.classLevels,
      subjects: params.subjects,
      chapters: params.chapters,
      difficulties: params.difficulties,
      subfields: params.subfields,
      theorems: params.theorems,
      per_page: 1 // We only need the count, not the actual results
    }
  });

  return {
    count: response.data.count || 0,
    filterType: params.filterType
  };
};

// Get similar exercises based on same chapters
export const getSimilarExercises = async (exerciseId: string) => {
  const response = await api.get(`/contents/${exerciseId}/similar/`);
  return {
    results: response.data.results || [],
    count: response.data.count || 0
  };
};



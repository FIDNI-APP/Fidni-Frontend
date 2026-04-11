/**
 * Structured Content API
 *
 * API client for exercises, exams, lessons with hierarchical JSON structure.
 * Uses the unified /contents/ endpoint with ?type= discriminator.
 */

import { api } from './apiClient';
import type {
  StructuredExercise,
  StructuredExerciseListItem,
  StructuredExam,
  StructuredExamListItem,
  StructuredLesson,
  StructuredLessonListItem,
  StructuredSolution,
  StructuredContentProgress,
  StructuredContentProgressListItem,
  ProgressSummary,
  StructuredContentStatistics,
  CreateStructuredExerciseRequest,
  CreateStructuredExamRequest,
  CreateStructuredLessonRequest,
  AssessItemRequest,
  AssessItemResponse,
  StructuredContentFilters,
  StructuredExamFilters,
} from '@/types/structured';
import type { FileAttachment, FileUploadResponse } from '@/types/fileAttachment';

// =====================
// HELPER FUNCTIONS
// =====================

function buildQueryParams(filters: StructuredContentFilters | StructuredExamFilters): URLSearchParams {
  const params = new URLSearchParams();

  // Single value filters (backwards compatible)
  if (filters.subject) params.append('subjects[]', String(filters.subject));
  if (filters.class_level) params.append('class_levels[]', String(filters.class_level));
  if (filters.chapter) params.append('chapters[]', String(filters.chapter));
  if (filters.difficulty) params.append('difficulties[]', filters.difficulty);
  if (filters.author) params.append('author', filters.author);
  if (filters.search) params.append('search', filters.search);
  if (filters.ordering) params.append('ordering', filters.ordering);
  if (filters.sort) params.append('sort', filters.sort);

  // Multiple value filters (using array format for Django)
  if (filters.classLevels?.length) {
    filters.classLevels.forEach(id => params.append('class_levels[]', id));
  }
  if (filters.subjects?.length) {
    filters.subjects.forEach(id => params.append('subjects[]', id));
  }
  if (filters.subfields?.length) {
    filters.subfields.forEach(id => params.append('subfields[]', id));
  }
  if (filters.chapters?.length) {
    filters.chapters.forEach(id => params.append('chapters[]', id));
  }
  if (filters.theorems?.length) {
    filters.theorems.forEach(id => params.append('theorems[]', id));
  }
  if (filters.difficulties?.length) {
    filters.difficulties.forEach(d => params.append('difficulties[]', d));
  }

  // Status filters
  if (filters.showViewed) params.append('showViewed', 'true');
  if (filters.hideViewed) params.append('hideViewed', 'true');
  if (filters.showCompleted) params.append('showCompleted', 'true');
  if (filters.showFailed) params.append('showFailed', 'true');

  // Exam-specific
  if ('is_national' in filters && filters.is_national !== undefined) {
    params.append('is_national', String(filters.is_national));
  }
  if ('national_year' in filters && filters.national_year) {
    params.append('national_year', String(filters.national_year));
  }

  return params;
}

// =====================
// PAGINATED RESPONSE TYPE
// =====================

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// =====================
// EXERCISE API
// =====================

export const structuredExerciseAPI = {
  list: async (filters?: StructuredContentFilters, page = 1): Promise<PaginatedResponse<StructuredExerciseListItem>> => {
    const params = filters ? buildQueryParams(filters) : new URLSearchParams();
    params.append('type', 'exercise');
    params.append('page', String(page));
    const response = await api.get(`/contents/?${params}`);
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length, next: null, previous: null };
    }
    return response.data;
  },

  get: async (id: string): Promise<StructuredExercise> => {
    const response = await api.get(`/contents/${id}/`);
    return response.data;
  },

  create: async (data: CreateStructuredExerciseRequest): Promise<StructuredExercise> => {
    const payload = {
      type: 'exercise',
      title: data.title,
      structure: data.structure,
      difficulty: data.difficulty,
      subject: data.subject_id,
      class_levels: data.class_level_ids,
      chapters: data.chapter_ids || [],
      theorems: data.theorem_ids || [],
      subfields: data.subfield_ids || [],
    };
    const response = await api.post('/contents/', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateStructuredExerciseRequest>): Promise<StructuredExercise> => {
    const payload: Record<string, unknown> = {};
    if (data.title) payload.title = data.title;
    if (data.structure) payload.structure = data.structure;
    if (data.difficulty) payload.difficulty = data.difficulty;
    if (data.subject_id) payload.subject = data.subject_id;
    if (data.class_level_ids) payload.class_levels = data.class_level_ids;
    if (data.chapter_ids) payload.chapters = data.chapter_ids;
    if (data.theorem_ids) payload.theorems = data.theorem_ids;
    if (data.subfield_ids) payload.subfields = data.subfield_ids;

    const response = await api.patch(`/contents/${id}/`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/contents/${id}/`);
  },

  // Voting
  vote: async (id: string, value: number): Promise<{ vote_count: number; user_vote: number }> => {
    const response = await api.post(`/contents/${id}/vote/`, { value });
    return response.data;
  },

  // Save/Bookmark
  save: async (id: string): Promise<{ saved: boolean }> => {
    const response = await api.post(`/contents/${id}/save/`);
    return response.data;
  },

  unsave: async (id: string): Promise<{ saved: boolean }> => {
    await api.delete(`/contents/${id}/unsave/`);
    return { saved: false };
  },

  // Complete/Progress
  complete: async (id: string, status: 'success' | 'review'): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/complete/`, { status });
    return response.data;
  },

  removeComplete: async (id: string): Promise<unknown> => {
    const response = await api.delete(`/contents/${id}/remove_progress/`);
    return response.data;
  },

  // Time tracking
  trackTime: async (id: string, timeSpentSeconds: number): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/track_time/`, { time_spent_seconds: timeSpentSeconds });
    return response.data;
  },

  // Solution
  getSolution: async (id: string): Promise<StructuredSolution | null> => {
    try {
      const response = await api.get(`/contents/${id}/`);
      return response.data.solution || null;
    } catch {
      return null;
    }
  },

  // Comments
  getComments: async (id: string): Promise<unknown[]> => {
    const response = await api.get(`/contents/${id}/`);
    return response.data.comments || [];
  },

  addComment: async (id: string, content: string, parentId?: string, fileIds?: string[]): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/comment/`, {
      content,
      parent_id: parentId,
      file_ids: fileIds,
    });
    return response.data;
  },

  // Question-level assessment
  assess: async (id: string, data: { item_path: string; assessment: string }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/assess_question/`, {
      question_path: data.item_path,
      status: data.assessment,
    });
    return response.data;
  },

  removeAssessment: async (id: string, data: { item_path: string }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/remove_assessment/`, {
      question_path: data.item_path,
    });
    return response.data;
  },

  validateSolution: async (id: string, data: { item_path: string; validation: string | null }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/validate_solution/`, {
      question_path: data.item_path,
      validation: data.validation,
    });
    return response.data;
  },

  getProgress: async (id: string): Promise<{ item_progress: Record<string, { status: string; solution_validation?: string; assessed_at: string }> }> => {
    const response = await api.get(`/contents/${id}/question_progress/`);
    return { item_progress: response.data };
  },

  // Timer sessions
  saveTimerSession: async (id: string, durationSeconds: number, sessionType = 'study', notes = ''): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/save_session/`, {
      duration_seconds: durationSeconds,
      session_type: sessionType,
      notes
    });
    return response.data;
  },

  getSessionStats: async (id: string): Promise<{ sessions: unknown[]; stats: { total_sessions: number; best_time: number; worst_time: number; average_time: number } }> => {
    const response = await api.get(`/contents/${id}/session_stats/`);
    return response.data;
  },

  getSessionHistory: async (id: string): Promise<{ sessions: Array<{ id: string; session_duration: number; started_at: string; ended_at: string; created_at: string; session_type: string; notes: string }> }> => {
    const response = await api.get(`/contents/${id}/session_history/`);
    return response.data;
  },

  deleteSession: async (id: string, sessionId: string): Promise<unknown> => {
    const response = await api.delete(`/contents/${id}/delete_session/${sessionId}/`);
    return response.data;
  },

  recordView: async (id: string): Promise<{ view_count: number; counted: boolean }> => {
    const response = await api.post(`/contents/${id}/view/`);
    return response.data;
  },
};

// =====================
// EXAM API
// =====================

export const structuredExamAPI = {
  list: async (filters?: StructuredExamFilters, page = 1): Promise<PaginatedResponse<StructuredExamListItem>> => {
    const params = filters ? buildQueryParams(filters) : new URLSearchParams();
    params.append('type', 'exam');
    params.append('page', String(page));
    const response = await api.get(`/contents/?${params}`);
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length, next: null, previous: null };
    }
    return response.data;
  },

  get: async (id: string): Promise<StructuredExam> => {
    const response = await api.get(`/contents/${id}/`);
    return response.data;
  },

  create: async (data: CreateStructuredExamRequest): Promise<StructuredExam> => {
    const payload = {
      type: 'exam',
      title: data.title,
      structure: data.structure,
      difficulty: data.difficulty,
      subject: data.subject_id,
      class_levels: data.class_level_ids,
      chapters: data.chapter_ids || [],
      theorems: data.theorem_ids || [],
      subfields: data.subfield_ids || [],
      is_national_exam: data.is_national_exam || false,
      national_year: data.national_year,
      duration_minutes: data.duration_minutes,
    };
    const response = await api.post('/contents/', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateStructuredExamRequest>): Promise<StructuredExam> => {
    const payload: Record<string, unknown> = {};
    if (data.title) payload.title = data.title;
    if (data.structure) payload.structure = data.structure;
    if (data.difficulty) payload.difficulty = data.difficulty;
    if (data.subject_id) payload.subject = data.subject_id;
    if (data.class_level_ids) payload.class_levels = data.class_level_ids;
    if (data.chapter_ids) payload.chapters = data.chapter_ids;
    if (data.theorem_ids) payload.theorems = data.theorem_ids;
    if (data.subfield_ids) payload.subfields = data.subfield_ids;
    if (data.is_national_exam !== undefined) payload.is_national_exam = data.is_national_exam;
    if (data.national_year) payload.national_year = data.national_year;
    if (data.duration_minutes) payload.duration_minutes = data.duration_minutes;

    const response = await api.patch(`/contents/${id}/`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/contents/${id}/`);
  },

  vote: async (id: string, value: number): Promise<{ vote_count: number; user_vote: number }> => {
    const response = await api.post(`/contents/${id}/vote/`, { value });
    return response.data;
  },

  save: async (id: string): Promise<{ saved: boolean }> => {
    const response = await api.post(`/contents/${id}/save/`);
    return response.data;
  },

  unsave: async (id: string): Promise<{ saved: boolean }> => {
    await api.delete(`/contents/${id}/unsave/`);
    return { saved: false };
  },

  complete: async (id: string, status: 'success' | 'review'): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/complete/`, { status });
    return response.data;
  },

  removeComplete: async (id: string): Promise<unknown> => {
    const response = await api.delete(`/contents/${id}/remove_progress/`);
    return response.data;
  },

  trackTime: async (id: string, timeSpentSeconds: number): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/track_time/`, { time_spent_seconds: timeSpentSeconds });
    return response.data;
  },

  getSolution: async (id: string): Promise<StructuredSolution | null> => {
    try {
      const response = await api.get(`/contents/${id}/`);
      return response.data.solution || null;
    } catch {
      return null;
    }
  },

  getComments: async (id: string): Promise<unknown[]> => {
    const response = await api.get(`/contents/${id}/`);
    return response.data.comments || [];
  },

  addComment: async (id: string, content: string, parentId?: string, fileIds?: string[]): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/comment/`, {
      content,
      parent_id: parentId,
      file_ids: fileIds,
    });
    return response.data;
  },

  // Question-level assessment
  assess: async (id: string, data: { item_path: string; assessment: string }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/assess_question/`, {
      question_path: data.item_path,
      status: data.assessment,
    });
    return response.data;
  },

  removeAssessment: async (id: string, data: { item_path: string }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/remove_assessment/`, {
      question_path: data.item_path,
    });
    return response.data;
  },

  validateSolution: async (id: string, data: { item_path: string; validation: string | null }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/validate_solution/`, {
      question_path: data.item_path,
      validation: data.validation,
    });
    return response.data;
  },

  getProgress: async (id: string): Promise<{ item_progress: Record<string, { status: string; solution_validation?: string; assessed_at: string }> }> => {
    const response = await api.get(`/contents/${id}/question_progress/`);
    return { item_progress: response.data };
  },

  // Timer sessions
  saveTimerSession: async (id: string, durationSeconds: number, sessionType = 'exam', notes = ''): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/save_session/`, {
      duration_seconds: durationSeconds,
      session_type: sessionType,
      notes
    });
    return response.data;
  },

  getSessionStats: async (id: string): Promise<{ sessions: unknown[]; stats: { total_sessions: number; best_time: number; worst_time: number; average_time: number } }> => {
    const response = await api.get(`/contents/${id}/session_stats/`);
    return response.data;
  },

  getSessionHistory: async (id: string): Promise<{ sessions: Array<{ id: string; session_duration: number; started_at: string; ended_at: string; created_at: string; session_type: string; notes: string }> }> => {
    const response = await api.get(`/contents/${id}/session_history/`);
    return response.data;
  },

  deleteSession: async (id: string, sessionId: string): Promise<unknown> => {
    const response = await api.delete(`/contents/${id}/delete_session/${sessionId}/`);
    return response.data;
  },

  recordView: async (id: string): Promise<{ view_count: number; counted: boolean }> => {
    const response = await api.post(`/contents/${id}/view/`);
    return response.data;
  },
};

// =====================
// LESSON API
// =====================

export const structuredLessonAPI = {
  list: async (filters?: StructuredContentFilters, page = 1): Promise<PaginatedResponse<StructuredLessonListItem>> => {
    const params = filters ? buildQueryParams(filters) : new URLSearchParams();
    params.append('type', 'lesson');
    params.append('page', String(page));
    const response = await api.get(`/contents/?${params}`);
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length, next: null, previous: null };
    }
    return response.data;
  },

  get: async (id: string): Promise<StructuredLesson> => {
    const response = await api.get(`/contents/${id}/`);
    return response.data;
  },

  create: async (data: CreateStructuredLessonRequest): Promise<StructuredLesson> => {
    const payload = {
      type: 'lesson',
      title: data.title,
      structure: data.structure,
      subject: data.subject_id,
      class_levels: data.class_level_ids,
      chapters: data.chapter_ids || [],
      theorems: data.theorem_ids || [],
      subfields: data.subfield_ids || [],
    };
    const response = await api.post('/contents/', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateStructuredLessonRequest>): Promise<StructuredLesson> => {
    const payload: Record<string, unknown> = {};
    if (data.title) payload.title = data.title;
    if (data.structure) payload.structure = data.structure;
    if (data.subject_id) payload.subject = data.subject_id;
    if (data.class_level_ids) payload.class_levels = data.class_level_ids;
    if (data.chapter_ids) payload.chapters = data.chapter_ids;
    if (data.theorem_ids) payload.theorems = data.theorem_ids;
    if (data.subfield_ids) payload.subfields = data.subfield_ids;

    const response = await api.patch(`/contents/${id}/`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/contents/${id}/`);
  },

  vote: async (id: string, value: number): Promise<{ vote_count: number; user_vote: number }> => {
    const response = await api.post(`/contents/${id}/vote/`, { value });
    return response.data;
  },

  save: async (id: string): Promise<{ saved: boolean }> => {
    const response = await api.post(`/contents/${id}/save/`);
    return response.data;
  },

  unsave: async (id: string): Promise<{ saved: boolean }> => {
    await api.delete(`/contents/${id}/unsave/`);
    return { saved: false };
  },

  complete: async (id: string, status: 'success' | 'review'): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/complete/`, { status });
    return response.data;
  },

  removeComplete: async (id: string): Promise<unknown> => {
    const response = await api.delete(`/contents/${id}/remove_progress/`);
    return response.data;
  },

  trackTime: async (id: string, timeSpentSeconds: number): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/track_time/`, { time_spent_seconds: timeSpentSeconds });
    return response.data;
  },

  getComments: async (id: string): Promise<unknown[]> => {
    const response = await api.get(`/contents/${id}/`);
    return response.data.comments || [];
  },

  addComment: async (id: string, content: string, parentId?: string, fileIds?: string[]): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/comment/`, {
      content,
      parent_id: parentId,
      file_ids: fileIds,
    });
    return response.data;
  },

  // Lessons don't have assessments, but adding stub for type compatibility
  assess: async (_id: string, _data: { item_path: string; assessment: string }): Promise<unknown> => {
    return {};
  },

  validateSolution: async (_id: string, _data: { item_path: string; validation: string | null }): Promise<unknown> => {
    return {};
  },

  getProgress: async (_id: string): Promise<{ item_progress: Record<string, { status: string; solution_validation?: string; assessed_at: string }> }> => {
    return { item_progress: {} };
  },

  // Lessons don't have timer, stubs for compatibility
  saveTimerSession: async (_id: string, _durationSeconds: number, _sessionType = 'study', _notes = ''): Promise<unknown> => {
    return {};
  },

  getSessionHistory: async (_id: string): Promise<{ sessions: Array<any> }> => {
    return { sessions: [] };
  },

  deleteSession: async (_id: string, _sessionId: string): Promise<unknown> => {
    return {};
  },

  recordView: async (id: string): Promise<{ view_count: number; counted: boolean }> => {
    const response = await api.post(`/contents/${id}/view/`);
    return response.data;
  },
};

// =====================
// PROGRESS API (uses existing interactions)
// =====================

export const structuredProgressAPI = {
  list: async (): Promise<PaginatedResponse<StructuredContentProgressListItem>> => {
    // Use user history endpoint
    const response = await api.get('/users/me/history/');
    return response.data;
  },

  summary: async (): Promise<ProgressSummary> => {
    const response = await api.get('/users/me/stats/');
    return {
      total_items: response.data.learning_stats?.total_viewed || 0,
      by_status: {
        not_started: 0,
        in_progress: 0,
        completed: response.data.learning_stats?.exercises_completed || 0,
        review: response.data.learning_stats?.exercises_in_review || 0,
      },
      by_type: {},
      total_time_seconds: 0,
    };
  },

  recent: async (limit = 10): Promise<StructuredContentProgressListItem[]> => {
    const response = await api.get(`/users/me/history/?limit=${limit}`);
    return response.data.results || response.data || [];
  },
};

// =====================
// FILE UPLOAD API
// =====================

export const fileAPI = {
  upload: async (file: File, contentType?: string, objectId?: number): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (contentType) formData.append('content_type', contentType);
    if (objectId) formData.append('object_id', String(objectId));

    const response = await api.post('/files/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  get: async (id: string): Promise<FileAttachment> => {
    const response = await api.get(`/files/${id}/`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/files/${id}/`);
  },

  list: async (contentType?: string, objectId?: number): Promise<FileAttachment[]> => {
    const params = new URLSearchParams();
    if (contentType) params.append('content_type', contentType);
    if (objectId) params.append('object_id', String(objectId));
    const response = await api.get(`/files/?${params}`);
    return response.data;
  },
};

// =====================
// UNIFIED API EXPORT
// =====================

export const structuredAPI = {
  exercises: structuredExerciseAPI,
  exams: structuredExamAPI,
  lessons: structuredLessonAPI,
  progress: structuredProgressAPI,
  files: fileAPI,
};

export default structuredAPI;

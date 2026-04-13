/**
 * Content Item API
 *
 * API client for exercises, exams, and lessons.
 * Uses the unified /contents/ endpoint with ?type= discriminator.
 */

import { api } from './apiClient';
import type {
  ContentExercise,
  ExerciseListItem,
  ContentExam,
  ExamListItem,
  ContentLesson,
  LessonListItem,
  ContentSolution,
  ContentProgress,
  ContentProgressListItem,
  ProgressSummary,
  ContentStatistics,
  CreateExerciseRequest,
  CreateExamRequest,
  CreateLessonRequest,
  AssessItemRequest,
  AssessItemResponse,
  ContentFilters,
  ContentExamFilters,
} from '@/types/content';
import type { FileAttachment, FileUploadResponse } from '@/types/fileAttachment';

// =====================
// HELPERS
// =====================

/** Normalize API response: rename json_content → structure */
function normalize<T>(data: T): T {
  if (Array.isArray(data)) return data.map(normalize) as unknown as T;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if ('json_content' in d) {
      const { json_content, ...rest } = d;
      return { ...rest, structure: json_content } as unknown as T;
    }
  }
  return data;
}

function buildQueryParams(filters: ContentFilters | ContentExamFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.subject) params.append('subjects[]', String(filters.subject));
  if (filters.class_level) params.append('class_levels[]', String(filters.class_level));
  if (filters.chapter) params.append('chapters[]', String(filters.chapter));
  if (filters.difficulty) params.append('difficulties[]', filters.difficulty);
  if (filters.author) params.append('author', filters.author);
  if (filters.search) params.append('search', filters.search);
  if (filters.ordering) params.append('ordering', filters.ordering);
  if (filters.sort) params.append('sort', filters.sort);

  filters.classLevels?.forEach(id => params.append('class_levels[]', id));
  filters.subjects?.forEach(id => params.append('subjects[]', id));
  filters.subfields?.forEach(id => params.append('subfields[]', id));
  filters.chapters?.forEach(id => params.append('chapters[]', id));
  filters.theorems?.forEach(id => params.append('theorems[]', id));
  filters.difficulties?.forEach(d => params.append('difficulties[]', d));

  if (filters.showViewed) params.append('showViewed', 'true');
  if (filters.hideViewed) params.append('hideViewed', 'true');
  if (filters.showCompleted) params.append('showCompleted', 'true');
  if (filters.showFailed) params.append('showFailed', 'true');

  if ('is_national' in filters && filters.is_national !== undefined) {
    params.append('is_national', String(filters.is_national));
  }
  if ('national_year' in filters && (filters as ContentExamFilters).national_year) {
    params.append('national_year', String((filters as ContentExamFilters).national_year));
  }

  return params;
}

// =====================
// PAGINATED RESPONSE
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

export const exerciseContentAPI = {
  list: async (filters?: ContentFilters, page = 1): Promise<PaginatedResponse<ExerciseListItem>> => {
    const params = filters ? buildQueryParams(filters) : new URLSearchParams();
    params.append('type', 'exercise');
    params.append('page', String(page));
    const response = await api.get(`/contents/?${params}`);
    if (Array.isArray(response.data)) {
      return { results: normalize(response.data), count: response.data.length, next: null, previous: null };
    }
    return { ...response.data, results: normalize(response.data.results) };
  },

  get: async (id: string): Promise<ContentExercise> => {
    const response = await api.get(`/contents/${id}/`);
    return normalize(response.data);
  },

  create: async (data: CreateExerciseRequest): Promise<ContentExercise> => {
    const payload = {
      type: 'exercise',
      title: data.title,
      json_content: data.structure,
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

  update: async (id: string, data: Partial<CreateExerciseRequest>): Promise<ContentExercise> => {
    const payload: Record<string, unknown> = {};
    if (data.title) payload.title = data.title;
    if (data.structure) payload.json_content = data.structure;
    if (data.difficulty) payload.difficulty = data.difficulty;
    if (data.subject_id) payload.subject = data.subject_id;
    if (data.class_level_ids) payload.class_levels = data.class_level_ids;
    if (data.chapter_ids) payload.chapters = data.chapter_ids;
    if (data.theorem_ids) payload.theorems = data.theorem_ids;
    if (data.subfield_ids) payload.subfields = data.subfield_ids;
    const response = await api.patch(`/contents/${id}/`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => { await api.delete(`/contents/${id}/`); },
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
  getSolution: async (id: string): Promise<ContentSolution | null> => {
    try {
      const response = await api.get(`/contents/${id}/`);
      return response.data.solution || null;
    } catch { return null; }
  },
  addComment: async (id: string, content: string, parentId?: string, fileIds?: string[]): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/comment/`, { content, parent_id: parentId, file_ids: fileIds });
    return response.data;
  },
  assess: async (id: string, data: { item_path: string; assessment: string }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/assess_question/`, { question_path: data.item_path, status: data.assessment });
    return response.data;
  },
  removeAssessment: async (id: string, data: { item_path: string }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/remove_assessment/`, { question_path: data.item_path });
    return response.data;
  },
  validateSolution: async (id: string, data: { item_path: string; validation: string | null }): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/validate_solution/`, { question_path: data.item_path, validation: data.validation });
    return response.data;
  },
  getProgress: async (id: string): Promise<{ item_progress: Record<string, { status: string; solution_validation?: string; assessed_at: string }> }> => {
    const response = await api.get(`/contents/${id}/question_progress/`);
    return { item_progress: response.data };
  },
  saveTimerSession: async (id: string, durationSeconds: number, sessionType = 'study', notes = ''): Promise<unknown> => {
    const response = await api.post(`/contents/${id}/save_session/`, { duration_seconds: durationSeconds, session_type: sessionType, notes });
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

export const examContentAPI = {
  list: async (filters?: ContentExamFilters, page = 1): Promise<PaginatedResponse<ExamListItem>> => {
    const params = filters ? buildQueryParams(filters) : new URLSearchParams();
    params.append('type', 'exam');
    params.append('page', String(page));
    const response = await api.get(`/contents/?${params}`);
    if (Array.isArray(response.data)) {
      return { results: normalize(response.data), count: response.data.length, next: null, previous: null };
    }
    return { ...response.data, results: normalize(response.data.results) };
  },

  get: async (id: string): Promise<ContentExam> => {
    const response = await api.get(`/contents/${id}/`);
    return normalize(response.data);
  },

  create: async (data: CreateExamRequest): Promise<ContentExam> => {
    const payload = {
      type: 'exam',
      title: data.title,
      json_content: data.structure,
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

  update: async (id: string, data: Partial<CreateExamRequest>): Promise<ContentExam> => {
    const payload: Record<string, unknown> = {};
    if (data.title) payload.title = data.title;
    if (data.structure) payload.json_content = data.structure;
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

  delete: async (id: string): Promise<void> => { await api.delete(`/contents/${id}/`); },
  vote: async (id: string, value: number) => { const r = await api.post(`/contents/${id}/vote/`, { value }); return r.data; },
  save: async (id: string) => { const r = await api.post(`/contents/${id}/save/`); return r.data; },
  unsave: async (id: string) => { await api.delete(`/contents/${id}/unsave/`); return { saved: false }; },
  complete: async (id: string, status: 'success' | 'review') => { const r = await api.post(`/contents/${id}/complete/`, { status }); return r.data; },
  removeComplete: async (id: string) => { const r = await api.delete(`/contents/${id}/remove_progress/`); return r.data; },
  trackTime: async (id: string, s: number) => { const r = await api.post(`/contents/${id}/track_time/`, { time_spent_seconds: s }); return r.data; },
  getSolution: async (id: string): Promise<ContentSolution | null> => {
    try { const r = await api.get(`/contents/${id}/`); return r.data.solution || null; } catch { return null; }
  },
  addComment: async (id: string, content: string, parentId?: string, fileIds?: string[]) => {
    const r = await api.post(`/contents/${id}/comment/`, { content, parent_id: parentId, file_ids: fileIds });
    return r.data;
  },
  assess: async (id: string, data: { item_path: string; assessment: string }) => {
    const r = await api.post(`/contents/${id}/assess_question/`, { question_path: data.item_path, status: data.assessment });
    return r.data;
  },
  removeAssessment: async (id: string, data: { item_path: string }) => {
    const r = await api.post(`/contents/${id}/remove_assessment/`, { question_path: data.item_path });
    return r.data;
  },
  validateSolution: async (id: string, data: { item_path: string; validation: string | null }) => {
    const r = await api.post(`/contents/${id}/validate_solution/`, { question_path: data.item_path, validation: data.validation });
    return r.data;
  },
  getProgress: async (id: string) => {
    const r = await api.get(`/contents/${id}/question_progress/`);
    return { item_progress: r.data };
  },
  saveTimerSession: async (id: string, durationSeconds: number, sessionType = 'exam', notes = '') => {
    const r = await api.post(`/contents/${id}/save_session/`, { duration_seconds: durationSeconds, session_type: sessionType, notes });
    return r.data;
  },
  getSessionStats: async (id: string) => { const r = await api.get(`/contents/${id}/session_stats/`); return r.data; },
  getSessionHistory: async (id: string) => { const r = await api.get(`/contents/${id}/session_history/`); return r.data; },
  deleteSession: async (id: string, sessionId: string) => { const r = await api.delete(`/contents/${id}/delete_session/${sessionId}/`); return r.data; },
  recordView: async (id: string) => { const r = await api.post(`/contents/${id}/view/`); return r.data; },
};

// =====================
// LESSON API
// =====================

export const lessonContentAPI = {
  list: async (filters?: ContentFilters, page = 1): Promise<PaginatedResponse<LessonListItem>> => {
    const params = filters ? buildQueryParams(filters) : new URLSearchParams();
    params.append('type', 'lesson');
    params.append('page', String(page));
    const response = await api.get(`/contents/?${params}`);
    if (Array.isArray(response.data)) {
      return { results: normalize(response.data), count: response.data.length, next: null, previous: null };
    }
    return { ...response.data, results: normalize(response.data.results) };
  },

  get: async (id: string): Promise<ContentLesson> => {
    const response = await api.get(`/contents/${id}/`);
    return normalize(response.data);
  },

  create: async (data: CreateLessonRequest): Promise<ContentLesson> => {
    const payload = {
      type: 'lesson',
      title: data.title,
      json_content: data.structure,
      subject: data.subject_id,
      class_levels: data.class_level_ids,
      chapters: data.chapter_ids || [],
      theorems: data.theorem_ids || [],
      subfields: data.subfield_ids || [],
    };
    const response = await api.post('/contents/', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateLessonRequest>): Promise<ContentLesson> => {
    const payload: Record<string, unknown> = {};
    if (data.title) payload.title = data.title;
    if (data.structure) payload.json_content = data.structure;
    if (data.subject_id) payload.subject = data.subject_id;
    if (data.class_level_ids) payload.class_levels = data.class_level_ids;
    if (data.chapter_ids) payload.chapters = data.chapter_ids;
    if (data.theorem_ids) payload.theorems = data.theorem_ids;
    if (data.subfield_ids) payload.subfields = data.subfield_ids;
    const response = await api.patch(`/contents/${id}/`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => { await api.delete(`/contents/${id}/`); },
  vote: async (id: string, value: number) => { const r = await api.post(`/contents/${id}/vote/`, { value }); return r.data; },
  save: async (id: string) => { const r = await api.post(`/contents/${id}/save/`); return r.data; },
  unsave: async (id: string) => { await api.delete(`/contents/${id}/unsave/`); return { saved: false }; },
  complete: async (id: string, status: 'success' | 'review') => { const r = await api.post(`/contents/${id}/complete/`, { status }); return r.data; },
  removeComplete: async (id: string) => { const r = await api.delete(`/contents/${id}/remove_progress/`); return r.data; },
  trackTime: async (id: string, s: number) => { const r = await api.post(`/contents/${id}/track_time/`, { time_spent_seconds: s }); return r.data; },
  addComment: async (id: string, content: string, parentId?: string, fileIds?: string[]) => {
    const r = await api.post(`/contents/${id}/comment/`, { content, parent_id: parentId, file_ids: fileIds });
    return r.data;
  },
  assess: async (_id: string, _data: { item_path: string; assessment: string }) => ({}),
  validateSolution: async (_id: string, _data: { item_path: string; validation: string | null }) => ({}),
  getProgress: async (_id: string) => ({ item_progress: {} as Record<string, { status: string; solution_validation?: string; assessed_at: string }> }),
  saveTimerSession: async (_id: string, _d: number, _t = 'study', _n = '') => ({}),
  getSessionHistory: async (_id: string) => ({ sessions: [] as any[] }),
  deleteSession: async (_id: string, _sid: string) => ({}),
  recordView: async (id: string) => { const r = await api.post(`/contents/${id}/view/`); return r.data; },
};

// =====================
// PROGRESS API
// =====================

export const progressAPI = {
  list: async (): Promise<PaginatedResponse<ContentProgressListItem>> => {
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
  recent: async (limit = 10): Promise<ContentProgressListItem[]> => {
    const response = await api.get(`/users/me/history/?limit=${limit}`);
    return response.data.results || response.data || [];
  },
};

// =====================
// FILE API
// =====================

export const fileAPI = {
  upload: async (file: File, contentType?: string, objectId?: number): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (contentType) formData.append('content_type', contentType);
    if (objectId) formData.append('object_id', String(objectId));
    const response = await api.post('/files/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  get: async (id: string): Promise<FileAttachment> => { const r = await api.get(`/files/${id}/`); return r.data; },
  delete: async (id: string): Promise<void> => { await api.delete(`/files/${id}/`); },
  list: async (contentType?: string, objectId?: number): Promise<FileAttachment[]> => {
    const params = new URLSearchParams();
    if (contentType) params.append('content_type', contentType);
    if (objectId) params.append('object_id', String(objectId));
    const r = await api.get(`/files/?${params}`);
    return r.data;
  },
};

// =====================
// UNIFIED EXPORT
// =====================

export const contentItemAPI = {
  exercises: exerciseContentAPI,
  exams: examContentAPI,
  lessons: lessonContentAPI,
  progress: progressAPI,
  files: fileAPI,
};

// =====================
// BACKWARDS-COMPAT ALIASES
// =====================

/** @deprecated Use exerciseContentAPI */
export const structuredExerciseAPI = exerciseContentAPI;
/** @deprecated Use examContentAPI */
export const structuredExamAPI = examContentAPI;
/** @deprecated Use lessonContentAPI */
export const structuredLessonAPI = lessonContentAPI;
/** @deprecated Use progressAPI */
export const structuredProgressAPI = progressAPI;
/** @deprecated Use contentItemAPI */
export const structuredAPI = contentItemAPI;

export default contentItemAPI;

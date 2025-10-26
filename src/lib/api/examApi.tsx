import api from './index';
import { Exam, Difficulty, VoteValue } from '@/types';

interface ExamResponse {
  results: Exam[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface ExamQueryParams {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  difficulties?: Difficulty[];
  subfields?: string[];
  theorems?: string[];
  isNationalExam?: boolean | null;
  dateRange?: {
    start: string | null;
    end: string | null;
  } | null;
  sort?: string;
  page?: number;
  per_page?: number;
}

// Get all exams with optional filtering
export const getExams = async (params: ExamQueryParams): Promise<ExamResponse> => {
  // Build the query parameters
  const queryParams: Record<string, any> = {
    class_levels: params.classLevels,
    subjects: params.subjects,
    chapters: params.chapters,
    difficulties: params.difficulties,
    subfields: params.subfields,
    theorems: params.theorems,
    sort: params.sort,
    page: params.page,
    per_page: params.per_page
  };

  // Add specific exam filters
  if (params.isNationalExam !== null && params.isNationalExam !== undefined) {
    queryParams.is_national_exam = params.isNationalExam;
  }

  // Add year range filter if provided
  if (params.dateRange?.start) {
    // Ensure we're sending year format
    const startYear = params.dateRange.start.length === 4 ? 
      params.dateRange.start : 
      new Date(params.dateRange.start).getFullYear().toString();
    queryParams.year_from = startYear;
  }
  if (params.dateRange?.end) {
    // Ensure we're sending year format  
    const endYear = params.dateRange.end.length === 4 ? 
      params.dateRange.end : 
      new Date(params.dateRange.end).getFullYear().toString();
    queryParams.year_to = endYear;
  }

  const response = await api.get('/exams/', { params: queryParams });
  
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

// Get a specific exam by ID
export const getExamById = async (id: string): Promise<Exam> => {
  const response = await api.get(`/exams/${id}/`);
  return response.data;
};

// Create a new exam
export const createExam = async (data: {
  title: string;
  content: string;
  difficulty: Difficulty;
  class_levels: string[];
  subject: string;
  chapters: string[];
  subfields: string[];
  theorems?: string[];
  is_national_exam: boolean;
  national_date?: string | null;
}): Promise<Exam> => {
  // Send national_date as-is (should be in YYYY format from frontend)
  const examData = { ...data };
  
  const response = await api.post('/exams/', examData);
  return response.data;
};

// Update an existing exam
export const updateExam = async (id: string, data: {
  title?: string;
  content?: string;
  difficulty?: Difficulty;
  class_levels?: string[];
  subject?: string;
  chapters?: string[];
  subfields?: string[];
  theorems?: string[];
  is_national_exam?: boolean;
  national_date?: string | null;
}): Promise<Exam> => {
  // Send national_date as-is (should be in YYYY format from frontend)
  const examData = { ...data };
  
  const response = await api.put(`/exams/${id}/`, examData);
  return response.data;
};

// Delete an exam
export const deleteExam = async (id: string): Promise<void> => {
  await api.delete(`/exams/${id}/`);
};

// Vote on an exam
export const voteExam = async (id: string, value: VoteValue): Promise<Exam> => {
  try {
    const response = await api.post(`/exams/${id}/vote/`, { value });
    return response.data.item; // Return the updated exam
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

// Comment on an exam
export const addExamComment = async (examId: string, content: string, parentId?: string): Promise<any> => {
  const response = await api.post(`/exams/${examId}/comment/`, { 
    content,
    parent: parentId
  });
  return response.data;
};

// Mark exam as viewed
export const markExamViewed = async (examId: string): Promise<any> => {
  const response = await api.post(`/exams/${examId}/view/`);
  return response.data;
};

// Mark exam progress (success/review)
export const markExamProgress = async (examId: string, status: 'success' | 'review'): Promise<any> => {
  const response = await api.post(`/exams/${examId}/mark_progress/`, { status });
  return response.data;
};

// Remove exam progress
export const removeExamProgress = async (examId: string): Promise<void> => {
  await api.delete(`/exams/${examId}/remove_progress/`);
};

// Save exam for later
export const saveExam = async (examId: string): Promise<any> => {
  const response = await api.post(`/exams/${examId}/save_exam/`);
  return response.data;
};

// Unsave exam
export const unsaveExam = async (examId: string): Promise<void> => {
  await api.delete(`/exams/${examId}/unsave_exam/`);
};
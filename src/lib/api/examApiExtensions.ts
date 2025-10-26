/**
 * Exam-Specific API Extensions
 *
 * Contains exam-only features like national exam filters and date ranges
 * that don't apply to exercises or lessons.
 */

import { examAPI, BaseContentQueryParams } from './contentApiFactory';
import { Exam, Difficulty } from '@/types';

/**
 * Extended query parameters specific to exams
 */
export interface ExamQueryParams extends BaseContentQueryParams {
  isNationalExam?: boolean | null;
  dateRange?: {
    start: string | null;
    end: string | null;
  } | null;
}

/**
 * Exam-specific create/update data
 */
export interface ExamData {
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
}

/**
 * Get exams with exam-specific filters (national exam, date range)
 */
export async function getExams(params: ExamQueryParams) {
  const baseParams: BaseContentQueryParams = {
    classLevels: params.classLevels,
    subjects: params.subjects,
    chapters: params.chapters,
    difficulties: params.difficulties,
    subfields: params.subfields,
    theorems: params.theorems,
    sort: params.sort,
    page: params.page,
    per_page: params.per_page,
  };

  // Add exam-specific query parameters
  const queryParams: Record<string, any> = { ...baseParams };

  if (params.isNationalExam !== null && params.isNationalExam !== undefined) {
    queryParams.is_national_exam = params.isNationalExam;
  }

  // Add year range filter if provided
  if (params.dateRange?.start) {
    const startYear = params.dateRange.start.length === 4
      ? params.dateRange.start
      : new Date(params.dateRange.start).getFullYear().toString();
    queryParams.year_from = startYear;
  }

  if (params.dateRange?.end) {
    const endYear = params.dateRange.end.length === 4
      ? params.dateRange.end
      : new Date(params.dateRange.end).getFullYear().toString();
    queryParams.year_to = endYear;
  }

  return examAPI.getList(queryParams);
}

/**
 * Create a new exam with exam-specific fields
 */
export async function createExam(data: ExamData): Promise<Exam> {
  return examAPI.create(data);
}

/**
 * Update an existing exam with exam-specific fields
 */
export async function updateExam(id: string, data: Partial<ExamData>): Promise<Exam> {
  return examAPI.update(id, data);
}

// Re-export common operations from base API
export const {
  getById: getExamById,
  delete: deleteExam,
  vote: voteExam,
  addComment: addExamComment,
  markViewed: markExamViewed,
  markProgress: markExamProgress,
  removeProgress: removeExamProgress,
  save: saveExam,
  unsave: unsaveExam,
} = examAPI;

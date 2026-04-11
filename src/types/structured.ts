/**
 * Types for Structured Content System
 *
 * Hierarchical content system for exercises, exams, and lessons
 * with granular progress tracking and self-assessment.
 */

import type { ClassLevelModel, SubjectModel, ChapterModel, Theorem, Subfield, User, Difficulty } from './index';

// =====================
// CONTENT BLOCK TYPES
// =====================

export interface ContentBlock {
  type: 'text' | 'image' | 'latex';
  html?: string;
  src?: string;  // For images
  alt?: string;  // For images
}

// =====================
// EXERCISE/EXAM STRUCTURE
// =====================

export interface Part {
  id: string;
  label?: string;
  points?: number;
  content?: ContentBlock;
}

export interface SubQuestion {
  id: string;
  label?: string;
  points?: number;
  content?: ContentBlock;
  parts?: Part[];
}

export interface Question {
  id: string;
  label?: string;
  points?: number;
  content?: ContentBlock;
  subQuestions?: SubQuestion[];
}

export interface ExerciseStructure {
  version: string;
  metadata?: {
    estimatedTime?: number;
    totalPoints?: number;
    [key: string]: unknown;
  };
  introduction?: ContentBlock;
  questions: Question[];
  solution?: SolutionStructure;
}

export interface SolutionStructure {
  questions?: Array<{
    id: string;
    content?: ContentBlock;
    subQuestions?: Array<{
      id: string;
      content?: ContentBlock;
      parts?: Array<{
        id: string;
        content?: ContentBlock;
      }>;
    }>;
  }>;
}

// =====================
// LESSON STRUCTURE
// =====================

export interface SubSection {
  id: string;
  title?: string;
  content?: ContentBlock;
}

export interface Section {
  id: string;
  title?: string;
  content?: ContentBlock;
  subSections?: SubSection[];
}

export interface LessonStructure {
  version: string;
  metadata?: {
    estimatedReadTime?: number;
    [key: string]: unknown;
  };
  sections: Section[];
}

// =====================
// STRUCTURED CONTENT MODELS
// =====================

export interface StructuredContentBase {
  id: string;
  title: string;
  difficulty?: Difficulty;
  structure: ExerciseStructure | LessonStructure;
  author: Pick<User, 'id' | 'username'>;
  created_at: string;
  updated_at: string;
  chapters: ChapterModel[];
  class_levels: ClassLevelModel[];
  subject: SubjectModel;
  theorems: Theorem[];
  subfields: Subfield[];
  view_count: number;
  version: number;
  total_points?: number;
  item_count?: number;
}

export interface StructuredExercise extends StructuredContentBase {
  structure: ExerciseStructure;
}

export interface StructuredExam extends StructuredContentBase {
  structure: ExerciseStructure;
  is_national_exam: boolean;
  national_year?: number;
  duration_minutes?: number;
}

export interface StructuredLesson extends Omit<StructuredContentBase, 'difficulty'> {
  structure: LessonStructure;
  section_count?: number;
}

// List serializer types (includes structure for preview rendering)
export interface StructuredExerciseListItem {
  id: string;
  title: string;
  difficulty?: Difficulty;
  structure: ExerciseStructure;
  author: Pick<User, 'id' | 'username'>;
  subject: SubjectModel;
  class_levels: ClassLevelModel[];
  chapters?: { id: number; name: string }[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  created_at: string;
  view_count: number;
  total_points: number;
  item_count: number;
}

export interface StructuredExamListItem extends StructuredExerciseListItem {
  is_national_exam: boolean;
  national_year?: number;
  duration_minutes?: number;
}

export interface StructuredLessonListItem {
  id: string;
  title: string;
  structure: LessonStructure;
  author: Pick<User, 'id' | 'username'>;
  subject: SubjectModel;
  class_levels: ClassLevelModel[];
  chapters?: { id: number; name: string }[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  created_at: string;
  view_count: number;
  section_count: number;
}

// =====================
// SOLUTION
// =====================

export interface StructuredSolution {
  id: string;
  content_type: number;
  object_id: string;
  content_type_name: string;
  structure: SolutionStructure;
  author: Pick<User, 'id' | 'username'>;
  created_at: string;
  updated_at: string;
}

// =====================
// PROGRESS TRACKING
// =====================

export type AssessmentStatus = 'success' | 'partial' | 'review' | 'failed';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'review';

export interface ItemProgressEntry {
  status: AssessmentStatus;
  assessed_at: string;
}

export interface ItemAssessment {
  id: string;
  item_path: string;
  assessment: AssessmentStatus;
  notes?: string;
  time_spent_seconds: number;
  handwriting_image?: string;
  recognized_content?: string;
  created_at: string;
}

export interface StructuredContentProgress {
  id: string;
  content_type: number;
  object_id: string;
  content_type_name: string;
  status: ProgressStatus;
  item_progress: Record<string, ItemProgressEntry>;
  time_spent: Record<string, number>;
  total_time_seconds: number;
  started_at?: string;
  completed_at?: string;
  last_activity: string;
  completion_percentage: number;
  success_rate: number;
  recent_assessments?: ItemAssessment[];
}

export interface StructuredContentProgressListItem {
  id: string;
  content_type_name: string;
  object_id: string;
  content_title?: string;
  status: ProgressStatus;
  completion_percentage: number;
  total_time_seconds: number;
  last_activity: string;
}

export interface ProgressSummary {
  total_items: number;
  by_status: Record<ProgressStatus, number>;
  by_type: Record<string, number>;
  total_time_seconds: number;
}

// =====================
// STATISTICS
// =====================

export interface ItemStatistics {
  attempts: number;
  success_rate: number;
  avg_time_seconds: number;
  difficulty_perceived?: 'easy' | 'medium' | 'hard';
}

export interface StructuredContentStatistics {
  id: string;
  content_type: number;
  object_id: string;
  content_type_name: string;
  total_attempts: number;
  completion_count: number;
  average_completion_time_seconds: number;
  overall_success_rate: number;
  item_statistics: Record<string, ItemStatistics>;
  last_calculated: string;
}

// =====================
// API REQUEST/RESPONSE TYPES
// =====================

export interface CreateStructuredExerciseRequest {
  title: string;
  difficulty?: Difficulty;
  structure: ExerciseStructure;
  class_level_ids: number[];
  subject_id: number;
  chapter_ids?: number[];
  theorem_ids?: number[];
  subfield_ids?: number[];
}

export interface CreateStructuredExamRequest extends CreateStructuredExerciseRequest {
  is_national_exam?: boolean;
  national_year?: number;
  duration_minutes?: number;
}

export interface CreateStructuredLessonRequest {
  title: string;
  structure: LessonStructure;
  class_level_ids: number[];
  subject_id: number;
  chapter_ids?: number[];
  theorem_ids?: number[];
  subfield_ids?: number[];
}

export interface AssessItemRequest {
  item_path: string;
  assessment: AssessmentStatus;
  notes?: string;
  time_spent_seconds?: number;
  handwriting_image?: string;
}

export interface AssessItemResponse {
  assessment: ItemAssessment;
  progress: StructuredContentProgress;
}

// =====================
// FILTER TYPES
// =====================

export interface StructuredContentFilters {
  // Single value filters (backwards compatible)
  subject?: number;
  class_level?: number;
  chapter?: number;
  difficulty?: Difficulty;
  author?: string;
  search?: string;
  ordering?: string;
  sort?: string;

  // Multiple value filters (for HorizontalFilterBar)
  classLevels?: string[];
  subjects?: string[];
  subfields?: string[];
  chapters?: string[];
  theorems?: string[];
  difficulties?: Difficulty[];

  // Status filters
  showViewed?: boolean;
  hideViewed?: boolean;
  showCompleted?: boolean;
  showFailed?: boolean;
}

export interface StructuredExamFilters extends StructuredContentFilters {
  is_national?: boolean;
  national_year?: number;
}

// =====================
// EDITOR TYPES
// =====================

export type ContentType = 'exercise' | 'exam' | 'lesson';

export interface EditorState {
  title: string;
  difficulty?: Difficulty;
  structure: ExerciseStructure | LessonStructure;
  classLevelIds: number[];
  subjectId: number | null;
  chapterIds: number[];
  theoremIds: number[];
  subfieldIds: number[];
  // Exam-specific
  isNationalExam?: boolean;
  nationalYear?: number;
  durationMinutes?: number;
}

// Helper to get item path
export function getItemPath(questionId: string, subQuestionId?: string, partId?: string): string {
  if (partId && subQuestionId) {
    return `${questionId}.${subQuestionId}.${partId}`;
  }
  if (subQuestionId) {
    return `${questionId}.${subQuestionId}`;
  }
  return questionId;
}

// Helper to parse item path
export function parseItemPath(path: string): { questionId: string; subQuestionId?: string; partId?: string } {
  const parts = path.split('.');
  return {
    questionId: parts[0],
    subQuestionId: parts[1],
    partId: parts[2],
  };
}

// Helper to generate sequential IDs
export function generateQuestionId(index: number): string {
  return `q${index + 1}`;
}

export function generateSubQuestionId(index: number): string {
  return String.fromCharCode(97 + index); // a, b, c, ...
}

export function generatePartId(index: number): string {
  const numerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  return numerals[index] || `${index + 1}`;
}

export function generateSectionId(index: number): string {
  return `s${index + 1}`;
}

export function generateSubSectionId(sectionIndex: number, subIndex: number): string {
  return `ss${sectionIndex + 1}_${subIndex + 1}`;
}

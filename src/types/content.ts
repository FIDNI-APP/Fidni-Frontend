import type { ClassLevelModel, SubjectModel, ChapterModel, Theorem, Subfield, User, Difficulty } from './index';

// =====================
// CONTENT BLOCK TYPES
// =====================

export interface ContentBlock {
  type: 'text' | 'image' | 'latex';
  html?: string;
  src?: string;
  alt?: string;
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

export interface LessonSection {
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
  sections: LessonSection[];
}

// =====================
// CONTENT MODELS (detail)
// =====================

export interface ContentBase {
  id: number;
  display_id?: number;
  type: 'exercise' | 'lesson' | 'exam';
  title: string;
  difficulty?: Difficulty;
  structure?: ExerciseStructure | LessonStructure;
  author: Pick<User, 'id' | 'username'>;
  created_at: string;
  updated_at?: string;
  chapters: ChapterModel[];
  class_levels: ClassLevelModel[];
  subject: SubjectModel;
  theorems: Theorem[];
  subfields: Subfield[];
  view_count: number;
  vote_count?: number;
  user_vote?: number | null;
  user_save?: boolean;
  user_complete?: 'success' | 'review' | null;
  user_timespent?: number;
  total_points?: number;
  item_count?: number;
  section_count?: number;
}

export interface ContentExercise extends ContentBase {
  type: 'exercise';
  structure?: ExerciseStructure;
}

export interface ContentExam extends ContentBase {
  type: 'exam';
  structure?: ExerciseStructure;
  is_national_exam?: boolean;
  national_year?: number | null;
  duration_minutes?: number | null;
}

export interface ContentLesson extends ContentBase {
  type: 'lesson';
  structure?: LessonStructure;
}

// =====================
// LIST ITEM TYPES
// =====================

export interface ExerciseListItem {
  id: number;
  display_id?: number;
  type: 'exercise';
  title: string;
  difficulty?: Difficulty;
  structure?: ExerciseStructure;
  author: Pick<User, 'id' | 'username'>;
  subject: SubjectModel;
  class_levels: ClassLevelModel[];
  chapters?: { id: number; name: string }[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  user_save?: boolean;
  user_vote?: number | null;
  vote_count?: number;
  created_at: string;
  view_count: number;
  total_points?: number;
  item_count?: number;
}

export interface ExamListItem {
  id: number;
  display_id?: number;
  type: 'exam';
  title: string;
  difficulty?: Difficulty;
  structure?: ExerciseStructure;
  author: Pick<User, 'id' | 'username'>;
  subject: SubjectModel;
  class_levels: ClassLevelModel[];
  chapters?: { id: number; name: string }[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  user_save?: boolean;
  user_vote?: number | null;
  vote_count?: number;
  created_at: string;
  view_count: number;
  total_points?: number;
  item_count?: number;
  is_national_exam?: boolean;
  national_year?: number | null;
  duration_minutes?: number | null;
}

export interface LessonListItem {
  id: number;
  display_id?: number;
  type: 'lesson';
  title: string;
  structure?: LessonStructure;
  author: Pick<User, 'id' | 'username'>;
  subject: SubjectModel;
  class_levels: ClassLevelModel[];
  chapters?: { id: number; name: string }[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  user_save?: boolean;
  user_vote?: number | null;
  vote_count?: number;
  created_at: string;
  view_count: number;
  section_count?: number;
}

export type ContentListItem = ExerciseListItem | ExamListItem | LessonListItem;

// =====================
// SOLUTION
// =====================

export interface ContentSolution {
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

export interface ContentProgress {
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

export interface ContentProgressListItem {
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

export interface ContentStatistics {
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
// API REQUEST TYPES
// =====================

export interface CreateExerciseRequest {
  title: string;
  difficulty?: Difficulty;
  structure: ExerciseStructure;
  class_level_ids: number[];
  subject_id: number;
  chapter_ids?: number[];
  theorem_ids?: number[];
  subfield_ids?: number[];
}

export interface CreateExamRequest extends CreateExerciseRequest {
  is_national_exam?: boolean;
  national_year?: number;
  duration_minutes?: number;
}

export interface CreateLessonRequest {
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
  progress: ContentProgress;
}

// =====================
// FILTER TYPES
// =====================

export interface ContentFilters {
  subject?: number;
  class_level?: number;
  chapter?: number;
  difficulty?: Difficulty;
  author?: string;
  search?: string;
  ordering?: string;
  sort?: string;
  classLevels?: string[];
  subjects?: string[];
  subfields?: string[];
  chapters?: string[];
  theorems?: string[];
  difficulties?: Difficulty[];
  showViewed?: boolean;
  hideViewed?: boolean;
  showCompleted?: boolean;
  showFailed?: boolean;
}

export interface ContentExamFilters extends ContentFilters {
  is_national?: boolean;
  national_year?: number;
}

// =====================
// EDITOR TYPES
// =====================

export type ContentKind = 'exercise' | 'exam' | 'lesson';

export interface EditorState {
  title: string;
  difficulty?: Difficulty;
  structure: ExerciseStructure | LessonStructure;
  classLevelIds: number[];
  subjectId: number | null;
  chapterIds: number[];
  theoremIds: number[];
  subfieldIds: number[];
  isNationalExam?: boolean;
  nationalYear?: number;
  durationMinutes?: number;
}

// =====================
// BACKWARDS-COMPAT ALIASES (remove gradually)
// =====================

/** @deprecated Use ContentBase */
export type StructuredContentBase = ContentBase;
/** @deprecated Use ContentExercise */
export type StructuredExercise = ContentExercise;
/** @deprecated Use ContentExam */
export type StructuredExam = ContentExam;
/** @deprecated Use ContentLesson */
export type StructuredLesson = ContentLesson;
/** @deprecated Use ExerciseListItem */
export type StructuredExerciseListItem = ExerciseListItem;
/** @deprecated Use ExamListItem */
export type StructuredExamListItem = ExamListItem;
/** @deprecated Use LessonListItem */
export type StructuredLessonListItem = LessonListItem;
/** @deprecated Use ContentSolution */
export type StructuredSolution = ContentSolution;
/** @deprecated Use ContentProgress */
export type StructuredContentProgress = ContentProgress;
/** @deprecated Use ContentProgressListItem */
export type StructuredContentProgressListItem = ContentProgressListItem;
/** @deprecated Use ContentStatistics */
export type StructuredContentStatistics = ContentStatistics;
/** @deprecated Use CreateExerciseRequest */
export type CreateStructuredExerciseRequest = CreateExerciseRequest;
/** @deprecated Use CreateExamRequest */
export type CreateStructuredExamRequest = CreateExamRequest;
/** @deprecated Use CreateLessonRequest */
export type CreateStructuredLessonRequest = CreateLessonRequest;
/** @deprecated Use ContentFilters */
export type StructuredContentFilters = ContentFilters;
/** @deprecated Use ContentExamFilters */
export type StructuredExamFilters = ContentExamFilters;

// =====================
// HELPERS
// =====================

export function getItemPath(questionId: string, subQuestionId?: string, partId?: string): string {
  if (partId && subQuestionId) return `${questionId}.${subQuestionId}.${partId}`;
  if (subQuestionId) return `${questionId}.${subQuestionId}`;
  return questionId;
}

export function parseItemPath(path: string): { questionId: string; subQuestionId?: string; partId?: string } {
  const parts = path.split('.');
  return { questionId: parts[0], subQuestionId: parts[1], partId: parts[2] };
}

export function generateQuestionId(index: number): string { return `q${index + 1}`; }
export function generateSubQuestionId(index: number): string { return String.fromCharCode(97 + index); }
export function generatePartId(index: number): string {
  const numerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  return numerals[index] || `${index + 1}`;
}
export function generateSectionId(index: number): string { return `s${index + 1}`; }
export function generateSubSectionId(sectionIndex: number, subIndex: number): string {
  return `ss${sectionIndex + 1}_${subIndex + 1}`;
}

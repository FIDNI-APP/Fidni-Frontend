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
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
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
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
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
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
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
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
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

// =====================
// SOLUTION
// =====================

export interface ContentSolution {
  id: string;
  content_type: number;
  object_id: string;
  content_type_name: string;
  structure: SolutionStructure;
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
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


export type Difficulty = 'easy' | 'medium' | 'hard';
export type SortOption = 'newest' | 'oldest' | 'most_upvoted' | 'most_commented';
export type VoteValue = 1 | -1 | 0;
export type CompleteValue = 'success' | 'review';
export type ContentKind = 'exercise' | 'lesson' | 'exam';

// =====================
// HIERARCHY
// =====================

export interface ClassLevelModel {
  id: string;
  name: string;
  content_count?: number | null;
}

export interface SubjectModel {
  id: string;
  name: string;
  class_level: ClassLevelModel;
  content_count?: number | null;
}

export interface Subfield {
  id: string;
  name: string;
  subject: SubjectModel;
  class_level: ClassLevelModel[];
  content_count?: number | null;
}

export interface ChapterModel {
  id: string;
  name: string;
  subject: SubjectModel;
  class_level: ClassLevelModel[];
  subfield: Subfield[];
  order: number;
  content_count?: number | null;
}

export interface Theorem {
  id: string;
  name: string;
  subject: SubjectModel;
  class_level: ClassLevelModel[];
  chapter: ChapterModel[];
  subfield: Subfield[];
  content_count?: number | null;
}

// =====================
// USER
// =====================

export interface SubjectGrade {
  id: string;
  subject: string;
  min_grade: number;
  max_grade: number;
}

export interface UserProfile {
  bio: string;
  avatar: string;
  favorite_subjects: string[];
  location: string;
  last_activity_date: string;
  joined_at: string;
  class_level: { id: string; name: string } | null;
  user_type: 'student' | 'teacher';
  onboarding_completed: boolean;
  subject_grades: SubjectGrade[];
  display_email: boolean;
  display_stats: boolean;
  email_notifications: boolean;
  comment_notifications: boolean;
  solution_notifications: boolean;
  contribution_stats?: {
    exercises: number;
    solutions: number;
    comments: number;
    total_contributions: number;
    upvotes_received: number;
    view_count: number;
  };
  learning_stats?: {
    exercises_completed: number;
    exercises_in_review: number;
    exercises_saved: number;
    subjects_studied: string[];
    total_viewed: number;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  profile: UserProfile;
  is_self?: boolean;
  isAuthenticated: boolean;
  is_superuser: boolean;
}

// =====================
// CONTENT
// =====================

export interface Comment {
  id: string;
  content: string;
  author: User;
  created_at: string;
  updated_at?: string;
  user_vote: VoteValue;
  parent_id?: string;
  replies?: Comment[];
  vote_count: number;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_type: string;
    url: string;
  }>;
}

export interface Solution {
  id: string;
  content: string;
  author: User;
  created_at: string;
  updated_at: string;
  upvotes_count?: number;
  downvotes_count?: number;
  user_vote: VoteValue;
  vote_count: number;
}

/**
 * Unified Content type — matches backend ContentSerializer / ContentListSerializer output
 * after normalize() maps json_content → structure.
 */
export interface Content {
  id: number;
  display_id?: number;
  type: ContentKind;
  title: string;
  // Legacy text content (old items)
  content?: string;
  // Structured JSON content (new items, after normalize())
  structure?: any;
  difficulty?: Difficulty;
  class_levels: ClassLevelModel[];
  subject: SubjectModel;
  chapters: ChapterModel[];
  theorems?: Theorem[];
  subfields?: Subfield[];
  author: User;
  created_at: string;
  updated_at?: string;
  view_count: number;
  vote_count: number;
  user_vote?: VoteValue;
  solution?: Solution;
  comments?: Comment[];
  comment_count?: number;
  user_save?: boolean;
  user_complete?: CompleteValue | null;
  user_timespent?: number;
  total_points?: number;
  item_count?: number;
  section_count?: number;
  // Exam-specific
  is_national_exam?: boolean;
  national_year?: number | null;
  duration_minutes?: number | null;
}

/** @deprecated Use Content instead */
export type Lesson = Content;
/** @deprecated Use Content instead */
export type Exam = Content;

// =====================
// FILTER TYPES
// =====================

export interface ExamFilters {
  classLevels: string[];
  subjects: string[];
  subfields: string[];
  chapters: string[];
  theorems: string[];
  difficulties: Difficulty[];
  isNationalExam: boolean | null;
  dateRange: { start: string | null; end: string | null } | null;
}

// =====================
// NOTEBOOK
// =====================

export interface Section {
  id: string;
  chapter: { id: string; name: string };
  lesson_entries: {
    id: string;
    lesson: { id: string; title: string; content?: string; structure?: any };
    page_order: number;
    content_start: number;
    content_end: number | null;
    is_continuation: boolean;
    added_at: string;
  }[];
  user_notes: string;
  order: number;
}

export interface Notebook {
  id: string;
  title: string;
  subject: { id: string; name: string };
  class_level: { id: string; name: string };
  sections: Section[];
}

export interface NotebookLessonEntry {
  id: string;
  lesson: Content;
  added_at: string;
  notes?: string;
  highlighted: boolean;
}

export interface NotebookChapter {
  id: string;
  chapter: ChapterModel;
  lessons: NotebookLessonEntry[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NotebookResponse {
  notebooks: Notebook[];
  count: number;
}

// =====================
// LEARNING PATH
// =====================

export interface LearningPath {
  id: string;
  subject: SubjectModel;
  class_level: ClassLevelModel[];
  title: string;
  description: string;
  estimated_hours: number;
  is_active: boolean;
  path_chapters: PathChapter[];
  user_progress?: UserLearningPathProgress;
  created_at: string;
  updated_at: string;
  total_chapters?: number;
  total_videos?: number;
}

export interface PathChapter {
  id: string;
  learning_path: LearningPath;
  chapter: ChapterModel;
  title: string;
  description: string;
  order: number;
  total_duration: string;
  videos: Video[];
  quiz?: ChapterQuiz;
  user_progress?: UserChapterProgress;
  created_at: string;
  updated_at: string;
}

export type VideoType = 'lesson' | 'introduction' | 'explanation' | 'demo' | 'tips' | 'summary';

export interface Video {
  id: string;
  path_chapter: string;
  title: string;
  url: string;
  thumbnail_url?: string;
  video_type: VideoType;
  duration_seconds: number;
  duration: string;
  order: number;
  resources: VideoResource[];
  user_progress?: UserVideoProgress;
  created_at: string;
  updated_at: string;
}

export interface ChapterQuiz {
  id: string;
  path_chapter: string;
  title: string;
  description?: string;
  estimated_minutes: number;
  estimated_duration: string;
  passing_score: number;
  time_limit_minutes?: number;
  shuffle_questions: boolean;
  questions: QuizQuestion[];
  user_attempts?: QuizAttemptSummary[];
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select';

export interface QuizQuestion {
  id: string;
  quiz: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer_index?: number;
  correct_answer_indices?: number[];
  explanation: string;
  difficulty: Difficulty;
  points: number;
  order: number;
}

export interface UserLearningPathProgress {
  started_at: string;
  progress_percentage: number;
  last_activity?: string;
  total_time_seconds?: number;
}

export interface UserChapterProgress {
  chapter_id: string;
  is_completed: boolean;
  progress_percentage: number;
  quiz_score?: number;
  quiz_passed?: boolean;
  started_at: string;
  completed_at?: string;
}

export interface UserVideoProgress {
  watched_seconds: number;
  is_completed: boolean;
  progress_percentage: number;
  notes?: string;
}

export interface VideoResource {
  id: string;
  title: string;
  resource_type: 'pdf' | 'link' | 'exercise' | 'summary' | 'code' | 'slides';
  url: string;
  description?: string;
}

export interface QuizAttemptSummary {
  id: string;
  started_at: string;
  score: number;
  passed: boolean;
  time_spent_seconds: number;
}

export type LearningPathSortOption = 'newest' | 'popular' | 'duration' | 'difficulty';
export type ProgressFilter = 'all' | 'not_started' | 'in_progress' | 'completed';

export interface QuizResult {
  score: number;
  passed: boolean;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  results?: {
    question_id: string;
    is_correct: boolean;
    your_answer: number | number[];
    correct_answer?: number | number[];
    explanation?: string;
  }[];
  passing_score: number;
}

export interface QuizSubmission {
  attempt_id: string;
  answers: {
    question_id: string;
    answer_index?: number;
    answer_indices?: number[];
  }[];
}

export interface StartQuizResponse {
  attempt_id: string;
  questions: QuizQuestion[];
  time_limit_minutes?: number;
  total_questions: number;
}

export interface ViewHistoryItem {
  content_type: string;
  content: Content;
  viewed_at: string;
  time_spent?: number;
}

export interface GradePrediction {
  subjectId: string;
  subjectName: string;
  currentAverage: number;
  predictedGrade: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  recommendedExercises?: string[];
}

export interface ResourceType {
  id: string;
}

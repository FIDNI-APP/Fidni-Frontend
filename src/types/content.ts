import type { ClassLevelModel, SubjectModel, ChapterModel, Theorem, Subfield, User, Difficulty, SortOption } from './index';

// =====================
// RESSENTI DES ÉLÈVES, PROGRESSION (listes et détail)
// =====================

export type FeltLevel = 'easy' | 'medium' | 'hard';

/**
 * Ressenti des élèves sur la difficulté (backend apps/things/difficulty.py). null côté API = pas assez de
 * données. `differs` : le ressenti n'est pas la difficulté annoncée par l'auteur.
 */
export interface Felt {
  level: FeltLevel;
  declared: FeltLevel | null;
  differs: boolean;
  /** Élèves retenus pour la réussite. */
  n: number;
  success_pct: number | null;
  votes: { easier: number; as_said: number; harder: number };
  basis: 'avis' | 'reussite' | 'annonce';
}

/** Questions évaluées par l'élève connecté (liste /api/contents/). */
export interface UserProgress {
  assessed: number;
  success: number;
  total: number;
}

/** Tris des listes : ceux de SortOption + « Du plus facile au plus difficile ». */
export type ListSort = SortOption | 'easiest';

/** Niveau d'une carte de liste : le slug mène à la page du niveau (/exercises/niveau/<slug>). */
export type ListClassLevel = ClassLevelModel & { slug?: string };
/** Chapitre d'une carte de liste (slug : page du chapitre). */
export interface ListChapter { id: number; name: string; slug?: string }

/** Champs ajoutés à chaque ligne des listes (et au détail pour `felt`). */
interface ListExtras {
  felt?: Felt | null;
  user_progress?: UserProgress | null;
  /** « ≈ N min » : somme des meta.expected_seconds des questions, null si aucune. */
  expected_minutes?: number | null;
  /** Tri « Pour toi » : pourquoi ce contenu est proposé. */
  recommendation_reason?: string | null;
}

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
  like_count?: number;
  dislike_count?: number;
  user_vote?: number | null;
  user_save?: boolean;
  user_complete?: 'success' | 'review' | null;
  user_timespent?: number;
  total_points?: number;
  item_count?: number;
  section_count?: number;
  /** Ressenti des élèves (exercices et examens), null s'il n'y a pas assez de données. */
  felt?: Felt | null;
  expected_minutes?: number | null;
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

export interface ExerciseListItem extends ListExtras {
  id: number;
  display_id?: number;
  type: 'exercise';
  title: string;
  difficulty?: Difficulty;
  structure?: ExerciseStructure;
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
  subject: SubjectModel;
  class_levels: ListClassLevel[];
  chapters?: ListChapter[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  user_save?: boolean;
  user_vote?: number | null;
  vote_count?: number;
  like_count?: number;
  dislike_count?: number;
  created_at: string;
  view_count: number;
  total_points?: number;
  item_count?: number;
}

export interface ExamListItem extends ListExtras {
  id: number;
  display_id?: number;
  type: 'exam';
  title: string;
  difficulty?: Difficulty;
  structure?: ExerciseStructure;
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
  subject: SubjectModel;
  class_levels: ListClassLevel[];
  chapters?: ListChapter[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  user_save?: boolean;
  user_vote?: number | null;
  vote_count?: number;
  like_count?: number;
  dislike_count?: number;
  created_at: string;
  view_count: number;
  total_points?: number;
  item_count?: number;
  is_national_exam?: boolean;
  national_year?: number | null;
  duration_minutes?: number | null;
  /** Nombre de parties (blocs « section ») : en mode Cartes, la structure n'en garde que le début. */
  section_count?: number;
}

export interface LessonListItem extends ListExtras {
  id: number;
  display_id?: number;
  type: 'lesson';
  title: string;
  structure?: LessonStructure;
  author: Pick<User, 'id' | 'username' | 'is_deleted'>;
  subject: SubjectModel;
  class_levels: ListClassLevel[];
  chapters?: ListChapter[];
  theorems?: { id: number; name: string }[];
  comment_count?: number;
  user_complete?: 'success' | 'review' | null;
  user_save?: boolean;
  user_vote?: number | null;
  vote_count?: number;
  like_count?: number;
  dislike_count?: number;
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
  /** « À faire » : tout sauf ce que l'élève a déjà réussi. */
  todo?: boolean;
  /** Mode Cartes : énoncé allégé, sans solutions (6 premiers blocs). */
  view?: 'card' | 'full';
  /** Taille de page (20 par défaut côté serveur, 100 au plus). */
  page_size?: number;
  /** Examens : nationaux (true) ou devoirs (false) ; années d'un examen national. */
  is_national?: boolean;
  national_year_min?: number;
  national_year_max?: number;
  /** Dossier d'une année du Bac national (« aucune » : sujets sans année). */
  national_year?: number | 'aucune';
  /** Dossier « Sans chapitre » d'un niveau : contenus rangés dans aucun de ses chapitres. */
  sans_chapitre?: boolean;
}

export interface ContentExamFilters extends ContentFilters {
  is_national?: boolean;
}

// =====================
// EDITOR TYPES
// =====================

export type ContentKind = 'exercise' | 'exam' | 'lesson';


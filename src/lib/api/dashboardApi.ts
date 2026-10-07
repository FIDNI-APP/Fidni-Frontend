/**
 * Dashboard API - User statistics and learning path data
 */
import { api } from './apiClient';

export interface ContentTypeStats {
  total_seconds: number;
  formatted: string;
  percentage: number;
  entries_count: number;  // Changed from sessions_count - represents tracking entries
  average_per_entry: number;  // Changed from average_per_session
  average_formatted: string;
}

export interface TimeBreakdown {
  exercises: ContentTypeStats;
  lessons: ContentTypeStats;
  exams: ContentTypeStats;
  total_seconds: number;
}

export interface LearningInsights {
  most_studied_type: 'exercises' | 'lessons' | 'exams';
  least_studied_type: 'exercises' | 'lessons' | 'exams';
  needs_more_lessons: boolean;
  balanced_study: boolean;
}

export interface DashboardStats {
  exercises_started: number;
  study_time: string;
  perfect_completions: number;
  total_exercises: number;
  streak_days: number;
  period: string;
  time_breakdown?: TimeBreakdown;
  insights?: LearningInsights;
}

export interface LearningPathStep {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'locked';
}

export interface LearningPathProgress {
  steps: LearningPathStep[];
  overall_progress: number;
  streak: number;
  level: number;
}

export interface RecommendedContent {
  exercises: any[];
  lessons: any[];
  exams: any[];
  /** Niveau de l'élève (les recommandations en viennent), null s'il n'est pas renseigné. */
  level: string | null;
}

/**
 * Get user dashboard statistics (for Quick Stats Dashboard)
 */
export async function getUserDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats/');
  return response.data;
}

/**
 * Get user learning path progress (for Learning Path Tracker)
 */
export async function getLearningPathProgress(): Promise<LearningPathProgress> {
  const response = await api.get('/dashboard/learning-path/');
  return response.data;
}

/**
 * Get recommended content (exercises, lessons, exams)
 */
function normalizeList(items: any[]): any[] {
  return items.map(item => {
    if ('json_content' in item) {
      const { json_content, ...rest } = item;
      return { ...rest, structure: json_content };
    }
    return item;
  });
}

export async function getRecommendedContent(): Promise<RecommendedContent> {
  const response = await api.get('/dashboard/recommended/');
  const data = response.data;
  return {
    exercises: normalizeList(data.exercises || []),
    lessons: normalizeList(data.lessons || []),
    exams: normalizeList(data.exams || []),
    level: data.level ?? null,
  };
}

// ── Tableau de bord de l'accueil (/api/dashboard/overview/) : uniquement des chiffres enregistrés.
export interface OverviewContent {
  id: number; type: 'exercise' | 'exam' | 'lesson'; title: string; url: string; chapter: string | null;
  assessed?: number; total?: number; last_at?: string;
}
export interface OverviewWeek {
  questions: number; success_rate: number | null; completed: number; chrono_minutes: number; active_days: number;
}
export interface OverviewChapter {
  id: number; name: string; subfield: string | null; assessed: number;
  success_pct: number | null; skilliq_pct: number | null; contents: number;
}
export interface DashboardOverview {
  level: { id: number; name: string } | null;
  streak: { current: number; best: number };
  calendar: { date: string; count: number }[];
  week: OverviewWeek;
  previous_week: OverviewWeek;
  totals: { questions: number; success_rate: number | null; exercises_done: number; exams_done: number; chrono_minutes: number };
  resume: OverviewContent[];
  review: OverviewContent[];
  chapters: OverviewChapter[];
  coverage: { total: number; touched: number };
  weak_notions: { slug: string; label: string; assessed: number; mastery_pct: number }[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await api.get('/dashboard/overview/');
  return response.data;
}

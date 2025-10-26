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
export async function getRecommendedContent(): Promise<RecommendedContent> {
  const response = await api.get('/dashboard/recommended/');
  return response.data;
}

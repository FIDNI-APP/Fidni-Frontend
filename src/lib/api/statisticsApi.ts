/**
 * Statistics API
 *
 * Handles all statistics-related API calls for exercises and exams
 * Includes success rates, time tracking, solution viewing, and user performance comparisons
 */

import { api } from './apiClient';

export interface ContentStatistics {
  total_participants: number;
  success_count: number;
  review_count: number;
  success_percentage: number;
  average_time_seconds: number;
  best_time_seconds: number;
  solution_views_before_success: number;
  user_time_percentile: number | null;
  user_completed: 'success' | 'review' | null;
  user_viewed_solution: boolean;
  user_time_seconds: number | null;
  solution_match_count: number;
  user_solution_matched: boolean;
}

export interface SolutionViewTrackingResponse {
  marked_as_viewed: boolean;
  message: string;
}

/**
 * Get statistics for any content item
 */
export async function getContentStatistics(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<ContentStatistics> {
  try {
    const response = await api.get(`/contents/${contentId}/statistics/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch content statistics:', error);
    throw error;
  }
}

/**
 * Get statistics for an exercise
 */
export async function getExerciseStatistics(
  exerciseId: string
): Promise<ContentStatistics> {
  return getContentStatistics('exercise', exerciseId);
}

/**
 * Get statistics for an exam
 */
export async function getExamStatistics(examId: string): Promise<ContentStatistics> {
  return getContentStatistics('exam', examId);
}

/**
 * Mark that current user viewed the solution
 */
export async function markSolutionViewed(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.post(`/contents/${contentId}/mark_solution_viewed/`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark solution as viewed:', error);
    throw error;
  }
}

/**
 * Mark that current user viewed the solution for an exercise
 */
export async function markExerciseSolutionViewed(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  return markSolutionViewed('exercise', exerciseId);
}

/**
 * Mark that current user viewed the solution for an exam
 */
export async function markExamSolutionViewed(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  return markSolutionViewed('exam', examId);
}

/**
 * Remove/undo solution viewed flag
 */
export async function undoSolutionViewed(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.delete(`/contents/${contentId}/mark_solution_viewed/`);
    return response.data;
  } catch (error) {
    console.error('Failed to undo solution view:', error);
    throw error;
  }
}

/**
 * Remove/undo solution viewed flag for an exercise
 */
export async function undoExerciseSolutionViewed(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  return undoSolutionViewed('exercise', exerciseId);
}

/**
 * Remove/undo solution viewed flag for an exam
 */
export async function undoExamSolutionViewed(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  return undoSolutionViewed('exam', examId);
}

/**
 * Mark that current user's solution matches the proposed solution
 */
export async function markSolutionMatched(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.post(`/contents/${contentId}/mark_solution_match/`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark solution match:', error);
    throw error;
  }
}

/**
 * Mark that current user's solution matches the proposed solution for an exercise
 */
export async function markExerciseSolutionMatched(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  return markSolutionMatched('exercise', exerciseId);
}

/**
 * Mark that current user's solution matches the proposed solution for an exam
 */
export async function markExamSolutionMatched(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  return markSolutionMatched('exam', examId);
}

/**
 * Remove/undo solution match flag
 */
export async function undoSolutionMatched(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.delete(`/contents/${contentId}/mark_solution_match/`);
    return response.data;
  } catch (error) {
    console.error('Failed to undo solution match:', error);
    throw error;
  }
}

/**
 * Remove/undo solution match flag for an exercise
 */
export async function undoExerciseSolutionMatched(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  return undoSolutionMatched('exercise', exerciseId);
}

/**
 * Remove/undo solution match flag for an exam
 */
export async function undoExamSolutionMatched(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  return undoSolutionMatched('exam', examId);
}

/**
 * Generic function to toggle solution match for any content type
 * If matched, will unmark; if not matched, will mark
 */
export async function toggleSolutionMatched(
  contentType: 'exercise' | 'exam',
  contentId: string,
  isCurrentlyMatched: boolean
): Promise<SolutionViewTrackingResponse> {
  return isCurrentlyMatched
    ? undoSolutionMatched(contentType, contentId)
    : markSolutionMatched(contentType, contentId);
}

/**
 * Taxonomy Time Statistics
 */

export interface TaxonomyTimeItem {
  id: number;
  taxonomy_type: 'subject' | 'subfield' | 'chapter' | 'theorem';
  taxonomy_id: number;
  name: string;
  total_time_seconds: number;
  total_time_formatted: string;
  // Content type breakdown
  exercise_time_seconds: number;
  lesson_time_seconds: number;
  exam_time_seconds: number;
}

export interface TaxonomyTimeStatsResponse {
  count: number;
  results: TaxonomyTimeItem[];
}

export interface TaxonomyTimeStatsParams {
  taxonomy_type?: 'subject' | 'subfield' | 'chapter' | 'theorem';
  search?: string;
  limit?: number;
}

/**
 * Get taxonomy time statistics for the current user
 */
export async function getTaxonomyTimeStats(
  params?: TaxonomyTimeStatsParams
): Promise<TaxonomyTimeStatsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.taxonomy_type) queryParams.set('taxonomy_type', params.taxonomy_type);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const url = `/study-time/taxonomy-stats/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch taxonomy time statistics:', error);
    throw error;
  }
}

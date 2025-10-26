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
 * Get statistics for an exercise
 */
export async function getExerciseStatistics(
  exerciseId: string
): Promise<ContentStatistics> {
  try {
    const response = await api.get(`/exercises/${exerciseId}/statistics/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch exercise statistics:', error);
    throw error;
  }
}

/**
 * Get statistics for an exam
 */
export async function getExamStatistics(examId: string): Promise<ContentStatistics> {
  try {
    const response = await api.get(`/exams/${examId}/statistics/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch exam statistics:', error);
    throw error;
  }
}

/**
 * Mark that current user viewed the solution for an exercise
 */
export async function markExerciseSolutionViewed(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.post(`/exercises/${exerciseId}/mark_solution_viewed/`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark solution as viewed:', error);
    throw error;
  }
}

/**
 * Mark that current user viewed the solution for an exam
 */
export async function markExamSolutionViewed(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.post(`/exams/${examId}/mark_solution_viewed/`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark solution as viewed:', error);
    throw error;
  }
}

/**
 * Generic function to get statistics for any content type
 */
export async function getContentStatistics(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<ContentStatistics> {
  return contentType === 'exercise'
    ? getExerciseStatistics(contentId)
    : getExamStatistics(contentId);
}

/**
 * Remove/undo solution viewed flag for an exercise
 */
export async function undoExerciseSolutionViewed(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.delete(`/exercises/${exerciseId}/mark_solution_viewed/`);
    return response.data;
  } catch (error) {
    console.error('Failed to undo solution view:', error);
    throw error;
  }
}

/**
 * Remove/undo solution viewed flag for an exam
 */
export async function undoExamSolutionViewed(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.delete(`/exams/${examId}/mark_solution_viewed/`);
    return response.data;
  } catch (error) {
    console.error('Failed to undo solution view:', error);
    throw error;
  }
}

/**
 * Generic function to mark solution as viewed for any content type
 */
export async function markSolutionViewed(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  return contentType === 'exercise'
    ? markExerciseSolutionViewed(contentId)
    : markExamSolutionViewed(contentId);
}

/**
 * Generic function to remove solution viewed flag for any content type
 */
export async function undoSolutionViewed(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  return contentType === 'exercise'
    ? undoExerciseSolutionViewed(contentId)
    : undoExamSolutionViewed(contentId);
}

/**
 * Mark that current user's solution matches the proposed solution for an exercise
 */
export async function markExerciseSolutionMatched(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.post(`/exercises/${exerciseId}/mark_solution_match/`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark solution match:', error);
    throw error;
  }
}

/**
 * Mark that current user's solution matches the proposed solution for an exam
 */
export async function markExamSolutionMatched(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.post(`/exams/${examId}/mark_solution_match/`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark solution match:', error);
    throw error;
  }
}

/**
 * Remove/undo solution match flag for an exercise
 */
export async function undoExerciseSolutionMatched(
  exerciseId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.delete(`/exercises/${exerciseId}/mark_solution_match/`);
    return response.data;
  } catch (error) {
    console.error('Failed to undo solution match:', error);
    throw error;
  }
}

/**
 * Remove/undo solution match flag for an exam
 */
export async function undoExamSolutionMatched(
  examId: string
): Promise<SolutionViewTrackingResponse> {
  try {
    const response = await api.delete(`/exams/${examId}/mark_solution_match/`);
    return response.data;
  } catch (error) {
    console.error('Failed to undo solution match:', error);
    throw error;
  }
}

/**
 * Generic function to mark solution match for any content type
 */
export async function markSolutionMatched(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  return contentType === 'exercise'
    ? markExerciseSolutionMatched(contentId)
    : markExamSolutionMatched(contentId);
}

/**
 * Generic function to remove solution match flag for any content type
 */
export async function undoSolutionMatched(
  contentType: 'exercise' | 'exam',
  contentId: string
): Promise<SolutionViewTrackingResponse> {
  return contentType === 'exercise'
    ? undoExerciseSolutionMatched(contentId)
    : undoExamSolutionMatched(contentId);
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

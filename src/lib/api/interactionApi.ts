/**
 * Interaction API
 *
 * Handles user interactions: voting, comments, time tracking, and sessions.
 * Uses the content API factory to eliminate duplication.
 */

import { api } from './apiClient';
import { exerciseAPI, examAPI, lessonAPI, getContentAPI, type VoteValue, type ContentType } from './contentApiFactory';

// Re-export VoteValue type for convenience
export type { VoteValue };

// ============ VOTING ============

/**
 * Vote on an exercise (uses factory)
 */
export const voteExercise = exerciseAPI.vote;

/**
 * Vote on an exam (uses factory)
 */
export const voteExam = examAPI.vote;

/**
 * Vote on a lesson (uses factory)
 */
export const voteLesson = lessonAPI.vote;

/**
 * Vote on a solution
 */
export async function voteSolution(id: string, value: VoteValue) {
  try {
    const response = await api.post(`/solutions/${id}/vote/`, { value });
    return response.data.item;
  } catch (error) {
    console.error('Vote error on solution:', error);
    throw error;
  }
}

/**
 * Vote on a comment
 */
export async function voteComment(id: string, value: VoteValue) {
  try {
    const response = await api.post(`/comments/${id}/vote/`, { value });
    return response.data.item;
  } catch (error) {
    console.error('Vote error on comment:', error);
    throw error;
  }
}

// ============ COMMENTS ============

/**
 * Add a comment to any content type (uses factory)
 */
export async function addComment(contentType: ContentType, contentId: string, content: string, parentId?: string) {
  try {
    const contentAPI = getContentAPI(contentType);
    return await contentAPI.addComment(contentId, content, parentId);
  } catch (error) {
    console.error(`Error adding comment to ${contentType}:`, error);
    throw error;
  }
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, content: string) {
  const response = await api.put(`/comments/${commentId}/`, { content });
  return response.data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
  await api.delete(`/comments/${commentId}/`);
}

// ============ TIME TRACKING ============

export interface TimeSession {
  id: string;
  session_duration: number; // in seconds
  started_at: string;
  ended_at: string;
  created_at: string;
  session_type: string;
  notes: string;
}

/**
 * Save time spent on content (uses factory)
 */
export async function saveTimeSpent(contentType: ContentType, contentId: string, timeSeconds: number) {
  const contentAPI = getContentAPI(contentType);
  return contentAPI.saveTimeSpent(contentId, timeSeconds);
}

/**
 * Get time spent on content (uses factory)
 */
export async function getTimeSpent(contentType: ContentType, contentId: string) {
  const contentAPI = getContentAPI(contentType);
  return contentAPI.getTimeSpent(contentId);
}

/**
 * Auto-save time spent (only if above threshold) (uses factory)
 */
export async function autoSaveTimeSpent(
  contentType: ContentType,
  contentId: string,
  timeSeconds: number,
  minTimeThreshold: number = 10
) {
  const contentAPI = getContentAPI(contentType);
  return contentAPI.autoSaveTimeSpent(contentId, timeSeconds, minTimeThreshold);
}

// ============ SESSION MANAGEMENT ============

/**
 * Save a study session (uses factory)
 */
export async function saveSession(
  contentType: ContentType,
  contentId: string,
  sessionType: string = 'study',
  notes: string = ''
) {
  const contentAPI = getContentAPI(contentType);
  return contentAPI.saveSession(contentId, sessionType, notes);
}

/**
 * Get session history for content (uses factory)
 */
export async function getSessionHistory(contentType: ContentType, contentId: string): Promise<TimeSession[]> {
  const contentAPI = getContentAPI(contentType);
  return contentAPI.getSessionHistory(contentId);
}

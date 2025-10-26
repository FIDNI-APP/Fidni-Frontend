/**
 * Lesson-Specific API Extensions
 *
 * Contains lesson-only features and convenience wrappers.
 */

import { lessonAPI, BaseContentQueryParams } from './contentApiFactory';
import { Lesson } from '@/types';

/**
 * Lesson-specific create/update data
 */
export interface LessonData {
  title: string;
  content: string;
  class_levels: string[];
  subject: string;
  chapters: string[];
  subfields: string[];
  theorems?: string[];
}

/**
 * Get lessons with optional filters
 */
export async function getLessons(params: BaseContentQueryParams) {
  return lessonAPI.getList(params);
}

/**
 * Create a new lesson
 */
export async function createLesson(data: LessonData): Promise<Lesson> {
  return lessonAPI.create(data);
}

/**
 * Update an existing lesson
 */
export async function updateLesson(id: string, data: Partial<LessonData>): Promise<Lesson> {
  return lessonAPI.update(id, data);
}

// Re-export common operations from base API
export const {
  getById: getLessonById,
  delete: deleteLesson,
  vote: voteLesson,
  addComment: addLessonComment,
  markViewed: markLessonViewed,
  markProgress: markLessonProgress,
  removeProgress: removeLessonProgress,
  save: saveLesson,
  unsave: unsaveLesson,
} = lessonAPI;

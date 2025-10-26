/**
 * Exercise-Specific API Extensions
 *
 * Contains exercise-only features like solutions that don't apply to other content types.
 */

import { api } from './apiClient';
import { exerciseAPI, BaseContentQueryParams } from './contentApiFactory';
import { Solution, Difficulty } from '@/types';

/**
 * Exercise-specific create/update data
 */
export interface ExerciseData {
  title: string;
  content: string;
  type?: string;
  class_levels: string[];
  subject: string;
  chapters: string[];
  difficulty: Difficulty;
  subfields: string[];
  theorems?: string[];
  solution_content?: string;
}

/**
 * Get exercises with optional filters
 */
export async function getExercises(params: BaseContentQueryParams) {
  return exerciseAPI.getList(params);
}

/**
 * Create a new exercise
 */
export async function createExercise(data: ExerciseData) {
  return exerciseAPI.create(data);
}

/**
 * Update an existing exercise
 */
export async function updateExercise(id: string, data: Partial<ExerciseData>) {
  return exerciseAPI.update(id, data);
}

// ============ SOLUTION MANAGEMENT (Exercise-specific) ============

/**
 * Add a solution to an exercise
 */
export async function addSolution(exerciseId: string, content: string): Promise<Solution> {
  const response = await api.post(`/exercises/${exerciseId}/solution/`, { content });
  return response.data;
}

/**
 * Get a specific solution by ID
 */
export async function getSolution(id: string): Promise<Solution> {
  const response = await api.get(`/solutions/${id}/`);
  return response.data;
}

/**
 * Update an existing solution
 */
export async function updateSolution(id: string, content: string): Promise<Solution> {
  const response = await api.put(`/solutions/${id}/`, { content });
  return response.data;
}

/**
 * Delete a solution
 */
export async function deleteSolution(id: string): Promise<void> {
  await api.delete(`/solutions/${id}/`);
}

/**
 * Vote on a solution (upvote/downvote)
 */
export async function voteSolution(id: string, value: 1 | -1 | 0): Promise<Solution> {
  try {
    const response = await api.post(`/solutions/${id}/vote/`, { value });
    return response.data.item;
  } catch (error) {
    console.error('Vote error on solution:', error);
    throw error;
  }
}

// ============ IMAGE UPLOAD (Used in exercise editor) ============

/**
 * Upload an image for use in exercise content
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/image/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.url;
}

// Re-export common operations from base API
export const {
  getById: getExerciseById,
  delete: deleteExercise,
  vote: voteExercise,
  addComment: addExerciseComment,
  markViewed: markExerciseViewed,
  markProgress: markExerciseProgress,
  removeProgress: removeExerciseProgress,
  save: saveExercise,
  unsave: unsaveExercise,
} = exerciseAPI;

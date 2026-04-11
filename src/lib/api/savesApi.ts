/**
 * API functions for managing saved items (exercises, lessons, exams)
 */

import { api } from './apiClient';

export interface SaveResponse {
  id: number;
  saved_at: string;
  message: string;
}

// Exercise saves
export async function saveExercise(exerciseId: number): Promise<SaveResponse> {
  try {
    const response = await api.post(`/contents/${exerciseId}/save/`);
    return response.data;
  } catch (error) {
    console.error('Failed to save exercise:', error);
    throw error;
  }
}

export async function unsaveExercise(exerciseId: number): Promise<void> {
  try {
    await api.delete(`/contents/${exerciseId}/unsave/`);
  } catch (error) {
    console.error('Failed to unsave exercise:', error);
    throw error;
  }
}

// Lesson saves
export async function saveLesson(lessonId: number): Promise<SaveResponse> {
  try {
    const response = await api.post(`/contents/${lessonId}/save/`);
    return response.data;
  } catch (error) {
    console.error('Failed to save lesson:', error);
    throw error;
  }
}

export async function unsaveLesson(lessonId: number): Promise<void> {
  try {
    await api.delete(`/contents/${lessonId}/unsave/`);
  } catch (error) {
    console.error('Failed to unsave lesson:', error);
    throw error;
  }
}

// Exam saves
export async function saveExam(examId: number): Promise<SaveResponse> {
  try {
    const response = await api.post(`/contents/${examId}/save/`);
    return response.data;
  } catch (error) {
    console.error('Failed to save exam:', error);
    throw error;
  }
}

export async function unsaveExam(examId: number): Promise<void> {
  try {
    await api.delete(`/contents/${examId}/unsave/`);
  } catch (error) {
    console.error('Failed to unsave exam:', error);
    throw error;
  }
}

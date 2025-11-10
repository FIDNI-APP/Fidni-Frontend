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
    const response = await api.post(`/exercises/${exerciseId}/save_exercise/`);
    return response.data;
  } catch (error) {
    console.error('Failed to save exercise:', error);
    throw error;
  }
}

export async function unsaveExercise(exerciseId: number): Promise<void> {
  try {
    await api.delete(`/exercises/${exerciseId}/unsave_exercise/`);
  } catch (error) {
    console.error('Failed to unsave exercise:', error);
    throw error;
  }
}

// Lesson saves
export async function saveLesson(lessonId: number): Promise<SaveResponse> {
  try {
    const response = await api.post(`/lessons/${lessonId}/save_lesson/`);
    return response.data;
  } catch (error) {
    console.error('Failed to save lesson:', error);
    throw error;
  }
}

export async function unsaveLesson(lessonId: number): Promise<void> {
  try {
    await api.delete(`/lessons/${lessonId}/unsave_lesson/`);
  } catch (error) {
    console.error('Failed to unsave lesson:', error);
    throw error;
  }
}

// Exam saves
export async function saveExam(examId: number): Promise<SaveResponse> {
  try {
    const response = await api.post(`/exams/${examId}/save_exam/`);
    return response.data;
  } catch (error) {
    console.error('Failed to save exam:', error);
    throw error;
  }
}

export async function unsaveExam(examId: number): Promise<void> {
  try {
    await api.delete(`/exams/${examId}/unsave_exam/`);
  } catch (error) {
    console.error('Failed to unsave exam:', error);
    throw error;
  }
}

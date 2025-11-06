// src/lib/api/notebookApi.ts
import {api} from './apiClient';
import { Notebook, NotebookResponse, NotebookChapter, NotebookLessonEntry } from '@/types/index'

// Get all notebooks for a user
export const getUserNotebooks = async (username: string): Promise<Notebook[]> => {
  try {
    const response = await api.get(`/users/${username}/notebooks/`);
    return response.data.notebooks || [];
  } catch (error) {
    console.error('Error fetching user notebooks:', error);
    throw error;
  }
};

// Get a specific notebook by ID
export const getNotebookById = async (notebookId: string): Promise<Notebook> => {
  try {
    const response = await api.get(`/notebooks/${notebookId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notebook:', error);
    throw error;
  }
};

// Create a new notebook for a subject
export const createNotebook = async (subjectId: string, title?: string): Promise<Notebook> => {
  try {
    const response = await api.post('/notebooks/', {
      subject_id: subjectId,
      title
    });
    return response.data;
  } catch (error) {
    console.error('Error creating notebook:', error);
    throw error;
  }
};

// Update notebook details
export const updateNotebook = async (
  notebookId: string, 
  data: { title?: string; cover_color?: string }
): Promise<Notebook> => {
  try {
    const response = await api.patch(`/notebooks/${notebookId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating notebook:', error);
    throw error;
  }
};

// Delete a notebook
export const deleteNotebook = async (notebookId: string): Promise<void> => {
  try {
    await api.delete(`/notebooks/${notebookId}/`);
  } catch (error) {
    console.error('Error deleting notebook:', error);
    throw error;
  }
};

// Add a chapter to a notebook
export const addChapterToNotebook = async (
  notebookId: string,
  chapterId: string,
  notes?: string
): Promise<NotebookChapter> => {
  try {
    const response = await api.post(`/notebooks/${notebookId}/chapters/`, {
      chapter_id: chapterId,
      notes
    });
    return response.data;
  } catch (error) {
    console.error('Error adding chapter to notebook:', error);
    throw error;
  }
};

// Add a lesson to a notebook chapter
export const addLessonToNotebook = async (
  notebookId: string,
  chapterId: string,
  lessonId: string,
  notes?: string,
  highlighted: boolean = false
): Promise<NotebookChapter> => {
  try {
    const response = await api.post(`/notebooks/${notebookId}/chapters/${chapterId}/add_lesson/`, {
      lesson_id: lessonId
    });
    return response.data;
  } catch (error) {
    console.error('Error adding lesson to notebook:', error);
    throw error;
  }
};

// Remove a lesson entry from a notebook chapter
export const removeFromNotebook = async (
  notebookId: string,
  chapterId: string,
  lessonEntryId: string
): Promise<NotebookChapter> => {
  try {
    const response = await api.post(`/notebooks/${notebookId}/chapters/${chapterId}/remove_lesson_page/`, {
      lesson_entry_id: lessonEntryId
    });
    return response.data;
  } catch (error) {
    console.error('Error removing lesson from notebook:', error);
    throw error;
  }
};

// Update notes for a chapter in a notebook
export const updateChapterNotes = async (
  notebookId: string,
  chapterId: string,
  notes: string
): Promise<NotebookChapter> => {
  try {
    const response = await api.post(
      `/notebooks/${notebookId}/chapters/${chapterId}/update_notes/`,
      { user_notes: notes }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating chapter notes:', error);
    throw error;
  }
};

// Get recent notebook activity
export const getNotebookActivity = async (username: string): Promise<any> => {
  try {
    const response = await api.get(`/users/${username}/notebook-activity/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notebook activity:', error);
    throw error;
  }
};

// Annotations API - nested under notebook/chapter/lesson_entry
export const saveLessonAnnotations = async (
  notebookId: string,
  chapterId: string,
  lessonEntryId: string,
  annotations: any[]
): Promise<void> => {
  try {
    await api.post(`/notebooks/${notebookId}/chapters/${chapterId}/lesson_entry/${lessonEntryId}/annotations/`, {
      annotations
    });
  } catch (error) {
    console.error('Error saving lesson annotations:', error);
    throw error;
  }
};

export const getLessonAnnotations = async (
  notebookId: string,
  chapterId: string,
  lessonEntryId: string
): Promise<any[]> => {
  try {
    const response = await api.get(`/notebooks/${notebookId}/chapters/${chapterId}/lesson_entry/${lessonEntryId}/annotations/`);
    return response.data.annotations || [];
  } catch (error) {
    console.error('Error fetching lesson annotations:', error);
    throw error;
  }
};
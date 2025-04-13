// src/lib/api/notebookApi.ts
import api from './apiClient';
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
): Promise<NotebookLessonEntry> => {
  try {
    const response = await api.post(`/notebooks/${notebookId}/chapters/${chapterId}/lessons/`, {
      lesson_id: lessonId,
      notes,
      highlighted
    });
    return response.data;
  } catch (error) {
    console.error('Error adding lesson to notebook:', error);
    throw error;
  }
};

// Remove a lesson from a notebook chapter
export const removeFromNotebook = async (
  notebookId: string,
  chapterId: string,
  lessonId: string
): Promise<void> => {
  try {
    await api.delete(`/notebooks/${notebookId}/chapters/${chapterId}/lessons/${lessonId}/`);
  } catch (error) {
    console.error('Error removing lesson from notebook:', error);
    throw error;
  }
};

// Update notes for a lesson in a notebook
export const updateLessonNotes = async (
  notebookId: string,
  chapterId: string,
  lessonId: string,
  notes: string,
  highlighted?: boolean
): Promise<NotebookLessonEntry> => {
  try {
    const response = await api.patch(
      `/notebooks/${notebookId}/chapters/${chapterId}/lessons/${lessonId}/`,
      { notes, highlighted }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating lesson notes:', error);
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
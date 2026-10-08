/**
 * API functions for managing revision lists
 */

import { api } from './apiClient';

export interface RevisionListItem {
  id: number;
  content_object: any;
  content_type: number;
  object_id: number;
  content_type_name: string;
  added_at: string;
  notes: string;
}

export interface NamedRef { id: number; name: string }

export interface RevisionList {
  id: number;
  name: string;
  description: string;
  user: any;
  items: RevisionListItem[];
  item_count: number;
  /** Liste des listes (GET /revision-lists/, allégée le 08/10/2026) : réussis / à revoir / à faire et
   *  chapitres des exercices ; les éléments n'y portent que object_id et content_type_name. */
  progress?: { success: number; review: number; todo: number };
  item_chapters?: string[];
  /** Étiquettes facultatives choisies par l'élève (filtres de la page Révisions). */
  class_levels?: NamedRef[];
  subjects?: NamedRef[];
  chapters?: NamedRef[];
  created_at: string;
  updated_at: string;
}

export interface CreateRevisionListData {
  name: string;
  description?: string;
  class_level_ids?: number[];
  subject_ids?: number[];
  chapter_ids?: number[];
}

/** Exercice ou examen à retravailler (raté, ou questions ratées), encore dans aucune liste. */
export interface RevisionSuggestion {
  id: number;
  type: 'exercise' | 'exam';
  title: string;
  failed: boolean;
  weak_questions: number;
  chapters: string[];
  class_level: string | null;
  at: string;
}

export interface AddItemData {
  content_type: 'exercise' | 'exam';
  object_id: number;
  notes?: string;
}

export interface RevisionListStatistics {
  total_items: number;
  completed: number;
  pending: number;
  success: number;
  review: number;
  progress_percentage: number;
  total_time_seconds: number;
}

/**
 * L'API renvoie l'énoncé dans `json_content` ; le reste du front (ExerciseRenderer, PDF)
 * l'attend dans `structure`, comme le fait contentApiFactory. Sans ça, chaque carte de la
 * liste affichait « Aucun contenu disponible ».
 */
function withStructures(list: RevisionList): RevisionList {
  return {
    ...list,
    items: (list.items || []).map((item) => {
      const c = item.content_object;
      if (!c || !('json_content' in c)) return item;
      const { json_content, ...rest } = c;
      return { ...item, content_object: { ...rest, structure: json_content } };
    }),
  };
}

/**
 * Get all revision lists for the current user
 */
export async function getRevisionLists(): Promise<RevisionList[]> {
  try {
    const response = await api.get('/revision-lists/', { params: { page_size: 200 } });
    return response.data.results || response.data;
  } catch (error) {
    console.error('Failed to fetch revision lists:', error);
    throw error;
  }
}

/**
 * Get a single revision list by ID
 */
export async function getRevisionList(id: number): Promise<RevisionList> {
  try {
    const response = await api.get(`/revision-lists/${id}/`);
    return withStructures(response.data);
  } catch (error) {
    console.error('Failed to fetch revision list:', error);
    throw error;
  }
}

/**
 * Create a new revision list
 */
export async function createRevisionList(data: CreateRevisionListData): Promise<RevisionList> {
  try {
    const response = await api.post('/revision-lists/', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create revision list:', error);
    throw error;
  }
}

/**
 * Update a revision list
 */
export async function updateRevisionList(id: number, data: Partial<CreateRevisionListData>): Promise<RevisionList> {
  try {
    const response = await api.patch(`/revision-lists/${id}/`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update revision list:', error);
    throw error;
  }
}

/**
 * Delete a revision list
 */
export async function deleteRevisionList(id: number): Promise<void> {
  try {
    await api.delete(`/revision-lists/${id}/`);
  } catch (error) {
    console.error('Failed to delete revision list:', error);
    throw error;
  }
}

/**
 * Add an item (exercise or exam) to a revision list
 */
export async function addItemToRevisionList(listId: number, data: AddItemData): Promise<RevisionListItem> {
  try {
    const response = await api.post(`/revision-lists/${listId}/add_item/`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to add item to revision list:', error);
    throw error;
  }
}

/**
 * Remove an item from a revision list
 */
export async function removeItemFromRevisionList(listId: number, itemId: number): Promise<void> {
  try {
    await api.delete(`/revision-lists/${listId}/remove_item/`, {
      data: { item_id: itemId }
    });
  } catch (error) {
    console.error('Failed to remove item from revision list:', error);
    throw error;
  }
}

/**
 * Get statistics for a revision list
 */
export async function getRevisionListStatistics(listId: number): Promise<RevisionListStatistics> {
  try {
    const response = await api.get(`/revision-lists/${listId}/statistics/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch revision list statistics:', error);
    throw error;
  }
}

/** Ajout en un clic à la liste « À revoir » (créée et étiquetée au besoin). */
export async function quickAddToRevision(objectId: number): Promise<{ list_id: number; list_name: string; created_list: boolean; added: boolean }> {
  const response = await api.post('/revision-lists/quick_add/', { object_id: objectId });
  return response.data;
}

/** Exercices à retravailler, pas encore rangés dans une liste. */
export async function getRevisionSuggestions(): Promise<{ count: number; results: RevisionSuggestion[] }> {
  const response = await api.get('/revision-lists/suggestions/');
  return response.data;
}

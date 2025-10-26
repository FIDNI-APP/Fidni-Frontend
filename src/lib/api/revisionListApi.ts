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

export interface RevisionList {
  id: number;
  name: string;
  description: string;
  user: any;
  items: RevisionListItem[];
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRevisionListData {
  name: string;
  description?: string;
}

export interface AddItemData {
  content_type: 'exercise' | 'exam';
  object_id: number;
  notes?: string;
}

/**
 * Get all revision lists for the current user
 */
export async function getRevisionLists(): Promise<RevisionList[]> {
  try {
    const response = await api.get('/revision-lists/');
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
    return response.data;
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

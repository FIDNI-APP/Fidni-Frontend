import {api} from './apiClient';
import { ClassLevelModel, SubjectModel, ChapterModel, Subfield, Theorem } from '@/types/index';

export const getClassLevels = async (contentType?: string): Promise<ClassLevelModel[]> => {
  const params: Record<string, string> = {};
  if (contentType) params.content_type = contentType;
  const response = await api.get('/class-levels/', { params });

  // Si la réponse est directement un tableau
  if (Array.isArray(response.data)) {
    return response.data;
  }

  // Si la réponse est un objet avec une propriété results (pour la compatibilité)
  return response.data.results || [];
};

export const getSubjects = async (classLevelId?: string[], contentType?: string): Promise<SubjectModel[]> => {
  const params: Record<string, any> = {};
  if (classLevelId) params.class_level = classLevelId;
  if (contentType) params.content_type = contentType;
  const response = await api.get('/subjects/', { params });

  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getSubfields = async (subjectId: string, classLevelIds: string[], contentType?: string): Promise<Subfield[]> => {
  const params: Record<string, any> = classLevelIds ? { class_level: classLevelIds, subject: subjectId } : {};
  if (contentType) params.content_type = contentType;
  const response = await api.get('/subfields/', { params });

  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getChapters = async (subjectId: string, classLevelIds: string[], subfieldIds: string[], contentType?: string): Promise<ChapterModel[]> => {
  const params: any = {};

  // Ensure proper format for parameters
  if (subjectId) {
    params.subject = subjectId;
  }

  if (classLevelIds && classLevelIds.length > 0) {
    params.class_level = classLevelIds;
  }

  if (subfieldIds && subfieldIds.length > 0) {
    params.subfields = subfieldIds;
  }

  if (contentType) params.content_type = contentType;

  const response = await api.get('/chapters/', { params });

  // Handle both array and object with results property
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};
export const getTheorems = async (subjectId: string, classLevelIds: string[], subfieldId: string[], chaptersId: string[], contentType?: string): Promise<Theorem[]> => {
  const params: Record<string, any> = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId, chapters: chaptersId } : {};
  if (contentType) params.content_type = contentType;
  const response = await api.get('/theorems/', { params });

  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getDifficultyCounts = async (
  contentType: string,
  filters: {
    classLevels?: string[];
    subjects?: string[];
    subfields?: string[];
    chapters?: string[];
    theorems?: string[];
  }
): Promise<Record<string, number>> => {
  const params = new URLSearchParams();
  params.append('content_type', contentType);
  filters.classLevels?.forEach(id => params.append('class_levels[]', id));
  filters.subjects?.forEach(id => params.append('subjects[]', id));
  filters.subfields?.forEach(id => params.append('subfields[]', id));
  filters.chapters?.forEach(id => params.append('chapters[]', id));
  filters.theorems?.forEach(id => params.append('theorems[]', id));
  const response = await api.get(`/difficulty-counts/?${params}`);
  return response.data;
};

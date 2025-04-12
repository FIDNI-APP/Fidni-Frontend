import api from './apiClient';
import { ClassLevelModel, SubjectModel, ChapterModel, Subfield, Theorem } from '@/types/index';

export const getClassLevels = async (): Promise<ClassLevelModel[]> => {
  const response = await api.get('/class-levels/');
  
  // Si la réponse est directement un tableau
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  // Si la réponse est un objet avec une propriété results (pour la compatibilité)
  return response.data.results || [];
};

export const getSubjects = async (classLevelId?: string[]): Promise<SubjectModel[]> => {
  const params = classLevelId ? { class_level: classLevelId } : {};
  const response = await api.get('/subjects/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getSubfields = async (subjectId: string, classLevelIds: string[]): Promise<Subfield[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId } : {};
  const response = await api.get('/subfields/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getChapters = async (subjectId: string, classLevelIds: string[], subfieldId: string[]): Promise<ChapterModel[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId } : {};
  const response = await api.get('/chapters/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getTheorems = async (subjectId: string, classLevelIds: string[], subfieldId: string[], chaptersId: string[]): Promise<Theorem[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId, chapters: chaptersId } : {};
  const response = await api.get('/theorems/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};
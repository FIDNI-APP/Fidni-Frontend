// Pages par niveau et par chapitre (« hubs ») : /exercises/niveau/2eme-bac-sm[/limites-et-continuite].
// Textes et liens fournis par le backend (apps/caracteristics/hubs.py), identiques à la page
// pré-remplie que lisent les moteurs de recherche (config/seo.py).
import { api } from './apiClient';

export interface HubChapter { id: number; name: string; slug: string; count: number; url: string }
export interface HubInfo {
  section: 'exercises' | 'lessons' | 'exams';
  type: 'exercise' | 'lesson' | 'exam';
  url: string;
  level: { id: number; name: string; slug: string; url: string };
  chapter: { id: number; name: string; slug: string } | null;
  count: number;
  indexable: boolean;
  title: string;
  description: string;
  h1: string;
  intro: string;
  chapters: HubChapter[];
  related: { section: string; label: string; count: number; url: string }[];
}

export const getHub = async (section: string, level: string, chapter?: string) =>
  (await api.get('/hubs/', { params: { section, level, chapter: chapter || undefined } })).data as HubInfo;

/** Adresse du hub d'un niveau (et d'un chapitre) dans une rubrique. */
export const hubPath = (section: string, levelSlug: string, chapterSlug?: string) =>
  `/${section}/niveau/${levelSlug}${chapterSlug ? `/${chapterSlug}` : ''}`;

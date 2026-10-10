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

/** Même résultat que django.utils.text.slugify (« 2ème Bac SM » → « 2eme-bac-sm »). */
export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[^\p{ASCII}]/gu, '').toLowerCase()
    .replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');

interface ProfileLike {
  profile?: {
    user_type?: string;
    class_level?: number | string | { id: string | number; name: string } | null;
    class_level_name?: string | null;
  } | null;
}

/** Niveau indiqué par l'élève dans son profil (id et slug de sa page), null pour un prof ou sans niveau. */
export function profileLevel(user: ProfileLike | null | undefined): { id: string; name: string; slug: string } | null {
  const p = user?.profile;
  if (!p || p.user_type === 'teacher' || p.class_level == null || p.class_level === '') return null;
  const lv = p.class_level;
  const id = typeof lv === 'object' ? String(lv.id) : String(lv);
  const name = p.class_level_name || (typeof lv === 'object' ? lv.name : '') || '';
  const slug = name ? slugify(name) : '';
  return id && slug ? { id, name, slug } : null;
}

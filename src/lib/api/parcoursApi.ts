/**
 * Parcours (12/11/2026) : données de la page /parcours. Aucune nouvelle route serveur : on lit les parcours
 * existants (backend apps/learningpath, GET /api/learning-paths/) avec, pour l'élève connecté, sa progression
 * par vidéo et par chapitre. La vidéo est lue et suivie par la page existante
 * /learning-path/:pathId/chapters/:chapterId/videos/:videoId (POST /api/videos/:id/update_progress/ : le serveur
 * ne la marque terminée qu'à 90 % visionnés ou en fin de lecture, jamais à l'ouverture).
 *
 * Types limités aux champs que la page utilise (le serveur en renvoie d'autres).
 */
import { api } from './apiClient';

export type Id = string | number;

export interface ParcoursVideo {
  id: Id;
  title: string;
  video_type: string;
  duration_seconds: number;
  /** « 12:30 » (Video.duration_display). */
  duration: string;
  order: number;
  user_progress?: {
    watched_seconds: number;
    is_completed: boolean;
    /** Position atteinte / durée, en %. */
    progress_percentage: number;
  } | null;
}

export interface ParcoursQuiz {
  id: Id;
  title: string;
  passing_score: number;
  estimated_minutes?: number;
}

export interface ParcoursChapter {
  id: Id;
  title: string;
  description: string;
  order: number;
  total_duration: string;
  chapter: { id: Id; name: string } | null;
  videos: ParcoursVideo[];
  quiz?: ParcoursQuiz | null;
  user_progress?: {
    is_completed: boolean;
    quiz_passed?: boolean;
    quiz_score?: number | null;
  } | null;
}

export interface Parcours {
  id: Id;
  title: string;
  description: string;
  estimated_hours: number;
  is_active: boolean;
  subject: { id: Id; name: string };
  class_level: { id: Id; name: string }[];
  path_chapters: ParcoursChapter[];
}

/** Tous les parcours actifs, avec la progression de l'élève connecté (serveur : un parcours par matière et niveau). */
export async function getParcoursList(): Promise<Parcours[]> {
  const paths: Parcours[] = [];
  let next: string | null = '/learning-paths/';
  while (next) {
    const { data }: { data: Parcours[] | { results: Parcours[]; next: string | null } } = await api.get(next);
    paths.push(...(Array.isArray(data) ? data : data.results));
    next = Array.isArray(data) ? null : data.next;
  }
  return paths.filter((p) => p.is_active !== false);
}

/** Adresse du lecteur vidéo existant. */
export const videoUrl = (pathId: Id, chapterId: Id, videoId: Id) =>
  `/learning-path/${pathId}/chapters/${chapterId}/videos/${videoId}`;

/** Adresse du quiz de fin de chapitre existant. */
export const quizUrl = (pathId: Id, chapterId: Id) => `/learning-path/${pathId}/chapters/${chapterId}/quiz`;

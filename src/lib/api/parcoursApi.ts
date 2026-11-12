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
  url: string;
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


export interface VideoInput {
  path_chapter: Id;
  title: string;
  url: string;
  duration_seconds: number;
  video_type: string;
  order: number;
}

export const getParcours = async (id: Id): Promise<Parcours> =>
  (await api.get(`/learning-paths/${id}/`)).data;

export async function saveParcoursVideo(input: VideoInput, id?: Id): Promise<ParcoursVideo> {
  try {
    const response = id == null
      ? await api.post('/videos/', input)
      : await api.patch(`/videos/${id}/`, input);
    return response.data;
  } catch (error) {
    if (id != null) throw error;
    // Le serveur a pu accepter le POST avant une coupure réseau.
    let next: string | null = `/videos/?chapter=${input.path_chapter}`;
    while (next) {
      const { data }: { data: ParcoursVideo[] | { results: ParcoursVideo[]; next: string | null } } = await api.get(next);
      const list = Array.isArray(data) ? data : data.results;
      const accepted = list.find((v) => v.order === input.order && v.title === input.title
        && v.url === input.url && v.duration_seconds === input.duration_seconds);
      if (accepted) return accepted;
      next = Array.isArray(data) ? null : data.next;
    }
    throw error;
  }
}

export async function addParcoursChapter(path: Parcours, chapter: { id: Id; name: string }): Promise<void> {
  await api.post('/path-chapters/', {
    learning_path: path.id, chapter: chapter.id, title: chapter.name,
    order: Math.max(-1, ...path.path_chapters.map((c) => c.order)) + 1, videos: [],
  });
}


export interface VideoUploadSession { session: string; received: number; chunk_size: number }

export async function beginVideoUpload(file: File, input: VideoInput, target?: Id): Promise<VideoUploadSession> {
  return (await api.post('/videos/upload_init/', {
    name: file.name, mime_type: file.name.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4',
    size: file.size, video: input, ...(target == null ? {} : { target }),
  })).data;
}

export async function sendVideoChunk(session: string, offset: number, chunk: Blob,
  onProgress: (loaded: number) => void): Promise<number> {
  const body = new FormData();
  body.append('session', session);
  body.append('offset', String(offset));
  body.append('file', chunk, 'video.part');
  const response = await api.post('/videos/upload_part/', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => onProgress(Math.min(event.loaded, chunk.size)),
  });
  return response.data.received;
}

export async function finishVideoUpload(session: string): Promise<ParcoursVideo> {
  return (await api.post('/videos/upload_finish/', { session })).data;
}

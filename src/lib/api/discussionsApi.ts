// Forum et commentaires (08/11/2026, séparés le 09/11/2026) : backend apps/discussions.
import { api } from './apiClient';
import type { FileAttachment } from '@/types/fileAttachment';

export type Salon = 'entraide' | 'methodes' | 'bac' | 'orientation';
export type DiscussionSort = 'recentes' | 'populaires' | 'sans_reponse' | 'suivies';
/** Forum : un sujet avec un titre, dans un salon. Commentaire : un message sous un contenu, sans titre. */
export type DiscussionGenre = 'forum' | 'commentaire';

export interface DiscussionAuthor {
  id: number;
  username: string;
  display_name?: string;
  avatar: string | null;
  is_deleted?: boolean;
  /** Repère public : élève (avec son niveau), professeur, équipe Fidni. */
  role: 'eleve' | 'prof' | 'equipe';
  level: string | null;
}

/** Leçon, exercice ou examen tagué, affiché en carte. */
export interface ContentTag {
  id: number;
  type: 'exercise' | 'exam' | 'lesson';
  title: string;
  url: string;
  difficulty: string | null;
  level: string | null;
  chapter: string | null;
  /** Statut de l'élève connecté sur ce contenu. */
  status: 'success' | 'review' | null;
}

export interface DiscussionCardData {
  id: number;
  genre: DiscussionGenre;
  /** Où mène ce message : sa page (forum), ou l'onglet Commentaires de son contenu. */
  url: string;
  /** Vide pour un commentaire. */
  title: string;
  excerpt: string;
  salon: Salon;
  author: DiscussionAuthor;
  class_level: { id: number; name: string } | null;
  created_at: string;
  last_activity_at: string;
  reply_count: number;
  /** Au moins une réponse d'un autre membre que l'auteur (absent : serveur d'avant le 08/11/2026 au soir). */
  answered?: boolean;
  utile: number;
  user_utile: boolean;
  followed: boolean;
  tags: ContentTag[];
  repliers: { username: string; display_name?: string; avatar: string | null }[];
  attachments: number;
}

export interface DiscussionReply {
  id: number;
  author: DiscussionAuthor;
  body: string;
  created_at: string;
  edited_at: string | null;
  reply_to: { id: number; username: string; display_name?: string } | null;
  utile: number;
  user_utile: boolean;
  attachments: FileAttachment[];
  can_edit: boolean;
}

export interface DiscussionDetail extends DiscussionCardData {
  body: string;
  edited_at: string | null;
  files: FileAttachment[];
  replies: DiscussionReply[];
  followers: number;
  can_edit: boolean;
}

export interface DiscussionPage {
  count: number;
  page: number;
  pages: number;
  niveau: number | null;
  results: DiscussionCardData[];
}

/**
 * Colonnes de /discussions, au niveau demandé : salons, nombre sans réponse et contenus les plus discutés (le forum
 * seulement), membres les plus utiles sur 30 jours (« utile » reçus au forum et dans les commentaires).
 */
export interface DiscussionPanel {
  niveau: number | null;
  salons: { key: Salon; label: string; count: number }[];
  total: number;
  sans_reponse: number;
  tendances: { content: ContentTag; discussions: number }[];
  utiles: { author: DiscussionAuthor; utile: number }[];
}

export interface DiscussionFilters {
  genre: DiscussionGenre;
  salon?: Salon | null;
  /** Absent : le niveau de l'élève ; « tous » : tous les niveaux. */
  niveau?: number | 'tous' | null;
  chapitre?: number | null;
  contenu?: number | null;
  auteur?: string | null;
  q?: string;
  tri?: DiscussionSort;
  page?: number;
}

const params = (f: Partial<DiscussionFilters>) => Object.fromEntries(
  Object.entries(f).filter(([, v]) => v !== undefined && v !== null && v !== ''),
);

export const getDiscussions = async (f: DiscussionFilters) =>
  (await api.get('/discussions/', { params: params(f) })).data as DiscussionPage;

export const getDiscussionPanel = async (niveau?: number | 'tous' | null) =>
  (await api.get('/discussions/panneau/', { params: params({ niveau }) })).data as DiscussionPanel;

export const getDiscussion = async (id: number | string) =>
  (await api.get(`/discussions/${id}/`)).data as DiscussionDetail;

export interface DiscussionInput {
  title: string;
  body: string;
  salon: Salon;
  /** Absent : le niveau de l'auteur ; null : tous les niveaux. */
  class_level?: number | null;
  content_ids: number[];
  file_ids?: string[];
}

export const createDiscussion = async (input: DiscussionInput) =>
  (await api.post('/discussions/', { ...input, genre: 'forum' })).data as DiscussionDetail;

export const createComment = async (contentId: number, body: string, fileIds: string[]) =>
  (await api.post('/discussions/', { genre: 'commentaire', body, content_ids: [contentId], file_ids: fileIds })).data as DiscussionDetail;

export const updateDiscussion = async (id: number, input: Partial<DiscussionInput>) =>
  (await api.patch(`/discussions/${id}/`, input)).data as DiscussionDetail;

export const deleteDiscussion = async (id: number) => { await api.delete(`/discussions/${id}/`); };

export const replyToDiscussion = async (id: number, body: string, replyTo?: number | null, fileIds?: string[]) =>
  (await api.post(`/discussions/${id}/repondre/`, { body, reply_to: replyTo ?? null, file_ids: fileIds ?? [] })).data as DiscussionReply;

export const updateReply = async (id: number, body: string) =>
  (await api.patch(`/discussions/reponses/${id}/`, { body })).data as DiscussionReply;

export const deleteReply = async (id: number) => { await api.delete(`/discussions/reponses/${id}/`); };

export const toggleUtile = async (kind: 'discussion' | 'reponse', id: number) =>
  (await api.post(kind === 'discussion' ? `/discussions/${id}/utile/` : `/discussions/reponses/${id}/utile/`)).data as
    { utile: number; user_utile: boolean };

export const toggleFollow = async (id: number) =>
  (await api.post(`/discussions/${id}/suivre/`)).data as { followed: boolean; followers: number };

export const searchContentTags = async (q: string) =>
  ((await api.get('/discussions/contenus/', { params: { q } })).data?.results ?? []) as ContentTag[];

export const getDiscussionCount = async () =>
  ((await api.get('/discussions/compteur/')).data?.sans_reponse ?? 0) as number;

/**
 * Messagerie (13/11/2026, backend apps/messagerie) : messages privés, salles de travail, appels.
 * Seulement entre abonnés mutuels (règle de Natsu) : le serveur refuse le reste (403).
 */
import { api } from './apiClient';

export interface Membre {
  id: number;
  username: string;
  display_name?: string;
  avatar?: string | null;
  is_deleted?: boolean;
  role?: 'eleve' | 'prof' | 'equipe';
  level?: string | null;
  lu_jusqu_a?: string | null;
  /** Salle de travail : la question où il en est (ancre de la page du sujet). */
  question?: string;
}

export interface ContenuTag {
  id: number;
  type: 'exercise' | 'exam' | 'lesson';
  title: string;
  url: string;
  difficulty?: string;
  level?: string | null;
  chapter?: string | null;
}

export type TypeMessage = 'texte' | 'invitation' | 'appel' | 'systeme';

export interface Message {
  id: number;
  conversation: number;
  auteur: number | null;
  type: TypeMessage;
  texte: string;
  donnees: {
    contenu?: ContenuTag;
    video?: boolean; duree?: number; personnes?: number; manque?: boolean;
    code?: 'ajout' | 'depart'; membre?: string;
  };
  created_at: string;
  supprime: boolean;
  /** Envoi en cours (pas encore confirmé par le serveur). */
  client_id?: string;
  echec?: boolean;
}

export interface EtatAppel {
  id: number;
  conversation: number;
  video: boolean;
  debut: string;
  lance_par: number | null;
  presences: { id: number; user: number }[];
}

export interface Conversation {
  id: number;
  type: 'directe' | 'groupe';
  titre: string;
  titre_libre: string;
  membres: Membre[];
  contenu: ContenuTag | null;
  dernier_message: Message | null;
  dernier_message_at: string;
  non_lus: number;
  lecture_seule: string;
  createur: number | null;
  appel: EtatAppel | null;
}

export const messagerieApi = {
  conversations: () => api.get('/messagerie/conversations/').then((r) => r.data.results as Conversation[]),
  conversation: (id: number) => api.get(`/messagerie/conversations/${id}/`).then((r) => r.data as Conversation),
  /** Une personne : la conversation directe (créée au besoin) ; plusieurs, ou un sujet : un groupe. */
  creer: (membres: string[], opts: { titre?: string; contenu?: number; groupe?: boolean } = {}) =>
    api.post('/messagerie/conversations/', { membres, ...opts }).then((r) => r.data as Conversation),
  renommer: (id: number, titre: string) => api.patch(`/messagerie/conversations/${id}/`, { titre }).then((r) => r.data as Conversation),
  messages: (id: number, avant?: number) =>
    api.get(`/messagerie/conversations/${id}/messages/`, { params: avant ? { avant } : {} })
      .then((r) => r.data as { results: Message[]; suite: boolean }),
  ecrire: (id: number, texte: string, clientId: string) =>
    api.post(`/messagerie/conversations/${id}/messages/`, { texte, client_id: clientId }).then((r) => r.data as Message),
  supprimer: (messageId: number) => api.delete(`/messagerie/messages/${messageId}/`),
  signaler: (messageId: number, motif: string) => api.post(`/messagerie/messages/${messageId}/signaler/`, { motif }),
  lu: (id: number) => api.post(`/messagerie/conversations/${id}/lu/`),
  ajouter: (id: number, membres: string[]) =>
    api.post(`/messagerie/conversations/${id}/membres/`, { membres }).then((r) => r.data as Conversation),
  quitter: (id: number) => api.post(`/messagerie/conversations/${id}/quitter/`),
  inviter: (id: number, contenu: number) => api.post(`/messagerie/conversations/${id}/inviter/`, { contenu }).then((r) => r.data as Message),
  nonLus: () => api.get('/messagerie/non-lus/').then((r) => (r.data.count as number) || 0),
  contacts: (q = '') => api.get('/messagerie/contacts/', { params: q ? { q } : {} }).then((r) => r.data.results as Membre[]),
  avec: (username: string) =>
    api.get(`/messagerie/avec/${encodeURIComponent(username)}/`).then((r) => r.data as { id: number | null; peut_ecrire: boolean }),
  ticket: () => api.post('/messagerie/ticket/').then((r) => r.data.ticket as string),
  ice: () => api.get('/messagerie/ice/').then((r) => (r.data.iceServers || []) as RTCIceServer[]),
};

/** Message d'erreur du serveur (« Vous devez vous suivre tous les deux… »), sinon un texte générique. */
export function raisonRefus(e: unknown, defaut: string): string {
  const d = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return typeof d === 'string' && d ? d : defaut;
}

// Pilotage › Enseignants (équipe seulement, backend things/enseignants_views.py, 14/11/2026).
import { api } from './apiClient';
import type { ContentEnseignant } from '@/types/content';

export interface EnseignantAdmin {
  id: number;
  civilite: 'M.' | 'Mme' | '';
  prenom: string;
  nom: string;
  nom_affiche: string;
  school: { id: number; name: string; city?: string | null } | null;
  compte: { id: number; username: string; nom: string } | null;
  contenus: number;
}

export type EnseignantPatch = Partial<{ civilite: string; prenom: string; nom: string; school: number | null; compte: string }>;

const erreur = (e: unknown, defaut: string) =>
  ((e as { response?: { data?: { error?: string } } })?.response?.data?.error) || defaut;

export const enseignantsApi = {
  list: async (): Promise<EnseignantAdmin[]> => (await api.get('/pilotage/enseignants/')).data.results,
  create: async (data: EnseignantPatch): Promise<EnseignantAdmin> => (await api.post('/pilotage/enseignants/', data)).data,
  update: async (id: number, data: EnseignantPatch): Promise<EnseignantAdmin> => (await api.patch(`/pilotage/enseignants/${id}/`, data)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`/pilotage/enseignants/${id}/`); },
  merge: async (id: number, dans: number): Promise<EnseignantAdmin> => (await api.post(`/pilotage/enseignants/${id}/fusionner/`, { dans })).data,
  contenus: async (id: number): Promise<{ id: number; type: 'exercise' | 'exam' | 'lesson'; title: string }[]> =>
    (await api.get(`/pilotage/enseignants/${id}/contenus/`)).data.results,
  /** Enseignants d'un contenu (page du contenu). */
  setForContent: async (contentId: number | string, ids: number[]): Promise<ContentEnseignant[]> =>
    (await api.put(`/pilotage/contenus/${contentId}/enseignants/`, { ids })).data.enseignants,
  erreur,
};

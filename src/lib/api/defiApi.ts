/**
 * Défi du jour (backend apps/defis). Ouvert aux visiteurs : un membre a une tentative et une série enregistrées ; le
 * navigateur d'un visiteur garde lui-même son nombre d'essais (components/defi/useDefi.ts).
 */
import { api } from './apiClient';

export type DefiStatut = 'en_cours' | 'trouve' | 'rate';
export type DefiDifficulte = 'easy' | 'medium' | 'hard' | 'very_hard';
export type DefiTheme = 'algebre' | 'arithmetique' | 'logique' | 'geometrie' | 'denombrement';
export interface DefiIndice { titre: string; texte: string }

/** Ce qui dépend de la tentative : réponse et solution n'arrivent qu'une fois la tentative finie. */
export interface DefiEtat {
  statut: DefiStatut;
  essais: number;
  essais_restants: number;
  indices_vus: number;
  reponse?: string;
  solution?: string;
  /** Vrais chiffres, seulement à partir de 20 réponses. */
  stats?: { total: number; trouves: number } | null;
  /** Membre connecté seulement. */
  serie?: number | null;
}

export interface Defi extends DefiEtat {
  date: string;
  du_jour: boolean;
  titre: string;
  theme: DefiTheme;
  difficulte: DefiDifficulte;
  enonce: string;
  consigne: string;
  indices: DefiIndice[];
  essais_max: number;
}

export interface DefiArchive { date: string; titre: string; theme: DefiTheme; difficulte: DefiDifficulte; statut: DefiStatut }

/** Pastille du menu (09/11/2026) : le défi du jour existe-t-il, et où en est le membre (null pour un visiteur). */
export interface DefiEtatMenu { date: string | null; statut: DefiStatut | null; serie: number | null }

/** Envoyé après une réponse ou « Voir la solution » : le menu relit l'état du défi du jour. */
export const DEFI_MAJ = 'fidni:defi';

// Un visiteur n'a rien en base : son navigateur garde où il en est. Illisible (navigation privée…) : il repart de zéro.
export interface DefiLocal { essais: number; indices: number; statut: DefiStatut }
const cleLocale = (date: string) => `fidni-defi-${date}`;
export function lireDefiLocal(date: string): DefiLocal | null {
  try { return JSON.parse(localStorage.getItem(cleLocale(date)) ?? 'null'); } catch { return null; }
}
export function ecrireDefiLocal(date: string, v: DefiLocal) {
  try { localStorage.setItem(cleLocale(date), JSON.stringify(v)); } catch { /* sans stockage : rien de grave */ }
}

export const defiApi = {
  duJour: async (): Promise<Defi | null> => (await api.get('/defis/aujourdhui/')).data.defi,
  etat: async (): Promise<DefiEtatMenu> => (await api.get('/defis/etat/')).data,
  detail: async (date: string): Promise<Defi> => (await api.get(`/defis/${date}/`)).data,
  archives: async (): Promise<DefiArchive[]> => (await api.get('/defis/archives/')).data.results,
  repondre: async (date: string, reponse: string, essai?: number): Promise<DefiEtat & { juste: boolean }> =>
    (await api.post(`/defis/${date}/repondre/`, { reponse, essai })).data,
  indice: (date: string) => api.post(`/defis/${date}/indice/`),
  abandonner: async (date: string): Promise<DefiEtat> => (await api.post(`/defis/${date}/abandonner/`)).data,
};

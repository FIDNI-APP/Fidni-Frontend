/**
 * Communauté (backend apps/communaute, 09/11/2026) : profils publics, abonnements, badges, membres, fil.
 * Un élève mineur valide ses abonnés par défaut ; s'abonner ne donne jamais le droit d'écrire.
 */
import { api } from './apiClient';

export type Role = 'eleve' | 'prof' | 'equipe';
export type StatutAbonnement = 'accepte' | 'en_attente' | null;
export type BadgeId = 'serie' | 'defis' | 'exercices' | 'maitrise' | 'quiz' | 'approfondi' | 'entraide' | 'auteur' | 'fondateur';
export type Banniere = 'zellige-vert' | 'zellige-or' | 'nuit' | 'sable' | 'menthe' | 'terre';
export type Bloc = 'chiffres' | 'badges' | 'chapitres' | 'defi' | 'activite';

export const BANNIERES: Banniere[] = ['zellige-vert', 'zellige-or', 'nuit', 'sable', 'menthe', 'terre'];
export const BLOCS: Bloc[] = ['chiffres', 'badges', 'chapitres', 'defi', 'activite'];

/** Badge d'une carte, de la vitrine ou du fil : le plus haut palier obtenu. `unite` / `un` : pluriel, singulier. */
export interface BadgeCourt { id: BadgeId; nom: string; palier: number; seuil: number; unite: string; un: string; obtenu_le?: string | null }

/** Badge du catalogue d'un profil. `valeur` : propriétaire seulement (sa progression). */
export interface Badge {
  id: BadgeId;
  nom: string;
  unite: string;
  un: string;
  paliers: number[];
  palier: number;
  obtenu_le: string | null;
  valeur?: number;
}

export interface Identite {
  id: number;
  username: string;
  /** « Prénom Nom » pour un membre connecté, sinon le pseudo (lib/nomAffiche). */
  display_name?: string;
  avatar: string | null;
  role: Role;
  level: string | null;
  objectif: string | null;
  banniere: Banniere;
  verifie: boolean;
}

export interface CarteMembre extends Identite {
  badges: BadgeCourt[];
  abonnes: number;
  relation: { abonne: StatutAbonnement; me_suit: boolean; moi: boolean };
}

/** peut_ecrire : abonnés mutuels, sans blocage (messages, appels, travail à plusieurs ; 13/11/2026). */
export interface Relation { moi: boolean; abonne: StatutAbonnement; me_suit: boolean; bloque: boolean; connecte: boolean; peut_ecrire?: boolean }

export interface Chiffre { id: string; valeur: number; record?: number }

export interface Activite {
  type: 'discussion' | 'commentaire' | 'reponse';
  id: number;
  titre: string;
  url: string;
  date: string;
  utiles: number;
  reponses?: number;
}

export interface Reglages {
  banniere: Banniere | '';
  objectif: string;
  vitrine: BadgeId[];
  blocs_masques: Bloc[];
  abonnes_a_valider: boolean;
  visible_recherche: boolean;
  mineur: boolean;
  demandes: number;
}

export interface ProfilPublic extends Identite {
  bio: string;
  ville: string | null;
  depuis: string | null;
  abonnes: number;
  abonnements: number;
  apercu_abonnes: { username: string; display_name?: string; avatar: string | null }[];
  listes_visibles: boolean;
  relation: Relation;
  vitrine: Badge[];
  badges: Badge[] | null;
  enseigne: { matieres: string[]; niveaux: string[] } | null;
  chiffres: Chiffre[] | null;
  chapitres: { id: number; name: string }[] | null;
  defi: { serie: number; record: number; trouves: number; debut: string; jours: string[] } | null;
  activite: Activite[] | null;
  reglages?: Reglages;
}

export interface PageMembres { results: CarteMembre[]; page: number; suite: boolean }

export interface Decouvrir {
  classe: CarteMembre[];
  profs: CarteMembre[];
  niveau: CarteMembre[];
  utiles: { membre: CarteMembre; n: number }[];
  series: { membre: CarteMembre; n: number }[];
}

export interface Auteur { id: number; username: string; display_name?: string; avatar: string | null; role: Role; level: string | null }

interface ObjetEcrit { id: number; titre: string; url: string; salon: string; reponses: number }

export type ElementFil =
  | { type: 'discussion'; date: string; membre: Auteur; objet: ObjetEcrit }
  /** `titre` : le contenu sous lequel le commentaire est écrit. */
  | { type: 'commentaire'; date: string; membre: Auteur; objet: ObjetEcrit }
  | { type: 'badge'; date: string; membre: Auteur; objet: BadgeCourt }
  | { type: 'publication'; date: string; membre: Auteur; objet: { id: number; titre: string; type: string; url: string } };

export interface PageFil { results: ElementFil[]; suite: string | null; suivis: number }

const u = (username: string) => encodeURIComponent(username);

export const communauteApi = {
  profil: async (username: string): Promise<ProfilPublic> => (await api.get(`/communaute/profils/${u(username)}/`)).data,
  suivre: async (username: string): Promise<StatutAbonnement> => (await api.post(`/communaute/profils/${u(username)}/suivre/`)).data.abonne,
  nePlusSuivre: async (username: string): Promise<void> => { await api.delete(`/communaute/profils/${u(username)}/suivre/`); },
  bloquer: (username: string) => api.post(`/communaute/profils/${u(username)}/bloquer/`),
  debloquer: (username: string) => api.delete(`/communaute/profils/${u(username)}/bloquer/`),
  abonnes: async (username: string, page = 1): Promise<PageMembres> =>
    (await api.get(`/communaute/profils/${u(username)}/abonnes/`, { params: { page } })).data,
  abonnements: async (username: string, page = 1): Promise<PageMembres> =>
    (await api.get(`/communaute/profils/${u(username)}/abonnements/`, { params: { page } })).data,
  demandes: async (page = 1): Promise<PageMembres> => (await api.get('/communaute/demandes/', { params: { page } })).data,
  accepter: (username: string) => api.post(`/communaute/demandes/${u(username)}/accepter/`),
  refuser: (username: string) => api.post(`/communaute/demandes/${u(username)}/refuser/`),
  retirer: (username: string) => api.delete(`/communaute/abonnes/${u(username)}/`),
  membres: async (params: { q?: string; role?: string; niveau?: string; matiere?: string; page?: number }): Promise<PageMembres> =>
    (await api.get('/communaute/membres/', { params })).data,
  decouvrir: async (): Promise<Decouvrir> => (await api.get('/communaute/decouvrir/')).data,
  fil: async (avant?: string): Promise<PageFil> => (await api.get('/communaute/fil/', { params: avant ? { avant } : {} })).data,
  reglages: async (): Promise<Reglages> => (await api.get('/communaute/moi/')).data,
  modifier: async (champs: Partial<Omit<Reglages, 'mineur' | 'demandes'>>): Promise<Reglages> =>
    (await api.patch('/communaute/moi/', champs)).data,
};

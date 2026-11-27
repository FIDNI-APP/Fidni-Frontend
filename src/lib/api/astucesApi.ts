/** Astuces par chapitre (backend apps/astuces) — bêta du 27/11/2026, équipe seulement. */
import { api } from './apiClient';

export interface AstuceLien {
  contenu: number;
  type: 'exercise' | 'exam' | 'lesson';
  titre: string;
  url: string;
  /** Numéro de la question tel que le site l'affiche (« 3.1 »). */
  question?: string;
  /** Rang de la partie (exercice) dans un devoir. */
  exercice?: number | null;
  note?: string;
}

export interface Astuce {
  rang_chapitre?: number;
  ordre?: number;
  slug: string;
  titre: string;
  resume: string;
  niveau: string;
  chapitre: string;
  type_question: string;
  technique: string;
  signaux: string[];
  pourquoi: string;
  methode: string[];
  exemple: { enonce: string; solution: string };
  piege: string;
  sur_le_site: AstuceLien[];
}

export interface FiltreCompte { nom: string; nombre: number }
export interface AstucesReponse {
  astuces: AstuceEquipe[];
  filtres: { niveaux: string[]; chapitres: FiltreCompte[]; types: FiltreCompte[]; techniques: FiltreCompte[] };
  /** Section montrée à tous les membres (sinon l'équipe seulement). */
  ouvert: boolean;
  peut_modifier: boolean;
  /** Équipe : chapitres du niveau, pour l'éditeur. */
  chapitres_niveau?: string[];
}

export async function getAstuces(niveau?: string): Promise<AstucesReponse> {
  const { data } = await api.get<AstucesReponse>('/astuces/', { params: niveau ? { niveau } : {} });
  return data;
}

// ── Équipe : interrupteur et édition (27/11/2026)

/** Référence « Sur Fidni » telle que l'éditeur la manipule : numéro du contenu + numéro de question. */
export interface AstuceReference { id: number | string; question?: string; partie?: number | null; note?: string; titre?: string; introuvable?: boolean }

/** Champs en plus pour l'équipe (réponse de l'API quand on est admin). */
export interface AstuceEquipe extends Astuce {
  publie?: boolean;
  source?: 'fichier' | 'admin';
  references?: AstuceReference[];
  modifiee_le?: string | null;
  modifiee_par?: string | null;
}

export interface AstuceSaisie {
  chapitre: string;
  titre: string;
  resume: string;
  type_question: string;
  technique: string;
  signaux: string[];
  pourquoi: string;
  methode: string[];
  exemple_enonce: string;
  exemple_solution: string;
  piege: string;
  sur_le_site: AstuceReference[];
  publie: boolean;
}

export interface EtatAstuces { ouvert: boolean; peut_modifier: boolean }

export async function getEtatAstuces(): Promise<EtatAstuces> {
  const { data } = await api.get<EtatAstuces>('/astuces/etat/');
  return data;
}

export async function setAstucesOuvertes(ouvert: boolean): Promise<EtatAstuces> {
  const { data } = await api.patch<EtatAstuces>('/astuces/etat/', { ouvert });
  return data;
}

export async function creerAstuce(saisie: Partial<AstuceSaisie>): Promise<AstuceEquipe> {
  const { data } = await api.post<AstuceEquipe>('/astuces/', saisie);
  return data;
}

export async function modifierAstuce(slug: string, saisie: Partial<AstuceSaisie>): Promise<AstuceEquipe> {
  const { data } = await api.patch<AstuceEquipe>(`/astuces/${slug}/`, saisie);
  return data;
}

/** Créée sur le site : supprimée ; venue du fichier : masquée. */
export async function retirerAstuce(slug: string): Promise<void> {
  await api.delete(`/astuces/${slug}/`);
}

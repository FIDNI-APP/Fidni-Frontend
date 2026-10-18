// IA des administrateurs (backend : apps/ia) — import d'un document, correction d'un signalement.
// Rien n'est publié ni modifié sans un clic de l'administrateur.
import { api } from './apiClient';

export type IAStatus = 'en_attente' | 'en_cours' | 'pret' | 'erreur' | 'publie' | 'applique' | 'rejete';
export type Origine = 'autorise' | 'officiel' | 'original';

export interface IAUsage { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; appels?: number }

export interface IAJobSummary {
  id: number;
  kind: 'import' | 'signalement';
  status: IAStatus;
  etape: string;
  error: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  document: string;
  usage: IAUsage;
  fiches?: { cle: string; titre: string; type: string }[];
  publies?: { id: number; type: string; titre: string }[];
  nb_doutes?: number;
  signalement?: number | null;
  fonde?: 'oui' | 'non' | 'incertain' | null;
  contenu?: { id: number; titre: string } | null;
}

export interface IAProbleme { gravite: 'corrige' | 'a_verifier'; ou?: string; description: string }
export interface IAControle { erreurs: string[]; avertissements: string[]; doublons: string[] }
export interface IAApercu {
  cle: string; titre: string; type: 'exercise' | 'exam' | 'lesson' | null; erreur?: string;
  niveaux?: string[]; chapitres?: string[]; theoremes?: string[]; difficulte?: string | null;
  examen?: { national?: boolean; annee?: number; duree_minutes?: number } | null;
  structure?: unknown;
}
export interface IAModification {
  bloc: string; sous_question: string | null; champ: 'content' | 'solution'; avant: string; apres: string; ou: string;
}

export interface IAJobDetail extends IAJobSummary {
  options: { origine?: Origine; credit?: string; consignes?: string; niveau?: string; type?: string; document?: string };
  history: { date: string; qui: string; texte: string }[];
  // Import
  doutes?: string[];
  problemes?: IAProbleme[];
  solutions_du_document?: boolean;
  controles?: IAControle[];
  erreurs_figures?: string[];
  avertissements?: string[];
  apercus?: IAApercu[];
  // Signalement
  explication?: string;
  modifications?: IAModification[];
  erreurs?: string[];
  report?: { id: number; reason: string; item_label: string; description: string; status: string };
}

export const listJobs = async (kind?: 'import' | 'signalement') =>
  (await api.get('/pilotage/ia/', { params: kind ? { kind } : {} })).data as
    { configuree: boolean; modele: string; results: IAJobSummary[] };

export const getJob = async (id: number) => (await api.get(`/pilotage/ia/${id}/`)).data as IAJobDetail;

export const startImport = async (form: FormData) =>
  (await api.post('/pilotage/ia/import/', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })).data as IAJobSummary;

export const askCorrection = async (id: number, instruction: string) =>
  (await api.post(`/pilotage/ia/${id}/corriger/`, { instruction })).data as IAJobSummary;

export const retryJob = async (id: number) => (await api.post(`/pilotage/ia/${id}/relancer/`)).data as IAJobSummary;

export const publishJob = async (id: number, body: { doublon_ok: boolean }) =>
  (await api.post(`/pilotage/ia/${id}/publier/`, body)).data as IAJobDetail;

/** « Ignorer le doublon » : le doublon probable n'empêche plus de publier ce brouillon (false : de nouveau signalé). */
export const ignoreDuplicate = async (id: number, ignorer: boolean) =>
  (await api.post(`/pilotage/ia/${id}/doublon/`, { ignorer })).data as IAJobDetail;

/** `prevenir` : la réponse (`reponse`, sinon l'explication de l'IA) part dans la cloche de l'élève, même action. */
export const applyJob = async (id: number, notify?: { prevenir: boolean; reponse?: string }) =>
  (await api.post(`/pilotage/ia/${id}/appliquer/`, notify ?? {})).data as IAJobDetail & { notified?: boolean };

export const rejectJob = async (id: number) => (await api.post(`/pilotage/ia/${id}/rejeter/`)).data as IAJobSummary;

export const fixReport = async (reportId: number, instruction?: string) =>
  (await api.post(`/pilotage/signalements/${reportId}/ia/`, instruction ? { instruction } : {})).data as IAJobSummary;

export const lastReportJob = async (reportId: number) =>
  (await api.get(`/pilotage/signalements/${reportId}/ia/derniere/`)).data as IAJobDetail | null;

/* Contenus préparés par Claude (onglet « À valider », backend apps/ia/depot.py) : mêmes actions que les brouillons
   de l'IA (getJob, publishJob, askCorrection, rejectJob), listés à part, en cartes. */
export type BrouillonStatut = 'a_valider' | 'publies' | 'rejetes';
export interface Brouillon {
  id: number; status: IAStatus; etape: string; error: string; created_at: string; updated_at: string;
  cle: string; titre: string; type: 'exercice' | 'examen' | 'lecon' | null; niveaux: string[]; chapitres: string[];
  difficulte: string | null; credit: string; ecole: string; document: string; extrait: string;
  questions: number; parties: number; sections: number; solutions: number; indications: number; figures: number;
  theoremes: string[]; nb_theoremes: number;
  /** doublons : 0 quand le doublon a été ignoré (doublon_ignore). */
  commentaires: number; erreurs: number; doublons: number; avertissements: number;
  doublon_ignore?: boolean;
  remplace: { id: number; titre: string; type: string } | null;
  publie: { id: number; titre: string; type: string } | null;
  corrections: number;
  /** Modifié à la main dans l'éditeur (la correction par l'IA n'est alors plus proposée). */
  edite?: boolean;
}
export interface BrouillonDetail extends IAJobDetail {
  depot?: boolean;
  remplace?: { id: number; titre: string; type: string } | null;
  carte?: Brouillon;
}

export const listBrouillons = async (statut: BrouillonStatut) =>
  (await api.get('/pilotage/brouillons/', { params: { statut } })).data as
    { compte: Record<BrouillonStatut, number>; ia_configuree: boolean; results: Brouillon[] };

export const isRunning = (s: IAStatus) => s === 'en_attente' || s === 'en_cours';

/** Message d'erreur de l'API (detail, ou premier champ en erreur). */
export function apiError(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === 'string') return d.detail;
    const first = Object.values(d)[0];
    if (typeof first === 'string') return first;
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  return fallback;
}

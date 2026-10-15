/**
 * « Ma progression » en tableau de bord (13/10/2026) : backend apps/users/tableau.py.
 * GET /api/stats/tableau/?jours=7|30|90|0 et GET /api/stats/tableau/jour/?date=.
 */
import { api } from './apiClient';

export type Periode = 7 | 30 | 90 | 0;

// Types (pas interfaces) : utilisables tels quels comme lignes de graphique (signature d'index implicite).
export type Questions = { reussies: number; partielles: number; ratees: number };
/** Un jour (ou une semaine, `periode.pas === 'semaine'`) : questions, temps, jours actifs (0/1, ou 0–7 par semaine). */
export type TableauJour = Questions & { date: string; secondes: number; actifs: number };
export interface TableauNote { date: string; id: number; titre: string; url: string; note: number }

export interface TableauChapitre extends Questions {
  id: number;
  nom: string;
  hub_url: string | null;
  examens_url: string | null;
  quiz: boolean;
  /** Notes aux examens (/20), questions de ce chapitre seulement. */
  note: { moyenne: number | null; min: number | null; max: number | null; n: number; serie: { date: string; note: number; examen: number }[] };
  secondes: number;
  /** Jours avec des questions de ce chapitre. */
  jours: ({ date: string } & Questions)[];
  actif: boolean;
}

export interface TempsContenu {
  id: number; titre: string; type: 'exercise' | 'exam' | 'lesson'; url: string;
  /** Sa part dans ce chapitre (le temps d'un contenu est partagé entre ses chapitres). */
  secondes: number;
  partage: number;
  jours: { date: string; secondes: number }[];
}
export interface TempsChapitre { id: number | null; nom: string; secondes: number; contenus: TempsContenu[] }

/** Point faible : un théorème des questions de la période, et ce qu'il reste à refaire. */
export interface PointFaible extends Questions {
  nom: string;
  id: number | null;
  /** Réussite sur la période (en partie = ½), en %. */
  taux: number;
  questions: number;
  chapitre: { id: number; nom: string; hub_url: string | null } | null;
  a_revoir_total: number;
  a_revoir: { id: number; titre: string; url: string; question: string; statut: 'review' | 'failed' | 'partial'; date: string }[];
}

export interface Tableau {
  level: { id: number; name: string } | null;
  periode: { debut: string; fin: string; jours: Periode; pas: 'jour' | 'semaine'; nb_jours: number };
  kpis: {
    questions: Questions & { avant: Questions | null };
    note: { moyenne: number | null; n: number; avant: number | null };
    secondes: { total: number; avant: number | null };
    jours_actifs: { n: number; sur: number; avant: number | null };
  };
  jours: TableauJour[];
  notes: TableauNote[];
  chapitres: TableauChapitre[];
  temps: TempsChapitre[];
  points_faibles: PointFaible[];
  /** Vue administrateur seulement (?eleve=) : le membre dont c'est la progression. */
  eleve?: { id: number; username: string; nom: string };
}

export interface JourContenu extends Questions {
  id: number; titre: string; type: 'exercise' | 'exam' | 'lesson'; url: string; chapitre: string | null; secondes: number;
}

// `eleve` : vue administrateur de la progression d'un membre (Pilotage › Membres ; refusé par le serveur sinon).
export const getTableau = async (jours: Periode, eleve?: number | null): Promise<Tableau> =>
  (await api.get('/stats/tableau/', { params: { jours, ...(eleve ? { eleve } : {}) } })).data;

export const getTableauJour = async (date: string, eleve?: number | null): Promise<{ date: string; contenus: JourContenu[] }> =>
  (await api.get('/stats/tableau/jour/', { params: { date, ...(eleve ? { eleve } : {}) } })).data;

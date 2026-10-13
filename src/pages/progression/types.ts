// Données de GET /api/stats/progression/ (backend apps/users/progression.py, maîtrise : apps/users/maitrise.py et
// objectif.py depuis le 13/10/2026) et de GET /api/stats/apercu/ (bloc « Où j'en suis » de l'accueil).
export type ChapterStatus = 'mastered' | 'good' | 'weak' | 'started' | 'todo';

export interface NotionStat { label: string; pct: number; questions: number }

export interface ChapterProgress {
  id: number;
  name: string;
  subfield: string;
  status: ChapterStatus;
  /** Maîtrise (auto-évaluation 60 %, quiz Skill IQ 40 %) ; null tant qu'il n'y a pas assez de données. */
  mastery: number | null;
  self_pct: number | null;
  questions: number;
  skilliq: { pct: number | null; level: string; date: string } | null;
  quiz_ready: boolean;
  seconds: number;
  contents: number;
  done: number;
  review: { id: number; title: string; url: string }[];
  notions: { best: NotionStat[]; worst: NotionStat[] };
  last_at: string | null;
  /** Page d'exercices du chapitre au niveau de l'élève ; null si le chapitre n'est pas de son niveau. */
  hub_url?: string | null;
  // ── Maîtrise (13/10/2026)
  etat?: Etat;
  raison?: string;
  criteres?: Critere[];
  en_progres?: boolean;
  a_confirmer?: boolean;
  priorite?: number;
  /** Maîtrise estimée (auto-évaluation 60 %, quiz 40 %), à partir de 4 questions évaluées. */
  pct?: number | null;
  reussite?: { pct: number | null; questions: number; par_difficulte: Partial<Record<Difficulte, { questions: number; pct: number | null }>> };
  recents?: { pct: number; questions: number } | null;
  tendance?: number | null;
  durable?: Durable;
  autonomie?: { seul: { pct: number | null; suivies: number; sans_aide: number; min: number };
    transfert: { reussis: number; essais: number; min: number; visible: boolean } };
  exercices_evalues?: number;
  exercices_reussis?: number;
  travailles?: number;
  derniere_evaluation?: string | null;
  notions_couvertes?: { reussies: number; dispo: number; manquantes: string[] };
  commence?: boolean;
}

export type Etat = 'maitrise' | 'bonne_voie' | 'a_consolider' | 'a_renforcer' | 'non_evalue';
export type Difficulte = 'easy' | 'medium' | 'hard';
export interface Critere { cle: string; etat: 'ok' | 'a_faire' | 'en_attente'; texte: string }
export interface Durable { etat: 'confirmee' | 'n_a_pas_tenu' | 'a_verifier' | 'inconnue'; le: string | null; a_partir_du: string | null; due: boolean }

export interface Evolution {
  delta: number | null;
  mesurable: boolean;
  chapitres_compares: number;
  chapitres_exclus: string[];
  questions_periode: number;
  disponible_le: string | null;
  detail?: { id: number; name: string; avant: number; maintenant: number }[];
  mises_en_garde: { cle: 'concentre' | 'surtout_facile' | 'estimee'; texte: string }[];
}

export interface Apercu {
  chapitres: { evalues: number; total: number };
  maitrise: number | null;
  etats: Record<Etat, number>;
  evolution: Evolution;
  serie?: { date: string; pct: number | null }[];
  commence: boolean;
}

export type ActionKind = 'entrainer' | 'cours' | 'quiz' | 'ds_blanc' | 'nationaux' | 'devoirs';
export interface ObjectifAction { kind: ActionKind; difficulte?: Difficulte; test_id?: number }

export interface ObjectifExercice { id: number; title: string; difficulty: Difficulte | null; chapter: string | null; status: string | null; minutes: number; url: string }

export interface Objectif {
  type: 'consolider' | 'renforcer' | 'verifier' | 'continuer' | 'evaluer' | 'approfondir' | 'ds_blanc' | 'decouvrir';
  titre: string;
  phrase: string;
  pourquoi: string[];
  chapitre: { id: number; name: string; hub_url: string | null; etat: Etat; en_progres: boolean; quiz_ready: boolean } | null;
  action: ObjectifAction;
  secondaire: ObjectifAction | null;
  ds: { id: number; date: string; jours: number; quand: string } | null;
  exercices?: ObjectifExercice[];
}

export interface Regularite {
  jours: { date: string; secondes: number; evaluations: number; actif: boolean }[];
  jours_actifs: number;
  sur: number;
  semaine_secondes: number;
  semaine_precedente: number;
  exercices_finis_semaine: number;
  serie: { actuelle: number; meilleure: number };
  objectif_minutes: number;
}

/** GET /api/stats/apercu/ (accueil). */
export interface ApercuData {
  level: { id: number; name: string } | null;
  apercu: Apercu;
  objectif: Objectif | null;
  regularite: { jours_actifs: number; sur: number };
}

export interface RatedItem {
  label: string;
  pct: number;
  chapter_id: number | null;
  chapter: string | null;
  source: 'notion' | 'skilliq';
  questions: number | null;
  url: string;
  hub_url?: string | null;
}

export interface EvolutionPoint { start: string; label: string; questions_ok: number; exercises: number; exam_avg: number | null }

export interface StudyTimeData {
  goal_minutes: number;
  total_seconds: number;
  today: number;
  week: number;
  previous_week: number;
  days: { date: string; seconds: number }[];
  months: { start: string; label: string; seconds: number }[];
  by_chapter: { id: number; name: string; seconds: number }[];
}

export interface ProgressionData {
  level: { id: number; name: string } | null;
  since: string | null;
  summary: {
    chapters: Record<ChapterStatus | 'total', number>;
    questions: number;
    questions_ok: number;
    questions_ok_week: number;
    exercises_done: number;
    streak: { current: number; best: number };
  };
  chapters: ChapterProgress[];
  strengths: RatedItem[];
  weaknesses: RatedItem[];
  evolution: { granularity: 'week' | 'month'; points: EvolutionPoint[] };
  exams: { count: number; average: number | null; best: number | null; list: { id: number; title: string; url: string; date: string; note: number }[] };
  time: StudyTimeData;
  apercu?: Apercu;
  objectif?: Objectif | null;
  regularite?: Regularite;
}

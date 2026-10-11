// Quiz par chapitre (/skill-iq) : types et petites règles partagées (backend apps/skilliq).
import type { ChapterStatus } from '@/pages/progression/types';

/** Résultat d'un quiz (GET /skill-assessments/my/, POST /skill-assessments/submit/<id>/). */
export interface SkillAssessment {
  id: number;
  chapter: number;
  chapter_name: string;
  subject_name: string | null;
  /** Score pondéré (facile 1, moyen 2, difficile 3) : sert au pourcentage, jamais montré en points. */
  score: number;
  max_score: number;
  completed_at: string;
  /** Passage précédent (null au premier) et nombre de passages. */
  previous_score?: number | null;
  previous_max?: number | null;
  attempts?: number;
  /** Page d'exercices du chapitre au niveau de l'élève ; null hors de son niveau. */
  hub_url?: string | null;
  /** Correction, seulement dans la réponse à l'envoi. */
  correction?: CorrectionItem[];
}

export interface CorrectionItem {
  id: number;
  your_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface QuizQuestion { id: number; question: string; options: string[]; difficulty: Difficulty }

/** Un chapitre vu par la page : programme de l'élève (Ma progression) + quiz prêt + dernier résultat. */
export interface QuizChapter {
  id: number;
  name: string;
  /** Sous-domaine (Analyse, Algèbre…) ; null pour un chapitre venu de la taxonomie (autre niveau). */
  subfield: string | null;
  subject: string | null;
  status: ChapterStatus;
  mastery: number | null;
  /** Nombre de questions actives (0 = pas encore de quiz). */
  ready: number;
  hub_url: string | null;
  last_at: string | null;
  /** Dernier passage de l'élève. */
  taken: SkillAssessment | null;
}

/** Quiz ouvert : le chapitre, et d'où l'on vient pour la suite. */
export interface ActiveQuiz { id: number; name: string; subject: string | null; hub_url: string | null }

export const DIFFICULTY: Record<Difficulty, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

export const pct = (a: Pick<SkillAssessment, 'score' | 'max_score'>) => (a.max_score ? Math.round((a.score / a.max_score) * 100) : 0);

/** Score du passage précédent en %, null au premier passage. */
export const previousPct = (a: SkillAssessment) =>
  (a.previous_score != null && a.previous_max ? Math.round((a.previous_score / a.previous_max) * 100) : null);

/** « Retour à mon DS » : seulement vers un plan de DS du site (jamais une adresse extérieure). */
export const safeReturn = (r: string | null) => (r && /^\/revisions\/ds\/\d+$/.test(r) ? r : null);

/** Un quiz = au plus 10 questions tirées au hasard. */
export const quizSize = (ready: number) => Math.min(Math.max(ready, 1), 10);

/** Durée annoncée : environ 45 s par question, jamais moins de 2 min. */
export const estMinutes = (ready: number) => Math.max(2, Math.round(quizSize(ready) * 0.75));

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** Couleurs du score : vert à partir de 50 %, or en dessous (jamais rouge : ce n'est pas une faute). */
export const RING = { good: '#1a7a4a', low: '#c0892f', track: '#efece6' } as const;

/** Chapitres rangés par sous-domaine (ordre alphabétique, « Autres » en dernier). */
export function bySubfield(chapters: QuizChapter[]) {
  const groups = new Map<string, QuizChapter[]>();
  for (const c of chapters) {
    const key = c.subfield ?? c.subject ?? 'Autres';
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()].sort(([a], [b]) => Number(a === 'Autres') - Number(b === 'Autres') || a.localeCompare(b, 'fr'));
}

// Quiz par chapitre (/skill-iq) : types et petites règles partagées (backend apps/skilliq).
import type { ChapterStatus } from '@/pages/progression/types';
import { dateLocale } from '@/i18n';

/** Deux quiz par chapitre (31/10/2026) : le quiz du cours (QCM sur le cours, compte dans Ma progression) et
 *  l'approfondissement (de vrais problèmes en QCM, avec des réponses pièges ; à part de la maîtrise). */
export type QuizType = 'cours' | 'approfondissement';

/** Type d'un résultat, d'un passage ou d'un quiz ouvert ; absent : le quiz du cours (tout ce qui précède). */
export const typeOf = (x: { type?: QuizType | null } | null | undefined): QuizType => x?.type ?? 'cours';

/** Score de l'approfondissement qui donne le badge « Chapitre approfondi ». */
export const BADGE_PCT = 80;

/** Le dernier passage de l'approfondissement donne-t-il le badge « Chapitre approfondi » ? */
export const isApprofondi = (a: SkillAssessment | null | undefined) =>
  !!a && typeOf(a) === 'approfondissement' && pct(a) >= BADGE_PCT;

/** Résultat d'un quiz (GET /skill-assessments/my/, POST /skill-assessments/submit/<id>/). */
export interface SkillAssessment {
  id: number;
  chapter: number;
  chapter_name: string;
  subject_name: string | null;
  /** Quiz du cours ou approfondissement (absent : le cours). */
  type?: QuizType;
  /** Score pondéré (facile 1, moyen 2, difficile 3) : sert au pourcentage, jamais montré en points. */
  score: number;
  max_score: number;
  completed_at: string;
  /** Temps passé sur le passage, hors corrections, en secondes. */
  time_spent?: number;
  /** Passage précédent (null au premier) et nombre de passages. */
  previous_score?: number | null;
  previous_max?: number | null;
  attempts?: number;
  /** Page d'exercices du chapitre au niveau de l'élève ; null hors de son niveau. */
  hub_url?: string | null;
  /** Niveau du quiz passé (null : passage d'avant le découpage par niveau). */
  class_level?: number | null;
  /** Correction : dans la réponse à l'envoi, et dans le dernier résultat (GET chapter/<id>/, figée). */
  correction?: CorrectionItem[];
  /** La correction du dernier passage est gardée (« Voir mon dernier résultat »). */
  a_correction?: boolean;
  /** Bilan du dernier passage par théorème (vide pour les passages d'avant le 13/10/2026). */
  par_theoreme?: TheoremReport | Record<string, never>;
}

/** Un théorème du chapitre : questions justes / posées sur ce passage (100 % = toutes justes). */
export interface TheoremScore { id: number; name: string; justes: number; total: number; pct: number }

export interface TheoremReport {
  /** Du moins maîtrisé au mieux maîtrisé. */
  theoremes: TheoremScore[];
  /** Théorèmes du chapitre absents de ce tirage. */
  non_evalues: { id: number; name: string }[];
  a_revoir: string[];
  /** Tous les théorèmes évalués à 100 % et aucun oublié. */
  complet: boolean;
}

export const hasReport = (r: SkillAssessment['par_theoreme']): r is TheoremReport =>
  !!r && Array.isArray((r as TheoremReport).theoremes) && (r as TheoremReport).theoremes.length > 0;

export interface CorrectionItem {
  id: number;
  /** Énoncé et réponses figés (dernier résultat ; aussi à la correction de chaque question). */
  question?: string;
  options?: string[];
  /** Réponse de l'élève : un index, ou les index cochés (plusieurs bonnes réponses) ; -1 ou null : sans réponse. */
  your_answer: Answer | null;
  /** Première bonne réponse (compatibilité) ; toutes les bonnes réponses dans `correct_answers`. */
  correct_answer: number;
  /** Toutes les bonnes réponses (absent dans une correction d'avant le 16/10/2026 : `correct_answer` seule). */
  correct_answers?: number[];
  is_correct: boolean;
  explanation: string;
  /** Théorèmes évalués par la question. */
  theoremes?: string[];
}

/** Quiz commencé, pas encore envoyé (GET /skill-assessments/en-cours/) : « Reprendre ». */
export interface QuizEnCours { chapitre: number; niveau: number; type?: QuizType; repondues: number; total: number; maj: string }

/** Un passage chargé (GET quiz/<id>/) : nouveau tirage, ou reprise d'un passage commencé. */
export interface QuizStart {
  questions: QuizQuestion[];
  /** Durée prévue et temps restant (reprise : temps déjà passé), en secondes ; plus de chronomètre affiché. */
  seconds: number;
  left: number;
  reprise: boolean;
  /** Corrections déjà données (reprise). */
  verifiees: CorrectionItem[];
}

/** Réponse à une question : un index (une bonne réponse), ou les index cochés (plusieurs bonnes réponses). */
export type Answer = number | number[];

/** Index cochés d'une réponse ([] : sans réponse). */
export const picked = (a: Answer | null | undefined): number[] =>
  (Array.isArray(a) ? a : a != null && a >= 0 ? [a] : []);

/** Toutes les bonnes réponses d'une correction. */
export const goodAnswers = (c: Pick<CorrectionItem, 'correct_answer' | 'correct_answers'>) =>
  (c.correct_answers?.length ? c.correct_answers : [c.correct_answer]);

/** Réponse donnée (pas « sans réponse »). */
export const answered = (c: Pick<CorrectionItem, 'your_answer'>) => picked(c.your_answer).length > 0;

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface QuizQuestion {
  id: number; question: string; options: string[]; difficulty: Difficulty;
  /** Nombre de bonnes réponses (plus d'une : cases à cocher, « Choisis {n} réponses ») ; jamais lesquelles. */
  nb_bonnes?: number;
}

/** Nombre de réponses à cocher pour cette question (1 pour une question à une seule bonne réponse). */
export const toPick = (q: Pick<QuizQuestion, 'nb_bonnes'>) => Math.max(1, q.nb_bonnes ?? 1);

/** Un chapitre vu par la page : programme de l'élève (Ma progression) + quiz prêt + dernier résultat. */
export interface QuizChapter {
  id: number;
  name: string;
  /** Sous-domaine (Analyse, Algèbre…) ; null pour un chapitre venu de la taxonomie (autre niveau). */
  subfield: string | null;
  subject: string | null;
  status: ChapterStatus;
  mastery: number | null;
  /** Quiz du cours : nombre de questions actives (0 = pas encore de quiz). */
  ready: number;
  hub_url: string | null;
  last_at: string | null;
  /** Dernier passage de l'élève au quiz du cours. */
  taken: SkillAssessment | null;
  /** Quiz du cours sorti il y a moins de 14 jours, pas encore passé depuis (étiquette « Nouveau »). */
  fresh: boolean;
  /** L'approfondissement du chapitre : mêmes informations (ready 0 : pas encore d'approfondissement). */
  deep: QuizStage;
}

/** Un des deux quiz d'un chapitre, vu par la liste. */
export interface QuizStage { ready: number; taken: SkillAssessment | null; fresh: boolean }

/** Le quiz du cours ou l'approfondissement d'un chapitre de la liste. */
export const stageOf = (c: QuizChapter, type: QuizType): QuizStage => (type === 'cours' ? c : c.deep);

/** Quiz ouvert : le chapitre, et d'où l'on vient pour la suite. */
export interface ActiveQuiz {
  id: number; name: string; subject: string | null; hub_url: string | null;
  /** Niveau du quiz (un quiz = chapitre + niveau) ; absent : celui de l'élève. */
  levelId?: number | null;
  /** Quiz du cours (défaut) ou approfondissement. */
  type?: QuizType;
}

/** Clé d'un quiz : niveau + chapitre, + type pour l'approfondissement (« Nouveau », passages en cours). */
export const quizKey = (levelId: number | null | undefined, chapterId: number, type: QuizType = 'cours') =>
  `${levelId ?? ''}:${chapterId}${type === 'cours' ? '' : `:${type}`}`;

/** Dernier résultat de l'élève sur le quiz (chapitre, niveau, type) ; un passage sans niveau (forcément du cours)
 *  compte pour le sien. */
export const takenOn = (mine: SkillAssessment[], chapterId: number, levelId: number | null | undefined,
  ownLevelId?: number | null, type: QuizType = 'cours') => {
  const ofQuiz = mine.filter((a) => a.chapter === chapterId && typeOf(a) === type);
  return ofQuiz.find((a) => a.class_level === levelId)
    ?? (levelId === ownLevelId ? ofQuiz.find((a) => a.class_level == null) : undefined) ?? null;
};

export const DIFFICULTY: Record<Difficulty, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

export const pct = (a: Pick<SkillAssessment, 'score' | 'max_score'>) => (a.max_score ? Math.round((a.score / a.max_score) * 100) : 0);

/** Score du passage précédent en %, null au premier passage. */
export const previousPct = (a: SkillAssessment) =>
  (a.previous_score != null && a.previous_max ? Math.round((a.previous_score / a.previous_max) * 100) : null);

/** « Retour à mon DS » : seulement vers un plan de DS du site (jamais une adresse extérieure). */
export const safeReturn = (r: string | null) => (r && /^\/revisions\/ds\/\d+$/.test(r) ? r : null);

/** Un quiz = toutes les questions du chapitre, 30 au plus (une par théorème d'abord). */
export const quizSize = (ready: number) => Math.min(Math.max(ready, 1), 30);

/** « Nouveau » : quiz sorti récemment (date de mise en ligne), pas passé depuis sa sortie. */
export const isFresh = (since: string | undefined, taken: SkillAssessment | null | undefined) =>
  !!since && (!taken || new Date(taken.completed_at) < new Date(since));


export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export const frDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });

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

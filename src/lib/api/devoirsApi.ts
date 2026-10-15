/**
 * « Mon prochain DS » (08/10/2026) : DS annoncés, plan de révision ciblé, DS blanc.
 * Backend : apps/interactions/devoirs.py (/api/devoirs/).
 */
import { api } from './apiClient';
import type { Etat } from '@/pages/progression/types';
import { t, dateLocale } from '@/i18n';

export type TestKind = 'ds' | 'controle' | 'blanc';
export interface NamedRef { id: number; name: string }

export interface UpcomingTest {
  id: number;
  kind: TestKind;
  subject: NamedRef | null;
  /** Niveau du DS (« Modifier » ouvre ses chapitres, pas ceux d'un autre niveau). */
  class_level?: NamedRef | null;
  chapters: NamedRef[];
  date: string;            // AAAA-MM-JJ
  days_left: number;       // négatif : passé (recalculé à la date du téléphone, voir `local`)
  grade: number | null;    // sur 20
  /** DS blanc commencé (et pas encore terminé si mock_done_at est nul) : « Reprendre ». */
  mock_started_at?: string | null;
  mock_done_at: string | null;
  mock_seconds: number | null;
  created_at: string;
  /** DS à venir seulement : moyenne de maîtrise des chapitres évalués, chapitres fragiles. */
  readiness?: number | null;
  weak_chapters?: string[];
}

export interface TestPayload {
  kind?: TestKind;
  subject_id?: number | null;
  class_level_id?: number | null;
  chapter_ids?: number[];
  date?: string;
  grade?: number | null;
}

export type ChapterStatus = 'mastered' | 'good' | 'weak' | 'started' | 'todo';
export interface PlanChapter {
  id: number;
  name: string;
  subfield: string;
  status: ChapterStatus;
  mastery: number | null;
  self_pct: number | null;
  questions: number;
  skilliq: { pct: number | null; level: string; date: string } | null;
  quiz_ready: boolean;
  contents: number;
  done: number;
  review: { id: number; title: string; url: string }[];
  /** Théorèmes des questions les mieux / moins réussis (pas affichés aux élèves). */
  theoremes?: { best: { label: string; pct: number }[]; worst: { label: string; pct: number }[] };
  /** Page d'exercices du chapitre au niveau de l'élève (« S'entraîner ») ; null hors de son niveau. */
  hub_url?: string | null;
  /** État de « Ma progression » (13/10/2026), null hors du programme de l'élève. */
  etat?: Etat | null;
  raison?: string | null;
}

export interface PlanExercise {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  chapter: string | null;
  status: 'review' | 'seen' | null;
  reason: string | null;
  minutes: number;
}

export interface MockExercise {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  chapter: string | null;
  minutes: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structure?: any;
}

export interface MockExam {
  exercises: MockExercise[];
  minutes: number;
  started_at: string | null;
  done_at: string | null;
  seconds: number | null;
  /** Réglages de l'élève : durée visée (minutes) et difficulté ('' = mélangée). */
  settings?: { minutes: number; difficulty: MockDifficulty; choices: number[] };
  /** Faux : pas assez d'exercices longs de la difficulté choisie, d'autres complètent le sujet. */
  difficulty_respected?: boolean;
  /** Questions au moins par exercice du DS blanc (3). */
  min_questions?: number;
  /** Chapitres du DS que le sujet couvre (les autres n'ont pas d'exercice long). */
  chapters_covered?: number[];
  /** Heure du serveur : le chronomètre s'y recale (horloge du téléphone décalée). */
  now?: string;
}

export type MockDifficulty = '' | 'easy' | 'medium' | 'hard';

export interface TestPlan {
  test: UpcomingTest;
  readiness: number | null;
  chapters: PlanChapter[];
  exercises: PlanExercise[];
  mock: MockExam | null;
  preparation: {
    exercises: number;
    exercises_goal: number;
    quizzes: number;
    quizzes_total: number;
    quiz_done: number[];
    mock: boolean;
  };
}

export const KIND_LABEL: Record<TestKind, string> = { ds: 'DS', controle: 'Contrôle', blanc: 'Examen blanc' };

/** « DS de mathématiques » */
export const testTitle = (test: Pick<UpcomingTest, 'kind' | 'subject'>) =>
  test.subject ? t('{kind} de {subject}', { kind: t(KIND_LABEL[test.kind]), subject: test.subject.name.toLowerCase() }) : t(KIND_LABEL[test.kind]);

/** « aujourd’hui », « demain », « dans 3 jours », « il y a 2 jours » */
export const whenLabel = (days: number) => {
  if (days === 0) return t('aujourd’hui');
  if (days === 1) return t('demain');
  if (days === -1) return t('hier');
  return days > 0 ? t('dans {n} jours', { n: days }) : t('il y a {n} jours', { n: -days });
};

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « Dimanche 11 octobre » (majuscule au jour seulement). */
export const longDate = (iso: string) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Jours avant le DS à la date du téléphone. Le serveur compte en UTC : entre minuit et 1 h (heure du Maroc), il
 *  disait encore « Demain » le jour du DS. */
const daysUntil = (iso: string) => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${iso}T12:00:00`).getTime() - today.getTime()) / 86400000);
};
const local = <T extends UpcomingTest | null>(t: T): T => (t ? { ...t, days_left: daysUntil(t.date) } : t);
type MockWithTest = MockExam & { test: UpcomingTest };
const localMock = (m: MockWithTest): MockWithTest => ({ ...m, test: local(m.test) });

export const devoirsApi = {
  list: async (): Promise<UpcomingTest[]> => ((await api.get('/devoirs/')).data as UpcomingTest[]).map(local),
  next: async (): Promise<UpcomingTest | null> => local((await api.get('/devoirs/prochain/')).data.test as UpcomingTest | null),
  create: async (data: TestPayload): Promise<UpcomingTest> => local((await api.post('/devoirs/', data)).data as UpcomingTest),
  update: async (id: number, data: TestPayload): Promise<UpcomingTest> => local((await api.patch(`/devoirs/${id}/`, data)).data as UpcomingTest),
  remove: async (id: number): Promise<void> => { await api.delete(`/devoirs/${id}/`); },
  plan: async (id: number): Promise<TestPlan> => {
    const p = (await api.get(`/devoirs/${id}/plan/`)).data as TestPlan;
    return { ...p, test: local(p.test) };
  },
  mock: async (id: number): Promise<MockWithTest> => localMock((await api.get(`/devoirs/${id}/ds-blanc/`)).data),
  mockAction: async (id: number, action: 'start' | 'finish' | 'new', seconds?: number): Promise<MockWithTest> =>
    localMock((await api.post(`/devoirs/${id}/ds-blanc/`, { action, seconds })).data),
  /** Durée et difficulté du DS blanc : enregistrées, et un nouveau sujet est tiré. */
  mockSettings: async (id: number, minutes: number, difficulty: MockDifficulty): Promise<MockWithTest> =>
    localMock((await api.post(`/devoirs/${id}/ds-blanc/`, { action: 'settings', minutes, difficulty })).data),
};

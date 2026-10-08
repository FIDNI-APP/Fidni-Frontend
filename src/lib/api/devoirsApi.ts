/**
 * « Mon prochain DS » (08/10/2026) : DS annoncés, plan de révision ciblé, DS blanc.
 * Backend : apps/interactions/devoirs.py (/api/devoirs/).
 */
import { api } from './apiClient';

export type TestKind = 'ds' | 'controle' | 'blanc';
export interface NamedRef { id: number; name: string }

export interface UpcomingTest {
  id: number;
  kind: TestKind;
  subject: NamedRef | null;
  chapters: NamedRef[];
  date: string;            // AAAA-MM-JJ
  days_left: number;       // négatif : passé
  grade: number | null;    // sur 20
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
  notions: { best: { label: string; pct: number }[]; worst: { label: string; pct: number }[] };
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
}

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
export const testTitle = (t: Pick<UpcomingTest, 'kind' | 'subject'>) =>
  t.subject ? `${KIND_LABEL[t.kind]} de ${t.subject.name.toLowerCase()}` : KIND_LABEL[t.kind];

/** « aujourd’hui », « demain », « dans 3 jours », « il y a 2 jours » */
export const whenLabel = (days: number) => {
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'demain';
  if (days === -1) return 'hier';
  return days > 0 ? `dans ${days} jours` : `il y a ${-days} jours`;
};

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « Dimanche 11 octobre » (majuscule au jour seulement). */
export const longDate = (iso: string) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const devoirsApi = {
  list: async (): Promise<UpcomingTest[]> => (await api.get('/devoirs/')).data,
  next: async (): Promise<UpcomingTest | null> => (await api.get('/devoirs/prochain/')).data.test,
  create: async (data: TestPayload): Promise<UpcomingTest> => (await api.post('/devoirs/', data)).data,
  update: async (id: number, data: TestPayload): Promise<UpcomingTest> => (await api.patch(`/devoirs/${id}/`, data)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`/devoirs/${id}/`); },
  plan: async (id: number): Promise<TestPlan> => (await api.get(`/devoirs/${id}/plan/`)).data,
  mock: async (id: number): Promise<MockExam & { test: UpcomingTest }> => (await api.get(`/devoirs/${id}/ds-blanc/`)).data,
  mockAction: async (id: number, action: 'start' | 'finish' | 'new', seconds?: number): Promise<MockExam & { test: UpcomingTest }> =>
    (await api.post(`/devoirs/${id}/ds-blanc/`, { action, seconds })).data,
};

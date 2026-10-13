// Logique de l'accueil (refonte du 11/10/2026), à part des composants : quelle action principale, quels
// premiers pas, quels blocs montrer. Que des données déjà chargées, aucun appel.
import type { DashboardOverview as Overview, OverviewContent, RecommendedItem } from '@/lib/api/dashboardApi';
import type { WeeklyProgress } from '@/lib/api';
import { KIND_LABEL, type UpcomingTest } from '@/lib/api/devoirsApi';
import type { NextTestState } from '@/components/devoirs/useNextTest';

/* ───────────────────────── L'action principale ───────────────────────── */

export type NextChoice =
  | { kind: 'ds'; test: UpcomingTest; resume: OverviewContent | null }
  | { kind: 'resume'; item: OverviewContent; others: OverviewContent[]; forTest: boolean }
  | { kind: 'start'; exercise: RecommendedItem | null }
  | { kind: 'teacher' };

/** DS assez proche pour passer avant « Reprendre ». */
const DS_FIRST_DAYS = 3;

/** Priorité : DS dans 3 jours au plus › reprendre › DS dans les deux semaines › commencer (prof : ses classes). */
export function chooseNext(data: Overview, test: UpcomingTest | null, exercises: RecommendedItem[], teacher: boolean): NextChoice {
  if (teacher) return { kind: 'teacher' };
  const [last, ...others] = data.resume;
  if (test && test.days_left >= 0 && test.days_left <= DS_FIRST_DAYS) return { kind: 'ds', test, resume: last ?? null };
  // Le contenu à reprendre est-il au programme du DS annoncé ? (on le dit : ça motive)
  const forTest = !!(last?.chapter && test && test.days_left >= 0 && test.chapters.some((c) => c.name === last.chapter));
  if (last) return { kind: 'resume', item: last, others: others.slice(0, 2), forTest };
  if (test && test.days_left >= 0) return { kind: 'ds', test, resume: null };
  return { kind: 'start', exercise: exercises[0] ?? null };
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « Préparer mon DS de mercredi », « … de demain », « … du 24 octobre ». */
export function prepareLabel(t: UpcomingTest): string {
  const what = t.kind === 'ds' ? 'DS' : KIND_LABEL[t.kind].toLowerCase();
  const d = new Date(`${t.date}T12:00:00`);
  const when = t.days_left <= 0 ? 'd’aujourd’hui' : t.days_left === 1 ? 'de demain'
    : t.days_left <= 6 ? `de ${WEEKDAYS[d.getDay()]}` : `du ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `Préparer mon ${what} ${when}`;
}

/** « aujourd’hui », « hier », « il y a 4 jours ». */
export function ago(iso?: string): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

/* ───────────────────────── Tes premiers pas ───────────────────────── */

export type StepKey = 'niveau' | 'exercice' | 'ds';
export type FirstStep = { key: StepKey; done: boolean };

/** Chaque pas se coche tout seul : niveau renseigné, premier travail évalué, un DS annoncé. */
export function firstSteps(data: Overview, ds: NextTestState): FirstStep[] {
  const t = data.totals;
  return [
    { key: 'niveau', done: !!data.level },
    { key: 'exercice', done: t.questions > 0 || t.exercises_done + t.exams_done > 0 || data.resume.length + data.review.length > 0 },
    { key: 'ds', done: ds.announced },
  ];
}

/** Le plus abordable des exercices proposés (« Facile » d'abord), sinon le premier. */
export const easiest = (items: RecommendedItem[]) => items.find((x) => x.difficulty === 'easy') ?? items[0] ?? null;

/* ───────────────────────── Blocs facultatifs ───────────────────────── */

/** Contenus montrés dans « À refaire » (les autres sont sur Réviser). */
export const REDO_SHOWN = 3;

/** Une activité à montrer ? (sinon la ligne de la semaine n'apparaît pas : pas de bande de zéros) */
export const hasWeekData = (data: Overview) =>
  data.totals.questions > 0 || data.streak.current > 0 || data.week.questions > 0;

/** Assez de données pour un graphique « Toi et ta classe » utile ? */
export const hasClassChart = (p: WeeklyProgress | null): p is WeeklyProgress =>
  !!p?.has_classroom && p.you.length > 1 && p.you.filter((v) => v > 0).length >= 2;

/** L'action principale vise-t-elle déjà ce que propose « Où j'en suis » (même DS, ou contenu à reprendre du même
 *  chapitre) ? Le bloc mène alors à Ma progression plutôt qu'à un second bouton vers la même chose. */
export function sameTarget(choice: NextChoice, objectif: { ds: { id: number } | null; chapitre: { name: string } | null } | null): boolean {
  if (!objectif) return false;
  if (choice.kind === 'ds') return !!objectif.ds && objectif.ds.id === choice.test.id;
  if (choice.kind === 'resume') return !!objectif.chapitre && choice.item.chapter === objectif.chapitre.name;
  return false;
}

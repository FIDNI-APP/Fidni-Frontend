/**
 * Parcours (12/11/2026) : règles de progression, sans affichage (testables à part).
 *
 * Chapitres (parcours principal), dans l'ordre :
 *  - terminé   : toutes ses vidéos terminées, et son quiz réussi s'il en a un ;
 *  - en cours  : le premier chapitre ouvert et pas terminé (le prochain checkpoint) ;
 *  - accessible: ouvert, pas terminé, mais pas le prochain (déjà commencé, ou chapitre vide) ;
 *  - verrouillé: le chapitre précédent n'est pas terminé et l'élève ne l'a pas commencé.
 * Un chapitre sans vidéo ni quiz (« bientôt ») ne bloque pas la suite et ne compte pas dans le total.
 *
 * Vidéos (parcours secondaire), même principe dans leur chapitre : la suivante s'ouvre quand la précédente est
 * terminée — c'est le serveur qui décide « terminée » (90 % visionnés ou fin de lecture), jamais l'ouverture.
 */
import type { Id, Parcours, ParcoursChapter, ParcoursVideo } from '@/lib/api/parcoursApi';

export type CheckpointState = 'completed' | 'current' | 'available' | 'locked';

export interface VideoStep {
  video: ParcoursVideo;
  index: number;
  state: CheckpointState;
  /** Position atteinte, 0–100 (0 sans progression). */
  percent: number;
}

export interface ChapterStep {
  chapter: ParcoursChapter;
  index: number;
  state: CheckpointState;
  /** Chapitre sans vidéo ni quiz : « bientôt », hors du total. */
  empty: boolean;
  videos: VideoStep[];
  doneVideos: number;
  /** Quiz de fin à faire (toutes les vidéos vues, quiz pas encore réussi). */
  quizDue: boolean;
  quizPassed: boolean;
  /** Avancement du chapitre en %, vidéos et quiz compris. */
  percent: number;
}

export interface ParcoursProgress {
  steps: ChapterStep[];
  total: number;
  done: number;
  percent: number;
  /** Prochain checkpoint : le chapitre en cours, et la vidéo (ou le quiz) à reprendre. */
  next: { step: ChapterStep; video: VideoStep | null; quiz: boolean } | null;
  finished: boolean;
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export const videoDone = (v: ParcoursVideo) => !!v.user_progress?.is_completed;
const videoStarted = (v: ParcoursVideo) => (v.user_progress?.watched_seconds ?? 0) > 0;
const videoPercent = (v: ParcoursVideo) =>
  videoDone(v) ? 100 : Math.max(0, Math.min(99, Math.round(v.user_progress?.progress_percentage ?? 0)));

function videoSteps(videos: ParcoursVideo[], chapterOpen: boolean): VideoStep[] {
  let previousDone = true;
  let currentGiven = false;
  return [...videos].sort(byOrder).map((video, index) => {
    const done = videoDone(video);
    const open = chapterOpen && (previousDone || videoStarted(video) || done);
    let state: CheckpointState;
    if (done) state = 'completed';
    else if (!open) state = 'locked';
    else if (!currentGiven) { state = 'current'; currentGiven = true; }
    else state = 'available';
    previousDone = previousDone && done;
    return { video, index, state, percent: videoPercent(video) };
  });
}

/** Progression complète d'un parcours (chapitres triés par ordre). */
export function computeProgress(parcours: Pick<Parcours, 'path_chapters'>): ParcoursProgress {
  const chapters = [...parcours.path_chapters].sort(byOrder);
  const steps: ChapterStep[] = [];
  let previousDone = true;
  let currentGiven = false;

  chapters.forEach((chapter, index) => {
    const empty = chapter.videos.length === 0 && !chapter.quiz;
    const allVideos = chapter.videos.every(videoDone);
    const quizPassed = !chapter.quiz || !!chapter.user_progress?.quiz_passed;
    const done = !empty && ((allVideos && quizPassed) || !!chapter.user_progress?.is_completed);
    const started = !!chapter.user_progress || chapter.videos.some((v) => videoStarted(v) || videoDone(v));
    const open = previousDone || started || done;

    let state: CheckpointState;
    if (done) state = 'completed';
    else if (!open) state = 'locked';
    else if (!currentGiven && !empty) { state = 'current'; currentGiven = true; }
    else state = 'available';

    const videos = videoSteps(chapter.videos, state !== 'locked');
    const doneVideos = videos.filter((v) => v.state === 'completed').length;
    const quizDue = !!chapter.quiz && allVideos && !chapter.user_progress?.quiz_passed && state !== 'locked';
    const parts = chapter.videos.length + (chapter.quiz ? 1 : 0);
    const percent = done ? 100 : parts === 0 ? 0
      : Math.round(((videos.reduce((n, v) => n + v.percent / 100, 0)) + (chapter.quiz && chapter.user_progress?.quiz_passed ? 1 : 0)) / parts * 100);

    steps.push({ chapter, index, state, empty, videos, doneVideos, quizDue, quizPassed: !!chapter.quiz && !!chapter.user_progress?.quiz_passed, percent });
    // Un chapitre vide ne bloque pas la suite.
    previousDone = previousDone && (done || empty);
  });

  const counted = steps.filter((s) => !s.empty);
  const done = counted.filter((s) => s.state === 'completed').length;
  const total = counted.length;
  const currentStep = steps.find((s) => s.state === 'current') ?? null;
  const next = currentStep ? {
    step: currentStep,
    video: currentStep.videos.find((v) => v.state === 'current') ?? null,
    quiz: currentStep.quizDue,
  } : null;

  return { steps, total, done, percent: total ? Math.round((done / total) * 100) : 0, next, finished: total > 0 && done === total };
}

/** Durée lisible : 1 h 05, 12 min, 45 s. */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m) return `${m} min`;
  return `${seconds} s`;
}

export const chapterSeconds = (c: ParcoursChapter) => c.videos.reduce((n, v) => n + (v.duration_seconds || 0), 0);

/** Clés des checkpoints terminés, pour animer ceux qui viennent de l'être (retour du lecteur). */
export function completedKeys(p: ParcoursProgress): string[] {
  return p.steps.flatMap((s) => [
    ...(s.state === 'completed' ? [`c${String(s.chapter.id)}`] : []),
    ...s.videos.filter((v) => v.state === 'completed').map((v) => `v${String(v.video.id)}`),
  ]);
}

export const sameId = (a: Id | null | undefined, b: Id | null | undefined) => a != null && b != null && String(a) === String(b);

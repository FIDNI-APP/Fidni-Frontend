// Données de GET /api/stats/progression/ (backend apps/users/progression.py).
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
}

export interface RatedItem {
  label: string;
  pct: number;
  chapter_id: number | null;
  chapter: string | null;
  source: 'notion' | 'skilliq';
  questions: number | null;
  url: string;
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
}

// Les chapitres du niveau de l'élève, vus par le quiz : programme et maîtrise (Ma progression, GET /stats/progression/),
// quiz prêts (GET /skill-assessments/available/) et derniers résultats (GET /skill-assessments/my/).
// Professeur : pas de « mon niveau » (profileLevel), seulement les quiz prêts, tous niveaux confondus.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProgression } from '@/pages/progression/useProgression';
import type { ChapterStatus } from '@/pages/progression/types';
import { getAvailable, getMine } from './api';
import { pct, type QuizChapter, type SkillAssessment } from './types';

/** Ordre du « prochain quiz » : là où le quiz apprend le plus à l'élève d'abord. */
const RANK: Record<ChapterStatus, number> = { weak: 0, started: 1, todo: 2, good: 3, mastered: 4 };

export function useQuizChapters(username: string | null, isTeacher: boolean) {
  const progression = useProgression(username && !isTeacher ? username : null);
  const [available, setAvailable] = useState<Record<string, number> | null>(null);
  const [availableFailed, setAvailableFailed] = useState(false);
  const [mine, setMine] = useState<SkillAssessment[] | null>(null);

  useEffect(() => {
    if (!username) return;
    let alive = true;
    getAvailable()
      .then((a) => { if (alive) setAvailable(a); })
      .catch(() => { if (alive) { setAvailable({}); setAvailableFailed(true); } });
    getMine()
      .then((m) => { if (alive) setMine(m); })
      .catch(() => { if (alive) setMine([]); });
    return () => { alive = false; };
  }, [username]);

  // Après un quiz : le dernier score de chaque chapitre (un échec ici n'empêche rien).
  const refreshMine = useCallback(() => { getMine().then(setMine).catch(() => {}); }, []);

  const data = progression.data;
  const progressionPending = !isTeacher && !data && !progression.failed;
  const loading = !username || available === null || mine === null || progressionPending;
  // Élève : sans le programme, la page ne peut rien proposer de juste ; professeur : sans la liste des quiz.
  const failed = isTeacher ? availableFailed : progression.failed && !data;

  const taken = useMemo(() => new Map((mine ?? []).map((a) => [a.chapter, a])), [mine]);

  const chapters = useMemo<QuizChapter[]>(() => {
    if (isTeacher || !data?.level) return [];
    return data.chapters.map((c) => ({
      id: c.id,
      name: c.name,
      subfield: c.subfield || null,
      subject: null,
      status: c.status,
      mastery: c.mastery,
      // Sans la liste des quiz (échec), l'indication de Ma progression suffit.
      ready: available?.[String(c.id)] ?? (c.quiz_ready ? 10 : 0),
      hub_url: c.hub_url ?? null,
      last_at: c.last_at,
      taken: taken.get(c.id) ?? null,
    }));
  }, [data, available, taken, isTeacher]);

  const ready = useMemo(() => chapters.filter((c) => c.ready > 0), [chapters]);
  const soon = useMemo(() => chapters.filter((c) => c.ready === 0), [chapters]);

  /** Quiz prêts hors du niveau de l'élève (autre niveau, ou tous pour un professeur). */
  const elsewhere = useMemo(() => {
    const mineIds = new Set(chapters.map((c) => c.id));
    return Object.entries(available ?? {}).filter(([id, n]) => n > 0 && !mineIds.has(Number(id))).length;
  }, [available, chapters]);

  /** Prochain quiz : prêt, pas encore passé, sur le chapitre le plus fragile. */
  const next = useMemo(() => [...ready].filter((c) => !c.taken).sort((a, b) =>
    RANK[a.status] - RANK[b.status] || (a.mastery ?? 101) - (b.mastery ?? 101) || a.name.localeCompare(b.name, 'fr'))[0] ?? null,
  [ready]);

  /** Tous passés : le plus faible score, à refaire. */
  const redo = useMemo(() => (next ? null : [...ready].filter((c) => c.taken)
    .sort((a, b) => pct(a.taken!) - pct(b.taken!))[0] ?? null), [next, ready]);

  /** Chapitre le plus fragile d'après les exercices : « à renforcer » d'abord, sinon le dernier commencé. */
  const fragile = useMemo(() => {
    const all = data?.chapters ?? [];
    const weak = all.filter((c) => c.status === 'weak').sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0))[0];
    const started = all.filter((c) => c.status === 'started').sort((a, b) => (b.last_at ?? '').localeCompare(a.last_at ?? ''))[0];
    const c = weak ?? started;
    return c ? { id: c.id, name: c.name, hub_url: c.hub_url ?? null, status: c.status } : null;
  }, [data]);

  return {
    loading,
    failed,
    level: isTeacher ? null : data?.level ?? null,
    chapters,
    ready,
    soon,
    elsewhere,
    next,
    redo,
    fragile,
    available: available ?? {},
    mine: mine ?? [],
    taken,
    refreshMine,
  };
}

export type QuizChapters = ReturnType<typeof useQuizChapters>;

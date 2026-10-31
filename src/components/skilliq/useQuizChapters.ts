// Les chapitres du niveau de l'élève, vus par le quiz : programme et maîtrise (Ma progression, GET /stats/progression/),
// quiz prêts (GET /skill-assessments/available/) et derniers résultats (GET /skill-assessments/my/).
// Professeur : pas de « mon niveau » (profileLevel), seulement les quiz prêts, tous niveaux confondus.
// Deux quiz par chapitre depuis le 31/10/2026 : le quiz du cours (`ready`, `taken`, `fresh`) et l'approfondissement
// (`deep`), chargés à part (?type=approfondissement).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProgression } from '@/pages/progression/useProgression';
import type { ChapterStatus } from '@/pages/progression/types';
import { getAvailable, getAvailableAll, getMine, getNew } from './api';
import { isFresh, pct, quizKey, takenOn, type QuizChapter, type QuizType, type SkillAssessment } from './types';

/** Ordre du « prochain quiz » : là où le quiz apprend le plus à l'élève d'abord. */
const RANK: Record<ChapterStatus, number> = { weak: 0, started: 1, todo: 2, good: 3, mastered: 4 };

/** Un quiz à mettre en avant : le chapitre et lequel de ses deux quiz. */
export interface Suggestion { chapter: QuizChapter; type: QuizType }

type ByLevel = Record<string, Record<string, number>>;

export function useQuizChapters(username: string | null, isTeacher: boolean, userId?: string | number | null) {
  // Cache de Ma progression : clé = identifiant du compte (le même que la page, 13/10/2026).
  const progression = useProgression(userId != null && !isTeacher ? String(userId) : null);
  const [available, setAvailable] = useState<Record<string, number> | null>(null);
  const [availableFailed, setAvailableFailed] = useState(false);
  const [deepAvailable, setDeepAvailable] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<SkillAssessment[] | null>(null);
  const [fresh, setFresh] = useState<Record<string, string>>({});
  // Quiz prêts de tous les niveaux (un quiz = chapitre + niveau + type) : barre de niveaux, autres niveaux.
  const [availableAll, setAvailableAll] = useState<ByLevel>({});
  const [deepAll, setDeepAll] = useState<ByLevel>({});

  useEffect(() => {
    if (!username) return;
    let alive = true;
    getAvailable()
      .then((a) => { if (alive) setAvailable(a); })
      .catch(() => { if (alive) { setAvailable({}); setAvailableFailed(true); } });
    getMine()
      .then((m) => { if (alive) setMine(m); })
      .catch(() => { if (alive) setMine([]); });
    // Approfondissement, « Nouveau », autres niveaux : un échec ne retire que ce qu'ils ajoutent.
    getAvailable(null, 'approfondissement').then((a) => { if (alive) setDeepAvailable(a); }).catch(() => {});
    getNew().then((f) => { if (alive) setFresh(f); }).catch(() => {});
    getAvailableAll().then((a) => { if (alive) setAvailableAll(a); }).catch(() => {});
    getAvailableAll('approfondissement').then((a) => { if (alive) setDeepAll(a); }).catch(() => {});
    return () => { alive = false; };
  }, [username]);

  // Après un quiz : le dernier score de chaque chapitre (un échec ici n'empêche rien).
  const refreshMine = useCallback(() => { getMine().then(setMine).catch(() => {}); }, []);

  const data = progression.data;
  const progressionPending = !isTeacher && !data && !progression.failed;
  const loading = !username || available === null || mine === null || progressionPending;
  // Élève : sans le programme, la page ne peut rien proposer de juste ; professeur : sans la liste des quiz.
  const failed = isTeacher ? availableFailed : progression.failed && !data;

  // Résultats des quiz de SON niveau, chapitre par chapitre (un passage sans niveau compte pour le sien).
  const levelId = data?.level?.id ?? null;

  const chapters = useMemo<QuizChapter[]>(() => {
    if (isTeacher || !data?.level) return [];
    return data.chapters.map((c) => {
      const taken = takenOn(mine ?? [], c.id, levelId, levelId);
      const deepTaken = takenOn(mine ?? [], c.id, levelId, levelId, 'approfondissement');
      return {
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
        taken,
        fresh: isFresh(fresh[quizKey(levelId, c.id)], taken),
        deep: {
          ready: deepAvailable[String(c.id)] ?? 0,
          taken: deepTaken,
          fresh: isFresh(fresh[quizKey(levelId, c.id, 'approfondissement')], deepTaken),
        },
      };
    });
  }, [data, available, deepAvailable, mine, isTeacher, fresh, levelId]);

  /** Chapitres qui ont au moins un des deux quiz ; les autres sont « bientôt ». */
  const ready = useMemo(() => chapters.filter((c) => c.ready > 0 || c.deep.ready > 0), [chapters]);
  const soon = useMemo(() => chapters.filter((c) => c.ready === 0 && c.deep.ready === 0), [chapters]);
  const hasDeep = ready.some((c) => c.deep.ready > 0);

  /** Quiz prêts hors du niveau de l'élève (autre niveau, ou tous pour un professeur) : chapitres avec un quiz. */
  const elsewhere = useMemo(() => {
    const levels = new Set([...Object.keys(availableAll), ...Object.keys(deepAll)]);
    let n = 0;
    for (const lv of levels) {
      if (Number(lv) === levelId) continue;
      const ids = new Set([...Object.entries(availableAll[lv] ?? {}), ...Object.entries(deepAll[lv] ?? {})]
        .filter(([, x]) => x > 0).map(([id]) => id));
      n += ids.size;
    }
    return n;
  }, [availableAll, deepAll, levelId]);

  /** Prochain quiz, pas encore passé : un approfondissement qui vient de sortir (cours déjà passé), un quiz du cours
   *  qui vient de sortir, les quiz du cours des chapitres les plus fragiles, puis les approfondissements des chapitres
   *  dont le cours est passé (le mieux réussi d'abord : prêt à aller plus loin). */
  const next = useMemo<Suggestion | null>(() => {
    const coursDone = (c: QuizChapter) => !!c.taken || c.ready === 0;
    const deepOpen = ready.filter((c) => c.deep.ready > 0 && !c.deep.taken && coursDone(c));
    const byCours = (a: QuizChapter, b: QuizChapter) =>
      (b.taken ? pct(b.taken) : -1) - (a.taken ? pct(a.taken) : -1) || a.name.localeCompare(b.name, 'fr');
    const freshDeep = deepOpen.filter((c) => c.deep.fresh).sort(byCours)[0];
    if (freshDeep) return { chapter: freshDeep, type: 'approfondissement' };
    const cours = ready.filter((c) => c.ready > 0 && !c.taken).sort((a, b) =>
      Number(b.fresh) - Number(a.fresh) || RANK[a.status] - RANK[b.status] || (a.mastery ?? 101) - (b.mastery ?? 101)
      || a.name.localeCompare(b.name, 'fr'))[0];
    if (cours) return { chapter: cours, type: 'cours' };
    const deep = [...deepOpen].sort(byCours)[0];
    return deep ? { chapter: deep, type: 'approfondissement' } : null;
  }, [ready]);

  /** Tous passés : le quiz le moins réussi (cours ou approfondissement), à refaire. */
  const redo = useMemo<Suggestion | null>(() => {
    if (next) return null;
    const taken: (Suggestion & { score: number })[] = ready.flatMap((c) => [
      ...(c.taken ? [{ chapter: c, type: 'cours' as const, score: pct(c.taken) }] : []),
      ...(c.deep.taken ? [{ chapter: c, type: 'approfondissement' as const, score: pct(c.deep.taken) }] : []),
    ]);
    const lowest = taken.sort((a, b) => a.score - b.score || Number(a.type !== 'cours') - Number(b.type !== 'cours'))[0];
    return lowest ? { chapter: lowest.chapter, type: lowest.type } : null;
  }, [next, ready]);

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
    hasDeep,
    elsewhere,
    next,
    redo,
    fragile,
    available: available ?? {},
    deepAvailable,
    availableAll,
    deepAll,
    fresh,
    mine: mine ?? [],
    refreshMine,
  };
}

export type QuizChapters = ReturnType<typeof useQuizChapters>;

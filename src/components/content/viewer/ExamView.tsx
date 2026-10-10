// Page d'un examen : présentée comme un vrai sujet, et pensée pour s'entraîner en conditions.
//   - Fiche du sujet : durée, barème, nombre d'exercices, niveau.
//   - Une seule feuille : la fiche en tête, puis les exercices séparés par un intertitre avec leur barème
//     (la numérotation repart à 1, comme sur papier).
//   - Épreuve : compte à rebours sur la durée du sujet ; solutions, auto-évaluation, copie et points
//     masqués jusqu'à la fin, puis le temps est enregistré (et la note du passage, une fois corrigé).
//   - Ta copie : note estimée d'après l'auto-évaluation (Réussi = tous les points, En partie = la
//     moitié, À revoir = 0), exercice par exercice. Aucun chiffre inventé : tout vient du barème et de
//     l'élève. Une épreuve refaite ne compte que les évaluations faites depuis son départ (comme le DS blanc).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Flag, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { AssessmentStatus, ContentExam } from '@/types/content';
import type { ExerciseBlock, FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { AdSlot } from '@/components/ads/AdSlot';
import ExerciseRenderer, { type AssessHandler, type AssessManyHandler } from './ExerciseRenderer';
import { SignupCard } from '@/components/auth/SignupPrompt';
import { useHideMobileTabBar } from '@/components/layout/nav';
import { DIFFICULTY, feltTooltip } from '@/components/content/listing/listingUtils';
import { trackAction } from '@/lib/usage';

/** L'examen propose « En partie » (la moitié des points) ; l'exercice garde Réussi / À revoir. */
const EXAM_OPTIONS: AssessmentStatus[] = ['success', 'partial', 'review'];

interface Props {
  content: ContentExam;
  isAuthenticated: boolean;
  questionProgress?: Record<string, AssessmentStatus>;
  /** Date de chaque auto-évaluation (ISO) : une épreuve refaite ne compte que celles faites depuis son départ. */
  questionDates?: Record<string, string>;
  onQuestionAssess?: AssessHandler;
  /** Statuts posés tels quels (null = effacer) : l'examen décide lui-même de ce qu'est « re-cliquer ». */
  onAssessMany?: AssessManyHandler;
  /** Épreuve terminée : enregistre sa durée, renvoie l'id de la session (pour y rattacher la note). */
  onSaveSession?: (seconds: number) => Promise<string | number | null | void>;
  /** Note du passage, mise à jour pendant la correction. */
  onSaveScore?: (sessionId: string | number, score: number, maxScore: number) => Promise<unknown>;
  /** Une solution vient d'être ouverte (« * » : toutes). */
  onSolutionOpen?: (path: string) => void;
  sessionCount: number;
  onOpenHistory: () => void;
  /** Votes, affichés en haut à droite de la fiche du sujet. */
  votes?: React.ReactNode;
  /** Bas de la fiche (signaler une erreur). */
  footer?: React.ReactNode;
  /** Signaler une erreur sur une question précise. */
  onReport?: (path: string) => void;
  /** Épreuve en cours (vrai) ou non : la page cache ce qui détournerait de la copie (« Où en es-tu ? »). */
  onAttemptChange?: (running: boolean) => void;
}

// ───────────────────────────── Découpage du sujet

interface Question { path: string; points: number }
interface Part { id: string; titleHtml: string; declared: number; blocks: ExerciseBlock[]; questions: Question[] }

const WEIGHT: Partial<Record<AssessmentStatus, number>> = { success: 1, partial: 0.5, review: 0, failed: 0 };

function splitExam(structure?: FlexibleExerciseStructure): { intro: ExerciseBlock[]; parts: Part[] } {
  const intro: ExerciseBlock[] = [];
  const parts: Part[] = [];
  const hasSections = (structure?.blocks ?? []).some((x) => x.type === 'section');
  for (const b of structure?.blocks ?? []) {
    if (b.type === 'section') {
      parts.push({ id: b.id, titleHtml: b.content?.html || `Partie ${parts.length + 1}`, declared: Number(b.points) || 0, blocks: [], questions: [] });
      continue;
    }
    if (!parts.length) {
      // Texte avant le premier exercice : consignes générales. Sujet sans parties : un seul bloc.
      if (hasSections) { intro.push(b); continue; }
      parts.push({ id: 'sujet', titleHtml: 'Sujet', declared: 0, blocks: [], questions: [] });
    }
    const part = parts[parts.length - 1];
    part.blocks.push(b);
    if (b.type === 'question') {
      if (b.subQuestions?.length) b.subQuestions.forEach((sq) => part.questions.push({ path: `${b.id}.${sq.id}`, points: Number(sq.points) || 0 }));
      else part.questions.push({ path: b.id, points: Number(b.points) || 0 });
    }
  }
  // Partie notée (« Exercice 2 — 5 pts ») dont les questions n'ont pas de points : le barème est réparti
  // à parts égales, sinon l'élève s'évaluerait sans que sa note bouge.
  for (const part of parts) {
    if (part.declared > 0 && part.questions.length && part.questions.every((q) => !q.points)) {
      const each = part.declared / part.questions.length;
      part.questions.forEach((q) => { q.points = each; });
    }
  }
  return { intro, parts };
}

const fmtPts = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');
const plainTitle = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function durationLabel(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}
function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

// ───────────────────────────── Épreuve (chrono), retenue si la page est rechargée

type EpreuveStatus = 'idle' | 'running' | 'paused' | 'done';
interface EpreuveState {
  status: EpreuveStatus;
  elapsed: number;
  /** Début du segment en cours (repart à chaque reprise après une pause). */
  startedAt: number | null;
  auto?: boolean;
  /** Départ du passage (ms) : seules les évaluations faites depuis comptent dans sa note. */
  attemptStart?: number | null;
  /** Session enregistrée à la fin (TimeSession) : la note du passage s'y rattache. */
  sessionId?: string | number | null;
}

// Clé lue aussi par la barre d'onglets du téléphone (MobileTabBar : cachée pendant l'épreuve).
function useEpreuve(examId: number | string, durationMin: number, onDone: (seconds: number) => void) {
  const key = `fidni:epreuve:${examId}`;
  const [state, setState] = useState<EpreuveState>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      if (v && typeof v.elapsed === 'number') return v;
    } catch { /* stockage indisponible */ }
    return { status: 'idle', elapsed: 0, startedAt: null };
  });
  const [now, setNow] = useState(Date.now());
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      if (state.status === 'idle') localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(state));
    } catch { /* stockage indisponible */ }
  }, [state, key]);

  useEffect(() => {
    if (state.status !== 'running') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [state.status]);

  const elapsed = state.elapsed + (state.status === 'running' && state.startedAt ? (now - state.startedAt) / 1000 : 0);
  const limit = durationMin * 60;

  const finish = useCallback((auto = false) => {
    const s = stateRef.current;
    if (s.status !== 'running' && s.status !== 'paused') return;
    const total = s.elapsed + (s.status === 'running' && s.startedAt ? (Date.now() - s.startedAt) / 1000 : 0);
    const seconds = Math.round(limit ? Math.min(total, limit) : total);
    const done: EpreuveState = { status: 'done', elapsed: seconds, startedAt: null, auto, attemptStart: s.attemptStart ?? null };
    stateRef.current = done;
    setState(done);
    trackAction('epreuve-terminee');
    doneRef.current(seconds);
  }, [limit]);

  // Temps écoulé : l'épreuve se termine d'elle-même.
  useEffect(() => {
    if (state.status === 'running' && limit && elapsed >= limit) finish(true);
  }, [elapsed, limit, state.status, finish]);

  return {
    status: state.status,
    elapsed,
    remaining: limit ? Math.max(0, limit - elapsed) : null,
    timeUp: state.auto === true,
    attemptStart: state.attemptStart ?? null,
    sessionId: state.sessionId ?? null,
    setSessionId: (id: string | number) => setState((s) => (s.status === 'done' ? { ...s, sessionId: id } : s)),
    start: () => {
      const t = Date.now();
      trackAction('epreuve-demarree');
      setNow(t);
      setState({ status: 'running', elapsed: 0, startedAt: t, attemptStart: t });
    },
    pause: () => setState((s) => (s.status === 'running' && s.startedAt ? { ...s, status: 'paused', elapsed: s.elapsed + (Date.now() - s.startedAt) / 1000, startedAt: null } : s)),
    resume: () => { setNow(Date.now()); setState((s) => (s.status === 'paused' ? { ...s, status: 'running', startedAt: Date.now() } : s)); },
    finish: () => finish(false),
    reset: () => setState({ status: 'idle', elapsed: 0, startedAt: null }),
  };
}

// ───────────────────────────── Vue

export const ExamView: React.FC<Props> = ({
  content, isAuthenticated, questionProgress, questionDates, onQuestionAssess, onAssessMany,
  onSaveSession, onSaveScore, onSolutionOpen, sessionCount, onOpenHistory, votes, footer, onReport, onAttemptChange,
}) => {
  const structure = content.structure as unknown as FlexibleExerciseStructure | undefined;
  const { intro, parts } = useMemo(() => splitExam(structure), [structure]);
  const durationMin = Number(content.duration_minutes) || 0;
  const [showAll, setShowAll] = useState(false);

  const setSessionIdRef = useRef<(id: string | number) => void>(() => {});
  const epreuve = useEpreuve(content.id, durationMin, (seconds) => {
    if (!isAuthenticated || seconds <= 0 || !onSaveSession) return;
    onSaveSession(seconds)
      .then((id) => { if (id !== null && id !== undefined) setSessionIdRef.current(id); })
      .catch(() => {});
  });
  setSessionIdRef.current = epreuve.setSessionId;
  const locked = epreuve.status === 'running' || epreuve.status === 'paused';
  // Pendant l'épreuve, rien ne doit inviter à quitter sa copie (barre d'onglets du téléphone cachée).
  useHideMobileTabBar(locked);
  const attemptRef = useRef(onAttemptChange);
  attemptRef.current = onAttemptChange;
  useEffect(() => { attemptRef.current?.(locked); }, [locked]);
  useEffect(() => () => attemptRef.current?.(false), []);

  // Passage en cours ou terminé : seules ses évaluations comptent (les anciennes restent en base). Les
  // évaluations faites ici depuis le départ comptent toujours (horloge du téléphone et du serveur décalées).
  const [freshPaths, setFreshPaths] = useState<Set<string>>(() => new Set());
  const attemptStart = epreuve.status === 'idle' ? null : epreuve.attemptStart;
  useEffect(() => { setFreshPaths(new Set()); }, [attemptStart]);
  const progress = useMemo(() => {
    if (!questionProgress || !attemptStart) return questionProgress;
    const out: Record<string, AssessmentStatus> = {};
    for (const [path, st] of Object.entries(questionProgress)) {
      const at = questionDates?.[path];
      if (freshPaths.has(path) || (at && Date.parse(at) >= attemptStart)) out[path] = st;
    }
    return out;
  }, [questionProgress, questionDates, attemptStart, freshPaths]);

  const remember = (changes: Record<string, AssessmentStatus | null>) => {
    if (!attemptStart) return;
    setFreshPaths((prev) => {
      const next = new Set(prev);
      for (const [p, st] of Object.entries(changes)) { if (st) next.add(p); else next.delete(p); }
      return next;
    });
  };
  // Re-cliquer le choix affiché l'efface ; une évaluation d'un ancien passage est remplacée (pas effacée).
  const assessOne: AssessHandler = (path, status, source) => {
    const change = { [path]: progress?.[path] === status ? null : status };
    remember(change);
    if (onAssessMany) onAssessMany(change, source);
    else onQuestionAssess?.(path, status, source);
  };
  const assessMany: AssessManyHandler = (changes, source) => {
    remember(changes);
    onAssessMany?.(changes, source);
  };

  // Barème et note estimée, exercice par exercice.
  const scores = useMemo(() => parts.map((p) => {
    const max = p.questions.reduce((s, q) => s + q.points, 0);
    let got = 0, corrected = 0, assessed = 0;
    for (const q of p.questions) {
      const st = progress?.[q.path];
      if (!st) continue;
      assessed++;
      corrected += q.points;
      got += q.points * (WEIGHT[st] ?? 0);
    }
    return { id: p.id, max: max || p.declared, questionMax: max, got, corrected, assessed, count: p.questions.length };
  }), [parts, progress]);
  const total = scores.reduce((s, x) => s + x.max, 0);
  const got = scores.reduce((s, x) => s + x.got, 0);
  const corrected = scores.reduce((s, x) => s + x.corrected, 0);
  const questionCount = scores.reduce((s, x) => s + x.count, 0);
  const assessedCount = scores.reduce((s, x) => s + x.assessed, 0);
  const solutionCount = useMemo(() => parts.reduce((n, p) => n + p.blocks.reduce((m, b) =>
    m + (b.subQuestions?.length ? b.subQuestions.filter((sq) => sq.solution?.html).length : b.solution?.html ? 1 : 0), 0), 0), [parts]);

  const progressData = useMemo(() => (progress
    ? Object.fromEntries(Object.entries(progress).map(([path, status]) => [path, { status, assessed_at: questionDates?.[path] }]))
    : undefined), [progress, questionDates]);

  // Note du passage : enregistrée avec sa session dès que la correction commence, puis mise à jour.
  const sessionId = epreuve.sessionId;
  const sentRef = useRef<string | null>(null);
  // Note en attente d'envoi : partie quand même si l'élève quitte la page juste après sa dernière évaluation.
  const pendingRef = useRef<{ sig: string; send: () => void } | null>(null);
  useEffect(() => {
    pendingRef.current = null;
    if (epreuve.status !== 'done' || sessionId === null || !onSaveScore || !isAuthenticated || total <= 0 || corrected <= 0) return;
    const score = Math.round(got * 100) / 100;
    const max = Math.round(total * 100) / 100;
    const sig = `${sessionId}:${score}/${max}`;
    if (sentRef.current === sig) return;
    const send = () => {
      pendingRef.current = null;
      sentRef.current = sig;
      onSaveScore(sessionId, score, max).catch(() => { sentRef.current = null; });
    };
    pendingRef.current = { sig, send };
    const t = window.setTimeout(send, 1200);
    return () => window.clearTimeout(t);
  }, [epreuve.status, sessionId, onSaveScore, isAuthenticated, got, total, corrected]);
  useEffect(() => () => {
    const p = pendingRef.current;
    if (p && sentRef.current !== p.sig) p.send();
  }, []);

  const felt = content.felt;
  const feltLabel = felt ? (felt.differs ? DIFFICULTY[felt.level]?.label : 'Comme annoncé') : null;

  const confirmFinish = () => { if (window.confirm('Terminer l’épreuve et passer à la correction ?')) epreuve.finish(); };
  const goTo = (id: string) => document.getElementById(`exam-part-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const levelName = content.class_levels?.[0]?.name;

  // ── Panneaux du rail (ordinateur : colonne de droite ; téléphone : au-dessus du sujet)
  const epreuvePanel = (
    <div className="rounded-2xl border border-line bg-white p-5" data-tour="examen-epreuve">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-faint">Épreuve</span>
        {sessionCount > 0 && (
          <button type="button" onClick={onOpenHistory} className="text-[12px] font-medium text-ink-faint hover:text-ink fd-nums">
            {sessionCount} passage{sessionCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {epreuve.status === 'idle' && (
        <>
          <p className="mt-2 text-[13.5px] text-ink-soft leading-relaxed">
            {durationMin
              ? <>Mets-toi en conditions : <b className="text-ink">{durationLabel(durationMin)}</b>, solutions masquées jusqu’à la fin.</>
              : <>Chronomètre-toi, solutions masquées jusqu’à la fin.</>}
          </p>
          <button type="button" onClick={epreuve.start} className="fd-btn-primary w-full justify-center mt-3.5" style={{ minHeight: 42 }}>
            <Play className="w-4 h-4" /> Commencer l’épreuve
          </button>
        </>
      )}

      {locked && (
        <>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`fd-nums font-semibold leading-none text-[30px] ${epreuve.status === 'paused' ? 'text-ink-faint' : 'text-ink'}`}>
              {clock(epreuve.remaining ?? epreuve.elapsed)}
            </span>
            <span className="text-[12px] text-ink-faint">{epreuve.remaining !== null ? 'restant' : 'écoulé'}{epreuve.status === 'paused' ? ' · en pause' : ''}</span>
          </div>
          {epreuve.remaining !== null && (
            <div className="mt-3 h-1.5 rounded-full bg-[#f2f1ee] overflow-hidden">
              <div className={`h-full rounded-full ${epreuve.remaining < 600 ? 'bg-gold' : 'bg-brand'}`}
                style={{ width: `${Math.min(100, (epreuve.elapsed / (durationMin * 60)) * 100)}%` }} />
            </div>
          )}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {epreuve.status === 'running'
              ? <button type="button" onClick={epreuve.pause} className="fd-btn-ghost justify-center"><Pause className="w-4 h-4" /> Pause</button>
              : <button type="button" onClick={epreuve.resume} className="fd-btn-ghost justify-center"><Play className="w-4 h-4" /> Reprendre</button>}
            <button type="button" onClick={confirmFinish}
              className="fd-btn-primary justify-center"><Flag className="w-4 h-4" /> Terminer</button>
          </div>
        </>
      )}

      {epreuve.status === 'done' && (
        <>
          <p className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-ink">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            {epreuve.timeUp ? 'Temps écoulé' : `Terminée en ${clock(epreuve.elapsed)}`}
          </p>
          <p className="mt-1 text-[13px] text-ink-faint leading-relaxed">
            À toi de corriger : ouvre la solution de chaque question et indique Réussi, En partie ou À revoir.
          </p>
          <button type="button" onClick={epreuve.reset} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-faint hover:text-ink">
            <RotateCcw className="w-3.5 h-3.5" /> Refaire l’épreuve
          </button>
        </>
      )}
    </div>
  );

  const copiePanel = !isAuthenticated ? (
    <SignupCard title="Obtiens ta note" benefits={false} tour="examen-copie"
      text="Avec un compte, tu t’évalues question par question et ta note estimée se calcule avec le barème, exercice par exercice." />
  ) : (
    <div className="rounded-2xl border border-line bg-white p-5" data-tour="examen-copie">
      <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-faint">Ta copie</span>
      {corrected > 0 ? (
        <>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="fd-display text-[34px] leading-none text-ink" style={{ fontWeight: 700 }}>{fmtPts(got)}</span>
            <span className="text-[16px] text-ink-faint fd-nums">/ {fmtPts(total)}</span>
            {total > 0 && total !== 20 && <span className="ml-auto text-[12px] text-ink-faint fd-nums">soit {fmtPts(Math.round((got / total) * 200) / 10)} / 20</span>}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-faint leading-snug">
            Note estimée d’après ton auto-évaluation{attemptStart ? ' de ce passage' : ''}{corrected < total ? `, sur ${fmtPts(corrected)} points corrigés` : ''}.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-ink-faint leading-relaxed">
          {attemptStart
            ? 'Corrige ce passage question par question (Réussi, En partie, À revoir) : ta note s’affiche ici.'
            : 'Après l’épreuve, évalue chaque question (Réussi, En partie, À revoir) : ta note estimée s’affiche ici.'}
        </p>
      )}

      {parts.length > 1 && (
        <ol className="mt-4 flex flex-col gap-1">
          {parts.map((p, i) => {
            const s = scores[i];
            return (
              <li key={p.id}>
                <button type="button" onClick={() => goTo(p.id)}
                  className="w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-[#f7f6f3] transition-colors">
                  <span className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-ink truncate">{plainTitle(p.titleHtml)}</span>
                    <span className="fd-nums text-ink-faint shrink-0">
                      {s.corrected > 0 ? <><b className="text-ink">{fmtPts(s.got)}</b> / {fmtPts(s.max)}</> : `${fmtPts(s.max)} pts`}
                    </span>
                  </span>
                  <span className="mt-1 block h-1 rounded-full bg-[#f2f1ee] overflow-hidden">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${s.count ? (s.assessed / s.count) * 100 : 0}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {questionCount > 0 && (
        <p className="mt-3 text-[12px] text-ink-faint fd-nums">{assessedCount} / {questionCount} questions corrigées</p>
      )}
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <div className="min-w-0 flex flex-col gap-5">
        {/* Téléphone : épreuve et copie avant le sujet ; compte à rebours collé en haut pendant l'épreuve. */}
        <div className="lg:hidden flex flex-col gap-4">
          {locked && (
            <div className="sticky top-[68px] z-20 -mx-1 pl-4 pr-1.5 py-1.5 rounded-xl border border-line bg-white/95 backdrop-blur flex items-center justify-between gap-2 shadow-sm">
              <span className="fd-nums font-semibold text-ink">{clock(epreuve.remaining ?? epreuve.elapsed)}</span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={epreuve.status === 'running' ? epreuve.pause : epreuve.resume}
                  className="h-9 px-3 rounded-lg text-[13px] font-medium text-ink-faint hover:bg-[#f2f1ee]">
                  {epreuve.status === 'running' ? 'Pause' : 'Reprendre'}
                </button>
                <button type="button" onClick={confirmFinish}
                  className="h-9 px-3 rounded-lg text-[13px] font-semibold text-brand-hover hover:bg-brand-soft">
                  Terminer
                </button>
              </span>
            </div>
          )}
          {epreuvePanel}
          {/* La copie (note, points) n'apparaît pas pendant l'épreuve. */}
          {!locked && (corrected > 0 || !isAuthenticated) && copiePanel}
        </div>

        {/* Le sujet : une seule feuille, la fiche en tête puis les exercices. */}
        <section className="rounded-2xl border border-line bg-white overflow-hidden">
          <div className="px-6 py-5 bg-[#fcfbf9] border-b border-line flex flex-wrap items-start justify-between gap-4" data-tour="examen-fiche">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
              {durationMin > 0 && <Fact label="Durée" value={durationLabel(durationMin)} />}
              {total > 0 && <Fact label="Barème" value={`${fmtPts(total)} points`} />}
              {parts.length > 0 && parts[0].id !== 'sujet' && <Fact label="Exercices" value={String(parts.length)} />}
              {levelName && <Fact label="Niveau" value={levelName} />}
              {content.is_national_exam && <Fact label="Session" value={`Bac national${content.national_year ? ` ${content.national_year}` : ''}`} />}
              {felt && feltLabel && <Fact label="Ressenti des élèves" value={feltLabel} title={feltTooltip(felt)} />}
            </dl>
            <div className="flex flex-col items-end gap-2.5 ml-auto">
            {votes}
            {solutionCount > 0 && (
              <button type="button" disabled={locked} onClick={() => {
                if (!showAll) { trackAction('toutes-solutions'); onSolutionOpen?.('*'); }
                setShowAll((v) => !v);
              }} data-tour="detail-solutions"
                title={locked ? 'Disponible à la fin de l’épreuve' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${
                  showAll && !locked ? 'bg-brand-soft text-brand-hover border-brand-line' : 'bg-white text-ink-soft border-line hover:border-ink'}`}>
                {showAll && !locked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showAll && !locked ? 'Masquer les solutions' : 'Toutes les solutions'}
              </button>
            )}
            </div>
          </div>
          {intro.length > 0 && (
            <div className="px-4 sm:px-7 py-5 border-b border-line">
              <ExerciseRenderer structure={{ version: structure?.version || '2.1', blocks: intro }} compact={false} locked={locked} />
            </div>
          )}
          {locked && (
            <p className="px-6 py-3 border-b border-line text-[13px] text-ink-soft bg-gold-soft/60 flex items-center gap-2">
              <Timer className="w-4 h-4 text-gold-strong shrink-0" />
              Épreuve en cours : compose sur une feuille. Les solutions s’afficheront à la fin.
            </p>
          )}

          {/* Exercices : un intertitre (titre, barème, tes points) et un trait entre deux exercices. */}
          {parts.map((p, i) => {
            const s = scores[i];
            return (
              <div key={p.id} id={`exam-part-${p.id}`} className={`scroll-mt-24 px-4 sm:px-7 pt-6 pb-7 ${i > 0 ? 'border-t border-line' : ''}`}>
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h2 className="fd-display text-[19px] text-ink min-w-0 [&_p]:m-0" dangerouslySetInnerHTML={{ __html: renderContentHtml(p.titleHtml) }} />
                  <span className="flex items-center gap-2 shrink-0">
                    {s.corrected > 0 && !locked && (
                      <span className="fd-nums text-[12.5px] font-semibold px-2.5 py-1 rounded-full bg-brand-soft text-brand-hover" title="Tes points (auto-évaluation)">
                        {fmtPts(s.got)} / {fmtPts(s.max)}
                      </span>
                    )}
                    {s.max > 0 && (
                      <span className="fd-nums text-[12.5px] font-semibold px-2.5 py-1 rounded-full bg-gold-soft text-gold-strong">
                        {fmtPts(s.max)} point{s.max > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </div>
                <ExerciseRenderer
                  structure={{ version: structure?.version || '2.1', blocks: p.blocks }}
                  progress={progressData}
                  onAssess={assessOne}
                  onAssessMany={assessMany}
                  assessOptions={EXAM_OPTIONS}
                  onSolutionOpen={onSolutionOpen}
                  interactive={isAuthenticated}
                  showAllSolutions={showAll}
                  compact={false}
                  locked={locked}
                  onReport={onReport}
                />
              </div>
            );
          })}
          {footer}
        </section>

        <AdSlot className="mt-1" />
      </div>

      <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
        {epreuvePanel}
        {!locked && copiePanel}
      </aside>
    </div>
  );
};

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <dt className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold text-ink fd-nums">{value}</dd>
      {/* Au toucher, pas d'infobulle : le détail est écrit dessous. */}
      {title && <dd className="mt-0.5 max-w-[220px] text-[11.5px] leading-snug text-ink-faint [@media(hover:hover)]:hidden">{title}</dd>}
    </div>
  );
}

export default ExamView;

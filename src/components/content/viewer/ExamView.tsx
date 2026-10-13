// Page d'un examen : présentée comme un vrai sujet, et pensée pour s'entraîner en conditions.
//   - Fiche du sujet : durée, barème, nombre d'exercices, niveau.
//   - Une seule feuille : la fiche en tête, puis les exercices séparés par un intertitre avec leur barème
//     (la numérotation repart à 1, comme sur papier).
//   - Épreuve : compte à rebours sur la durée du sujet ; solutions, auto-évaluation, copie et points
//     masqués jusqu'à la fin, puis le temps est enregistré (et la note du passage, une fois corrigé).
//   - Ta copie : note estimée d'après l'auto-évaluation (Réussi = tous les points, En partie = la
//     moitié, À revoir = 0), exercice par exercice. Aucun chiffre inventé : tout vient du barème et de
//     l'élève. Une épreuve refaite ne compte que les évaluations faites depuis son départ (comme le DS blanc).
// 11/10/2026 : la fiche porte l'action principale (« Lancer l'épreuve », puis « Terminée : à toi de
//   corriger ») ; la colonne de droite ne montre que le compte à rebours pendant l'épreuve, sinon ta copie
//   (qui sert aussi de sommaire). Sur téléphone, la copie passe après le sujet. Logique de l'épreuve inchangée.
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
  /** Une indication vient d'être ouverte (journal de « Ma progression »). */
  onHintOpen?: (path: string) => void;
  sessionCount: number;
  onOpenHistory: () => void;
  /** Pied de la feuille (j'aime, signaler une erreur). */
  footer?: React.ReactNode;
  /** Signaler une erreur sur une question précise. */
  onReport?: (path: string) => void;
  /** Épreuve en cours (vrai) ou non : la page cache ce qui détournerait de la copie (« Où en es-tu ? »). */
  onAttemptChange?: (running: boolean) => void;
  /** Sous la feuille, dans la colonne du sujet (« Tu as fini ? », pour continuer, discussion). */
  children?: React.ReactNode;
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
  onSaveSession, onSaveScore, onSolutionOpen, onHintOpen, sessionCount, onOpenHistory, footer, onReport, onAttemptChange, children,
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

  // ── Épreuve : lancement dans la fiche du sujet ; pendant l'épreuve, le compte à rebours (colonne de droite
  //    sur ordinateur, bandeau collé en haut sur téléphone).
  const clockLabel = clock(epreuve.remaining ?? epreuve.elapsed);
  const timerPanel = (
    <div className="rounded-2xl border border-line bg-white p-5" data-tour="examen-epreuve">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">Épreuve en cours</span>
        {epreuve.status === 'paused' && <span className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-semibold text-ink-faint">en pause</span>}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span role="timer" className={`fd-nums text-[32px] font-semibold leading-none ${epreuve.status === 'paused' ? 'text-ink-faint' : 'text-ink'}`}>{clockLabel}</span>
        <span className="text-[12px] text-ink-faint">{epreuve.remaining !== null ? 'restant' : 'écoulé'}</span>
      </div>
      {epreuve.remaining !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]">
          <div className={`h-full rounded-full ${epreuve.remaining < 600 ? 'bg-gold' : 'bg-brand'}`}
            style={{ width: `${Math.min(100, (epreuve.elapsed / (durationMin * 60)) * 100)}%` }} />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {epreuve.status === 'running'
          ? <button type="button" onClick={epreuve.pause} className="fd-btn-ghost min-h-10 justify-center"><Pause className="h-4 w-4" /> Pause</button>
          : <button type="button" onClick={epreuve.resume} className="fd-btn-ghost min-h-10 justify-center"><Play className="h-4 w-4" /> Reprendre</button>}
        <button type="button" onClick={confirmFinish} className="fd-btn-primary min-h-10 justify-center"><Flag className="h-4 w-4" /> Terminer</button>
      </div>
    </div>
  );

  const toggleAll = solutionCount > 0 && !locked ? (
    <button type="button" onClick={() => {
      if (!showAll) { trackAction('toutes-solutions'); onSolutionOpen?.('*'); }
      setShowAll((v) => !v);
    }} data-tour="detail-solutions" aria-pressed={showAll}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        showAll ? 'bg-brand-soft text-brand-hover' : 'border border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
      {showAll ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      {showAll ? 'Masquer le corrigé' : 'Tout le corrigé'}
    </button>
  ) : null;

  // Fiche, partie « épreuve » : une seule action principale à chaque moment.
  // Deux façons de travailler un sujet : en conditions (l'action principale) ou en lisant le corrigé.
  const epreuveBlock = epreuve.status === 'idle' ? (
    <div className="mt-5 border-t border-line pt-5" data-tour="examen-epreuve">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={epreuve.start} className="fd-btn-primary min-h-11 justify-center px-5 text-[14px]">
          <Play className="h-4 w-4" /> Lancer l’épreuve
        </button>
        {toggleAll}
      </div>
      <p className="mt-2.5 text-[13px] leading-snug text-ink-faint">
        {durationMin
          ? <>L’épreuve lance un compte à rebours de {durationLabel(durationMin)} ; les solutions restent cachées jusqu’à la fin.</>
          : <>L’épreuve lance un chronomètre ; les solutions restent cachées jusqu’à la fin.</>}
      </p>
    </div>
  ) : locked ? (
    <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[13.5px] leading-snug text-gold-strong">
      <Timer className="mt-px h-4 w-4 shrink-0" aria-hidden />
      <span><b className="font-semibold">Épreuve en cours.</b> Compose sur une feuille : les solutions s’afficheront à la fin.</span>
    </p>
  ) : (
    <div className="mt-5 rounded-xl border border-brand-line bg-brand-soft/60 px-4 py-3">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        {epreuve.timeUp ? 'Temps écoulé' : `Épreuve terminée en ${clock(epreuve.elapsed)}`}
        {corrected > 0 && (
          <a href="#ta-copie" className="ml-auto shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[12.5px] font-semibold text-brand-hover fd-nums fd-exam-narrow">
            {fmtPts(got)} / {fmtPts(total)}
          </a>
        )}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        À toi de corriger : ouvre la solution de chaque question et indique Réussi, En partie ou À revoir.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {toggleAll}
        <button type="button" onClick={epreuve.reset} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-[13px] font-medium text-ink-faint hover:text-ink">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Refaire l’épreuve
        </button>
      </div>
    </div>
  );

  const copiePanel = !isAuthenticated ? (
    <SignupCard title="Obtiens ta note" benefits={false} tour="examen-copie"
      text="Avec un compte, tu t’évalues question par question et ta note estimée se calcule avec le barème, exercice par exercice." />
  ) : (
    <div className="rounded-2xl border border-line bg-white p-5" data-tour="examen-copie">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">Ta copie</span>
        {sessionCount > 0 && (
          <button type="button" onClick={onOpenHistory} className="-my-2 min-h-10 text-[12.5px] font-medium text-ink-faint hover:text-ink fd-nums">
            {sessionCount} passage{sessionCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
      {corrected > 0 ? (
        <>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="fd-display text-[34px] leading-none text-ink" style={{ fontWeight: 700 }}>{fmtPts(got)}</span>
            <span className="text-[16px] text-ink-faint fd-nums">/ {fmtPts(total)}</span>
            {total > 0 && total !== 20 && <span className="ml-auto text-[12px] text-ink-faint fd-nums">soit {fmtPts(Math.round((got / total) * 200) / 10)} / 20</span>}
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
            Note estimée d’après ton auto-évaluation{attemptStart ? ' de ce passage' : ''}{corrected < total ? `, sur ${fmtPts(corrected)} points corrigés` : ''}.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
          {attemptStart
            ? 'Corrige ce passage question par question : ta note s’affiche ici.'
            : 'Après l’épreuve, ouvre chaque solution et dis si tu avais trouvé : ta note estimée s’affiche ici.'}
        </p>
      )}

      {parts.length > 1 && (
        <ol className="mt-4 flex flex-col gap-0.5 border-t border-line pt-3">
          {parts.map((p, i) => {
            const sc = scores[i];
            return (
              <li key={p.id}>
                <button type="button" onClick={() => goTo(p.id)}
                  className="-mx-2 w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#f7f6f3]">
                  <span className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium text-ink">{plainTitle(p.titleHtml)}</span>
                    <span className="shrink-0 text-ink-faint fd-nums">
                      {sc.corrected > 0 ? <><b className="text-ink">{fmtPts(sc.got)}</b> / {fmtPts(sc.max)}</> : `${fmtPts(sc.max)} pts`}
                    </span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#f2f1ee]">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${sc.count ? (sc.assessed / sc.count) * 100 : 0}%` }} />
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

  const noParts = parts.length === 1 && parts[0].id === 'sujet';
  return (
    // Deux colonnes seulement si la feuille garde la largeur du PDF (ReadingStyles : .fd-exam-*).
    <div className="fd-exam-layout">
    <div className="fd-exam-grid">
      <div className="fd-exam-main flex min-w-0 flex-col gap-8 sm:gap-10">
        <div>
          {/* Téléphone : compte à rebours collé en haut pendant l'épreuve. */}
          {locked && (
            <div className="sticky top-[68px] z-20 mb-3 flex items-center justify-between gap-2 rounded-2xl border border-line bg-white/95 py-1 pl-4 pr-1 shadow-[0_2px_10px_rgba(20,18,16,.06)] backdrop-blur fd-exam-narrow">
              <span className="flex items-baseline gap-1.5">
                <span role="timer" className={`text-[17px] font-semibold fd-nums ${epreuve.status === 'paused' ? 'text-ink-faint' : 'text-ink'}`}>{clockLabel}</span>
                <span className="text-[12px] text-ink-faint">{epreuve.status === 'paused' ? 'en pause' : epreuve.remaining !== null ? 'restant' : ''}</span>
              </span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={epreuve.status === 'running' ? epreuve.pause : epreuve.resume}
                  className="h-10 rounded-xl px-3 text-[13px] font-medium text-ink-soft hover:bg-[#f2f1ee]">
                  {epreuve.status === 'running' ? 'Pause' : 'Reprendre'}
                </button>
                <button type="button" onClick={confirmFinish} className="h-10 rounded-xl bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover">
                  Terminer
                </button>
              </span>
            </div>
          )}

          {/* Le sujet : une seule feuille, la fiche en tête (comme la copie distribuée en classe), puis les exercices. */}
          <section className="overflow-hidden rounded-2xl border border-line bg-white sm:rounded-3xl">
            <div className="border-b border-line bg-[#fcfbf9] px-4 py-5 sm:px-8 sm:py-6" data-tour="examen-fiche">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
                {durationMin > 0 && <Fact label="Durée" value={durationLabel(durationMin)} />}
                {total > 0 && <Fact label="Barème" value={`${fmtPts(total)} points`} />}
                {!noParts && parts.length > 0 && <Fact label="Exercices" value={String(parts.length)} />}
                {levelName && <Fact label="Niveau" value={levelName} />}
                {content.is_national_exam && <Fact label="Session" value={`Bac ${content.national_year ?? 'national'}`} />}
                {felt && feltLabel && <Fact label="Ressenti des élèves" value={feltLabel} title={feltTooltip(felt)} />}
              </dl>
              {epreuveBlock}
            </div>
            {intro.length > 0 && (
              <div className="border-b border-line px-4 py-5 text-[14.5px] sm:px-8">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">Consignes</p>
                <ExerciseRenderer structure={{ version: structure?.version || '2.1', blocks: intro }} compact={false} locked={locked} variant="reading" />
              </div>
            )}

            {/* Exercices : un intertitre (titre, barème, tes points) et un trait entre deux exercices. */}
            {parts.map((p, i) => {
              const sc = scores[i];
              const heading = !(noParts && !sc.max);
              return (
                <div key={p.id} id={`exam-part-${p.id}`} className={`scroll-mt-24 px-4 pb-9 sm:px-8 sm:pb-10 ${heading ? 'pt-7 sm:pt-8' : 'pt-6 sm:pt-8'} ${i > 0 ? 'border-t border-line' : ''}`}>
                  {heading && (
                    <div className="mb-5 flex items-baseline justify-between gap-3">
                      <h2 className="fd-paper min-w-0 text-[20px] font-bold leading-snug text-ink [&_p]:m-0" dangerouslySetInnerHTML={{ __html: renderContentHtml(p.titleHtml) }} />
                      <span className="flex shrink-0 items-center gap-1.5">
                        {sc.corrected > 0 && !locked && (
                          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[12.5px] font-semibold text-brand-hover fd-nums" title="Tes points (auto-évaluation)">
                            {fmtPts(sc.got)} / {fmtPts(sc.max)}
                          </span>
                        )}
                        {sc.max > 0 && (
                          <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[12.5px] font-semibold text-gold-strong fd-nums">
                            {fmtPts(sc.max)} pt{sc.max > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <ExerciseRenderer
                    structure={{ version: structure?.version || '2.1', blocks: p.blocks }}
                    progress={progressData}
                    onAssess={assessOne}
                    onAssessMany={assessMany}
                    assessOptions={EXAM_OPTIONS}
                    onSolutionOpen={onSolutionOpen}
                    onHintOpen={onHintOpen}
                    interactive={isAuthenticated}
                    showAllSolutions={showAll}
                    compact={false}
                    variant="reading"
                    locked={locked}
                    onReport={onReport}
                  />
                </div>
              );
            })}
            {footer}
          </section>
        </div>

        {/* Téléphone : la copie (note, barème par exercice) après le sujet, dès qu'il y a une note (pas pendant l'épreuve). */}
        {!locked && (corrected > 0 || !isAuthenticated) && <div id="ta-copie" className="scroll-mt-24 fd-exam-narrow">{copiePanel}</div>}
        {/* Pas d’annonce pendant une épreuve chronométrée. */}
        {!locked && <AdSlot />}
        {children}
      </div>

      <aside className="fd-exam-aside sticky top-20 flex-col gap-4">
        {locked ? timerPanel : copiePanel}
      </aside>
    </div>
    </div>
  );
};

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title} className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[16px] font-semibold text-ink fd-nums">{value}</dd>
      {/* Au toucher, pas d'infobulle : le détail est écrit dessous. */}
      {title && <dd className="mt-0.5 max-w-[220px] text-[11.5px] leading-snug text-ink-faint [@media(hover:hover)]:hidden">{title}</dd>}
    </div>
  );
}

export default ExamView;

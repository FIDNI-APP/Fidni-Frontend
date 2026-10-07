// Page d'un examen : présentée comme un vrai sujet, et pensée pour s'entraîner en conditions.
//   - Fiche du sujet : durée, barème, nombre d'exercices, niveau.
//   - Une seule feuille : la fiche en tête, puis les exercices séparés par un intertitre avec leur barème
//     (la numérotation repart à 1, comme sur papier).
//   - Épreuve : compte à rebours sur la durée du sujet ; solutions et auto-évaluation masquées
//     jusqu'à la fin, puis le temps est enregistré.
//   - Ta copie : note estimée d'après l'auto-évaluation (réussi = tous les points, partiel = la
//     moitié), exercice par exercice. Aucun chiffre inventé : tout vient du barème et de l'élève.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Flag, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { AssessmentStatus, ContentExam } from '@/types/content';
import type { ExerciseBlock, FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { AdSlot } from '@/components/ads/AdSlot';
import ExerciseRenderer, { type AssessChanges } from './ExerciseRenderer';
import { SignupCard } from '@/components/auth/SignupPrompt';
import { trackAction } from '@/lib/usage';

interface Props {
  content: ContentExam;
  isAuthenticated: boolean;
  questionProgress?: Record<string, AssessmentStatus>;
  onQuestionAssess?: (path: string, status: AssessmentStatus) => void;
  onAssessMany?: (changes: AssessChanges) => void;
  onSaveSession?: (seconds: number) => Promise<void>;
  sessionCount: number;
  onOpenHistory: () => void;
  /** Votes, affichés en haut à droite de la fiche du sujet. */
  votes?: React.ReactNode;
  /** Bas de la fiche (signaler une erreur). */
  footer?: React.ReactNode;
  /** Signaler une erreur sur une question précise. */
  onReport?: (path: string) => void;
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
interface EpreuveState { status: EpreuveStatus; elapsed: number; startedAt: number | null; auto?: boolean }

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
    const done: EpreuveState = { status: 'done', elapsed: seconds, startedAt: null, auto };
    stateRef.current = done;
    setState(done);
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
    start: () => { setNow(Date.now()); setState({ status: 'running', elapsed: 0, startedAt: Date.now() }); },
    pause: () => setState((s) => (s.status === 'running' && s.startedAt ? { status: 'paused', elapsed: s.elapsed + (Date.now() - s.startedAt) / 1000, startedAt: null } : s)),
    resume: () => { setNow(Date.now()); setState((s) => (s.status === 'paused' ? { ...s, status: 'running', startedAt: Date.now() } : s)); },
    finish: () => finish(false),
    reset: () => setState({ status: 'idle', elapsed: 0, startedAt: null }),
  };
}

// ───────────────────────────── Vue

export const ExamView: React.FC<Props> = ({
  content, isAuthenticated, questionProgress, onQuestionAssess, onAssessMany,
  onSaveSession, sessionCount, onOpenHistory, votes, footer, onReport,
}) => {
  const structure = content.structure as unknown as FlexibleExerciseStructure | undefined;
  const { intro, parts } = useMemo(() => splitExam(structure), [structure]);
  const durationMin = Number(content.duration_minutes) || 0;
  const [showAll, setShowAll] = useState(false);

  const epreuve = useEpreuve(content.id, durationMin, (seconds) => {
    if (isAuthenticated && seconds > 0) onSaveSession?.(seconds).catch(() => {});
  });
  const locked = epreuve.status === 'running' || epreuve.status === 'paused';

  // Barème et note estimée, exercice par exercice.
  const scores = useMemo(() => parts.map((p) => {
    const max = p.questions.reduce((s, q) => s + q.points, 0);
    let got = 0, corrected = 0, assessed = 0;
    for (const q of p.questions) {
      const st = questionProgress?.[q.path];
      if (!st) continue;
      assessed++;
      corrected += q.points;
      got += q.points * (WEIGHT[st] ?? 0);
    }
    return { id: p.id, max: max || p.declared, questionMax: max, got, corrected, assessed, count: p.questions.length };
  }), [parts, questionProgress]);
  const total = scores.reduce((s, x) => s + x.max, 0);
  const got = scores.reduce((s, x) => s + x.got, 0);
  const corrected = scores.reduce((s, x) => s + x.corrected, 0);
  const questionCount = scores.reduce((s, x) => s + x.count, 0);
  const assessedCount = scores.reduce((s, x) => s + x.assessed, 0);
  const solutionCount = useMemo(() => parts.reduce((n, p) => n + p.blocks.reduce((m, b) =>
    m + (b.subQuestions?.length ? b.subQuestions.filter((sq) => sq.solution?.html).length : b.solution?.html ? 1 : 0), 0), 0), [parts]);

  const progressData = questionProgress
    ? Object.fromEntries(Object.entries(questionProgress).map(([path, status]) => [path, {
      status, assessed_at: new Date().toISOString(),
    }]))
    : undefined;

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
            <button type="button" onClick={() => { if (window.confirm('Terminer l’épreuve et passer à la correction ?')) epreuve.finish(); }}
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
            À toi de corriger : ouvre la solution de chaque question et indique si tu l’as réussie.
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
            Note estimée d’après ton auto-évaluation{corrected < total ? `, sur ${fmtPts(corrected)} points corrigés` : ''}.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-ink-faint leading-relaxed">
          Après l’épreuve, évalue chaque question (réussi, partiel…) : ta note estimée s’affiche ici.
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
            <div className="sticky top-[68px] z-20 -mx-1 px-4 py-2.5 rounded-xl border border-line bg-white/95 backdrop-blur flex items-center justify-between shadow-sm">
              <span className="fd-nums font-semibold text-ink">{clock(epreuve.remaining ?? epreuve.elapsed)}</span>
              <button type="button" onClick={epreuve.status === 'running' ? epreuve.pause : epreuve.resume} className="text-[13px] font-medium text-ink-faint">
                {epreuve.status === 'running' ? 'Pause' : 'Reprendre'}
              </button>
            </div>
          )}
          {epreuvePanel}
          {(corrected > 0 || !isAuthenticated) && copiePanel}
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
            </dl>
            <div className="flex flex-col items-end gap-2.5 ml-auto">
            {votes}
            {solutionCount > 0 && (
              <button type="button" disabled={locked} onClick={() => { if (!showAll) trackAction('toutes-solutions'); setShowAll((v) => !v); }} data-tour="detail-solutions"
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
                    {s.corrected > 0 && (
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
                  onAssess={onQuestionAssess}
                  onAssessMany={onAssessMany}
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
        {copiePanel}
      </aside>
    </div>
  );
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold text-ink fd-nums">{value}</dd>
    </div>
  );
}

export default ExamView;

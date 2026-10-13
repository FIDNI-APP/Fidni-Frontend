// Une ligne de quiz : le chapitre, son dernier score (ou la durée), « Passer » ou « Refaire ». 14/10/2026 : un quiz
// commencé se reprend (« Reprendre ») ; un quiz passé rouvre son dernier résultat (clic sur la ligne, `onView`).
import React from 'react';
import { Brain, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { RING, estMinutes, frDate, pct, previousPct, quizSize, type QuizEnCours, type SkillAssessment } from './types';

/** Petit anneau du dernier score (hors .fd-card : la règle CSS des cartes forcerait le vert). */
export const ScoreRing: React.FC<{ value: number; size?: number }> = ({ value, size = 44 }) => (
  <ProgressRing percentage={value} size={size} strokeWidth={4} trackColor={RING.track} progressColor={value >= 50 ? RING.good : RING.low}>
    <span className="fd-nums text-[12px] font-bold text-ink">{value}<span className="sr-only"> %</span></span>
  </ProgressRing>
);

/** Écart avec le passage précédent (« +20 pts »), rien au premier passage. */
export const Delta: React.FC<{ a: SkillAssessment; long?: boolean; className?: string }> = ({ a, long = false, className = '' }) => {
  const before = previousPct(a);
  if (before === null) return null;
  const d = pct(a) - before;
  const tone = d > 0 ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft';
  const text = d === 0 ? (long ? 'Même score que la dernière fois' : '=')
    : `${d > 0 ? '+' : '−'}${Math.abs(d)} pt${Math.abs(d) > 1 ? 's' : ''}${long ? ' depuis la dernière fois' : ''}`;
  return (
    <span className={`fd-nums inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${tone} ${className}`}
      title={`Avant : ${before} %`}>
      {text}<span className="sr-only"> (avant : {before} %)</span>
    </span>
  );
};

/** Étiquette « Nouveau » : quiz sorti il y a moins de 14 jours, pas encore passé. */
export const NewBadge: React.FC = () => (
  <span className="inline-flex items-center rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.06em] text-white">Nouveau</span>
);

export const QuizRow: React.FC<{
  name: string;
  ready: number;
  taken: SkillAssessment | null;
  isNew?: boolean;
  /** Passage commencé, pas encore envoyé : « Reprendre ». */
  enCours?: QuizEnCours | null;
  onStart: () => void;
  /** Rouvrir le dernier résultat (quiz déjà passé). */
  onView?: () => void;
}> = ({ name, ready, taken, isNew = false, enCours = null, onStart, onView }) => {
  const score = taken ? pct(taken) : null;
  const view = taken && onView ? onView : null;
  const body = (
    <>
      {score !== null ? <ScoreRing value={score} /> : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f7f6f3] text-ink-faint ring-1 ring-line" aria-hidden>
          <Brain className="h-[18px] w-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold leading-snug text-ink">{name}{isNew && <NewBadge />}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-faint">
          {enCours ? (
            <span className="fd-nums font-medium text-gold-strong">Commencé · {enCours.repondues}/{enCours.total} corrigées</span>
          ) : taken ? (
            <>
              <span>Fait le {frDate(taken.completed_at)}</span>
              <Delta a={taken} />
              {view && <span className="font-medium text-ink-soft">· Voir mon résultat</span>}
            </>
          ) : <span className="fd-nums">{quizSize(ready)} questions · {estMinutes(ready)} min</span>}
        </span>
      </span>
      {view && <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-faint sm:block" aria-hidden />}
    </>
  );
  const label = enCours ? 'Reprendre' : taken ? 'Refaire' : 'Passer';
  return (
    <li className="flex min-h-16 items-center gap-2 px-2 py-2 sm:px-3">
      {view ? (
        <button type="button" onClick={view} aria-label={`Voir mon dernier résultat au quiz « ${name} »`}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          {body}
        </button>
      ) : <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1">{body}</div>}
      <button type="button" onClick={onStart} className={`${enCours ? 'fd-btn-primary' : 'fd-btn-ghost'} min-h-10 shrink-0 text-[13px]`}
        aria-label={`${label} le quiz « ${name} »`}>
        {enCours ? <Play className="hidden h-4 w-4 sm:block" aria-hidden /> : taken ? <RotateCcw className="hidden h-4 w-4 sm:block" aria-hidden />
          : <Play className="hidden h-4 w-4 sm:block" aria-hidden />}
        {label}
      </button>
    </li>
  );
};

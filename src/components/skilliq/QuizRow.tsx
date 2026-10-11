// Une ligne de quiz : le chapitre, son dernier score (ou la durée), « Passer » ou « Refaire ».
import React from 'react';
import { Brain, Play, RotateCcw } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { RING, estMinutes, frDate, pct, previousPct, quizSize, type SkillAssessment } from './types';

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

export const QuizRow: React.FC<{
  name: string;
  ready: number;
  taken: SkillAssessment | null;
  onStart: () => void;
}> = ({ name, ready, taken, onStart }) => {
  const score = taken ? pct(taken) : null;
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">
      {score !== null ? <ScoreRing value={score} /> : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f7f6f3] text-ink-faint ring-1 ring-line" aria-hidden>
          <Brain className="h-[18px] w-[18px]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold leading-snug text-ink">{name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-faint">
          {taken ? (
            <>
              <span>Fait le {frDate(taken.completed_at)}</span>
              <Delta a={taken} />
            </>
          ) : <span className="fd-nums">{quizSize(ready)} questions · {estMinutes(ready)} min</span>}
        </p>
      </div>
      <button type="button" onClick={onStart} className="fd-btn-ghost min-h-10 shrink-0 text-[13px]"
        aria-label={`${taken ? 'Refaire' : 'Passer'} le quiz « ${name} »`}>
        {taken ? <RotateCcw className="hidden h-4 w-4 sm:block" aria-hidden /> : <Play className="hidden h-4 w-4 sm:block" aria-hidden />}
        {taken ? 'Refaire' : 'Passer'}
      </button>
    </li>
  );
};

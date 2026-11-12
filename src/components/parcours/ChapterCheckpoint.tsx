/**
 * Parcours : un chapitre sur la carte (point du chemin + son libellé). Quatre états : terminé (or plein), en cours
 * (prochain checkpoint, bordure or), accessible, verrouillé (gris, non cliquable). Le libellé se place du côté libre
 * du chemin (calculé par ChapterMap).
 */
import React from 'react';
import { Check, Lock } from 'lucide-react';
import { t } from '@/i18n';
import { type ChapterStep, chapterSeconds, formatDuration } from './progression';

export const STATE_LABEL: Record<ChapterStep['state'], string> = {
  completed: 'Terminé', current: 'En cours', available: 'Accessible', locked: 'Verrouillé',
};

const NODE: Record<ChapterStep['state'], string> = {
  completed: 'bg-gold text-white border-gold',
  current: 'bg-white text-ink border-gold shadow-[0_0_0_6px_rgb(var(--c-gold-soft))]',
  available: 'bg-white text-ink-soft border-[#d8d4cc] group-hover:border-ink',
  locked: 'bg-[#f2f1ee] text-ink-faint border-line',
};

export const ChapterCheckpoint: React.FC<{
  step: ChapterStep;
  x: number;
  y: number;
  size: number;
  side: 'left' | 'right';
  labelWidth: number;
  selected: boolean;
  justDone: boolean;
  onSelect: () => void;
}> = ({ step, x, y, size, side, labelWidth, selected, justDone, onSelect }) => {
  const { state, chapter, index, empty } = step;
  const locked = state === 'locked';
  const seconds = chapterSeconds(chapter);
  const meta = [
    empty ? t('Bientôt') : chapter.videos.length > 1 ? t('{n} vidéos', { n: chapter.videos.length }) : t('{n} vidéo', { n: chapter.videos.length }),
    seconds ? formatDuration(seconds) : null,
  ].filter(Boolean).join(' · ');
  const status = empty ? null
    : state === 'current' ? (step.percent > 0 ? t('En cours · {n} %', { n: step.percent }) : t('Prochaine étape'))
      : t(STATE_LABEL[state]);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-pressed={selected}
      aria-label={`${t('Chapitre {n}', { n: index + 1 })} : ${chapter.title}. ${status ?? t('Bientôt')}`}
      className={`fd-parcours-point group absolute flex items-center gap-3 text-start focus:outline-none disabled:cursor-not-allowed ${
        side === 'left' ? 'flex-row-reverse' : ''}`}
      style={{
        top: y - size / 2,
        ...(side === 'right' ? { left: x - size / 2 } : { right: `calc(100% - ${x + size / 2}px)` }),
      }}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-semibold transition-[border-color,background-color,box-shadow] duration-200 fd-nums group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 ${NODE[state]} ${
          selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''} ${justDone ? 'fd-parcours-valide' : ''}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {state === 'completed' ? <Check className="h-5 w-5" strokeWidth={2.5} /> : locked ? <Lock className="h-4 w-4" /> : index + 1}
      </span>
      <span dir="auto" className={`min-w-0 ${side === 'left' ? 'text-end' : ''}`} style={{ width: labelWidth }}>
        <span className={`line-clamp-3 block text-[14.5px] leading-snug ${selected ? 'font-semibold text-ink' : locked ? 'font-medium text-ink-faint' : 'font-medium text-ink group-hover:text-ink'}`}>
          {chapter.title}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-ink-faint fd-nums">
          {meta}
          {status && <> · <span className={state === 'current' ? 'font-medium text-gold-strong' : state === 'completed' ? 'text-gold-strong' : ''}>{status}</span></>}
        </span>
      </span>
    </button>
  );
};

export default ChapterCheckpoint;

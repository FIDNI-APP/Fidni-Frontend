/**
 * Parcours : une vidéo du chapitre (parcours secondaire). Titre, durée, état, progression éventuelle, et l'action :
 * « Lancer », « Reprendre » ou « Revoir » (lecteur existant, qui enregistre la progression). Verrouillée tant que la
 * précédente n'est pas terminée. Le trait vertical relie les vidéos ; il est en or jusqu'à la dernière terminée.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, Play, RotateCcw } from 'lucide-react';
import { t } from '@/i18n';
import { videoUrl, type Id } from '@/lib/api/parcoursApi';
import { type VideoStep, formatDuration } from './progression';

const NODE: Record<VideoStep['state'], string> = {
  completed: 'bg-gold border-gold text-white',
  current: 'bg-white border-gold text-gold-strong',
  available: 'bg-white border-[#d8d4cc] text-ink-soft',
  locked: 'bg-[#f2f1ee] border-line text-ink-faint',
};

export const VideoCheckpoint: React.FC<{
  step: VideoStep;
  pathId: Id;
  chapterId: Id;
  last: boolean;
  justDone: boolean;
}> = ({ step, pathId, chapterId, last, justDone }) => {
  const { video, state, percent, index } = step;
  const started = percent > 0 && state !== 'completed';
  const to = videoUrl(pathId, chapterId, video.id);
  const action = state === 'completed' ? t('Revoir') : started ? t('Reprendre') : t('Lancer');
  const duration = formatDuration(video.duration_seconds) || video.duration;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Trait vers la vidéo suivante. */}
      {!last && (
        <span aria-hidden className={`absolute start-[13px] top-8 bottom-0 w-0.5 rounded-full ${state === 'completed' ? 'bg-gold' : 'bg-line'}`} />
      )}
      <span aria-hidden className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-semibold fd-nums ${NODE[state]} ${justDone ? 'fd-parcours-valide' : ''}`}>
        {state === 'completed' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : state === 'locked' ? <Lock className="h-3 w-3" /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <p dir="auto" className={`text-[14.5px] font-medium leading-snug ${state === 'locked' ? 'text-ink-faint' : 'text-ink'}`}>{video.title}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-faint fd-nums">
              {duration}
              {state === 'completed' && <> · <span className="text-gold-strong">{t('Terminée')}</span></>}
              {started && <> · {t('{n} % vus', { n: percent })}</>}
              {state === 'locked' && <> · {t('Après la vidéo précédente')}</>}
            </p>
          </div>
          {state !== 'locked' && (
            <Link to={to}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-colors ${
                state === 'current' ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-[#f2f1ee] text-ink hover:bg-[#e7e3dc]'}`}
              aria-label={`${action} : ${video.title}`}>
              {state === 'completed' ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
              {action}
            </Link>
          )}
        </div>
        {started && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#efece6]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
            aria-label={t('Progression de la vidéo')}>
            <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </li>
  );
};

export default VideoCheckpoint;

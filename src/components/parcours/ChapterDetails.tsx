/**
 * Parcours : le chapitre choisi sur la carte — son avancement, ses vidéos (checkpoints secondaires) et, s'il en a,
 * le quiz de fin de chapitre. Un chapitre verrouillé dit ce qu'il reste à terminer ; un chapitre vide, qu'il arrive.
 * Changement de chapitre : léger fondu (désactivé avec prefers-reduced-motion).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardCheck, Lock } from 'lucide-react';
import { t } from '@/i18n';
import { quizUrl, type Id } from '@/lib/api/parcoursApi';
import { type ChapterStep, chapterSeconds, formatDuration } from './progression';
import { VideoCheckpoint } from './VideoCheckpoint';
import { STATE_LABEL } from './ChapterCheckpoint';

export const ChapterDetails: React.FC<{
  step: ChapterStep;
  pathId: Id;
  previous: ChapterStep | null;
  justDone: ReadonlySet<string>;
}> = ({ step, pathId, previous, justDone }) => {
  const { chapter, state, index, empty } = step;
  const seconds = chapterSeconds(chapter);
  const quiz = chapter.quiz;

  return (
    <section key={String(chapter.id)} aria-labelledby="parcours-chapitre-titre" className="fd-card fd-parcours-panneau p-5 sm:p-6">
      <p className="text-[13px] text-ink-faint fd-nums">
        {t('Chapitre {n}', { n: index + 1 })}
        {!empty && <> · {t(STATE_LABEL[state])}</>}
      </p>
      <h2 id="parcours-chapitre-titre" dir="auto" className="fd-display mt-1 text-[22px] leading-tight text-ink">{chapter.title}</h2>
      {!empty && (
        <p className="mt-1.5 text-[13px] text-ink-faint fd-nums">
          {chapter.videos.length > 1 ? t('{n} vidéos', { n: chapter.videos.length }) : t('{n} vidéo', { n: chapter.videos.length })}
          {seconds > 0 && <> · {formatDuration(seconds)}</>}
          {quiz && <> · {t('un quiz')}</>}
        </p>
      )}
      {chapter.description && <p dir="auto" className="mt-3 text-[14px] leading-relaxed text-ink-soft">{chapter.description}</p>}

      {!empty && state !== 'locked' && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[12.5px] text-ink-faint fd-nums">
            <span>{t('{n} sur {total} vidéos', { n: step.doneVideos, total: chapter.videos.length })}</span>
            <span className="font-semibold text-ink">{step.percent} %</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efece6]">
            <div className="h-full rounded-full bg-gold" style={{ width: `${step.percent}%` }} />
          </div>
        </div>
      )}

      {state === 'locked' && previous && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f7f6f3] px-3.5 py-3 text-[13.5px] text-ink-soft">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <span>{t('Termine « {titre} » pour ouvrir ce chapitre.', { titre: previous.chapter.title })}</span>
        </p>
      )}

      {empty ? (
        <p className="mt-4 rounded-xl bg-[#f7f6f3] px-3.5 py-3 text-[13.5px] text-ink-soft">{t('Les vidéos de ce chapitre arrivent bientôt.')}</p>
      ) : (
        <ol className="mt-5" aria-label={t('Vidéos du chapitre')}>
          {step.videos.map((v, i) => (
            <VideoCheckpoint key={String(v.video.id)} step={v} pathId={pathId} chapterId={chapter.id}
              last={i === step.videos.length - 1 && !quiz} justDone={justDone.has(`v${String(v.video.id)}`)} />
          ))}
          {quiz && (
            <li className="relative flex gap-3">
              <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                step.quizPassed ? 'border-gold bg-gold text-white' : step.quizDue ? 'border-gold bg-white text-gold-strong' : 'border-line bg-[#f2f1ee] text-ink-faint'}`}>
                {step.quizPassed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.quizDue ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p dir="auto" className={`text-[14.5px] font-medium leading-snug ${step.quizPassed || step.quizDue ? 'text-ink' : 'text-ink-faint'}`}>{quiz.title || t('Quiz de fin de chapitre')}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-faint fd-nums">
                    {step.quizPassed ? <span className="text-gold-strong">{t('Réussi')}</span>
                      : step.quizDue ? t('Réussir avec {n} % au moins', { n: quiz.passing_score })
                        : t('Après les vidéos du chapitre')}
                  </p>
                </div>
                {(step.quizDue || step.quizPassed) && (
                  <Link to={quizUrl(pathId, chapter.id)}
                    className={`inline-flex min-h-9 shrink-0 items-center rounded-[10px] px-3 text-[13px] font-semibold transition-colors ${
                      step.quizDue ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-[#f2f1ee] text-ink hover:bg-[#e7e3dc]'}`}>
                    {step.quizDue ? t('Passer le quiz') : t('Refaire')}
                  </Link>
                )}
              </div>
            </li>
          )}
        </ol>
      )}
    </section>
  );
};

export default ChapterDetails;

// Aucun quiz prêt pour le niveau de l'élève (le cas de la production au 11/10/2026) : une page honnête et utile.
// Ce que seront les quiz, en une phrase, puis de quoi travailler tout de suite : les exercices du chapitre
// le plus fragile (d'après Ma progression), et sa progression. Pas de tuiles à zéro ni de cartes « en préparation ».
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleDashed, Dumbbell, GraduationCap, Hourglass, LineChart, Target } from 'lucide-react';
import { EmptyState } from '@/components/space/Page';
import { practiceUrl } from '@/pages/progression/links';
import { ChapterPlan } from './ChapterPlan';
import type { QuizChapter } from './types';
import { t } from '@/i18n';

export interface Fragile { id: number; name: string; hub_url: string | null; status: string }

export const ComingSoon: React.FC<{
  variant: 'student' | 'teacher' | 'no-level';
  fragile: Fragile | null;
  /** Exercices du niveau de l'élève (repli sans chapitre fragile). */
  exercisesHref: string;
  chapters: QuizChapter[];
  levelName: string | null;
  username: string | null;
  /** Un bandeau plus précis est affiché au-dessus (lien vers un quiz pas encore prêt) : cet état se fait discret. */
  quiet?: boolean;
}> = ({ variant, fragile, exercisesHref, chapters, levelName, username, quiet = false }) => {
  const student = variant !== 'teacher';
  const practice = variant === 'student' && fragile
    ? { to: practiceUrl(fragile.hub_url, fragile.id), label: t('S’entraîner sur mon chapitre le plus fragile') }
    : variant === 'student' ? { to: exercisesHref, label: t('S’entraîner sur mon niveau') }
      : { to: '/exercises', label: t('Voir les exercices') };
  const weak = fragile?.status === 'weak';

  return (
    <div className="flex flex-col gap-3">
      <EmptyState
        tone="gold"
        icon={Hourglass}
        compact={quiet}
        title={<span className="block text-balance">{t('Les quiz par chapitre arrivent bientôt')}</span>}
        text={(
          <>
            <span className="block text-balance">
              {student
                ? t('Pour chaque chapitre, des questions chronométrées et corrigées pour mesurer ta maîtrise, théorème par théorème. En attendant, le meilleur entraînement reste les exercices.')
                : t('Pour chaque chapitre, des questions corrigées pour que tes élèves mesurent leur maîtrise. En attendant, les exercices corrigés sont là.')}
            </span>
            {variant === 'student' && fragile && (
              <span className="mt-4 flex justify-center">
                <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] ring-1 ${
                  weak ? 'bg-gold-soft text-gold-strong ring-gold-line' : 'bg-[#f7f6f3] text-ink-soft ring-line'}`}>
                  {weak ? <Target className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  <span className="truncate">{weak ? t('À renforcer') : t('Commencé')} : <b className="font-semibold">{fragile.name}</b></span>
                </span>
              </span>
            )}
          </>
        )}
        action={(
          <Link to={practice.to} className={`${quiet ? 'fd-btn-ghost text-[13px]' : 'fd-btn-primary'} min-h-11 w-full justify-center text-center sm:w-auto`}>
            <Dumbbell className="h-4 w-4 shrink-0" aria-hidden /> {practice.label} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        )}
        secondary={variant === 'student' ? (
          <Link to="/progression" className="fd-btn-ghost min-h-11 w-full justify-center text-[13px] sm:w-auto">
            <LineChart className="h-4 w-4" aria-hidden /> {t('Voir ma progression')}
          </Link>
        ) : variant === 'no-level' && username ? (
          // Le niveau se règle dans « Modifier mon profil », section Scolarité (pas dans les Paramètres).
          <Link to={`/profile/${encodeURIComponent(username)}/edit#scolarite`} className="fd-btn-ghost min-h-11 w-full justify-center text-[13px] sm:w-auto">
            <GraduationCap className="h-4 w-4" aria-hidden /> {t('Indiquer mon niveau')}
          </Link>
        ) : undefined}
      />

      {variant === 'student' && chapters.length > 0 && (
        <ChapterPlan title={t('Chapitres prévus')} meta={levelName} chapters={chapters} />
      )}
    </div>
  );
};

// « Tes premiers pas » (nouvel élève, refonte du 11/10/2026) : trois pas faisables dès aujourd'hui, cochés
// d'après les données déjà là. Pas de quiz de chapitre : aucun n'est prêt en production.
// Le premier pas non fait porte le bouton vert (data-tour="home-reprendre"), les autres un bouton discret.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, Check, GraduationCap } from 'lucide-react';
import type { DashboardOverview as Overview, RecommendedItem } from '@/lib/api/dashboardApi';
import { DIFFICULTY } from '@/components/content/listing/listingUtils';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';
import type { FirstStep, StepKey } from './home';

export const FirstSteps: React.FC<{
  steps: FirstStep[];
  data: Overview;
  /** Exercice proposé pour le premier exercice (null : la page des exercices du niveau). */
  exercise: RecommendedItem | null;
  /** Où indiquer son niveau (/complete-profile, ou la modification du profil). */
  levelLink: string;
  onAnnounce: () => void;
}> = ({ steps, data, exercise, levelLink, onAnnounce }) => {
  const current = steps.find((x) => !x.done)?.key;
  const done = steps.filter((x) => x.done).length;
  const exercisesHub = data.level_hub_url ?? '/exercises';
  const btn = (key: StepKey) => (key === current
    ? 'fd-btn-primary min-h-11 justify-center text-[13.5px]'
    : 'fd-btn-ghost min-h-10 justify-center text-[13px] font-semibold');
  const tour = (key: StepKey) => (key === current ? { 'data-tour': 'home-reprendre' } : {});

  const content: Record<StepKey, { title: string; text: React.ReactNode; cta: React.ReactNode }> = {
    niveau: {
      title: t('Indique ton niveau'),
      text: data.level
        ? <>{t('Ton niveau :')} <b className="font-semibold text-ink-soft">{data.level.name}</b>.</>
        : t('Tronc commun, 1re ou 2e Bac : on te montre les contenus de ta classe.'),
      cta: (
        <Link to={levelLink} className={btn('niveau')} {...tour('niveau')}>
          <GraduationCap className="h-4 w-4" /> {t('Indiquer mon niveau')}
        </Link>
      ),
    },
    exercice: {
      title: t('Ouvre ton premier exercice'),
      text: (
        <>
          {exercise && (
            <>{t('Proposé :')} <b className="font-semibold text-ink-soft">{exercise.title}</b>
              {exercise.difficulty && DIFFICULTY[exercise.difficulty] ? ` (${t(DIFFICULTY[exercise.difficulty].label).toLowerCase()})` : ''}. </>
          )}
          {t('Sous chaque question, dis si tu l’as réussie : ton accueil se remplit au fil de ton travail.')}
        </>
      ),
      cta: (
        <Link to={exercise ? `/exercises/${exercise.id}` : exercisesHub} onClick={() => trackAction('accueil-reprendre')}
          className={btn('exercice')} {...tour('exercice')}>
          {t('Commencer')} <ArrowRight className="h-4 w-4" />
        </Link>
      ),
    },
    ds: {
      title: t('Annonce ton prochain DS'),
      text: t('Sa date et ses chapitres : tu auras une révision ciblée et un DS blanc chronométré.'),
      cta: (
        <button type="button" onClick={onAnnounce} className={btn('ds')} {...tour('ds')}>
          <CalendarPlus className="h-4 w-4" /> {t('Annoncer mon DS')}
        </button>
      ),
    },
  };

  return (
    <section aria-labelledby="premiers-pas-titre" data-tour="home-premiers-pas" className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[.08em] text-brand-hover">{t('Pour bien démarrer')}</p>
          <h2 id="premiers-pas-titre" className="fd-display mt-1.5 text-[23px] leading-tight text-ink sm:text-[27px]">{t('Tes premiers pas')}</h2>
        </div>
        <span className="fd-nums shrink-0 rounded-full bg-[#f2f1ee] px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft">
          {done} / {steps.length}<span className="sr-only"> {t('faits')}</span>
        </span>
      </div>
      <ol className="divide-y divide-line border-t border-line">
        {steps.map((x, i) => {
          const c = content[x.key];
          const isCurrent = x.key === current;
          return (
            <li key={x.key}
              className={`grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:px-7 ${isCurrent ? 'bg-[#fcfbf9]' : ''}`}>
              <span aria-hidden className={`fd-nums inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${
                x.done ? 'bg-brand-soft text-brand-hover' : isCurrent ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-soft'}`}>
                {x.done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-[15px] font-semibold leading-snug ${x.done ? 'text-ink-faint line-through decoration-[#cfc9bf]' : 'text-ink'}`}>
                  {c.title}<span className="sr-only">{x.done ? ` ${t('(fait)')}` : ''}</span>
                </p>
                {(!x.done || x.key === 'niveau') && <p className="mt-0.5 text-[13px] leading-snug text-ink-faint">{c.text}</p>}
              </div>
              {!x.done && <div className="col-start-2 sm:col-start-auto">{c.cta}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

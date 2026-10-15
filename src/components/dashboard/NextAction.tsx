// Carte principale de l'accueil (refonte du 11/10/2026) : UNE action, choisie par `chooseNext` :
//   1. un DS dans 3 jours au plus → « Préparer mon DS de mercredi » ;
//   2. un contenu commencé → « Reprendre » (le plus récent) ;
//   3. un DS dans les deux semaines → « Préparer mon DS de … » ;
//   4. sinon « Commencer » : le 1er exercice proposé pour toi (à défaut, les exercices de ton niveau).
// Un prof : ses classes. Le bouton porte data-tour="home-reprendre" et la mesure « accueil-reprendre ».
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, PlayCircle, Sparkles, Timer } from 'lucide-react';
import type { DashboardOverview as Overview, RecommendedItem } from '@/lib/api/dashboardApi';
import { longDate, testTitle } from '@/lib/api/devoirsApi';
import { Countdown, DateTile, Readiness } from '@/components/devoirs/ui';
import { DifficultyChip } from '@/components/content/listing/ListingParts';
import { lessonsHub } from '@/pages/progression/links';
import type { Felt } from '@/types/content';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';
import { ago, prepareLabel, reasonLabel, type NextChoice } from './home';

/* ───────────────────────── Charpente de la carte ───────────────────────── */

const Hero: React.FC<{
  badge: React.ReactNode;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  action: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ badge, eyebrow, title, children, action, footer }) => (
  <section aria-labelledby="action-titre" className="overflow-hidden rounded-3xl border border-line bg-white">
    <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:gap-8">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {badge}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-[.08em] text-brand-hover">{eyebrow}</p>
          <h2 id="action-titre" className="fd-display mt-1.5 text-[23px] leading-tight text-ink sm:text-[27px]">{title}</h2>
          {children}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
    {footer && (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line bg-[#fcfbf9] px-5 py-2 text-[13px] sm:px-7">
        {footer}
      </div>
    )}
  </section>
);

const IconBadge: React.FC<{ icon: React.ComponentType<{ className?: string }> }> = ({ icon: Icon }) => (
  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-hover ring-1 ring-brand-line sm:flex" aria-hidden>
    <Icon className="h-6 w-6" />
  </span>
);

const MainButton: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} onClick={() => trackAction('accueil-reprendre')} data-tour="home-reprendre"
    className="fd-btn-primary min-h-11 w-full justify-center text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 md:w-auto">
    {children} <ArrowRight className="h-4 w-4 shrink-0" />
  </Link>
);

const FootLink: React.FC<{ to: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ to, icon: Icon, children }) => (
  <Link to={to} className="inline-flex min-h-10 min-w-0 max-w-full items-center gap-1.5 font-semibold text-ink-soft hover:text-ink hover:underline">
    {Icon && <Icon className="h-4 w-4 shrink-0 text-ink-faint" />}
    <span className="truncate">{children}</span>
  </Link>
);

/** Questions évaluées d'un contenu commencé : « 1 / 3 questions ». */
const QuestionsBar: React.FC<{ assessed: number; total: number }> = ({ assessed, total }) => {
  const pct = total ? Math.round((assessed / total) * 100) : 0;
  return (
    <span className="flex min-w-[160px] max-w-[260px] flex-1 items-center gap-2.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2f1ee]" role="progressbar"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={assessed} aria-label={t('Questions évaluées')}>
        <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 4)}%` }} />
      </span>
      <span className="fd-nums whitespace-nowrap text-[12.5px] text-ink-faint">{total > 1 ? t('{a} / {n} questions', { a: assessed, n: total }) : t('{a} / {n} question', { a: assessed, n: total })}</span>
    </span>
  );
};

/* ───────────────────────── Les quatre cas ───────────────────────── */

export const NextAction: React.FC<{ choice: NextChoice; data: Overview }> = ({ choice, data }) => {
  const exercisesHub = data.level_hub_url ?? `/exercises${data.level ? `?classLevels=${data.level.id}` : ''}`;
  const lessons = lessonsHub(data.level_hub_url) ?? `/lessons${data.level ? `?classLevels=${data.level.id}` : ''}`;

  if (choice.kind === 'ds') {
    const { test, resume } = choice;
    return (
      <Hero badge={(
        // Plus petite sur téléphone : le titre garde la place de tenir sur une ligne.
        <>
          <span className="sm:hidden"><DateTile date={test.date} size="sm" urgent={test.days_left <= 1} /></span>
          <span className="hidden sm:block"><DateTile date={test.date} size="lg" urgent={test.days_left <= 1} /></span>
        </>
      )}
        eyebrow={<span className="inline-flex flex-wrap items-center gap-2">{t('Ton prochain DS')} <Countdown days={test.days_left} className="normal-case tracking-normal" /></span>}
        title={testTitle(test)}
        action={<MainButton to={`/revisions/ds/${test.id}`}>{prepareLabel(test)}</MainButton>}
        footer={(
          <>
            <FootLink to={`/revisions/ds/${test.id}/blanc`} icon={Timer}>{t('DS blanc chronométré')}</FootLink>
            {resume && <FootLink to={resume.url} icon={PlayCircle}>{t('Ou reprends :')} {resume.title}</FootLink>}
          </>
        )}>
        <p className="mt-0.5 text-[13px] text-ink-faint">{longDate(test.date)}</p>
        {test.chapters.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t('Chapitres du DS')}>
            {test.chapters.map((c) => {
              const weak = test.weak_chapters?.includes(c.name);
              return (
                <li key={c.id} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${weak ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink-soft'}`}>
                  {c.name}{weak && <span className="sr-only"> {t('(à renforcer)')}</span>}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 max-w-[260px]">
          {test.readiness == null
            ? <p className="text-[12.5px] text-ink-faint">{t('Pas encore de mesure : quelques exercices suffisent.')}</p>
            : <Readiness value={test.readiness} compact />}
        </div>
      </Hero>
    );
  }

  if (choice.kind === 'resume') {
    const { item, others, forTest } = choice;
    return (
      <Hero badge={<IconBadge icon={PlayCircle} />}
        eyebrow={t('Reprendre · {quand}', { quand: ago(item.last_at) || t('là où tu t’es arrêté') })}
        title={item.title}
        action={<MainButton to={item.url}>{t('Reprendre')}</MainButton>}
        footer={others.length > 0 ? (
          <>
            <span className="text-ink-faint">{t('Aussi en cours :')}</span>
            {others.map((o) => <FootLink key={`${o.type}-${o.id}`} to={o.url}>{o.title}</FootLink>)}
          </>
        ) : undefined}>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {item.chapter && <span className="rounded-full bg-[#f2f1ee] px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">{item.chapter}</span>}
          {forTest && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand-hover">{t('Au programme de ton DS')}</span>}
          {item.total ? <QuestionsBar assessed={item.assessed ?? 0} total={item.total} /> : null}
        </div>
      </Hero>
    );
  }

  if (choice.kind === 'teacher') {
    return (
      <Hero badge={<IconBadge icon={GraduationCap} />} eyebrow={t('Ton espace prof')} title={t('Tes classes')}
        action={<MainButton to="/classrooms">{t('Ouvrir mes classes')}</MainButton>}
        footer={<FootLink to="/exercises" icon={BookOpen}>{t('Parcourir les exercices')}</FootLink>}>
        <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-faint">
          {t('Suis le travail de tes élèves et donne-leur des TD tirés des exercices de Fidni.')}
        </p>
      </Hero>
    );
  }

  const ex = choice.exercise;
  const reason = ex?.reason;
  return (
    <Hero badge={<IconBadge icon={Sparkles} />} eyebrow={t('Pour commencer')}
      title={ex ? ex.title : t('Un exercice de ton niveau')}
      action={<MainButton to={ex ? `/exercises/${ex.id}` : exercisesHub}>{ex ? t('Commencer') : t('Choisir un exercice')}</MainButton>}
      footer={<FootLink to={lessons} icon={BookOpen}>{t('Revoir le cours de ton niveau')}</FootLink>}>
      {ex ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {ex.chapters?.[0]?.name && <span className="rounded-full bg-[#f2f1ee] px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">{ex.chapters[0].name}</span>}
          <DifficultyChip difficulty={ex.difficulty} felt={(ex as RecommendedItem & { felt?: Felt | null }).felt ?? null} />
          <span className="text-[12.5px] text-ink-faint">{reason ? `· ${reasonLabel(reason)}` : `· ${t('choisi pour toi')}`}</span>
        </div>
      ) : (
        <p className="mt-1.5 text-[14px] text-ink-faint">{t('Choisis un chapitre, puis dis sous chaque question si tu l’as réussie.')}</p>
      )}
    </Hero>
  );
};

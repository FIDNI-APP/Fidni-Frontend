// « Ton prochain DS » sur l'accueil (refonte du 11/10/2026) : une carte compacte (date, compte à rebours,
// chapitres, préparation) qui ouvre le plan de révision (/revisions/ds/:id) ; seulement pour un DS dans les deux
// semaines. Sans DS annoncé, une invitation discrète ouvre le formulaire ; « Plus tard » la masque 14 jours.
// Un DS déjà annoncé plus loin que deux semaines : rien (Réviser le montre).
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, X } from 'lucide-react';
import { t } from '@/i18n';
import { Section, SectionLink } from '@/components/space/Page';
import { Countdown, DateTile, Readiness, testName } from './ui';
import { nextTestVisible, type NextTestState } from './useNextTest';

/** « Dénombrement, Suites numériques » : les chapitres à renforcer en or (et dits aux lecteurs d'écran). */
const ChapterLine: React.FC<{ names: string[]; weak: string[] }> = ({ names, weak }) => (
  <p className="mt-1 truncate text-[13px] text-ink-faint">
    {names.slice(0, 3).map((n, i) => (
      <React.Fragment key={n}>
        {i > 0 && t(', ')}
        {weak.includes(n) ? <span className="text-gold-strong">{n}<span className="sr-only"> {t('(à renforcer)')}</span></span> : n}
      </React.Fragment>
    ))}
    {names.length > 3 && <>{' '}{names.length > 4 ? t('et {n} autres', { n: names.length - 3 }) : t('et {n} autre', { n: names.length - 3 })}</>}
  </p>
);

export const NextTestReminder: React.FC<{
  state: NextTestState;
  onAnnounce: () => void;
  /** Invitation masquée (« Plus tard ») et le geste qui la masque : voir useAnnounceLater (useNextTest.ts). */
  later: boolean;
  onLater: () => void;
  className?: string;
}> = ({ state, onAnnounce, later, onLater, className = '' }) => {
  if (!nextTestVisible(state, later)) return null;
  const test = state.test;

  if (!test) {
    return (
      <Section id="prochain-ds" title={t('Ton prochain DS')} className={className}
        action={(
          <button type="button" onClick={onLater} aria-label={t('Plus tard (masquer pendant 14 jours)')} title={t('Masquer pendant 14 jours')}
            className="inline-flex min-h-10 items-center gap-1 font-medium text-ink-faint hover:text-ink">
            <X className="h-3.5 w-3.5" aria-hidden /> {t('Plus tard')}
          </button>
        )}>
        <div className="flex items-start gap-3.5 rounded-2xl border border-dashed border-[#d8d4cc] bg-white p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold leading-snug text-ink">{t('Un DS bientôt ?')}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">
              {t('Indique sa date et ses chapitres : tu auras une révision ciblée et un DS blanc.')}
            </p>
            <button type="button" onClick={onAnnounce} className="fd-btn-ghost mt-3 min-h-10 text-[13px] font-semibold">
              <CalendarPlus className="h-4 w-4" /> {t('Annoncer mon DS')}
            </button>
          </div>
        </div>
      </Section>
    );
  }

  const soon = test.days_left <= 1;
  return (
    <Section id="prochain-ds" title={t('Ton prochain DS')} className={className}
      action={<SectionLink to="/reviser#prochain-ds">{t('Réviser')}</SectionLink>}>
      <Link to={`/revisions/ds/${test.id}`}
        className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <DateTile date={test.date} size="sm" urgent={soon} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold leading-snug text-ink group-hover:underline">{testName(test)}</span>
            <Countdown days={test.days_left} />
          </div>
          {test.chapters.length > 0 && <ChapterLine names={test.chapters.map((c) => c.name)} weak={test.weak_chapters ?? []} />}
          <div className="mt-3 flex items-end gap-4">
            <div className="min-w-0 max-w-[220px] flex-1">
              {test.readiness == null
                ? <p className="text-[12px] text-ink-faint">{t('Pas encore de mesure : quelques exercices suffisent.')}</p>
                : <Readiness value={test.readiness} compact />}
            </div>
            <span className="ms-auto inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand-hover">
              {t('Préparer')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </Section>
  );
};

export default NextTestReminder;

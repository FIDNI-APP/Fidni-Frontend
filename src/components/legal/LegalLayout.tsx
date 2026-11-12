// Mise en page commune des pages juridiques : titre, date, sommaire, sections numérotées.
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import { SEO } from '@/components/layout/SEO';
import { t } from '@/i18n';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

const PAGES = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/terms-of-service', label: 'Conditions d’utilisation' },
  { to: '/privacy-policy', label: 'Confidentialité' },
];

export const LegalLayout: React.FC<{ title: string; description: string; intro: React.ReactNode; sections: LegalSection[] }> = ({
  title, description, intro, sections,
}) => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }, [pathname, hash]);

  const contents = (
    <ol className="space-y-0.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex items-baseline gap-1 rounded px-1 py-1.5 leading-snug text-ink-soft hover:text-brand-hover focus-visible:outline-brand">
            <span className="fd-nums min-w-5 shrink-0 text-ink-faint">{i + 1}.</span>{s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="bg-[#faf9f7] min-h-screen pb-16 text-[#1a1a1a]">
      {/* Titre et description propres (avant : ceux de l'accueil). */}
      <SEO title={`${title} – Fidni`} description={description} canonicalUrl={pathname} />
      <header className="border-b border-[#e7e3dc] pt-8 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center text-[#6b6862] hover:text-[#1a1a1a] mb-6 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" /> {t('Retour à Fidni')}
          </Link>
          <nav className="flex flex-wrap gap-1.5 mb-6" aria-label={t('Pages juridiques')}>
            {PAGES.map((p) => (
              <Link key={p.to} to={p.to} aria-current={pathname === p.to ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${pathname === p.to
                  ? 'bg-[#1a1a1a] text-white' : 'bg-white border border-[#e7e3dc] text-[#4b4843] hover:border-[#1a1a1a]'}`}>
                {t(p.label)}
              </Link>
            ))}
          </nav>
          <h1 className="fd-display text-3xl md:text-4xl mb-3">{title}</h1>
          <div className="text-[#4b4843] text-base leading-relaxed max-w-2xl">{intro}</div>
          <p className="mt-4 text-sm text-[#9a958c]">{t('Dernière mise à jour : {date}', { date: LEGAL.updated })}</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl items-start gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 lg:py-8">
        <nav aria-label={t('Sommaire')} className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
          <details key={pathname} className="group rounded-xl border border-line bg-white px-4 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
              {t('Sommaire')} <ChevronDown size={16} className="group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-line pb-3 pt-2">{contents}</div>
          </details>
          <div className="hidden border-t-2 border-ink pt-3 lg:block">
            <p className="mb-2 text-sm font-semibold">{t('Sommaire')}</p>
            {contents}
          </div>
        </nav>
        <div className="min-w-0 rounded-xl border border-line bg-white">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-4 border-b border-line p-5 last:border-0 sm:p-7">
              <h2 className="flex items-baseline gap-3 text-lg font-semibold mb-3">
                <span className="text-[#c0892f] text-sm" style={{ fontFamily: 'var(--fd-mono)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </h2>
              <div className="legal-body text-[15px] leading-relaxed text-[#33302b] space-y-3">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="text-center lg:col-start-2 text-sm text-[#8a857d]">
          {t('Une question ? Écrivez à')}{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#1a7a4a] underline">{LEGAL.contactEmail}</a>
        </p>
      </main>
    </div>
  );
};

/** Tableau lisible sur mobile (défilement horizontal interne, jamais celui de la page). */
export const LegalTable: React.FC<{ head: string[]; rows: React.ReactNode[][] }> = ({ head, rows }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full min-w-[560px] text-sm border-collapse">
      <thead>
        <tr>{head.map((h) => (
          <th key={h} className="text-start font-semibold text-[#1a1a1a] border-b border-[#e7e3dc] py-2 pe-3 align-bottom">{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="align-top">
            {r.map((c, j) => <td key={j} className="border-b border-[#f2efe9] py-2.5 pe-3 text-[#4b4843]">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

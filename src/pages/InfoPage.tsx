/**
 * Pages « À propos » (/a-propos) et « Contact » (/contact) : qui fait Fidni, comment les contenus sont
 * rédigés, comment nous joindre. Texte unique côté backend (config/pages.py, GET /api/pages/<slug>/),
 * pré-rempli pour les moteurs de recherche ; ces pages comptent pour l'examen AdSense.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, CardsSkeleton } from '@/components/space/Page';
import { getInfoPage, type InfoPageData, type InfoPageLink } from '@/lib/api/pagesApi';
import { t } from '@/i18n';

const LinkItem: React.FC<{ link: InfoPageLink }> = ({ link }) => {
  const cls = 'inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-brand-hover hover:text-brand';
  if (link.href.startsWith('mailto:')) {
    return <a href={link.href} className="fd-btn-primary inline-flex min-h-10 items-center gap-2 break-all"><Mail className="h-4 w-4" aria-hidden /> {link.label}</a>;
  }
  return <Link to={link.href} className={cls}>{link.label} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden /></Link>;
};

export const InfoPage: React.FC<{ slug: 'a-propos' | 'contact' }> = ({ slug }) => {
  const [data, setData] = useState<InfoPageData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    getInfoPage(slug).then((d) => { if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [slug, attempt]);

  return (
    <Page width="narrow">
      {data && <SEO title={data.title} description={data.description} canonicalUrl={`/${slug}`} />}
      {!data && !failed && <CardsSkeleton n={3} />}
      {failed && (
        <div role="alert" className="space-y-3 py-8 text-sm text-ink-soft">
          <p>
            {t('La page n’a pas pu s’afficher. Tu peux nous écrire à')}{' '}
            <a href="mailto:contact@fidni.fr" className="font-semibold text-brand-hover underline">contact@fidni.fr</a>.
          </p>
          <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setAttempt((n) => n + 1)}>{t('Réessayer')}</button>
        </div>
      )}
      {data && (
        <>
          <PageHeader eyebrow="Fidni" title={data.h1} subtitle={data.intro} />
          <div className="divide-y divide-line border-t-2 border-ink">
            {data.sections.map((sec) => (
              <section key={sec.title} className="py-5 sm:py-6">
                <h2 className="fd-display text-[21px] leading-snug text-ink">{sec.title}</h2>
                <div className="mt-2.5 max-w-[68ch] space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
                  {sec.paragraphs.map((p) => <p key={p}>{p}</p>)}
                </div>
                {sec.links && sec.links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-0.5">
                    {sec.links.map((l) => <LinkItem key={l.href} link={l} />)}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  );
};

export default InfoPage;

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
    return <a href={link.href} className={cls}><Mail className="h-4 w-4" aria-hidden /> {link.label}</a>;
  }
  return <Link to={link.href} className={cls}>{link.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>;
};

export const InfoPage: React.FC<{ slug: 'a-propos' | 'contact' }> = ({ slug }) => {
  const [data, setData] = useState<InfoPageData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    getInfoPage(slug).then((d) => { if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <Page width="narrow">
      {data && <SEO title={data.title} description={data.description} canonicalUrl={`/${slug}`} />}
      {!data && !failed && <CardsSkeleton n={3} />}
      {failed && (
        <p className="py-10 text-[14.5px] text-ink-faint">
          {t('La page n’a pas pu s’afficher. Tu peux nous écrire à')}{' '}
          <a href="mailto:contact@fidni.fr" className="font-semibold text-brand-hover underline">contact@fidni.fr</a>.
        </p>
      )}
      {data && (
        <>
          <PageHeader eyebrow="Fidni" title={data.h1} subtitle={data.intro} />
          <div className="flex flex-col gap-4">
            {data.sections.map((sec) => (
              <section key={sec.title} className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <h2 className="fd-display text-[21px] leading-snug text-ink">{sec.title}</h2>
                <div className="mt-2.5 space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
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

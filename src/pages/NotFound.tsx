import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { SEO } from '@/components/layout/SEO';
import { t } from '@/i18n';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <SEO title="Page introuvable – Fidni" description="Cette page n’existe pas ou a été déplacée." noindex />
      <div className="border-t-2 border-ink pt-5">
        <h1 className="fd-display text-3xl text-ink">{t('Page introuvable')}</h1>
        <p className="mb-6 mt-2 text-sm text-ink-soft">{t('Ce lien ne mène nulle part : la page a peut-être été déplacée ou supprimée.')}</p>
        <form role="search" className="mb-4 flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
          navigate(q ? '/search?' + new URLSearchParams({ q }) : '/search');
        }}>
          <input type="search" name="q" aria-label={t('Rechercher')} placeholder={t('Rechercher')}
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-base focus-visible:outline-brand" />
          <button className="fd-btn-primary min-h-11" type="submit"><Search size={16} aria-hidden />{t('Rechercher')}</button>
        </form>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <Link to="/" className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-hover">{t('Retour à l’accueil')} <ArrowRight size={14} className="rtl:rotate-180" aria-hidden /></Link>
          <Link to="/exercises" className="inline-flex min-h-10 items-center text-ink-soft hover:underline">{t('Voir les exercices')}</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

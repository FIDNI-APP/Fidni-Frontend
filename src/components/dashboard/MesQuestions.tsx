// Accueil (15/11/2026, Natsu : « montrer un peu la progression de l'élève, notamment les exercices réussis et à
// revoir ») : le même graphique que Ma progression (« Mes questions, réussies et à revoir »), sur les 30 derniers
// jours, avec un lien vers la page. Mêmes données (GET /api/stats/tableau/?jours=30), gardées pour la session :
// ouvrir Ma progression ensuite est immédiat.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTableau } from '@/pages/progression/useTableau';
import { QuestionsChart } from '@/components/progression/Questions';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';

export const MesQuestions: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const { data, failed, reload } = useTableau(user ? String(user.id) : null, 30);

  return (
    <section aria-labelledby="accueil-mes-questions" className={`rounded-2xl border border-line bg-white px-4 pb-4 pt-4 sm:px-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="accueil-mes-questions" className="text-[15px] font-semibold text-ink">
          {t('Mes questions, réussies et à revoir')}
          <span className="ms-2 text-[12.5px] font-medium text-ink-faint">{t('30 derniers jours')}</span>
        </h2>
        <Link to="/progression" onClick={() => trackAction('accueil-courbe')}
          className="inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
          {t('Ma progression')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
      {data ? (
        <QuestionsChart data={data} height={160}
          emptyText={t('Aucune question ces 30 derniers jours.')} />
      ) : failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 py-6">
          <p className="flex-1 text-[13.5px] text-ink-soft">{t('Ta progression n’a pas pu se charger.')}</p>
          <button type="button" onClick={reload} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
        </div>
      ) : (
        <div className="h-[210px] animate-pulse rounded-xl bg-[#f2f1ee]" role="status" aria-label={t('Chargement')} />
      )}
    </section>
  );
};

export default MesQuestions;

// Onglet « Discussions » d'un exercice, d'une leçon ou d'un examen (08/11/2026) : les discussions de l'espace
// Discussions qui taguent ce contenu, et « Lancer une discussion » avec ce contenu déjà tagué.
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MessagesSquare, PenLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import type { DiscussionPage } from '@/lib/api/discussionsApi';
import { DiscussionCard } from './DiscussionCard';
import { t } from '@/i18n';

export const ContentDiscussions: React.FC<{
  contentId: number;
  contentType: 'exercise' | 'exam' | 'lesson';
  page: DiscussionPage | null;
}> = ({ contentId, contentType, page }) => {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();
  const start = () => {
    if (!isAuthenticated) { openModal('discussion'); return; }
    navigate(`/discussions/nouvelle?contenu=${contentId}`);
  };
  const what = contentType === 'lesson' ? t('cette leçon') : contentType === 'exam' ? t('ce sujet') : t('cet exercice');

  return (
    <section aria-labelledby="discussions-contenu">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="discussions-contenu" className="fd-display flex items-baseline gap-2 text-[20px] text-ink">
          {t('Discussions sur {quoi}', { quoi: what })}
          {!!page?.count && <span className="font-sans text-[13px] font-semibold text-ink-faint fd-nums">{page.count}</span>}
        </h2>
        <button type="button" onClick={start} className="fd-btn-primary inline-flex min-h-10 items-center gap-2">
          <PenLine className="h-4 w-4" /> {t('Lancer une discussion')}
        </button>
      </div>
      {!page ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" aria-label={t('Chargement')} /></div>
      ) : page.results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-9 text-center">
          <MessagesSquare className="mx-auto h-7 w-7 text-ink-faint" aria-hidden />
          <p className="mt-2 text-[14.5px] font-semibold text-ink">{t('Aucune discussion sur {quoi}.', { quoi: what })}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">{page.results.map((d) => <DiscussionCard key={d.id} d={d} hideTag={contentId} />)}</div>
          {page.count > page.results.length && (
            <Link to={`/discussions?contenu=${contentId}&niveau=tous`} className="mt-3 inline-flex min-h-10 items-center font-semibold text-brand-hover hover:underline">
              {t('Voir les {n} discussions', { n: page.count })}
            </Link>
          )}
        </>
      )}
    </section>
  );
};

export default ContentDiscussions;

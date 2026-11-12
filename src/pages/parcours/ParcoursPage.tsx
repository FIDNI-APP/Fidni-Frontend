/**
 * /parcours (12/11/2026) : le Parcours, fonctionnalité Premium. Niveau → matière → chapitres (la carte, parcours
 * principal) → vidéos du chapitre choisi (parcours secondaire) → quiz de validation. Données : parcours existants
 * (apps/learningpath) ; lecture des vidéos sur le lecteur existant, qui revient ici.
 * Ordinateur : la carte à gauche, le chapitre choisi à droite (collant). Téléphone : la carte, puis le chapitre ;
 * choisir un chapitre fait défiler jusqu'à lui.
 */
import React, { useRef } from 'react';
import { Route, RotateCcw } from 'lucide-react';
import { EmptyState, Page } from '@/components/space/Page';
import { SEO } from '@/components/layout/SEO';
import { PremiumGate } from '@/components/parcours/PremiumGate';
import { ParcoursHeader } from '@/components/parcours/ParcoursHeader';
import { ChapterMap } from '@/components/parcours/ChapterMap';
import { ChapterDetails } from '@/components/parcours/ChapterDetails';
import { useParcours } from '@/components/parcours/useParcours';
import { useAuth } from '@/contexts/AuthContext';
import { hasParcoursAccess } from '@/lib/features';
import type { Id } from '@/lib/api/parcoursApi';
import { t } from '@/i18n';

const ParcoursContent: React.FC = () => {
  const p = useParcours(true);
  const detailsRef = useRef<HTMLDivElement>(null);

  const select = (id: Id) => {
    p.chooseChapter(id);
    // Téléphone : le chapitre s'affiche sous la carte ; on l'amène à l'écran.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
    }
  };

  if (p.failed) {
    return (
      <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
        <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{t('Le parcours n’a pas pu se charger. Vérifie ta connexion.')}</p>
        <button type="button" onClick={p.reload} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
      </div>
    );
  }
  if (!p.list) {
    return (
      <div aria-busy="true" role="status" aria-label={t('Chargement')}>
        <div className="mb-8 h-24 animate-pulse rounded-2xl bg-[#efece6]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="h-[520px] animate-pulse rounded-2xl bg-[#f2f1ee]" />
          <div className="h-80 animate-pulse rounded-2xl bg-[#f2f1ee]" />
        </div>
      </div>
    );
  }
  if (p.list.length === 0) {
    return <EmptyState icon={Route} title={t('Aucun parcours pour l’instant')} text={t('Les premiers parcours en vidéo arrivent bientôt.')} />;
  }

  return (
    <>
      <ParcoursHeader parcours={p.parcours} progress={p.progress} levels={p.levels} subjects={p.subjects}
        level={p.level} subject={p.subject} onLevel={p.chooseLevel} onSubject={p.chooseSubject} />

      {!p.parcours || !p.progress ? (
        <EmptyState icon={Route} compact title={t('Pas encore de parcours pour ce choix')} text={t('Choisis un autre niveau ou une autre matière.')} />
      ) : p.progress.steps.length === 0 ? (
        <EmptyState icon={Route} compact title={t('Ce parcours n’a pas encore de chapitre')} text={t('Ses chapitres arrivent bientôt.')} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
          <section aria-label={t('Carte des chapitres')} className="fd-card overflow-hidden px-3 py-4 sm:px-6">
            <ChapterMap steps={p.progress.steps} selectedId={p.selected?.chapter.id ?? null} justDone={p.justDone} onSelect={select} />
          </section>
          <div ref={detailsRef} className="scroll-mt-24 lg:sticky lg:top-[84px]">
            {p.selected && (
              <ChapterDetails key={String(p.selected.chapter.id)} step={p.selected} pathId={p.parcours.id}
                previous={p.progress.steps[p.selected.index - 1] ?? null} justDone={p.justDone} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const ParcoursPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <Page width="full">
      <SEO title="Parcours | Fidni" description="Les chapitres de ton niveau en vidéos, dans l’ordre du programme, avec ta progression." canonicalUrl="/parcours" />
      <PremiumGate>
        {hasParcoursAccess(user) && <ParcoursContent />}
      </PremiumGate>
    </Page>
  );
};

export default ParcoursPage;

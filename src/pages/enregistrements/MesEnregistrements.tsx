/**
 * Mes enregistrements (/enregistrements, refonte du 11/10/2026) : ce que l'élève a mis de côté pour y revenir.
 * Deux onglets gardés dans l'adresse (?onglet=favoris|cahiers, favoris par défaut), leurs compteurs toujours visibles :
 *  - Favoris : exercices, examens et leçons enregistrés avec le signet, avec où il en est ;
 *  - Cahiers : ses cahiers de cours (leçons rangées par chapitre), qu'on ouvre dans la liseuse /notebooks?nb=<id>.
 * Les anciennes adresses y mènent : /saved → favoris, /notebooks (sans cahier) → cahiers (App.tsx).
 */
import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, BookMarked, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Page, PageHeader, Segmented } from '@/components/space/Page';
import { exercisesHome } from '@/components/layout/nav';
import { profileLevel } from '@/lib/api/hubApi';
import { useSaved } from '@/components/enregistrements/useSaved';
import { lessonsHome, useNotebooks } from '@/components/enregistrements/useNotebooks';
import { FavorisPanel, type InNotebook } from '@/components/enregistrements/FavorisPanel';
import { CahiersPanel } from '@/components/enregistrements/CahiersPanel';

type Tab = 'favoris' | 'cahiers';

const ErrorBanner: React.FC<{ text: string; onRetry: () => void }> = ({ text, onRetry }) => (
  <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
    <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{text}</p>
    <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> Réessayer</button>
  </div>
);

export const MesEnregistrements: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('onglet') === 'cahiers' ? 'cahiers' : 'favoris';

  const saved = useSaved(isAuthenticated ? user?.username : undefined);
  const notebooks = useNotebooks(isAuthenticated);
  const level = profileLevel(user);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login');
  }, [authLoading, isAuthenticated, navigate]);

  // Leçons déjà rangées dans un cahier : la carte du favori mène au cahier au lieu de proposer « Ranger ».
  const inNotebooks = useMemo(() => {
    const map = new Map<string, InNotebook>();
    for (const nb of notebooks.list ?? []) {
      for (const s of nb.sections ?? []) {
        for (const e of s.lesson_entries ?? []) {
          const id = String(e.lesson?.id);
          if (!map.has(id)) map.set(id, { notebookId: nb.id, sectionId: s.id, title: nb.title });
        }
      }
    }
    return map;
  }, [notebooks.list]);

  if (!isAuthenticated) return null;

  // Chargement en échec sans rien à montrer : pas d'état vide trompeur, seulement le bandeau.
  const savedDown = saved.failed && !saved.items?.length;
  const notebooksDown = notebooks.failed && !notebooks.list?.length;

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set('onglet', t);
    setParams(next, { replace: true });
  };

  return (
    <Page>
      <PageHeader eyebrow="Mon suivi" title="Mes enregistrements" subtitle="Ce que tu as mis de côté pour y revenir." />

      <div className="mb-8" data-tour="enregistrements-onglets">
        <Segmented<Tab> label="Favoris ou cahiers" value={tab} onChange={setTab} options={[
          { key: 'favoris', label: 'Favoris', count: savedDown ? undefined : saved.items?.length, icon: Bookmark },
          { key: 'cahiers', label: 'Cahiers', count: notebooksDown ? undefined : notebooks.list?.length, icon: BookMarked },
        ]} />
      </div>

      <div role="tabpanel" aria-label="Favoris" hidden={tab !== 'favoris'}>
        {saved.failed && (
          <ErrorBanner onRetry={saved.reload}
            text={saved.items?.length ? 'Une partie de tes favoris n’a pas pu se charger. Vérifie ta connexion.' : 'Tes favoris n’ont pas pu se charger. Vérifie ta connexion.'} />
        )}
        {!savedDown && (
          <FavorisPanel state={saved} inNotebooks={inNotebooks} onNotebookChanged={notebooks.reload}
            exercisesTo={exercisesHome(user)} lessonsTo={lessonsHome(level)} hasLevel={!!level} />
        )}
      </div>

      <div role="tabpanel" aria-label="Cahiers" hidden={tab !== 'cahiers'}>
        {notebooks.failed && <ErrorBanner onRetry={notebooks.reload} text="Tes cahiers n’ont pas pu se charger. Vérifie ta connexion." />}
        {!notebooksDown && <CahiersPanel state={notebooks} level={level} />}
      </div>
    </Page>
  );
};

export default MesEnregistrements;

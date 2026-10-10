// Rubriques Exercices / Leçons / Devoirs / Bac national, rangées en dossiers (10/10/2026) :
//  - /exercises (/lessons, /exams)        → dossiers de niveaux (ContentFolders « levels ») ;
//  - /exercises/niveau/:level             → dossiers de chapitres du niveau (« chapters ») ;
//  - /exercises/niveau/:level/:chapter    → le dossier ouvert : les cartes habituelles (ContentList) ;
//  - /exams/nationaux                     → dossiers par année ; /exams/nationaux/:annee → les sujets de l'année.
// Une adresse avec des paramètres de liste (anciens liens, « S'entraîner », recherche) garde la liste filtrée.
// Titres et textes des pages de niveau et de chapitre : backend (apps/caracteristics/hubs.py), identiques à la
// page pré-remplie que lisent les moteurs de recherche (config/seo.py).
import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ContentList } from './ContentList';
import { ContentFolders } from './ContentFolders';
import { NotFound } from '@/pages/NotFound';
import { useAuth } from '@/contexts/AuthContext';
import { getHub, type HubInfo } from '@/lib/api/hubApi';
import { SECTION_OF, hasListParams, type ContentKind } from './sections';

// Pages déjà chargées dans l'onglet : un retour (« Précédent ») réaffiche les dossiers tout de suite, à la même
// hauteur, au lieu d'un chargement qui ramenait en haut de la page.
const hubCache = new Map<string, HubInfo>();
const HUB_CACHE_MAX = 20;

const Loading: React.FC = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-label="Chargement de la page">
    <div className="h-6 w-6 rounded-full border-2 border-line border-t-brand animate-spin" />
  </div>
);

export const ContentHub: React.FC<{ contentType: ContentKind }> = ({ contentType }) => {
  const { level = '', chapter } = useParams<{ level: string; chapter?: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const section = SECTION_OF[contentType];
  // Page d'un niveau sans paramètre de liste : ses chapitres en dossiers.
  const folders = !chapter && !hasListParams(location.search);
  // Dossiers : rechargés à la connexion et après une évaluation (ce que l'élève a terminé dans chaque chapitre).
  const viewer = folders ? user?.id ?? null : null;
  const cacheKey = `${section}|${level}|${chapter ?? ''}|${viewer ?? ''}`;
  const [hub, setHub] = useState<HubInfo | null>(() => hubCache.get(cacheKey) ?? null);
  const [missing, setMissing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    const cached = hubCache.get(cacheKey);
    if (cached) setHub(cached);
    getHub(section, level, chapter)
      .then((data) => {
        if (cancelled) return;
        hubCache.delete(cacheKey);
        hubCache.set(cacheKey, data);
        if (hubCache.size > HUB_CACHE_MAX) hubCache.delete(hubCache.keys().next().value as string);
        setHub(data);
      })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [section, level, chapter, cacheKey, reload]);

  if (missing) return <NotFound />;
  // Autre rubrique, niveau ou chapitre : rien de l'ancien pendant le chargement (la même instance sert aux
  // trois rubriques : /exercises/niveau/… → /lessons/niveau/… garderait sinon la page des exercices).
  const current = hub && hub.section === section && hub.level.slug === level
    && (hub.chapter?.slug ?? undefined) === (chapter || undefined) ? hub : null;
  if (!current) return <Loading />;
  if (folders) {
    return <ContentFolders key={current.url} view="chapters" contentType={contentType} hub={current}
      onProgress={() => setReload((n) => n + 1)} />;
  }
  // key : un autre niveau ou chapitre repart d'une liste neuve (filtres de la nouvelle page).
  return <ContentList key={current.url} contentType={contentType} hub={current} />;
};

/** /exercises, /lessons, /exams : les dossiers de niveaux (la liste filtrée si l'adresse a des filtres). */
export const ContentSection: React.FC<{ contentType: ContentKind }> = ({ contentType }) => {
  const location = useLocation();
  if (hasListParams(location.search)) return <ContentList key={`${contentType}-liste`} contentType={contentType} />;
  return <ContentFolders key={contentType} view="levels" contentType={contentType} />;
};

/** /exams/nationaux : les dossiers par année (la liste filtrée si l'adresse a des filtres). */
export const NationalSection: React.FC = () => {
  const location = useLocation();
  if (hasListParams(location.search)) return <ContentList key="nationaux" contentType="exam" national />;
  return <ContentFolders view="years" />;
};

/** /exams/nationaux/:annee : les sujets d'une année (« aucune » : sujets sans année). */
export const NationalYear: React.FC = () => {
  const { annee = '' } = useParams<{ annee: string }>();
  if (!/^(\d{4}|aucune)$/.test(annee)) return <NotFound />;
  return <ContentList key={`nationaux-${annee}`} contentType="exam" national nationalYear={annee} />;
};

export default ContentHub;

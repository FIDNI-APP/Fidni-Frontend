// /discussions (09/11/2026), deux onglets qui ne se mélangent plus. Forum : des sujets avec un titre, par salons, et ceux qui
// attendent une réponse. Commentaires : ce que les membres écrivent sous les exercices, les leçons et les examens, sans attendre
// forcément de réponse ; une ligne mène à l'onglet du contenu. Filtres dans l'adresse (vue, salon, tri, recherche, niveau,
// chapitre, auteur) : un lien partagé ouvre la même vue. Niveau et chapitre un cran plus loin, derrière « Filtres ».
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Page, PageHeader, QuietMenu, UnderlineTabs } from '@/components/space/Page';
import { SEO } from '@/components/layout/SEO';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { fieldCls } from '@/components/enregistrements/ModalShell';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { getClassLevels } from '@/lib/api';
import { getTaxonomy, type TaxonomyLevel } from '@/components/skilliq/api';
import {
  getDiscussionCount, getDiscussions, type DiscussionCardData, type DiscussionFilters, type DiscussionSort, type Salon,
} from '@/lib/api/discussionsApi';
import { CommentRow, DiscussionRow } from '@/components/discussions/DiscussionRow';
import { SalonBlocs } from '@/components/discussions/SalonBlocs';
import { salonOf } from '@/components/discussions/parts';
import { t } from '@/i18n';

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

const SkeletonRows: React.FC = () => (
  <ul className="animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label={t('Chargement')}>
    {[0, 1, 2, 3].map((i) => (
      <li key={i} className="flex gap-4 py-4">
        <span className="h-10 w-10 shrink-0 rounded-full bg-[#efece6]" />
        <span className="flex-1">
          <span className="block h-4 w-3/4 rounded bg-[#efece6]" />
          <span className="mt-2.5 block h-3 w-1/3 rounded bg-[#f2f1ee]" />
        </span>
      </li>
    ))}
  </ul>
);

export const DiscussionsHub: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const commentaires = params.get('vue') === 'commentaires';
  const salon = commentaires ? null : (params.get('salon') as Salon | null) || null;
  const triParam = (params.get('tri') as DiscussionSort | null) || 'recentes';
  // « Sans réponse » n'a de sens que dans le forum : un commentaire n'attend pas forcément de réponse.
  const tri: DiscussionSort = commentaires && triParam === 'sans_reponse' ? 'recentes' : triParam;
  const q = params.get('q') || '';
  const niveauParam = params.get('niveau');
  const niveau: number | 'tous' | null = niveauParam === 'tous' ? 'tous' : num(niveauParam);
  const chapitre = num(params.get('chapitre'));
  const auteur = params.get('auteur');
  const mine = !!auteur && !!user && auteur === user.username;

  const [search, setSearch] = useState(q);
  const [items, setItems] = useState<DiscussionCardData[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [effectiveLevel, setEffectiveLevel] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [aAider, setAAider] = useState(0);
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyLevel[]>([]);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const ancreFiltres = useRef<HTMLDivElement>(null);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v === null || v === '') next.delete(k); else next.set(k, v); });
    setParams(next, { replace: false });
  };

  const filters: DiscussionFilters = useMemo(() => ({
    genre: commentaires ? 'commentaire' : 'forum', salon, tri, q: q || undefined, niveau: niveau ?? undefined, chapitre, auteur,
  }), [commentaires, salon, tri, q, niveau, chapitre, auteur]);

  // Liste : première page à chaque changement de filtre.
  useEffect(() => {
    let alive = true;
    setItems(null);
    setFailed(false);
    getDiscussions({ ...filters, page: 1 })
      .then((d) => {
        if (!alive) return;
        setItems(d.results); setPage(1); setPages(d.pages); setEffectiveLevel(d.niveau);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [filters]);

  useEffect(() => {
    getClassLevels().then((l) => setLevels((l as { id: number | string; name: string }[]).map((x) => ({ id: Number(x.id), name: x.name })))).catch(() => {});
    getTaxonomy().then(setTaxonomy).catch(() => {});
  }, []);

  // Le même nombre que l'entrée « Discussions » du menu (membres seulement).
  useEffect(() => {
    if (!isAuthenticated) { setAAider(0); return; }
    getDiscussionCount().then(setAAider).catch(() => {});
  }, [isAuthenticated]);

  // Recherche : part 300 ms après la dernière touche.
  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (search.trim() === q) return;
      const next = new URLSearchParams(params);
      if (search.trim()) next.set('q', search.trim()); else next.delete('q');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [search, q, params, setParams]);

  const more = async () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const d = await getDiscussions({ ...filters, page: page + 1 });
      setItems((prev) => [...(prev ?? []), ...d.results]);
      setPage(d.page);
      setPages(d.pages);
    } finally {
      setLoadingMore(false);
    }
  };

  const chapters = useMemo(() => {
    const level = taxonomy.find((l) => l.id === (typeof niveau === 'number' ? niveau : effectiveLevel));
    return level ? level.subjects.flatMap((s) => s.chapters) : [];
  }, [taxonomy, niveau, effectiveLevel]);

  const write = () => {
    if (!isAuthenticated) { openModal('discussion'); return; }
    navigate(`/discussions/nouvelle${salon ? `?salon=${salon}` : ''}`);
  };

  const aSonNiveau = isAuthenticated && !!user?.profile?.class_level;
  const vue = mine ? 'mes' : tri;
  const choisirVue = (v: string) => {
    if (v === 'mes') set({ auteur: user?.username ?? null, tri: null });
    else set({ tri: v === 'recentes' ? null : v, auteur: null });
  };

  const nomNiveau = niveauParam === 'tous' ? t('Tous les niveaux') : levels.find((l) => l.id === niveau)?.name;
  const nomChapitre = chapters.find((c) => c.id === chapitre)?.name;
  const puces = [
    // Quitter un salon se voit ici : le second clic sur son bloc ne se devine pas.
    salon ? { cle: 'salon', label: t(salonOf(salon).label), retirer: () => set({ salon: null }) } : null,
    niveauParam && nomNiveau ? { cle: 'niveau', label: nomNiveau, retirer: () => set({ niveau: null, chapitre: null }) } : null,
    chapitre && nomChapitre ? { cle: 'chapitre', label: nomChapitre, retirer: () => set({ chapitre: null }) } : null,
    auteur && !mine ? {
      cle: 'auteur',
      label: commentaires ? t('Commentaires de {nom}', { nom: auteur }) : t('Discussions de {nom}', { nom: auteur }),
      retirer: () => set({ auteur: null }),
    } : null,
  ].filter(Boolean) as { cle: string; label: string; retirer: () => void }[];
  const nbFiltres = (niveauParam ? 1 : 0) + (chapitre ? 1 : 0);

  const videTexte = commentaires
    ? (q ? t('Aucun commentaire ne correspond.') : t('Aucun commentaire ici pour l’instant.'))
    : (q ? t('Aucune discussion ne correspond.')
      : tri === 'sans_reponse' ? t('Toutes les discussions ont une réponse.')
        : t('Aucune discussion ici pour l’instant.'));

  return (
    <Page width="narrow">
      <SEO title="Discussions entre élèves en maths | Fidni" canonicalUrl="/discussions"
        description="Le forum des élèves en maths (entraide, méthodes, bac et orientation) et leurs commentaires sous les leçons, les exercices et les examens." />

      <PageHeader title={t('Discussions')} actions={commentaires ? undefined : (
        <button type="button" onClick={write} className="fd-btn-primary inline-flex min-h-10 items-center gap-1.5 px-4">
          <Plus className="h-4 w-4" aria-hidden /> {t('Nouvelle discussion')}
        </button>
      )} />

      <UnderlineTabs<string> label="Forum ou commentaires" value={commentaires ? 'commentaires' : 'forum'}
        onChange={(v) => set({ vue: v === 'commentaires' ? v : null, salon: null, tri: null, auteur: mine ? auteur : null })}
        options={[{ key: 'forum', label: 'Forum' }, { key: 'commentaires', label: 'Commentaires' }]} />

      {!commentaires && <div className="mt-4"><SalonBlocs salon={salon} onChange={(s) => set({ salon: s, auteur: mine ? auteur : null })} /></div>}

      {/* Recherche ; à droite, ce qu'on regarde et les filtres. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-[#f2f1ee] px-3.5 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/25 max-sm:basis-full">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={commentaires ? t('Rechercher un commentaire…') : t('Rechercher une discussion…')}
            aria-label={commentaires ? t('Rechercher un commentaire') : t('Rechercher une discussion')}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint" />
        </label>
        <QuietMenu<string> label="Afficher" value={vue} onChange={choisirVue} options={commentaires ? [
          { value: 'recentes', label: t('Récents') },
          { value: 'populaires', label: t('Les plus utiles') },
          ...(isAuthenticated ? [{ value: 'suivies', label: t('Suivis') }, { value: 'mes', label: t('Mes commentaires') }] : []),
        ] : [
          { value: 'recentes', label: t('Récentes') },
          { value: 'populaires', label: t('Populaires') },
          { value: 'sans_reponse', label: t('Sans réponse') },
          ...(isAuthenticated ? [{ value: 'suivies', label: t('Suivies') }, { value: 'mes', label: t('Mes discussions') }] : []),
        ]} />
        <div ref={ancreFiltres}>
          <button type="button" onClick={() => setFiltresOuverts((o) => !o)} aria-haspopup="dialog" aria-expanded={filtresOuverts}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <SlidersHorizontal className="h-4 w-4 text-ink-faint" aria-hidden />
            {t('Filtres')}
            {nbFiltres > 0 && <span className="fd-nums rounded-full bg-ink px-1.5 text-[12px] font-bold text-white">{nbFiltres}</span>}
          </button>
          <FloatingPanel anchorRef={ancreFiltres} open={filtresOuverts} onClose={() => setFiltresOuverts(false)} placement="bottom-end" offset={6}
            className="w-[280px] rounded-2xl border border-line bg-white p-4 shadow-[0_14px_40px_rgba(20,18,16,.16)]">
            <label className="block text-[13px] font-medium text-ink-soft">
              {t('Niveau')}
              <select value={niveauParam ?? ''} onChange={(e) => set({ niveau: e.target.value || null, chapitre: null })} className={`${fieldCls} mt-1.5`}>
                <option value="">{aSonNiveau ? t('Mon niveau') : t('Tous les niveaux')}</option>
                {aSonNiveau && <option value="tous">{t('Tous les niveaux')}</option>}
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            {chapters.length > 0 && (
              <label className="mt-3 block text-[13px] font-medium text-ink-soft">
                {t('Chapitre')}
                <select value={chapitre ?? ''} onChange={(e) => set({ chapitre: e.target.value || null })} className={`${fieldCls} mt-1.5`}>
                  <option value="">{t('Tous les chapitres')}</option>
                  {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
          </FloatingPanel>
        </div>
      </div>

      {puces.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t('Filtres')}>
          {puces.map((p) => (
            <li key={p.cle}>
              <button type="button" onClick={p.retirer} aria-label={t('Retirer {nom}', { nom: p.label })}
                className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full bg-ink/[.06] pe-2.5 ps-3 text-[13px] font-medium text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                <span className="truncate">{p.label}</span>
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Le seul appel de la page, dans le forum : des membres attendent une réponse. */}
      {!commentaires && aAider > 0 && tri !== 'sans_reponse' && !auteur && !q && (
        <button type="button" onClick={() => set({ tri: 'sans_reponse', salon: null, auteur: null })}
          className="mt-3 flex min-h-10 w-full items-center gap-2.5 rounded-xl text-start text-[14px] text-ink-soft transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-gold" />
          <span className="min-w-0">
            {aAider > 1 ? t('{n} discussions attendent une réponse.', { n: aAider }) : t('Une discussion attend une réponse.')}
          </span>
          <span className="shrink-0 font-semibold text-brand-hover">{t('Voir ›')}</span>
        </button>
      )}

      <section aria-label={commentaires ? t('Commentaires') : t('Forum')} className="mt-2">
        {failed ? (
          <p role="alert" className="py-10 text-center text-[14px] text-ink-soft">
            {commentaires ? t('Les commentaires n’ont pas pu être chargés.') : t('Les discussions n’ont pas pu être chargées.')}
          </p>
        ) : !items ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[16px] text-ink-soft">{videTexte}</p>
            {!commentaires && (
              <button type="button" onClick={write} className="mt-3 inline-flex min-h-10 items-center text-[14px] font-semibold text-brand-hover hover:underline">
                {t('Lancer une discussion')}
              </button>
            )}
          </div>
        ) : (
          <>
            <ul>
              {items.map((d) => (commentaires
                ? <CommentRow key={d.id} d={d} montrerNiveau={effectiveLevel === null} />
                : <DiscussionRow key={d.id} d={d} montrerSalon={!salon} montrerNiveau={effectiveLevel === null} />))}
            </ul>
            {page < pages && (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={more} disabled={loadingMore}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t('Voir plus')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </Page>
  );
};

export default DiscussionsHub;

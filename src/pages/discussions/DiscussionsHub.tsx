// Les filtres et le tri sont conservés dans l’adresse partageable du fil.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown, Flame, Loader2, MessageCircle, MessagesSquare, PenLine, Plus, Search, SlidersHorizontal,
} from 'lucide-react';
import { EmptyState, Page, UnderlineTabs } from '@/components/space/Page';
import { SEO } from '@/components/layout/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { getClassLevels } from '@/lib/api';
import { getTaxonomy, type TaxonomyLevel } from '@/components/skilliq/api';
import {
  getDiscussionPanel, getDiscussions, type DiscussionCardData, type DiscussionFilters, type DiscussionPanel, type DiscussionSort, type Salon,
} from '@/lib/api/discussionsApi';
import { CommentCard, DiscussionCard } from '@/components/discussions/DiscussionCard';
import { AuthorName, Avatar, ContentTagCard, RoleBadge, SALONS } from '@/components/discussions/parts';
import { t } from '@/i18n';

type Tri = { key: DiscussionSort; label: string; membres?: boolean };
const SORTS: Tri[] = [
  { key: 'recentes', label: 'Récentes' },
  { key: 'populaires', label: 'Populaires' },
  { key: 'sans_reponse', label: 'Sans réponse' },
  { key: 'suivies', label: 'Suivies', membres: true },
];
// Un commentaire n'attend pas forcément de réponse : pas de « Sans réponse ».
const SORTS_COMMENTAIRES: Tri[] = [
  { key: 'recentes', label: 'Récents' },
  { key: 'populaires', label: 'Les plus utiles' },
  { key: 'suivies', label: 'Suivis', membres: true },
];

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

export const DiscussionsHub: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const commentaires = params.get('vue') === 'commentaires';
  const salon = commentaires ? null : (params.get('salon') as Salon | null) || null;
  const triParam = (params.get('tri') as DiscussionSort | null) || 'recentes';
  const tri: DiscussionSort = commentaires && triParam === 'sans_reponse' ? 'recentes' : triParam;
  const q = params.get('q') || '';
  const niveauParam = params.get('niveau');
  const niveau: number | 'tous' | null = niveauParam === 'tous' ? 'tous' : num(niveauParam);
  const chapitre = num(params.get('chapitre'));
  const auteur = params.get('auteur');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(q);
  const [items, setItems] = useState<DiscussionCardData[] | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [effectiveLevel, setEffectiveLevel] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [panel, setPanel] = useState<DiscussionPanel | null>(null);
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyLevel[]>([]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v === null || v === '') next.delete(k); else next.set(k, v); });
    setParams(next, { replace: false });
  };

  const filters: DiscussionFilters = useMemo(() => ({
    genre: commentaires ? 'commentaire' : 'forum', salon, tri, q: q || undefined, niveau: niveau ?? undefined, chapitre, auteur,
  }), [commentaires, salon, tri, q, niveau, chapitre, auteur]);

  // Fil : première page à chaque changement de filtre.
  useEffect(() => {
    let alive = true;
    setItems(null);
    setFailed(false);
    getDiscussions({ ...filters, page: 1 })
      .then((d) => {
        if (!alive) return;
        setItems(d.results); setCount(d.count); setPage(1); setPages(d.pages); setEffectiveLevel(d.niveau);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [filters]);

  // Colonne : salons, à aider, tendances, plus utiles (au même niveau que le fil).
  useEffect(() => {
    let alive = true;
    getDiscussionPanel(niveau ?? undefined).then((p) => { if (alive) setPanel(p); }).catch(() => {});
    return () => { alive = false; };
  }, [niveau]);

  useEffect(() => {
    getClassLevels().then((l) => setLevels((l as { id: number | string; name: string }[]).map((x) => ({ id: Number(x.id), name: x.name })))).catch(() => {});
    getTaxonomy().then(setTaxonomy).catch(() => {});
  }, []);
  useEffect(() => { setSearch(q); }, [q]);

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

  const salonCount = (key: Salon | null) => (key ? panel?.salons.find((s) => s.key === key)?.count : panel?.total) ?? null;
  const mine = !!auteur && !!user && auteur === user.username;
  const heading = commentaires
    ? (auteur ? (mine ? t('Mes commentaires') : t('Commentaires de {nom}', { nom: auteur })) : t('Tous les commentaires'))
    : auteur ? (mine ? t('Mes discussions') : t('Discussions de {nom}', { nom: auteur }))
      : salon ? t(SALONS.find((s) => s.key === salon)?.label ?? '') : t('Toutes les discussions');
  return (
    <Page width="wide">
      <SEO title="Discussions entre élèves en maths | Fidni" canonicalUrl="/discussions"
        description="Le forum des élèves en maths (entraide, méthodes, bac et orientation) et leurs commentaires sous les leçons, les exercices et les examens." />

      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4 sm:mb-6 sm:pt-6">
        <div className="min-w-0">
          <h1 className="fd-display text-ink" style={{ fontSize: 'clamp(29px, 4vw, 46px)', lineHeight: 1.08 }}>{t('Discussions')}</h1>
        </div>
        {!commentaires && (
          <button type="button" onClick={write} className="fd-btn-primary inline-flex min-h-11 items-center gap-1.5 px-3 text-[13px] sm:gap-2 sm:px-4 sm:text-sm">
            <Plus className="h-4 w-4" /> {t('Nouvelle discussion')}
          </button>
        )}
      </div>

      <UnderlineTabs<string> label="Forum ou commentaires" value={commentaires ? 'commentaires' : 'forum'} className="mb-5"
        onChange={(v) => set({ vue: v === 'commentaires' ? v : null, salon: null, tri: null, auteur: mine ? auteur : null })}
        options={[{ key: 'forum', label: 'Forum' }, { key: 'commentaires', label: 'Commentaires' }]} />

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0">
          {/* Recherche et filtres */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <form className="relative min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() || null }); }}>
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => { if (search.trim() !== q) set({ q: search.trim() || null }); }}
                placeholder={commentaires ? t('Rechercher un commentaire…') : t('Rechercher une discussion…')}
                aria-label={commentaires ? t('Rechercher un commentaire') : t('Rechercher une discussion')}
                className="h-11 w-full rounded-xl border border-line bg-white ps-9 pe-3 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </form>
            <button type="button" aria-expanded={filtersOpen} aria-controls="filtres-discussions" onClick={() => setFiltersOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink">
              <SlidersHorizontal size={15} aria-hidden />{t('Filtres')}
              {(niveauParam || chapitre) && <span className="fd-nums text-brand-hover">{Number(!!niveauParam) + Number(!!chapitre)}</span>}
            </button>
          </div>
          <div id="filtres-discussions" hidden={!filtersOpen}>
            <div className="mb-4 grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2">
              <div className="relative">
                <select aria-label={t('Niveau')} value={niveauParam ?? ''} onChange={(e) => set({ niveau: e.target.value || null, chapitre: null })}
                  className="h-11 w-full appearance-none rounded-xl border border-line bg-white ps-3 pe-9 text-[14px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
                  <option value="">{isAuthenticated && user?.profile?.class_level ? t('Mon niveau') : t('Tous les niveaux')}</option>
                  {isAuthenticated && user?.profile?.class_level && <option value="tous">{t('Tous les niveaux')}</option>}
                  {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              </div>
              {chapters.length > 0 && (
                <div className="relative max-w-full">
                  <select aria-label={t('Chapitre')} value={chapitre ?? ''} onChange={(e) => set({ chapitre: e.target.value || null })}
                    className="h-11 w-full appearance-none truncate rounded-xl border border-line bg-white ps-3 pe-9 text-[14px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
                    <option value="">{t('Tous les chapitres')}</option>
                    {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                </div>
              )}
            </div>
          </div>
          {!commentaires && (
            <nav aria-label={t('Salons')} className="mb-5 flex flex-wrap items-center gap-1 border-b border-line pb-3">
              {[{ key: null, label: 'Tous', icon: MessagesSquare }, ...SALONS].map(({ key, label, icon: Icon }) => {
                const active = salon === key && !auteur;
                const count = salonCount(key);
                return (
                  <button key={key ?? 'tous'} type="button" onClick={() => set({ salon: key, auteur: null })}
                    aria-pressed={active}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium ${active ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-white'}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />{t(label)}
                    {count !== null && <span className="fd-nums text-xs font-normal">{count}</span>}
                  </button>
                );
              })}
            </nav>
          )}
          {(auteur || (isAuthenticated && user)) && (
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {isAuthenticated && user && <button type="button" className="min-h-9 text-ink-soft underline underline-offset-4" aria-pressed={mine}
                onClick={() => set({ auteur: mine ? null : user.username, salon: null, tri: null })}>
                {commentaires ? t('Mes commentaires') : t('Mes discussions')}
              </button>}
              {auteur && !mine && <button type="button" className="min-h-9 underline" onClick={() => set({ auteur: null })}>
                {commentaires ? t('Tous les commentaires') : t('Toutes les discussions')}
              </button>}
            </div>
          )}
          {/* Fil */}
          <section aria-labelledby="fil-titre" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="fil-titre" className="fd-display flex items-baseline gap-2 text-[20px] text-ink">
                {heading}
                {items && <span className="font-sans text-[13px] font-semibold text-ink-faint fd-nums">{count}</span>}
              </h2>
              <div className="relative inline-flex items-center">
                <select aria-label={t('Trier')} value={tri} onChange={(event) => set({ tri: event.target.value === 'recentes' ? null : event.target.value, auteur: event.target.value === 'suivies' ? null : auteur })}
                  className="min-h-10 appearance-none rounded-lg bg-transparent ps-2 pe-7 text-sm font-medium text-ink-soft">
                  {(commentaires ? SORTS_COMMENTAIRES : SORTS).filter((option) => !option.membres || isAuthenticated).map((option) => (
                    <option key={option.key} value={option.key}>{t(option.label)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute end-2" aria-hidden />
              </div>
            </div>

            {failed ? (
              <p role="alert" className="rounded-2xl border border-line bg-white px-4 py-3 text-[13.5px] text-ink-soft">
                {commentaires ? t('Les commentaires n’ont pas pu être chargés.') : t('Les discussions n’ont pas pu être chargées.')}
              </p>
            ) : !items ? (
              <div className="space-y-2.5" aria-busy="true">
                {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-line bg-white" />)}
              </div>
            ) : items.length === 0 ? (
              commentaires ? (
                <EmptyState icon={MessageCircle} compact title={q ? t('Aucun commentaire ne correspond.') : t('Aucun commentaire ici pour l’instant.')} />
              ) : (
                <EmptyState icon={MessagesSquare} compact
                  title={q ? t('Aucune discussion ne correspond.') : tri === 'sans_reponse' ? t('Toutes les discussions ont une réponse.') : t('Aucune discussion ici pour l’instant.')}
                  action={<button type="button" onClick={write} className="fd-btn-primary inline-flex min-h-10 items-center gap-2"><PenLine className="h-4 w-4" /> {t('Lancer une discussion')}</button>} />
              )
            ) : (
              <>
                <div className="divide-y divide-line border-y border-line bg-white px-3 sm:px-5">
                  {items.map((d) => (commentaires ? <CommentCard key={d.id} d={d} /> : <DiscussionCard key={d.id} d={d} />))}
                </div>
                {page < pages && (
                  <div className="mt-4 flex justify-center">
                    <button type="button" onClick={more} disabled={loadingMore} className="fd-btn-ghost inline-flex min-h-10 items-center gap-2">
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} {t('Voir plus')}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Colonne */}
        <aside className="space-y-5 xl:sticky xl:top-[84px]">
          {!commentaires && panel && panel.sans_reponse > 0 && tri !== 'sans_reponse' && (
            <div className="rounded-xl border-s-[3px] border-brand bg-brand-soft p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-hover"><MessageCircle className="h-4 w-4" /> {t('À aider')}</p>
              <p className="mt-1 text-[14px] text-ink">
                {panel.sans_reponse > 1 ? t('{n} discussions attendent une réponse.', { n: panel.sans_reponse }) : t('Une discussion attend une réponse.')}
              </p>
              <button type="button" onClick={() => set({ tri: 'sans_reponse', auteur: null })}
                className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-ink px-3 text-[13px] font-semibold text-white hover:bg-black">
                {t('Voir')}
              </button>
            </div>
          )}
          {!commentaires && panel && panel.tendances.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink"><Flame className="h-4 w-4 text-gold" /> {t('Les plus discutés')}</p>
              <ul className="space-y-2">
                {panel.tendances.map((x) => (
                  <li key={x.content.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1"><ContentTagCard tag={x.content} compact /></div>
                    {/* Les discussions de ce contenu : en bas de son onglet Commentaires (« Dans le forum »). */}
                    <Link to={`${x.content.url}?onglet=discussions`} title={t('Voir les discussions')}
                      className="shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[12px] font-semibold text-ink-soft fd-nums hover:bg-line">
                      {x.discussions}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {panel && panel.utiles.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-2.5 text-[13px] font-semibold text-ink">{t('Les plus utiles')} <span className="font-medium text-ink-faint">· {t('30 jours')}</span></p>
              <ol className="space-y-2.5">
                {panel.utiles.map((u, i) => (
                  <li key={u.author.id} className="flex items-center gap-2.5">
                    <span className="w-4 text-center text-[12px] font-semibold text-ink-faint fd-nums">{i + 1}</span>
                    <Avatar user={u.author} size={30} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <AuthorName author={u.author} className="block truncate text-[13.5px]" />
                      <RoleBadge author={u.author} />
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-brand-hover fd-nums">▲ {u.utile}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </Page>
  );
};

export default DiscussionsHub;

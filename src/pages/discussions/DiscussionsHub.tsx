// /discussions (08/11/2026) : l'espace Discussions (backend apps/discussions). Deux onglets depuis le 09/11/2026 : le forum,
// par salons, et les commentaires écrits sous les leçons, les exercices et les examens, dont chaque carte mène à l'onglet
// du contenu. Les filtres sont dans l'adresse (vue, salon, tri, recherche, niveau, chapitre, auteur) : un lien partagé ouvre
// la même vue. Ordinateur : salons à gauche, fil au centre, colonne à droite (à aider, contenus les plus discutés, membres
// les plus utiles). Téléphone : salons en pastilles qui défilent, la colonne de droite sous le fil.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bookmark, ChevronDown, Flame, Loader2, MessageCircle, MessagesSquare, PenLine, Plus, Search, Sparkles, UserRound,
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

type Icone = React.ComponentType<{ className?: string }>;

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
  const resume = commentaires
    ? (items ? (count > 1 ? t('{n} commentaires', { n: count }) : t('{n} commentaire', { n: count })) : '')
    : panel ? [panel.total > 1 ? t('{n} discussions', { n: panel.total }) : t('{n} discussion', { n: panel.total }),
      panel.sans_reponse ? t('{n} sans réponse', { n: panel.sans_reponse }) : null].filter(Boolean).join(' · ') : '';

  const lien = (key: string, label: string, Icon: Icone, active: boolean, onClick: () => void, n: number | null = null) => (
    <button key={key} type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-start text-[14px] transition-colors ${
        active ? 'bg-ink font-semibold text-white' : 'font-medium text-ink-soft hover:bg-[#f2f1ee] hover:text-ink'}`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-gold' : 'text-ink-faint'}`} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {n !== null && <span className={`fd-nums text-[12px] ${active ? 'text-white/70' : 'text-ink-faint'}`}>{n}</span>}
    </button>
  );

  return (
    <Page width="full">
      <SEO title="Discussions entre élèves en maths | Fidni" canonicalUrl="/discussions"
        description="Le forum des élèves en maths (entraide, méthodes, bac et orientation) et leurs commentaires sous les leçons, les exercices et les examens." />

      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="fd-display text-ink" style={{ fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.08 }}>{t('Discussions')}</h1>
          <p className="mt-1.5 min-h-5 text-[13.5px] text-ink-faint fd-nums">{resume}</p>
        </div>
        {!commentaires && (
          <button type="button" onClick={write} className="fd-btn-primary inline-flex min-h-11 items-center gap-2 px-4">
            <Plus className="h-4 w-4" /> {t('Nouvelle discussion')}
          </button>
        )}
      </div>

      <UnderlineTabs<string> label="Forum ou commentaires" value={commentaires ? 'commentaires' : 'forum'} className="mb-5"
        onChange={(v) => set({ vue: v === 'commentaires' ? v : null, salon: null, tri: null, auteur: mine ? auteur : null })}
        options={[{ key: 'forum', label: 'Forum' }, { key: 'commentaires', label: 'Commentaires' }]} />

      {/* Recherche et filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative min-w-[220px] flex-1" onSubmit={(e) => { e.preventDefault(); set({ q: search.trim() || null }); }}>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => { if (search.trim() !== q) set({ q: search.trim() || null }); }}
            placeholder={commentaires ? t('Rechercher un commentaire…') : t('Rechercher une discussion…')}
            aria-label={commentaires ? t('Rechercher un commentaire') : t('Rechercher une discussion')}
            className="h-11 w-full rounded-xl border border-line bg-white ps-9 pe-3 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        </form>
        <label className="relative">
          <span className="sr-only">{t('Niveau')}</span>
          <select value={niveauParam ?? ''} onChange={(e) => set({ niveau: e.target.value || null, chapitre: null })}
            className="h-11 appearance-none rounded-xl border border-line bg-white ps-3 pe-9 text-[14px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
            <option value="">{isAuthenticated && user?.profile?.class_level ? t('Mon niveau') : t('Tous les niveaux')}</option>
            {isAuthenticated && user?.profile?.class_level && <option value="tous">{t('Tous les niveaux')}</option>}
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        </label>
        {chapters.length > 0 && (
          <label className="relative max-w-full">
            <span className="sr-only">{t('Chapitre')}</span>
            <select value={chapitre ?? ''} onChange={(e) => set({ chapitre: e.target.value || null })}
              className="h-11 max-w-[260px] appearance-none truncate rounded-xl border border-line bg-white ps-3 pe-9 text-[14px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
              <option value="">{t('Tous les chapitres')}</option>
              {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          </label>
        )}
      </div>

      {/* Téléphone : salons en pastilles */}
      {!commentaires && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide lg:hidden">
          {[{ key: null as Salon | null, label: t('Tous') }, ...SALONS.map((s) => ({ key: s.key as Salon | null, label: t(s.label) }))].map((s) => {
            const active = salon === s.key && !auteur;
            return (
              <button key={s.key ?? 'tous'} type="button" onClick={() => set({ salon: s.key, auteur: null })}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft'}`}>
                {s.label}
                {salonCount(s.key) !== null && <span className={`fd-nums ${active ? 'text-white/70' : 'text-ink-faint'}`}>{salonCount(s.key)}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)_280px] xl:gap-8">
        {/* Salons, ou les commentaires */}
        <aside className="sticky top-[84px] hidden lg:block" aria-label={commentaires ? t('Commentaires') : t('Salons')}>
          <p className="mb-1.5 px-2.5 text-[12px] font-medium text-ink-faint">{commentaires ? t('Commentaires') : t('Salons')}</p>
          <nav className="flex flex-col gap-0.5">
            {commentaires
              ? lien('tous', t('Tous les commentaires'), MessageCircle, !auteur && tri !== 'suivies', () => set({ auteur: null, tri: null }))
              : (
                <>
                  {lien('tous', t('Tous'), MessagesSquare, !salon && !auteur, () => set({ salon: null, auteur: null }), salonCount(null))}
                  {SALONS.map((s) => lien(s.key, t(s.label), s.icon, salon === s.key && !auteur, () => set({ salon: s.key, auteur: null }), salonCount(s.key)))}
                </>
              )}
          </nav>
          {isAuthenticated && user && (
            <>
              <p className="mb-1.5 mt-5 px-2.5 text-[12px] font-medium text-ink-faint">{t('Moi')}</p>
              <nav className="flex flex-col gap-0.5">
                {lien('mes', commentaires ? t('Mes commentaires') : t('Mes discussions'), UserRound, mine,
                  () => set({ auteur: user.username, salon: null, tri: null }))}
                {lien('suivies', commentaires ? t('Suivis') : t('Suivies'), Bookmark, tri === 'suivies' && !auteur,
                  () => set({ tri: 'suivies', auteur: null }))}
              </nav>
            </>
          )}
        </aside>

        {/* Fil */}
        <section aria-labelledby="fil-titre" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="fil-titre" className="fd-display flex items-baseline gap-2 text-[20px] text-ink">
              {heading}
              {items && <span className="font-sans text-[13px] font-semibold text-ink-faint fd-nums">{count}</span>}
            </h2>
            <div role="tablist" aria-label={t('Trier')} className="flex flex-wrap gap-1 rounded-full border border-line bg-white p-1">
              {(commentaires ? SORTS_COMMENTAIRES : SORTS).filter((s) => !s.membres || isAuthenticated).map((s) => (
                <button key={s.key} type="button" role="tab" aria-selected={tri === s.key} onClick={() => set({ tri: s.key === 'recentes' ? null : s.key })}
                  className={`min-h-8 rounded-full px-3 text-[13px] font-semibold transition-colors ${
                    tri === s.key ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}>
                  {t(s.label)}
                </button>
              ))}
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
              <div className="space-y-2.5">
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

        {/* Colonne */}
        <aside className="space-y-4 lg:sticky lg:top-[84px]">
          {!commentaires && panel && panel.sans_reponse > 0 && tri !== 'sans_reponse' && (
            <div className="rounded-2xl border border-gold-line bg-gold-soft/60 p-4">
              <p className="flex items-center gap-2 text-[13px] font-bold text-gold-strong"><Sparkles className="h-4 w-4" /> {t('À aider')}</p>
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
              <p className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-ink"><Flame className="h-4 w-4 text-gold" /> {t('Les plus discutés')}</p>
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
              <p className="mb-2.5 text-[13px] font-bold text-ink">{t('Les plus utiles')} <span className="font-medium text-ink-faint">· {t('30 jours')}</span></p>
              <ol className="space-y-2.5">
                {panel.utiles.map((u, i) => (
                  <li key={u.author.id} className="flex items-center gap-2.5">
                    <span className="w-4 text-center text-[12px] font-bold text-ink-faint fd-nums">{i + 1}</span>
                    <Avatar user={u.author} size={30} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <AuthorName author={u.author} className="block truncate text-[13.5px]" />
                      <RoleBadge author={u.author} />
                    </span>
                    <span className="shrink-0 text-[12.5px] font-bold text-brand-hover fd-nums">▲ {u.utile}</span>
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

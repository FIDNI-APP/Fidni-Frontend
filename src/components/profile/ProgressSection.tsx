// src/components/profile/ProgressSection.tsx
// Onglet « Réussis / à revoir » du profil (refonte du 11/10/2026) : les exercices que l'élève a notés.
// Un bilan (réussis · à revoir), un filtre, un classement (à revoir d'abord, par chapitre, par matière, temps),
// une recherche quand la liste est longue. Les « à revoir » renvoient à Réviser › À refaire.
// Ordre du serveur : le plus récemment noté d'abord, dans chaque liste (GET /users/<u>/success_thing/, review_thing/).
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Clock, Dumbbell, RotateCcw, Search, Target, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CardsSkeleton, EmptyState, Segmented, SplitBar } from '@/components/space/Page';
import { hubPath, profileLevel } from '@/lib/api/hubApi';
import { duration } from '@/pages/progression/format';
import type { Content } from '@/types';

interface ProgressSectionProps {
  successExercises: Content[];
  reviewExercises: Content[];
  isLoading: boolean;
  failed?: boolean;
  onRetry?: () => void;
}

type Status = 'success' | 'review';
type Filter = 'all' | Status;
type Order = 'default' | 'chapter' | 'subject' | 'time';
type Rated = Content & { status: Status };

interface Group { key: string; name: string; success: number; review: number; seconds: number; items: Rated[] }

const SHOWN = 12;
const SEARCH_FROM = 8;
/** En dessous, ni filtre ni classement : la liste se lit d'un coup d'œil. */
const TOOLS_FROM = 5;

const pathOf = (c: Content) => `/${c.type === 'exam' ? 'exams' : c.type === 'lesson' ? 'lessons' : 'exercises'}/${c.id}`;
const timeOf = (c: Content) => (c.user_timespent && c.user_timespent >= 60 ? duration(c.user_timespent) : null);
const chapterOf = (c: Content) => c.chapters?.[0]?.name;

function groupBy(items: Rated[], keyOf: (c: Rated) => { key: string; name: string }[]): Group[] {
  const map = new Map<string, Group>();
  items.forEach((c) => keyOf(c).forEach(({ key, name }) => {
    const g = map.get(key) ?? { key, name, success: 0, review: 0, seconds: 0, items: [] };
    g[c.status] += 1;
    g.seconds += c.user_timespent || 0;
    g.items.push(c);
    map.set(key, g);
  }));
  // Les groupes où il reste le plus à revoir d'abord, puis les plus fournis.
  return [...map.values()].sort((a, b) => b.review - a.review || b.items.length - a.items.length || a.name.localeCompare(b.name, 'fr'));
}

const byChapter = (c: Rated) => (c.chapters?.length
  ? c.chapters.map((ch) => ({ key: `c${ch.id}`, name: ch.name }))
  : [{ key: 'aucun', name: 'Sans chapitre' }]);
const bySubject = (c: Rated) => [{ key: `s${c.subject?.id ?? 'aucune'}`, name: c.subject?.name || 'Sans matière' }];

/** Pastille d'état : icône + mot (jamais la couleur seule). */
const StatusTile: React.FC<{ status: Status; small?: boolean }> = ({ status, small }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-xl ${small ? 'h-8 w-8' : 'mt-0.5 h-9 w-9'} ${
    status === 'success' ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-gold-strong'}`} aria-hidden>
    {status === 'success' ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
  </span>
);

const StatusWord: React.FC<{ status: Status }> = ({ status }) => (
  <span className={`font-semibold ${status === 'success' ? 'text-brand-hover' : 'text-gold-strong'}`}>
    {status === 'success' ? 'Réussi' : 'À revoir'}
  </span>
);

const ExerciseCard: React.FC<{ item: Rated }> = ({ item }) => {
  const meta = [chapterOf(item), timeOf(item)].filter(Boolean).join(' · ');
  return (
    <li>
      <Link to={pathOf(item)}
        className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <StatusTile status={item.status} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug text-ink line-clamp-2">{item.title}</span>
          <span className="mt-1 block truncate text-[12.5px] text-ink-faint">
            <StatusWord status={item.status} />{meta && <> · {meta}</>}
          </span>
        </span>
        {item.status === 'review' && (
          <span className="hidden shrink-0 items-center gap-1 self-center text-[12.5px] font-semibold text-brand-hover group-hover:underline sm:inline-flex">
            Refaire <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </Link>
    </li>
  );
};

const GroupBlock: React.FC<{ group: Group }> = ({ group }) => (
  <details className="group/g rounded-2xl border border-line bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open/g:rotate-90" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{group.name}</span>
        <span className="mt-1.5 flex items-center gap-3">
          <SplitBar success={group.success} review={group.review} total={group.items.length} className="w-24 shrink-0 sm:w-32" />
          <span className="truncate text-[12.5px] text-ink-faint">
            <b className="fd-nums font-semibold text-brand-hover">{group.success}</b> réussi{group.success > 1 ? 's' : ''}
            {group.review > 0 && <> · <b className="fd-nums font-semibold text-gold-strong">{group.review}</b> à revoir</>}
          </span>
        </span>
      </span>
      {group.seconds >= 60 && <span className="fd-nums hidden shrink-0 text-[12.5px] text-ink-faint sm:inline">{duration(group.seconds)}</span>}
    </summary>
    <ul className="divide-y divide-line border-t border-line">
      {group.items.map((c) => (
        <li key={`${group.key}-${c.id}`}>
          <Link to={pathOf(c)} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-[#fcfbf9] focus:outline-none focus-visible:bg-[#f7f6f3] sm:px-5">
            <StatusTile status={c.status} small />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink">{c.title}</span>
              <span className="block text-[12px] text-ink-faint"><StatusWord status={c.status} />{timeOf(c) && <> · {timeOf(c)}</>}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  </details>
);

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  successExercises = [], reviewExercises = [], isLoading, failed = false, onRetry,
}) => {
  const { user } = useAuth();
  const level = profileLevel(user);
  const startUrl = level ? hubPath('exercises', level.slug) : '/exercises';
  const [filter, setFilter] = useState<Filter>('all');
  const [order, setOrder] = useState<Order>('default');
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);

  const success = useMemo(() => (Array.isArray(successExercises) ? successExercises : []), [successExercises]);
  const review = useMemo(() => (Array.isArray(reviewExercises) ? reviewExercises : []), [reviewExercises]);
  // À revoir d'abord (le plus récemment noté en tête), puis les réussis.
  const items = useMemo<Rated[]>(() => [
    ...review.map((c) => ({ ...c, status: 'review' as const })),
    ...success.map((c) => ({ ...c, status: 'success' as const })),
  ], [success, review]);
  const total = items.length;
  const seconds = items.reduce((n, c) => n + (c.user_timespent || 0), 0);
  const subjects = new Set(items.map((c) => c.subject?.name || '')).size;

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = items.filter((c) => (filter === 'all' || c.status === filter) && (!q || c.title.toLowerCase().includes(q)));
    return order === 'time' ? [...list].sort((a, b) => (b.user_timespent || 0) - (a.user_timespent || 0)) : list;
  }, [items, filter, q, order]);
  const groups = useMemo(() => (order === 'chapter' ? groupBy(visible, byChapter) : order === 'subject' ? groupBy(visible, bySubject) : null),
    [visible, order]);

  if (isLoading) return <CardsSkeleton n={4} className="sm:grid-cols-2" />;

  if (failed && total === 0) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
        <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Tes exercices n’ont pas pu se charger. Vérifie ta connexion.</p>
        {onRetry && <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>}
      </div>
    );
  }

  if (total === 0) {
    return (
      <EmptyState icon={Target} title="Rien de noté pour l’instant"
        text="Après un exercice, dis si tu l’as réussi ou s’il est à revoir : il apparaîtra ici, et ceux à revoir t’attendront dans Réviser."
        action={<Link to={startUrl} className="fd-btn-primary min-h-10"><Dumbbell className="h-4 w-4" /> S’entraîner</Link>} />
    );
  }

  const shown = all ? visible : visible.slice(0, SHOWN);
  const orders: { key: Order; label: string }[] = [
    { key: 'default', label: filter === 'all' ? 'À revoir d’abord' : 'Les plus récents' },
    { key: 'chapter', label: 'Par chapitre' },
    ...(subjects > 1 ? [{ key: 'subject' as const, label: 'Par matière' }] : []),
    { key: 'time', label: 'Temps passé' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Bilan : combien de notés, la part réussie, ce qui reste à refaire. */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-ink-soft">
              <b className="fd-nums text-[22px] font-bold text-ink">{total}</b> exercice{total > 1 ? 's' : ''} noté{total > 1 ? 's' : ''} :{' '}
              <b className="fd-nums font-semibold text-brand-hover">{success.length}</b> réussi{success.length > 1 ? 's' : ''},{' '}
              <b className="fd-nums font-semibold text-gold-strong">{review.length}</b> à revoir
            </p>
            <SplitBar success={success.length} review={review.length} total={total} className="mt-2.5 max-w-md" />
          </div>
          {seconds >= 60 && (
            <p className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-ink-faint">
              <Clock className="h-4 w-4" aria-hidden /> <span className="fd-nums font-semibold text-ink-soft">{duration(seconds)}</span> passées dessus
            </p>
          )}
        </div>
        {review.length > 0 && (
          <Link to="/reviser#a-refaire"
            className="flex min-h-11 items-center gap-2 border-t border-line bg-gold-soft/60 px-4 text-[13px] font-semibold text-gold-strong hover:underline sm:px-5">
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{review.length} à revoir : les refaire dans Réviser</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        )}
      </div>

      {/* Filtre, classement, recherche (seulement quand la liste est assez longue). */}
      {total >= TOOLS_FROM && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Segmented<Filter> label="Afficher" value={filter} onChange={(v) => { setFilter(v); setAll(false); }}
            options={[
              { key: 'all', label: 'Tous', count: total },
              { key: 'success', label: 'Réussis', count: success.length },
              { key: 'review', label: 'À revoir', count: review.length },
            ]} />
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            {total > SEARCH_FROM && (
              <label className="relative min-w-0 flex-1 sm:max-w-[240px]">
                <span className="sr-only">Rechercher un exercice</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setAll(false); }} placeholder="Rechercher…"
                  className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-[13px] text-ink-faint">
              <span className="shrink-0">Classer</span>
              <select value={order} onChange={(e) => setOrder(e.target.value as Order)}
                className="h-10 rounded-xl border border-line bg-white px-3 text-[13.5px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30">
                {orders.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        q ? (
          <EmptyState compact icon={Search} tone="ink" title="Aucun exercice ne correspond"
            text={`Rien ne contient « ${query.trim()} »${filter !== 'all' ? ' dans ce filtre' : ''}.`}
            action={<button type="button" onClick={() => setQuery('')} className="fd-btn-ghost min-h-10"><X className="h-4 w-4" /> Effacer la recherche</button>} />
        ) : filter === 'review' ? (
          <EmptyState compact icon={Check} title="Rien à revoir"
            text="Tous les exercices que tu as notés sont réussis. Bravo !" />
        ) : (
          <EmptyState compact icon={RotateCcw} tone="gold" title="Pas encore de réussi"
            text="Refais un exercice à revoir : quand tu le réussis, marque-le « Réussi »."
            action={<Link to="/reviser#a-refaire" className="fd-btn-ghost min-h-10">Ouvrir Réviser</Link>} />
        )
      ) : groups ? (
        <div className="flex flex-col gap-3">
          {groups.map((g) => <GroupBlock key={g.key} group={g} />)}
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((c) => <ExerciseCard key={`${c.status}-${c.id}`} item={c} />)}
          </ul>
          {visible.length > SHOWN && (
            <button type="button" onClick={() => setAll((v) => !v)} className="-mt-3 min-h-10 self-start text-[13px] font-semibold text-brand-hover hover:underline">
              {all ? 'Voir moins' : `Voir les ${visible.length} exercices`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ProgressSection;

/**
 * Réviser (/reviser, refonte du 11/10/2026) : une seule page au lieu de deux onglets (« Préparer un DS »,
 * « Mes révisions ») et d'un encart caché. Trois réponses, dans l'ordre où l'élève se les pose :
 *  1. Mon prochain DS : la date, où j'en suis, « Continuer ma préparation » (plan : /revisions/ds/:id) ;
 *  2. À refaire : ce que j'ai raté, le plus ancien d'abord (GET /api/revision-lists/suggestions/?tout=1) ;
 *  3. Mes listes : les exercices que j'ai mis de côté, à refaire à la suite ou à imprimer.
 * Les anciennes adresses (/revision-lists?onglet=ds|listes) y mènent (App.tsx, RevisionsRedirect).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, CalendarCheck, CalendarPlus, Check, ChevronRight, ClipboardCheck, ListChecks, ListPlus, Loader2,
  Pencil, Plus, RotateCcw, Sparkles, Target, Timer, Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Page, PageHeader, Section, EmptyState, SplitBar, CardsSkeleton } from '@/components/space/Page';
import { Countdown, DateTile, GradeBadge, ReadinessRing } from '@/components/devoirs/ui';
import { GradeForm } from '@/components/devoirs/GradeForm';
import { TestFormModal } from '@/components/devoirs/TestFormModal';
import { CreateListModal } from '@/components/revision/CreateListModal';
import { devoirsApi, longDate, testTitle, type UpcomingTest } from '@/lib/api/devoirsApi';
import {
  deleteRevisionList, getRevisionLists, getToRedo, quickAddManyToRevision, type RevisionList, type ToRedoItem,
} from '@/lib/api/revisionListApi';

type ReviserTab = 'ds' | 'a-refaire' | 'listes';
const TABS: { key: ReviserTab; label: string }[] = [
  { key: 'ds', label: 'Mes DS' }, { key: 'a-refaire', label: 'À refaire' }, { key: 'listes', label: 'Mes listes' },
];
/** Anciens liens à ancre (avant les onglets) → onglet. */
const HASH_TAB: Record<string, ReviserTab> = { 'prochain-ds': 'ds', 'a-refaire': 'a-refaire', 'mes-listes': 'listes' };
const REDO_SHOWN = 6;
const PAST_SHOWN = 4;

const ago = (days: number | null) => (days === null ? '' : days <= 0 ? 'aujourd’hui' : days === 1 ? 'hier' : `il y a ${days} j`);

/* ───────────────────────── 1. Prochain DS ───────────────────────── */

const NextTestHero: React.FC<{ test: UpcomingTest; others: UpcomingTest[]; onEdit: (t: UpcomingTest) => void }> = ({ test, others, onEdit }) => (
  <div className="overflow-hidden rounded-3xl border border-line bg-white">
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <div className="flex items-start gap-4 sm:flex-1">
        <DateTile date={test.date} size="lg" urgent={test.days_left <= 1} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Countdown days={test.days_left} />
            {test.mock_done_at && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand-hover">
                <ClipboardCheck className="h-3.5 w-3.5" /> DS blanc fait
              </span>
            )}
          </div>
          <h3 className="fd-display mt-2 text-[24px] leading-tight text-ink">{testTitle(test)}</h3>
          <p className="mt-0.5 text-[13px] text-ink-faint">{longDate(test.date)}</p>
          {test.chapters.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Chapitres du DS">
              {test.chapters.map((c) => {
                const weak = test.weak_chapters?.includes(c.name);
                return (
                  <li key={c.id} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${weak ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink-soft'}`}>
                    {c.name}{weak && <span className="sr-only"> (à renforcer)</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:w-[260px] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="flex items-center gap-3">
          <ReadinessRing value={test.readiness ?? null} size={64} />
          <p className="text-[13px] leading-snug text-ink-soft">
            {test.readiness == null ? <>Pas encore de mesure : quelques exercices suffisent.</>
              : test.weak_chapters?.length ? <>À renforcer : <b className="font-semibold text-ink">{test.weak_chapters[0]}</b></>
                : <>Tu es sur la bonne voie.</>}
          </p>
        </div>
        <Link to={`/revisions/ds/${test.id}`} className="fd-btn-primary min-h-11 w-full justify-center" data-tour="reviser-preparer">
          Continuer ma préparation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-[#fcfbf9] px-5 py-2.5 text-[12.5px] sm:px-6">
      <Link to={`/revisions/ds/${test.id}/blanc`} className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-ink-soft hover:text-ink">
        <Timer className="h-4 w-4" /> DS blanc chronométré
      </Link>
      <button type="button" onClick={() => onEdit(test)} className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-ink-soft hover:text-ink">
        <Pencil className="h-3.5 w-3.5" /> Modifier
      </button>
      {others.length > 0 && <span className="text-ink-faint sm:ml-auto">Puis : {others.map((o) => `${testTitle(o)} (${new Date(`${o.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})`).join(' · ')}</span>}
    </div>
  </div>
);

const NoTestCard: React.FC<{ onAdd: () => void; hasPast: boolean }> = ({ onAdd, hasPast }) => (
  <div className="overflow-hidden rounded-3xl border border-dashed border-[#d8d4cc] bg-white">
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-hover ring-1 ring-brand-line" aria-hidden>
        <CalendarPlus className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-semibold text-ink">{hasPast ? 'Un nouveau DS bientôt ?' : 'Un DS bientôt ?'}</h3>
        <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-faint">
          Indique sa date et ses chapitres : Fidni te dit où tu en es, te propose les bons exercices et un DS blanc chronométré.
        </p>
      </div>
      <button type="button" onClick={onAdd} className="fd-btn-primary min-h-11 justify-center" data-tour="reviser-annoncer">
        <Plus className="h-4 w-4" /> Annoncer mon DS
      </button>
    </div>
    <ol className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
      {[
        [CalendarCheck, 'Annonce-le', 'Date et chapitres, en 20 secondes.'],
        [Target, 'Révise ce qui compte', 'Tes chapitres fragiles d’abord.'],
        [Timer, 'Fais un DS blanc', 'Chronométré, puis corrigé.'],
      ].map(([Icon, title, text], i) => {
        const I = Icon as React.ComponentType<{ className?: string }>;
        return (
          <li key={i} className="flex gap-3 bg-[#fcfbf9] px-5 py-3.5">
            <I className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
            <p className="text-[12.5px] leading-snug text-ink-faint"><b className="font-semibold text-ink-soft">{title as string}</b> — {text as string}</p>
          </li>
        );
      })}
    </ol>
  </div>
);

/** DS passés : leur note, un clic pour la changer (ou la saisir). */
const PastTests: React.FC<{ tests: UpcomingTest[]; onChange: (t: UpcomingTest) => void }> = ({ tests, onChange }) => {
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const graded = tests.filter((t) => t.grade !== null);
  const average = graded.length ? graded.reduce((n, t) => n + (t.grade ?? 0), 0) / graded.length : null;
  return (
    <details className="group mt-3 rounded-2xl border border-line bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-[13.5px] text-ink-soft sm:px-5">
        <ChevronRight className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-90" />
        <span className="flex-1"><b className="font-semibold text-ink">Mes DS passés</b> · {tests.length}</span>
        {average !== null && <span className="text-[12.5px]">moyenne <b className="fd-nums text-ink">{average.toFixed(1).replace('.', ',')} / 20</b></span>}
      </summary>
      <ul className="divide-y divide-line border-t border-line px-4 sm:px-5">
        {(all ? tests : tests.slice(0, PAST_SHOWN)).map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <Link to={`/revisions/ds/${t.id}`} className="min-w-0 flex-1 truncate text-[13.5px] hover:underline">
              <b className="font-semibold text-ink">{testTitle(t)}</b>{' '}
              <span className="text-ink-faint">· {new Date(`${t.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            </Link>
            {t.grade !== null && editing !== t.id ? (
              <button type="button" onClick={() => setEditing(t.id)} title="Changer ma note" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                <GradeBadge grade={t.grade} />
              </button>
            ) : (
              <GradeForm test={t} autoFocus={editing === t.id} onSaved={(n) => { onChange(n); setEditing(null); }} />
            )}
          </li>
        ))}
      </ul>
      {tests.length > PAST_SHOWN && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mx-4 mb-3 min-h-9 text-[12.5px] font-semibold text-brand-hover hover:underline sm:mx-5">
          {all ? 'Voir moins' : `Voir les ${tests.length} DS passés`}
        </button>
      )}
    </details>
  );
};

/* ───────────────────────── 2. À refaire ───────────────────────── */

const RedoCard: React.FC<{ item: ToRedoItem }> = ({ item }) => {
  const path = `/${item.type === 'exam' ? 'exams' : 'exercises'}/${item.id}`;
  const why = item.failed ? 'Marqué à revoir' : `${item.weak_questions} question${item.weak_questions > 1 ? 's' : ''} à reprendre`;
  return (
    <li>
      <Link to={path} className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-strong" aria-hidden>
          <RotateCcw className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug text-ink line-clamp-2">{item.title}</span>
          <span className="mt-1 block text-[12.5px] text-ink-faint">
            {why}{item.days_ago !== null && <> · <span className="text-gold-strong">{ago(item.days_ago)}</span></>}
          </span>
          {item.chapters[0] && <span className="mt-2 inline-block rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] text-ink-soft">{item.chapters[0]}</span>}
        </span>
        <span className="hidden shrink-0 items-center gap-1 self-center text-[12.5px] font-semibold text-brand-hover group-hover:underline sm:inline-flex">
          Refaire <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </li>
  );
};

/* ───────────────────────── 3. Mes listes ───────────────────────── */

const ListCard: React.FC<{ list: RevisionList; onDelete: () => void; deleting: boolean }> = ({ list, onDelete, deleting }) => {
  const total = list.item_count ?? 0;
  const p = list.progress ?? { success: 0, review: 0, todo: total };
  const chapters = (list.chapters?.length ? list.chapters.map((c) => c.name) : list.item_chapters ?? []).slice(0, 3);
  const done = p.success === total && total > 0;
  return (
    <li className="group relative">
      <Link to={`/profile/revision-lists/${list.id}`}
        className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 pr-12 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <span className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{list.name}</span>
          {done && <Check className="h-4 w-4 shrink-0 text-brand" aria-label="Tout réussi" />}
        </span>
        <span className="mt-1 block truncate text-[12.5px] text-ink-faint">
          {total} exercice{total > 1 ? 's' : ''}{chapters.length ? ` · ${chapters.join(', ')}` : ''}
        </span>
        {total > 0 ? (
          <span className="mt-auto pt-3">
            <SplitBar success={p.success} review={p.review} total={total} />
            <span className="mt-1.5 block text-[12px] text-ink-faint">
              {p.success + p.review === 0 ? <><b className="fd-nums text-ink-soft">{p.todo}</b> à faire</> : <>
                <b className="fd-nums text-brand-hover">{p.success}</b> réussi{p.success > 1 ? 's' : ''}
                {p.review > 0 && <> · <b className="fd-nums text-gold-strong">{p.review}</b> à revoir</>}
                {p.todo > 0 && <> · {p.todo} à faire</>}
              </>}
            </span>
          </span>
        ) : <span className="mt-auto pt-3 text-[12px] text-ink-faint">Vide : ajoute des exercices avec le bouton « Liste ».</span>}
      </Link>
      <button type="button" onClick={onDelete} disabled={deleting} aria-label={`Supprimer la liste ${list.name}`} title="Supprimer"
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-faint opacity-80 transition hover:bg-[#f2f1ee] hover:text-[#a23b34] focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
};

/* ───────────────────────── Page ───────────────────────── */

export const Reviser: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState<UpcomingTest[] | null>(null);
  const [redo, setRedo] = useState<{ count: number; results: ToRedoItem[] } | null>(null);
  const [lists, setLists] = useState<RevisionList[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [testModal, setTestModal] = useState<{ test: UpcomingTest | null } | null>(null);
  const [newList, setNewList] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [allRedo, setAllRedo] = useState(false);
  const [ranging, setRanging] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    devoirsApi.list().then(setTests).catch(() => { setTests((t) => t ?? []); setFailed(true); });
    getToRedo().then(setRedo).catch(() => setRedo((r) => r ?? { count: 0, results: [] }));
    getRevisionLists().then((l) => setLists(l || [])).catch(() => { setLists((l) => l ?? []); setFailed(true); });
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { navigate('/login'); return; }
    if (isAuthenticated) load();
  }, [authLoading, isAuthenticated, navigate, load]);

  // Onglets (11/10/2026 : les trois sections empilées faisaient une longue page) : ?onglet=ds|a-refaire|listes.
  // Les anciens liens (« /reviser#mes-listes ») ouvrent le bon onglet.
  const [params, setParams] = useSearchParams();
  const fromHash = HASH_TAB[location.hash.slice(1)];
  const tab: ReviserTab = (TABS.some((x) => x.key === params.get('onglet')) ? params.get('onglet') : fromHash ?? 'ds') as ReviserTab;
  const setTab = (k: ReviserTab) => { const p = new URLSearchParams(params); p.set('onglet', k); setParams(p, { replace: true }); };

  if (!isAuthenticated) return null;

  const upcoming = (tests ?? []).filter((t) => t.days_left >= 0);
  const past = (tests ?? []).filter((t) => t.days_left < 0);
  const next = upcoming[0];
  const notInList = (redo?.results ?? []).filter((x) => !x.in_list);

  const saved = (t: UpcomingTest) => {
    const isNew = !testModal?.test;
    setTestModal(null);
    if (isNew && t.days_left >= 0) navigate(`/revisions/ds/${t.id}`);
    else load();
  };

  const removeList = async (list: RevisionList) => {
    if (!window.confirm(`Supprimer la liste « ${list.name} » ? Les exercices eux-mêmes restent sur Fidni.`)) return;
    setDeleting(list.id);
    try {
      await deleteRevisionList(list.id);
      setLists((cur) => cur?.filter((l) => l.id !== list.id) ?? cur);
    } catch {
      window.alert('La liste n’a pas pu être supprimée.');
    } finally {
      setDeleting(null);
    }
  };

  // « À refaire » → une liste « À revoir », pour les refaire à la suite ou les imprimer.
  const rangeAll = async () => {
    setRanging(true);
    try {
      const r = await quickAddManyToRevision(notInList.map((x) => x.id));
      load();
      if (r.list_id) navigate(`/profile/revision-lists/${r.list_id}`);
    } catch {
      window.alert('Les exercices n’ont pas pu être rangés.');
    } finally {
      setRanging(false);
    }
  };

  const redoItems = redo?.results ?? [];
  const shownRedo = allRedo ? redoItems : redoItems.slice(0, REDO_SHOWN);

  return (
    <Page>
      <PageHeader
        eyebrow="Mon suivi"
        title="Réviser"
        subtitle="Ton prochain DS, ce que tu as raté, et les exercices que tu as mis de côté."
        actions={(
          <>
            <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setTestModal({ test: null })}>
              <CalendarPlus className="h-4 w-4" /> Annoncer un DS
            </button>
            <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setNewList(true)} data-tour="revisions-nouvelle">
              <ListPlus className="h-4 w-4" /> Nouvelle liste
            </button>
          </>
        )}
      />

      {failed && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Une partie de la page n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={load} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}

      {/* Onglets : une section à la fois, son nombre en badge. */}
      <div role="tablist" aria-label="Réviser" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((x) => {
          const n = x.key === 'ds' ? upcoming.length : x.key === 'a-refaire' ? redo?.count : lists?.length;
          const on = tab === x.key;
          return (
            <button key={x.key} type="button" role="tab" id={`onglet-${x.key}`} aria-selected={on} aria-controls={`panneau-${x.key}`}
              onClick={() => setTab(x.key)}
              className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[14px] font-semibold transition-colors ${
                on ? 'border-ink text-ink' : 'border-transparent text-ink-faint hover:text-ink'}`}>
              {x.label}
              {!!n && <span className={`fd-nums rounded-full px-1.5 text-[11.5px] ${on ? 'bg-ink text-white' : 'bg-[#f2f1ee] text-ink-soft'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panneau-${tab}`} aria-labelledby={`onglet-${tab}`} className="flex flex-col gap-10">
        {tab === 'ds' && (
        <Section id="prochain-ds" title={upcoming.length > 1 ? 'Mes prochains DS' : 'Mon prochain DS'}>
          <div data-tour="revisions-ds">
            {tests === null ? <CardsSkeleton n={1} />
              : next ? <NextTestHero test={next} others={upcoming.slice(1)} onEdit={(t) => setTestModal({ test: t })} />
                : <NoTestCard hasPast={past.length > 0} onAdd={() => setTestModal({ test: null })} />}
            {past.length > 0 && (
              <PastTests tests={past} onChange={(n) => setTests((cur) => cur?.map((x) => (x.id === n.id ? { ...x, ...n } : x)) ?? cur)} />
            )}
          </div>
        </Section>

        )}

        {tab === 'a-refaire' && (
        <Section id="a-refaire" title="À refaire" count={redo?.count}
          hint={redoItems.length ? 'Ce que tu as raté, le plus ancien d’abord : c’est le bon moment pour le refaire.' : undefined}
          action={notInList.length > 1 ? (
            <button type="button" onClick={rangeAll} disabled={ranging} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand-hover hover:underline disabled:opacity-50">
              {ranging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} En faire une liste
            </button>
          ) : undefined}>
          <div data-tour="revisions-suggestions">
            {redo === null ? <CardsSkeleton n={2} className="sm:grid-cols-2" />
              : redoItems.length === 0 ? (
                <EmptyState compact icon={Check} title="Rien à refaire pour l’instant"
                  text="Quand tu marques un exercice « À revoir » ou que tu rates une question, il t’attend ici quelques jours plus tard." />
              ) : (
                <>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {shownRedo.map((x) => <RedoCard key={x.id} item={x} />)}
                  </ul>
                  {redoItems.length > REDO_SHOWN && (
                    <button type="button" onClick={() => setAllRedo((v) => !v)} className="mt-3 min-h-10 text-[13px] font-semibold text-brand-hover hover:underline">
                      {allRedo ? 'Voir moins' : `Voir les ${redoItems.length} exercices`}
                    </button>
                  )}
                </>
              )}
          </div>
        </Section>

        )}

        {tab === 'listes' && (
        <Section id="mes-listes" title="Mes listes" count={lists?.length}
          hint={lists?.length ? 'Ouvre une liste pour refaire ses exercices à la suite, ou imprime-la.' : undefined}>
          {lists === null ? <CardsSkeleton n={2} className="sm:grid-cols-2" />
            : lists.length === 0 ? (
              <EmptyState icon={ListChecks} tone="ink" title="Pas encore de liste"
                text="Range ensemble les exercices à refaire : bouton « Liste » sur un exercice, ou « En faire une liste » depuis À refaire."
                action={<button type="button" className="fd-btn-primary min-h-10" onClick={() => setNewList(true)}><Plus className="h-4 w-4" /> Créer une liste</button>} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2" data-tour="revisions-liste">
                {lists.map((l) => <ListCard key={l.id} list={l} deleting={deleting === l.id} onDelete={() => removeList(l)} />)}
                <li>
                  <button type="button" onClick={() => setNewList(true)}
                    className="flex h-full min-h-[96px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8d4cc] text-[13.5px] font-semibold text-ink-faint transition-colors hover:border-ink-faint hover:text-ink">
                    <Plus className="h-4 w-4" /> Nouvelle liste
                  </button>
                </li>
              </ul>
            )}
        </Section>
        )}
      </div>

      <TestFormModal open={!!testModal} test={testModal?.test} onClose={() => setTestModal(null)} onSaved={saved}
        onDeleted={(id) => { setTestModal(null); setTests((cur) => cur?.filter((x) => x.id !== id) ?? cur); }} />
      <CreateListModal open={newList} onClose={() => setNewList(false)} />
    </Page>
  );
};

export default Reviser;

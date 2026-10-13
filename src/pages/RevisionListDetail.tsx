/**
 * Une liste de révision (/profile/revision-lists/:id), deux vues (10/10/2026 ; refonte du 11/10/2026) :
 *  - Mode révision (par défaut) : un exercice à la fois, interactif comme le DS blanc (pages/devoirs/MockExamPage) :
 *    Réussi / À revoir sous chaque question, « Tout réussi », puis « Exercice suivant ». La page s'ouvre sur le premier
 *    exercice pas encore réussi ; une pastille par exercice dit où l'élève en est (statistics.statuses).
 *  - Feuille à imprimer : tous les énoncés à la suite, solutions masquées ou affichées, export PDF.
 * Chaque exercice a son lien « Ouvrir l'exercice » (commentaires, solutions des élèves, ressenti).
 * On y arrive depuis Réviser (« Mes listes ») : mêmes briques (components/space/Page), mêmes couleurs
 * (vert = réussi, or = à revoir).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getRevisionList,
  removeItemFromRevisionList,
  updateRevisionList,
  getRevisionListStatistics,
  type RevisionList,
  type RevisionListItem,
  type RevisionListStatistics,
} from '@/lib/api';
import type { ItemStatus } from '@/lib/api/revisionListApi';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, Eye, EyeOff, FileDown, ListChecks, ListX,
  PenLine, Pencil, Printer, RotateCcw, Trash2, WifiOff,
} from 'lucide-react';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Page, PageHeader, EmptyState, Segmented, SplitBar } from '@/components/space/Page';
import { DifficultyDot } from '@/components/devoirs/ui';
import { exercisesHome } from '@/components/layout/nav';
import { ExerciseRenderer, type AssessChanges } from '@/components/content/viewer/ExerciseRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { api } from '@/lib/api/apiClient';
import { assessQuestions, type AssessSource } from '@/lib/api/contentItemApi';
import { recordHelp } from '@/lib/helpTracking';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import type { AssessmentStatus } from '@/types/content';
import { trackAction } from '@/lib/usage';

type View = 'revision' | 'feuille';
type Progress = Record<string, { status: AssessmentStatus; assessed_at?: string }>;
type Done = Exclude<ItemStatus, null>;

const BACK = { to: '/reviser#mes-listes', label: 'Réviser' };

const STATUS_UI: Record<'success' | 'review' | 'todo', { label: string; pill: string; dot: string }> = {
  success: { label: 'Réussi', pill: 'bg-brand-soft text-brand-hover', dot: 'border-brand bg-brand text-white' },
  review: { label: 'À revoir', pill: 'bg-gold-soft text-gold-strong', dot: 'border-gold bg-gold-soft text-gold-strong' },
  todo: { label: 'Pas encore fait', pill: 'bg-[#f2f1ee] text-ink-faint', dot: 'border-line bg-white text-ink-soft hover:border-ink-faint' },
};
const statusKey = (s: ItemStatus | undefined) => (s === 'success' || s === 'review' ? s : 'todo');

const contentPath = (c: Content) => `/${c.type === 'exam' ? 'exams' : 'exercises'}/${c.id}`;
const kindLabel = (c: Content) => (c.type === 'exam' ? 'Examen' : 'Exercice');

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateString));

function StatusPill({ status }: { status: ItemStatus | undefined }) {
  const ui = STATUS_UI[statusKey(status)];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ui.pill}`}>{ui.label}</span>;
}

function Meta({ content }: { content: Content }) {
  const chapter = (content.chapters as { name?: string }[] | undefined)?.[0]?.name;
  const level = content.class_levels?.[0];
  const difficulty = content.difficulty === 'easy' || content.difficulty === 'medium' || content.difficulty === 'hard' ? content.difficulty : null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-faint">
      {chapter && <span className="font-semibold text-ink-soft">{chapter}</span>}
      <DifficultyDot level={difficulty} />
      {level && <span>{typeof level === 'string' ? level : level.name}</span>}
    </div>
  );
}

/** Retirer un exercice de la liste : discret, rouge sobre au survol. */
function RemoveButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Retirer de la liste" title="Retirer de la liste"
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#fbecea] hover:text-[#a23b34] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}>
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export const RevisionListDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const view: View = params.get('vue') === 'feuille' ? 'feuille' : 'revision';
  const [list, setList] = useState<RevisionList | null>(null);
  const [statistics, setStatistics] = useState<RevisionListStatistics | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const [loading, setLoading] = useState(true);
  // Liste absente (404) ou chargement impossible (réseau) : deux messages différents.
  const [loadError, setLoadError] = useState<'missing' | 'failed' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  // Mode révision : l'exercice affiché (index dans la liste) ; null = récapitulatif de fin.
  const [current, setCurrent] = useState<number | null>(0);
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [busy, setBusy] = useState(false);
  const tracked = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const { setCrumbs } = useBreadcrumb();
  const crumbTitle = list?.name ?? null;
  useEffect(() => {
    // Même mot que le menu (« Mon suivi › Réviser »), qui reste surligné.
    setCrumbs([{ label: 'Réviser', to: '/reviser' }, { label: crumbTitle ?? 'Liste de révision' }]);
  }, [crumbTitle, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);

  const setView = (v: View) => {
    const next = new URLSearchParams(params);
    if (v === 'feuille') next.set('vue', 'feuille'); else next.delete('vue');
    setParams(next, { replace: true });
  };

  const load = useCallback(async (keepPosition = false) => {
    if (!id) return;
    try {
      if (!keepPosition) setLoading(true);
      setLoadError(null);
      const data = await getRevisionList(parseInt(id));
      setList(data);
      setEditName(data.name);
      setEditDescription(data.description);
      let st: Record<string, ItemStatus> = {};
      try {
        const stats = await getRevisionListStatistics(parseInt(id));
        setStatistics(stats);
        st = stats.statuses ?? {};
      } catch (statsError) {
        console.error('Failed to load statistics:', statsError);
      }
      setStatuses(st);
      const items = (data.items || []).filter((i) => i.content_object);
      if (keepPosition) {
        setCurrent((c) => (c === null ? null : Math.min(c, Math.max(0, items.length - 1))));
      } else {
        // On reprend au premier exercice pas encore réussi.
        const first = items.findIndex((i) => st[String(i.object_id)] !== 'success');
        setCurrent(first >= 0 ? first : 0);
      }
    } catch (error) {
      // Après un retrait ou un renommage, on garde la liste affichée ; sinon on dit ce qui se passe.
      const code = (error as { response?: { status?: number } })?.response?.status;
      if (code !== 404 && code !== 403) console.error('Failed to load revision list:', error);
      if (!keepPosition) setLoadError(code === 404 || code === 403 ? 'missing' : 'failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Réservé aux membres (comme la page des listes) : un visiteur va à la connexion.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/login'); return; }
    load();
  }, [authLoading, isAuthenticated, load, navigate]);

  const items = useMemo(() => (list?.items || []).filter((i) => i.content_object) as (RevisionListItem & { content_object: Content })[], [list]);
  const item = current !== null ? items[current] : undefined;
  const contentId = item ? Number(item.content_object.id) : null;

  // Mode révision : ses réponses déjà données sur l'exercice affiché (même lecture que le DS blanc).
  useEffect(() => {
    if (view !== 'revision' || contentId === null || progressRef.current[contentId]) return;
    let alive = true;
    api.get(`/contents/${contentId}/question_progress/`)
      .then((r) => {
        if (!alive) return;
        const p: Progress = {};
        Object.entries(r.data || {}).forEach(([path, v]) => {
          const { status, assessed_at } = (v || {}) as { status?: AssessmentStatus; assessed_at?: string };
          if (status) p[path] = { status, assessed_at };
        });
        setProgress((cur) => ({ ...cur, [contentId]: { ...p, ...cur[contentId] } }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [view, contentId]);

  const counts = useMemo(() => items.reduce((acc, i) => {
    acc[statusKey(statuses[String(i.object_id)])] += 1;
    return acc;
  }, { success: 0, review: 0, todo: 0 }), [items, statuses]);

  const goTo = (index: number | null) => {
    setCurrent(index);
    window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const trackOnce = () => {
    if (tracked.current) return;
    tracked.current = true;
    trackAction('mode-revision');
  };

  const setStatus = (key: string, s: ItemStatus) => setStatuses((cur) => ({ ...cur, [key]: s }));

  // Une ou plusieurs questions évaluées : enregistrées comme sur la page de l'exercice ; quand toutes le sont,
  // le résultat de l'exercice suit (tout réussi → Réussi, sinon À revoir).
  const assess = async (content: Content, changes: AssessChanges, source: AssessSource = 'question', completion?: ItemStatus) => {
    const cid = Number(content.id);
    const key = String(cid);
    const before = progressRef.current[cid] ?? {};
    const next: Progress = { ...before };
    for (const [path, s] of Object.entries(changes)) {
      if (s) next[path] = { status: s }; else delete next[path];
    }
    const leaves = assessablePaths(content.structure as unknown as FlexibleExerciseStructure);
    let target = completion;
    if (target === undefined && leaves.length && leaves.every((p) => next[p])) {
      target = leaves.every((p) => next[p].status === 'success') ? 'success' : 'review';
    }
    const prevStatus = statusesRef.current[key] ?? null;
    const send = target !== undefined && target !== prevStatus;
    progressRef.current = { ...progressRef.current, [cid]: next };
    setProgress((cur) => ({ ...cur, [cid]: next }));
    if (send) setStatus(key, target ?? null);
    trackOnce();
    try {
      await assessQuestions(cid, changes, { source, ...(send ? { completion: target } : {}) });
    } catch {
      progressRef.current = { ...progressRef.current, [cid]: before };
      setProgress((cur) => ({ ...cur, [cid]: before }));
      if (send) setStatus(key, prevStatus);
    }
  };

  // « Tout réussi » / « À revoir » pour tout l'exercice (re-cliquer le choix actif l'efface).
  const setVerdict = async (content: Content, verdict: Done) => {
    const cid = Number(content.id);
    const key = String(cid);
    const prev = statusesRef.current[key] ?? null;
    const leaves = assessablePaths(content.structure as unknown as FlexibleExerciseStructure);
    setBusy(true);
    try {
      if (verdict === 'success' && leaves.length) {
        const clear = prev === 'success';
        await assess(content, Object.fromEntries(leaves.map((p) => [p, clear ? null : 'success'])), 'tout', clear ? null : 'success');
        return;
      }
      trackOnce();
      const next = prev === verdict ? null : verdict;
      setStatus(key, next);
      try {
        if (next === null) await api.delete(`/contents/${cid}/remove_progress/`);
        else await api.post(`/contents/${cid}/complete/`, { status: next });
      } catch {
        setStatus(key, prev);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!id || !list) return;
    if (!confirm('Retirer cet exercice de la liste ? Il reste sur Fidni, avec ta progression.')) return;
    try {
      await removeItemFromRevisionList(parseInt(id), itemId);
      await load(true);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleUpdateList = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!id || !editName.trim()) return;
    try {
      await updateRevisionList(parseInt(id), { name: editName, description: editDescription });
      setIsEditing(false);
      await load(true);
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  // Solution ou indication ouverte en mode révision, par question, comme sur sa page (journal de « Ma progression »).
  const helpOpened = (content: Content, path: string, kind: 'indice' | 'solution') => recordHelp(content.id, path, kind);

  if (authLoading || (loading && !loadError)) {
    return (
      <Page width="narrow">
        <PageHeader back={BACK} eyebrow="Liste de révision" icon={ListChecks}
          title={<><span className="sr-only">Chargement de la liste…</span><span aria-hidden className="inline-block h-[0.9em] w-64 max-w-full animate-pulse rounded-lg bg-[#efece6] align-middle" /></>} />
        <div className="flex flex-col gap-4" aria-busy>
          <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <span key={i} className="h-10 w-10 animate-pulse rounded-full bg-[#efece6]" />)}</div>
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-white" />
        </div>
      </Page>
    );
  }

  if (!list) {
    const failed = loadError === 'failed';
    return (
      <Page width="narrow">
        <PageHeader back={BACK} eyebrow="Liste de révision" icon={ListChecks} title={failed ? 'Liste de révision' : 'Liste introuvable'} />
        <div role="alert">
          {failed ? (
            <EmptyState icon={WifiOff} tone="gold" title="La liste n’a pas pu être chargée"
              text="Vérifie ta connexion, puis réessaie."
              action={<button type="button" onClick={() => load()} className="fd-btn-primary min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>}
              secondary={<Link to={BACK.to} className="fd-btn-ghost min-h-10">Mes listes</Link>} />
          ) : (
            <EmptyState icon={ListX} tone="ink" title="Cette liste n’existe plus"
              text="Elle a peut-être été supprimée. Retrouve tes autres listes sur la page Réviser."
              action={<Link to={BACK.to} className="fd-btn-primary min-h-10">Mes listes <ArrowRight className="h-4 w-4" /></Link>} />
          )}
        </div>
      </Page>
    );
  }

  const openState = { from: location.pathname + location.search };
  const firstNotDone = items.findIndex((i) => statuses[String(i.object_id)] !== 'success');
  const firstReview = items.findIndex((i) => statuses[String(i.object_id)] === 'review');
  const isLast = (current ?? 0) + 1 >= items.length;
  const pdfPath = `/revision-lists/${list.id}/pdf${view === 'feuille' && showAllSolutions ? '?solutions=end' : ''}`;

  return (
    <Page width="narrow" className={`revision-page ${showAllSolutions ? '' : 'revision-solutions-hidden'}`}>
      <div className="revision-print-hide">
        {isEditing ? (
          <>
            <PageHeader back={BACK} eyebrow="Liste de révision" icon={ListChecks} title="Modifier la liste" />
            <form onSubmit={handleUpdateList} className="mb-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">Nom</span>
                <input type="text" value={editName} maxLength={100} onChange={(e) => setEditName(e.target.value)} autoFocus
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-semibold text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Nom de la liste" />
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Description <span className="font-normal text-ink-faint">(facultatif)</span>
                </span>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2}
                  className="w-full resize-none rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Pour le devoir du 12 novembre…" />
              </label>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" className="fd-btn-ghost min-h-10" onClick={() => { setIsEditing(false); setEditName(list.name); setEditDescription(list.description); }}>
                  Annuler
                </button>
                <button type="submit" className="fd-btn-primary min-h-10 disabled:cursor-not-allowed disabled:opacity-50" disabled={!editName.trim()}>
                  <Check className="h-4 w-4" /> Enregistrer
                </button>
              </div>
            </form>
          </>
        ) : (
          <PageHeader back={BACK} eyebrow="Liste de révision" icon={ListChecks} title={list.name}
            subtitle={list.description || undefined}
            actions={(
              <>
                <button type="button" onClick={() => setIsEditing(true)} className="fd-btn-ghost min-h-10" title="Renommer la liste" data-tour="revision-modifier">
                  <Pencil className="h-4 w-4" /> Modifier
                </button>
                <button type="button" onClick={() => navigate(pdfPath)} disabled={!items.length} data-tour="revision-pdf"
                  className={`${view === 'feuille' ? 'fd-btn-primary' : 'fd-btn-ghost'} min-h-10 disabled:cursor-not-allowed disabled:opacity-50`}>
                  <FileDown className="h-4 w-4" /> PDF
                </button>
              </>
            )}>
            {/* Où en est la liste */}
            {items.length > 0 && (
              <div className="mt-4 max-w-md">
                {statistics && <SplitBar success={counts.success} review={counts.review} total={items.length} />}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-faint">
                  <span><b className="fd-nums font-semibold text-ink-soft">{items.length}</b> {kindWord(items)}</span>
                  {statistics && (
                    <>
                      <span><b className="fd-nums font-semibold text-brand-hover">{counts.success}</b> réussi{counts.success > 1 ? 's' : ''}</span>
                      {counts.review > 0 && <span><b className="fd-nums font-semibold text-gold-strong">{counts.review}</b> à revoir</span>}
                      {counts.todo > 0 && <span><b className="fd-nums font-semibold text-ink-soft">{counts.todo}</b> à faire</span>}
                    </>
                  )}
                </p>
              </div>
            )}
          </PageHeader>
        )}

        {/* Deux façons de travailler la liste ; les solutions ne concernent que la feuille */}
        {items.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div data-tour="revision-mode" className="inline-flex max-w-full">
              <Segmented<View> value={view} onChange={setView} label="Affichage de la liste"
                options={[{ key: 'revision', label: 'Mode révision', icon: PenLine }, { key: 'feuille', label: 'Feuille à imprimer', icon: Printer }]} />
            </div>
            {view === 'feuille' && (
              <button type="button" onClick={() => setShowAllSolutions((v) => !v)} data-tour="revision-solutions" aria-pressed={showAllSolutions}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${
                  showAllSolutions ? 'border-brand-line bg-brand-soft text-brand-hover' : 'border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink'}`}>
                {showAllSolutions ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showAllSolutions ? 'Solutions affichées' : 'Solutions masquées'}
              </button>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ListX} tone="ink" title="Cette liste est vide"
          text="Sur un exercice qui te résiste, touche le bouton «&nbsp;Liste&nbsp;» (sur sa carte ou sa page) pour l’ajouter ici. Tu pourras ensuite le refaire à la suite des autres, ou imprimer la liste."
          action={<Link to={exercisesHome(user)} className="fd-btn-primary min-h-10"><BookOpen className="h-4 w-4" /> Trouver des exercices</Link>}
          secondary={<Link to="/exams" className="fd-btn-ghost min-h-10">Devoirs (DS)</Link>} />
      ) : view === 'revision' ? (
        /* ───────────── Mode révision : un exercice à la fois ───────────── */
        <div className="revision-print-hide">
          <nav aria-label="Exercices de la liste" className="mb-4">
            <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0.5">
              {items.map((it, i) => {
                const s = statuses[String(it.object_id)];
                const ui = STATUS_UI[statusKey(s)];
                const on = current === i;
                return (
                  <li key={it.id} className="shrink-0">
                    <button type="button" onClick={() => goTo(i)} aria-current={on ? 'step' : undefined}
                      aria-label={`${kindLabel(it.content_object)} ${i + 1} : ${ui.label.toLowerCase()}`} title={it.content_object.title}
                      className={`fd-nums inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-[box-shadow,border-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${ui.dot} ${
                        on ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}>
                      {s === 'success' ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {item ? (
            <article ref={cardRef} aria-labelledby="exercice-titre" className="scroll-mt-24 rounded-2xl border border-line bg-white">
              <header className="flex items-start gap-2 border-b border-line py-3.5 pl-4 pr-2 sm:py-4 sm:pl-6 sm:pr-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="fd-nums text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">
                      {kindLabel(item.content_object)} {(current ?? 0) + 1} / {items.length}
                    </span>
                    <StatusPill status={statuses[String(item.object_id)]} />
                  </div>
                  <h2 id="exercice-titre" className="mt-1 text-[18px] font-semibold leading-snug text-ink">{item.content_object.title}</h2>
                  <Meta content={item.content_object} />
                </div>
                <RemoveButton onClick={() => handleRemoveItem(item.id)} />
              </header>

              <div className="px-4 py-4 sm:px-6">
                {item.content_object.structure && typeof item.content_object.structure === 'object' ? (
                  <ExerciseRenderer
                    key={item.id}
                    structure={item.content_object.structure as unknown as FlexibleExerciseStructure}
                    compact={false}
                    interactive
                    progress={progress[Number(item.content_object.id)]}
                    onAssess={(path, status, source) => assess(item.content_object, {
                      [path]: progressRef.current[Number(item.content_object.id)]?.[path]?.status === status ? null : status,
                    }, source)}
                    onAssessMany={(changes, source) => assess(item.content_object, changes, source)}
                    onSolutionOpen={(path) => helpOpened(item.content_object, path, 'solution')}
                    onHintOpen={(path) => helpOpened(item.content_object, path, 'indice')}
                  />
                ) : (
                  <p className="text-sm italic text-ink-faint">L’énoncé n’est pas disponible ici : ouvre l’exercice.</p>
                )}
                <Link to={contentPath(item.content_object)} state={openState}
                  className="mt-3 inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                  Ouvrir l’{item.content_object.type === 'exam' ? 'examen' : 'exercice'}
                  <span className="hidden font-normal text-ink-faint sm:inline">(commentaires, solutions des élèves)</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Où en es-tu ? puis la suite */}
              <footer className="flex flex-col gap-3 rounded-b-2xl border-t border-line bg-[#fcfbf9] px-4 py-3.5 sm:flex-row sm:items-center sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-[13px] font-semibold text-ink">Tu l’as réussi ?</span>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    {([['success', 'Tout réussi', CheckCheck], ['review', 'À revoir', RotateCcw]] as const).map(([v, label, Icon]) => {
                      const on = statuses[String(item.object_id)] === v;
                      return (
                        <button key={v} type="button" disabled={busy} aria-pressed={on} onClick={() => setVerdict(item.content_object, v)}
                          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                            on ? (v === 'success' ? 'border-brand bg-brand-soft text-brand-hover' : 'border-gold bg-gold-soft text-gold-strong')
                              : 'border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink'}`}>
                          <Icon className="h-4 w-4" /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  {(current ?? 0) > 0 && (
                    <button type="button" onClick={() => goTo((current ?? 1) - 1)} aria-label="Exercice précédent" title="Exercice précédent"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => goTo(isLast ? null : (current ?? 0) + 1)}
                    className="fd-btn-primary min-h-10 flex-1 justify-center sm:flex-none">
                    {isLast ? 'Terminer' : 'Exercice suivant'} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            </article>
          ) : (
            /* Récapitulatif : la liste a été parcourue */
            <section ref={cardRef} aria-labelledby="bilan-titre" className="scroll-mt-24 rounded-2xl border border-line bg-white px-5 py-8 text-center sm:px-8">
              <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${
                counts.success === items.length ? 'bg-brand-soft text-brand-hover ring-brand-line' : 'bg-[#f2f1ee] text-ink-soft ring-line'}`} aria-hidden>
                {counts.success === items.length ? <CheckCheck className="h-6 w-6" /> : <ListChecks className="h-6 w-6" />}
              </span>
              <h2 id="bilan-titre" className="fd-display mt-4 text-[22px] leading-tight text-ink">
                {counts.success === items.length ? 'Toute la liste est réussie !' : 'Tu as parcouru la liste.'}
              </h2>
              <SplitBar className="mx-auto mt-4 max-w-xs" success={counts.success} review={counts.review} total={items.length} />
              <p className="fd-nums mt-2 text-[13.5px] text-ink-soft">
                {counts.success} réussi{counts.success > 1 ? 's' : ''} · {counts.review} à revoir · {counts.todo} pas encore fait{counts.todo > 1 ? 's' : ''}
              </p>
              {counts.review > 0 && (
                <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-faint">Refais ceux «&nbsp;à revoir&nbsp;» dans 2 ou 3 jours : c’est là qu’ils rentrent pour de bon.</p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {firstNotDone >= 0 && (
                  <button type="button" onClick={() => goTo(firstReview >= 0 ? firstReview : firstNotDone)} className="fd-btn-primary min-h-10">
                    <RotateCcw className="h-4 w-4" /> {firstReview >= 0 ? 'Reprendre les «\u00a0à revoir\u00a0»' : 'Reprendre'}
                  </button>
                )}
                <button type="button" onClick={() => goTo(0)} className="fd-btn-ghost min-h-10">Revoir depuis le début</button>
              </div>
              <Link to={BACK.to} className="mt-3 inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                Mes listes <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}
        </div>
      ) : (
        /* ───────────── Feuille à imprimer : tous les énoncés à la suite ───────────── */
        <>
          <div className="revision-print-only">
            <h1 className="mb-1 text-center text-[22px] font-bold text-ink">{list.name}</h1>
            {list.description && <p className="mb-1 text-center text-[12px] text-ink-faint">{list.description}</p>}
            <p className="mb-4 text-center text-[11px] text-ink-faint">
              {items.length} exercice{items.length !== 1 ? 's' : ''} · {formatDate(list.created_at)}
            </p>
            <hr className="mb-6 border-0 border-t border-line" />
          </div>

          <div className="revision-sheet flex flex-col gap-6">
            {items.map((it, index) => {
              const content = it.content_object;
              const hasStructure = content.structure && typeof content.structure === 'object';
              const isExam = content.type === 'exam';
              return (
                <article key={it.id} className="revision-exercise-card overflow-hidden rounded-2xl border border-line bg-white">
                  <header className="flex items-start gap-2 pb-3 pl-4 pr-2 pt-4 sm:pl-6 sm:pr-3 sm:pt-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="fd-nums text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{kindLabel(content)} {index + 1}</span>
                        <span className="revision-print-hide"><StatusPill status={statuses[String(it.object_id)]} /></span>
                      </div>
                      <h2 className="text-[17px] font-semibold leading-snug text-ink">{content.title}</h2>
                      <Meta content={content} />
                      <Link to={contentPath(content)} state={openState}
                        className="revision-print-hide mt-1 inline-flex min-h-9 items-center gap-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
                        Ouvrir l’{isExam ? 'examen' : 'exercice'} <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <RemoveButton className="revision-print-hide" onClick={() => handleRemoveItem(it.id)} />
                  </header>
                  <div className="mx-4 border-t border-[#f2f1ee] sm:mx-6" />
                  <div className="px-4 py-4 sm:px-6">
                    {hasStructure ? (
                      <ExerciseRenderer structure={content.structure as unknown as FlexibleExerciseStructure} interactive={false}
                        showAllSolutions={showAllSolutions} compact={false} />
                    ) : (
                      <p className="text-sm italic text-ink-faint">Aucun contenu disponible</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Impression (Feuille à imprimer) : seulement les énoncés, une page par exercice */}
      <style>{`
        .revision-print-only { display: none; }

        @media print {
          .revision-print-hide { display: none !important; }
          .revision-print-only { display: block !important; padding: 24px 40px 0; }

          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; padding-bottom: 0 !important; background: white !important; }
          .revision-page { max-width: 100% !important; padding: 0 !important; }
          .revision-sheet { gap: 0 !important; }

          .revision-exercise-card {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            margin-bottom: 0 !important;
          }
          .revision-exercise-card:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Pas de boutons sur papier (œil des solutions, signaler) */
          .revision-sheet button { display: none !important; }
        }
      `}</style>
    </Page>
  );
};

/** « 3 exercices », « 2 examens », « 3 contenus » (liste mixte). */
function kindWord(items: { content_object: Content }[]) {
  const exams = items.filter((i) => i.content_object.type === 'exam').length;
  const many = items.length > 1;
  if (exams === 0) return many ? 'exercices' : 'exercice';
  if (exams === items.length) return many ? 'examens' : 'examen';
  return 'contenus';
}

export default RevisionListDetail;

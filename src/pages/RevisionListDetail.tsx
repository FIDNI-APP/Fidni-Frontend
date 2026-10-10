/**
 * Une liste de révision (/profile/revision-lists/:id), deux vues (10/10/2026) :
 *  - Mode révision (par défaut) : un exercice à la fois, interactif comme le DS blanc (pages/devoirs/MockExamPage) :
 *    Réussi / À revoir sous chaque question, « Tout réussi », puis « Exercice suivant ». La page s'ouvre sur le premier
 *    exercice pas encore réussi ; une pastille par exercice dit où l'élève en est (statistics.statuses).
 *  - Feuille à imprimer : l'ancienne page, tous les énoncés à la suite, solutions masquées ou affichées, export PDF.
 * Chaque exercice a son lien « Ouvrir l'exercice » (commentaires, solutions des élèves, ressenti).
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
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Trash2,
  Edit2,
  Save,
  X,
  BookOpen,
  Calendar,
  Check,
  CheckCheck,
  FileDown,
  Eye,
  EyeOff,
  ListX,
  Loader2,
  PenLine,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ExerciseRenderer, type AssessChanges } from '@/components/content/viewer/ExerciseRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { api } from '@/lib/api/apiClient';
import { assessQuestions, type AssessSource } from '@/lib/api/contentItemApi';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import type { AssessmentStatus } from '@/types/content';
import { trackAction } from '@/lib/usage';

type View = 'revision' | 'feuille';
type Progress = Record<string, { status: AssessmentStatus; assessed_at?: string }>;
type Done = Exclude<ItemStatus, null>;

const STATUS_UI: Record<'success' | 'review' | 'todo', { label: string; pill: string; dot: string }> = {
  success: { label: 'Réussi', pill: 'bg-brand-soft text-brand-hover', dot: 'bg-brand border-brand text-white' },
  review: { label: 'À revoir', pill: 'bg-gold-soft text-[#8a6318]', dot: 'bg-gold-soft border-gold text-[#8a6318]' },
  todo: { label: 'Pas encore fait', pill: 'bg-[#f2f1ee] text-ink-faint', dot: 'bg-white border-line text-ink-soft' },
};
const statusKey = (s: ItemStatus | undefined) => (s === 'success' || s === 'review' ? s : 'todo');

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  easy: { label: 'Facile', color: 'text-emerald-600' },
  medium: { label: 'Moyen', color: 'text-amber-600' },
  hard: { label: 'Difficile', color: 'text-rose-600' },
};

const contentPath = (c: Content) => `/${c.type === 'exam' ? 'exams' : 'exercises'}/${c.id}`;
const kindLabel = (c: Content) => (c.type === 'exam' ? 'Examen' : 'Exercice');

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateString));

function StatusPill({ status }: { status: ItemStatus | undefined }) {
  const ui = STATUS_UI[statusKey(status)];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ui.pill}`}>{ui.label}</span>;
}

function Meta({ content }: { content: Content }) {
  const d = content.difficulty ? DIFFICULTY[content.difficulty] : null;
  const chapter = (content.chapters as { name?: string }[] | undefined)?.[0]?.name;
  const level = content.class_levels?.[0];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-faint">
      {chapter && <span className="font-semibold text-ink-soft">{chapter}</span>}
      {d && (
        <span className={`inline-flex items-center gap-1 font-semibold ${d.color}`}>
          <DifficultyBars difficulty={content.difficulty} />{d.label}
        </span>
      )}
      {level && <span>{typeof level === 'string' ? level : level.name}</span>}
    </div>
  );
}

export const RevisionListDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const usernameRef = useRef(user?.username);
  usernameRef.current = user?.username;
  const [params, setParams] = useSearchParams();
  const view: View = params.get('vue') === 'feuille' ? 'feuille' : 'revision';
  const [list, setList] = useState<RevisionList | null>(null);
  const [statistics, setStatistics] = useState<RevisionListStatistics | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const [loading, setLoading] = useState(true);
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
  const cardRef = useRef<HTMLDivElement | null>(null);

  const setView = (v: View) => {
    const next = new URLSearchParams(params);
    if (v === 'feuille') next.set('vue', 'feuille'); else next.delete('vue');
    setParams(next, { replace: true });
  };

  const load = useCallback(async (keepPosition = false) => {
    if (!id) return;
    try {
      if (!keepPosition) setLoading(true);
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
      console.error('Failed to load revision list:', error);
      navigate(usernameRef.current ? `/profile/${usernameRef.current}` : '/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

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

  const handleUpdateList = async () => {
    if (!id) return;
    try {
      await updateRevisionList(parseInt(id), { name: editName, description: editDescription });
      setIsEditing(false);
      await load(true);
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-ink-faint text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full border border-line">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ListX className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Liste introuvable</h2>
          <p className="text-ink-faint mb-6 text-sm">Cette liste n’existe pas ou a été supprimée.</p>
          <Button onClick={() => navigate('/revision-lists?onglet=listes')} className="bg-[#1a7a4a] hover:bg-[#15633c] text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Mes listes
          </Button>
        </div>
      </div>
    );
  }

  const openState = { from: location.pathname + location.search };
  const firstNotDone = items.findIndex((i) => statuses[String(i.object_id)] !== 'success');
  const firstReview = items.findIndex((i) => statuses[String(i.object_id)] === 'review');

  return (
    <div className={`min-h-screen bg-paper ${showAllSolutions ? '' : 'revision-solutions-hidden'}`}>
      {/* En-tête clair, comme les autres pages. */}
      <section className="revision-print-hide" style={{ background: '#faf9f7', borderBottom: '1px solid #e7e3dc' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-5">
          <button onClick={() => navigate('/revision-lists?onglet=listes')}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-sm mb-3 text-ink-faint hover:text-ink">
            <ArrowLeft className="w-4 h-4" /> Mes listes de révision
          </button>

          {isEditing ? (
            <div className="space-y-3">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-lg font-bold text-ink focus:outline-none focus:border-brand"
                placeholder="Nom de la liste…" />
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-sm text-ink-soft resize-none focus:outline-none focus:border-brand"
                rows={2} placeholder="Description…" />
              <div className="flex gap-2">
                <button onClick={handleUpdateList} className="fd-btn-primary"><Save className="w-3.5 h-3.5" /> Enregistrer</button>
                <button onClick={() => { setIsEditing(false); setEditName(list.name); setEditDescription(list.description); }} className="fd-btn-ghost">
                  <X className="w-3.5 h-3.5" /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h1 className="fd-display" style={{ fontSize: 'clamp(24px,3.2vw,32px)', color: '#1a1a1a', lineHeight: 1.15 }}>{list.name}</h1>
                  {list.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">{list.description}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button onClick={() => setIsEditing(true)} className="fd-btn-ghost" style={{ minHeight: 36 }} title="Renommer la liste" data-tour="revision-modifier">
                    <Edit2 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  {view === 'feuille' && (
                    <button onClick={() => setShowAllSolutions(!showAllSolutions)} data-tour="revision-solutions" className="fd-btn-ghost" style={{ minHeight: 36, ...(showAllSolutions ? { borderColor: '#cfe6d8', background: '#eaf3ed', color: '#15633c' } : {}) }}
                      aria-pressed={showAllSolutions}>
                      {showAllSolutions ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {showAllSolutions ? 'Solutions affichées' : 'Solutions masquées'}
                    </button>
                  )}
                  <button onClick={() => navigate(`/revision-lists/${list.id}/pdf${view === 'feuille' && showAllSolutions ? '?solutions=end' : ''}`)}
                    disabled={!items.length} data-tour="revision-pdf" className={`${view === 'feuille' ? 'fd-btn-primary' : 'fd-btn-ghost'} disabled:opacity-50`} style={{ minHeight: 36 }}>
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              {/* Chiffres de la liste */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[13px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /><span className="fd-nums">{items.length}</span> exercice{items.length !== 1 ? 's' : ''}
                </span>
                {statistics && items.length > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /><span className="fd-nums">{counts.success}</span> réussi{counts.success > 1 ? 's' : ''}</span>
                    {counts.review > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /><span className="fd-nums">{counts.review}</span> à revoir</span>}
                  </>
                )}
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Créée le {formatDate(list.created_at)}</span>
              </div>

              {/* Deux façons de travailler la liste */}
              {items.length > 0 && (
                <div role="tablist" aria-label="Affichage de la liste" data-tour="revision-mode"
                  className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#efece7] p-1 sm:inline-grid sm:w-auto">
                  {([['revision', 'Mode révision', PenLine], ['feuille', 'Feuille à imprimer', Printer]] as const).map(([key, label, Icon]) => (
                    <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 text-[13.5px] font-semibold transition-colors sm:min-w-[170px] ${
                        view === key ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {items.length === 0 ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center justify-center py-16 px-4 gap-5 text-center bg-white rounded-2xl border-2 border-dashed border-line">
            <div className="w-14 h-14 bg-paper rounded-full flex items-center justify-center"><ListX className="w-7 h-7 text-ink-faint" /></div>
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-ink mb-2">Liste vide</h3>
              <p className="text-ink-faint text-sm leading-relaxed">
                Ajoute des exercices depuis leur page ou leur carte (bouton « Liste ») pour te faire un programme de révision.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/exercises" className="fd-btn-primary"><BookOpen className="w-3.5 h-3.5" /> Exercices</Link>
              <Link to="/exams" className="fd-btn-ghost">Examens</Link>
            </div>
          </div>
        </div>
      ) : view === 'revision' ? (
        /* ───────────── Mode révision : un exercice à la fois ───────────── */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-16">
          <nav aria-label="Exercices de la liste">
            <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 sm:mx-0 sm:flex-wrap sm:px-1">
              {items.map((it, i) => {
                const s = statuses[String(it.object_id)];
                const ui = STATUS_UI[statusKey(s)];
                const on = current === i;
                return (
                  <li key={it.id} className="shrink-0">
                    <button type="button" onClick={() => goTo(i)} aria-current={on ? 'step' : undefined}
                      aria-label={`${kindLabel(it.content_object)} ${i + 1} : ${ui.label.toLowerCase()}`} title={it.content_object.title}
                      className={`fd-nums inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-shadow ${ui.dot} ${
                        on ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}>
                      {s === 'success' ? <Check className="h-4 w-4" /> : i + 1}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {item ? (
            <div ref={cardRef} className="mt-4 scroll-mt-20 rounded-2xl border border-line bg-white">
              <div className="flex items-start gap-3 border-b border-line px-4 pt-4 pb-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="fd-nums text-[11.5px] font-bold uppercase tracking-[.07em] text-ink-faint">
                      {kindLabel(item.content_object)} {(current ?? 0) + 1} / {items.length}
                    </span>
                    <StatusPill status={statuses[String(item.object_id)]} />
                  </div>
                  <h2 className="mt-1 text-[18px] font-bold leading-snug text-ink">{item.content_object.title}</h2>
                  <Meta content={item.content_object} />
                </div>
                <button onClick={() => handleRemoveItem(item.id)} aria-label="Retirer de la liste" title="Retirer de la liste"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#cfcdc8] hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

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
                  />
                ) : (
                  <p className="text-sm italic text-ink-faint">L’énoncé n’est pas disponible ici : ouvre l’exercice.</p>
                )}
                <Link to={contentPath(item.content_object)} state={openState}
                  className="mt-4 inline-flex min-h-[36px] items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                  Ouvrir l’{item.content_object.type === 'exam' ? 'examen' : 'exercice'} (commentaires, solutions des élèves) <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Où en es-tu ? puis la suite */}
              <div className="flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-line bg-[#fcfbf9] px-4 py-3 sm:px-6">
                <span className="mr-1 text-[13px] font-semibold text-ink">Tu l’as réussi ?</span>
                {([['success', 'Tout réussi', CheckCheck], ['review', 'À revoir', RotateCcw]] as const).map(([v, label, Icon]) => {
                  const on = statuses[String(item.object_id)] === v;
                  return (
                    <button key={v} type="button" disabled={busy} aria-pressed={on} onClick={() => setVerdict(item.content_object, v)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                        on ? (v === 'success' ? 'border-brand bg-brand-soft text-brand-hover' : 'border-gold bg-gold-soft text-[#8a6318]')
                          : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  );
                })}
                <div className="ml-auto flex gap-2">
                  {(current ?? 0) > 0 && (
                    <button type="button" onClick={() => goTo((current ?? 1) - 1)} aria-label="Exercice précédent"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:border-ink">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => goTo((current ?? 0) + 1 < items.length ? (current ?? 0) + 1 : null)}
                    className="fd-btn-primary" style={{ minHeight: 40 }}>
                    {(current ?? 0) + 1 < items.length ? 'Exercice suivant' : 'Terminer'} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Récapitulatif : la liste a été parcourue */
            <div ref={cardRef} className="mt-4 scroll-mt-20 rounded-2xl border border-line bg-white px-5 py-6 text-center sm:px-8">
              <p className="fd-display text-[22px] leading-tight text-ink">
                {counts.success === items.length ? 'Toute la liste est réussie !' : 'Tu as parcouru la liste.'}
              </p>
              <p className="mt-2 text-[14px] text-ink-soft fd-nums">
                {counts.success} réussi{counts.success > 1 ? 's' : ''} · {counts.review} à revoir · {counts.todo} pas encore fait{counts.todo > 1 ? 's' : ''}
              </p>
              {counts.review > 0 && (
                <p className="mt-1 text-[13px] text-ink-faint">Refais ceux « à revoir » dans 2 ou 3 jours : c’est là qu’ils rentrent pour de bon.</p>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {firstNotDone >= 0 && (
                  <button type="button" onClick={() => goTo(firstReview >= 0 ? firstReview : firstNotDone)} className="fd-btn-primary" style={{ minHeight: 40 }}>
                    <RotateCcw className="h-4 w-4" /> {firstReview >= 0 ? 'Reprendre les « à revoir »' : 'Reprendre'}
                  </button>
                )}
                <button type="button" onClick={() => goTo(0)} className="fd-btn-ghost" style={{ minHeight: 40 }}>Revoir depuis le début</button>
                <Link to="/revision-lists?onglet=listes" className="fd-btn-ghost" style={{ minHeight: 40 }}>Mes listes</Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ───────────── Feuille à imprimer : tous les énoncés à la suite ───────────── */
        <>
          <div className="revision-print-only">
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px' }}>{list.name}</h1>
            {list.description && <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginBottom: '4px' }}>{list.description}</p>}
            <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginBottom: '16px' }}>
              {items.length} exercice{items.length !== 1 ? 's' : ''} · {formatDate(list.created_at)}
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginBottom: '24px' }} />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <AnimatePresence>
              <div className="flex flex-col gap-8">
                {items.map((it, index) => {
                  const content = it.content_object;
                  const hasStructure = content.structure && typeof content.structure === 'object';
                  const isExam = content.type === 'exam';
                  return (
                    <motion.div key={it.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60 }}
                      transition={{ delay: index * 0.04 }}
                      className="revision-exercise-card bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
                      <div className={`h-1 ${isExam ? 'bg-[#c0892f]' : 'bg-[#1a7a4a]'}`} />
                      <div className="px-4 sm:px-6 pt-5 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="text-xs font-bold text-ink-faint uppercase tracking-wider">{kindLabel(content)} {index + 1}</span>
                              <span className="revision-print-hide"><StatusPill status={statuses[String(it.object_id)]} /></span>
                            </div>
                            <h2 className="text-lg font-bold text-ink leading-snug">{content.title}</h2>
                          </div>
                          <button onClick={() => handleRemoveItem(it.id)} aria-label="Retirer de la liste"
                            className="revision-print-hide inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[#cfcdc8] hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <Meta content={content} />
                        <Link to={contentPath(content)} state={openState}
                          className="revision-print-hide mt-2 inline-flex min-h-[32px] items-center gap-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
                          Ouvrir l’{isExam ? 'examen' : 'exercice'} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <div className="mx-4 sm:mx-6 border-t border-[#f2f1ee]" />
                      <div className="px-4 sm:px-6 py-4">
                        {hasStructure ? (
                          <ExerciseRenderer structure={content.structure as unknown as FlexibleExerciseStructure} interactive={false}
                            showAllSolutions={showAllSolutions} compact={false} />
                        ) : (
                          <p className="text-sm text-ink-faint italic">Aucun contenu disponible</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Impression (Feuille à imprimer) */}
      <style>{`
        .revision-print-only { display: none; }

        @media print {
          .revision-print-hide { display: none !important; }
          .revision-print-only { display: block !important; padding: 24px 40px 0; }

          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; }
          .max-w-4xl { max-width: 100% !important; }
          .px-4, .sm\\:px-6 { padding-left: 0 !important; padding-right: 0 !important; }
          .py-8 { padding-top: 0 !important; padding-bottom: 0 !important; }

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

          /* Remove gap in print — page breaks handle separation */
          .flex.flex-col.gap-8 { gap: 0 !important; }

          /* Accent line */
          .revision-exercise-card > div:first-child { height: 4px !important; }

          /* When solutions are hidden, mask solution areas and solution toggle buttons */
          .revision-solutions-hidden .content-compact-view .border-l-2.border-green-400 { display: none !important; }
          .revision-solutions-hidden .content-compact-view button { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default RevisionListDetail;

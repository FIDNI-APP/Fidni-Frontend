/**
 * Révisions (/revision-lists) : deux onglets séparés (09/10/2026), mémorisés dans l'adresse (?onglet=ds|listes) :
 *  - Mes DS : devoirs annoncés, préparation, DS blanc, notes (components/devoirs/UpcomingTestsSection) ;
 *  - Mes listes : exercices à retravailler rangés par l'élève, et ses exercices ratés pas encore rangés.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRevisionLists, deleteRevisionList, createRevisionList, getRevisionSuggestions, quickAddManyToRevision,
  type RevisionList, type RevisionSuggestion,
} from '@/lib/api/revisionListApi';
import { AlertCircle, BookmarkPlus, CalendarCheck, ChevronDown, ChevronRight, ListChecks, ListPlus, Loader2, Plus, Printer, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevisionLabelPicker, EMPTY_LABELS, labelsToPayload, type RevisionLabels } from '@/components/revision/RevisionLabelPicker';
import { HowItWorks, UpcomingTestsSection } from '@/components/devoirs/UpcomingTestsSection';
import type { UpcomingTest } from '@/lib/api/devoirsApi';

const NAME_IDEAS = ['Limites — DS 1', 'Avant le bac blanc', 'Exercices ratés'];

type Tab = 'ds' | 'listes';
const TAB_KEY = 'fidni:revisions:onglet';
const LIST_STEPS = [
  { icon: BookmarkPlus, title: 'Range des exercices', text: 'Bouton « Liste » sur un exercice ou un examen, ou en un clic depuis tes exercices ratés.' },
  { icon: RotateCcw, title: 'Refais-les à la suite', text: 'Ouvre la liste : un exercice à la fois, tu dis ce que tu as réussi, et on reprend au premier qui n’est pas encore réussi.' },
  { icon: Printer, title: 'Imprime une feuille', text: 'Feuille à imprimer : exporte la liste en PDF, avec ou sans corrigé, pour travailler sur papier.' },
];

function storedTab(): Tab | null {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return v === 'ds' || v === 'listes' ? v : null;
  } catch { return null; }
}

export const RevisionLists = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<RevisionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newLabels, setNewLabels] = useState<RevisionLabels>(EMPTY_LABELS);
  // Filtres par étiquette (niveau, matière, chapitre).
  const [fLevel, setFLevel] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fChapter, setFChapter] = useState('');
  // Exercices ratés pas encore rangés dans une liste.
  const [suggestions, setSuggestions] = useState<RevisionSuggestion[]>([]);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [addingId, setAddingId] = useState<number | 'all' | null>(null);
  // Onglet : celui de l'adresse, sinon le dernier ouvert, sinon « Mes DS ».
  const [params, setParams] = useSearchParams();
  const urlTab = params.get('onglet');
  const tab: Tab = urlTab === 'ds' || urlTab === 'listes' ? urlTab : (storedTab() ?? 'ds');
  const selectTab = (t: Tab) => {
    try { localStorage.setItem(TAB_KEY, t); } catch { /* préférence facultative */ }
    const next = new URLSearchParams(params);
    next.set('onglet', t);
    setParams(next, { replace: true });
  };
  const [tests, setTests] = useState<UpcomingTest[] | null>(null);
  const onTests = useCallback((t: UpcomingTest[]) => setTests(t), []);
  const upcomingCount = (tests ?? []).filter((t) => t.days_left >= 0).length;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) { fetchLists(); fetchSuggestions(); }
  }, [isAuthenticated, authLoading, navigate]);

  // Échap ferme la fenêtre de création.
  useEffect(() => {
    if (!showCreateModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreateModal]);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const data = await getRevisionLists();
      setLists(data || []);
      setError(null);
    } catch {
      setError('Impossible de charger tes listes de révision.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const r = await getRevisionSuggestions();
      setSuggestions(r.results || []);
      setSuggestionCount(r.count || 0);
    } catch { /* encart facultatif */ }
  };

  const addSuggestion = async (ids: number[], key: number | 'all') => {
    setAddingId(key);
    try {
      await quickAddManyToRevision(ids);  // une requête, même pour « Tout ranger »
      setSuggestions((prev) => prev.filter((x) => !ids.includes(x.id)));
      setSuggestionCount((n) => Math.max(0, n - ids.length));
      await fetchLists();
    } catch {
      setError('L’exercice n’a pas pu être ajouté.');
    } finally {
      setAddingId(null);
    }
  };

  // Valeurs de filtre disponibles : seulement celles présentes sur les listes.
  const facets = useMemo(() => {
    const collect = (key: 'class_levels' | 'subjects' | 'chapters') => {
      const m = new Map<string, string>();
      lists.forEach((l) => (l[key] || []).forEach((x) => m.set(String(x.id), x.name)));
      return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    };
    return { levels: collect('class_levels'), subjects: collect('subjects'), chapters: collect('chapters') };
  }, [lists]);
  const hasFacets = facets.levels.length + facets.subjects.length + facets.chapters.length > 0;
  const filtering = !!(fLevel || fSubject || fChapter);
  const shown = lists.filter((l) =>
    (!fLevel || (l.class_levels || []).some((x) => String(x.id) === fLevel))
    && (!fSubject || (l.subjects || []).some((x) => String(x.id) === fSubject))
    && (!fChapter || (l.chapters || []).some((x) => String(x.id) === fChapter)));

  const totals = lists.reduce((acc, l) => {
    const n = l.item_count ?? 0;
    const p = l.progress ?? { success: 0, review: 0, todo: n };
    return { items: acc.items + n, success: acc.success + p.success, review: acc.review + p.review };
  }, { items: 0, success: 0, review: 0 });

  const handleDelete = async (list: RevisionList) => {
    if (!window.confirm(`Supprimer la liste « ${list.name} » ? Les exercices eux-mêmes restent sur Fidni.`)) return;
    try {
      setDeletingId(list.id);
      await deleteRevisionList(list.id);
      setLists(prev => prev.filter(l => l.id !== list.id));
    } catch {
      setError('La liste n’a pas pu être supprimée.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newListName.trim() || creating) return;
    try {
      setCreating(true);
      const newList = await createRevisionList({ name: newListName.trim(), description: newListDescription.trim(), ...labelsToPayload(newLabels) });
      setLists([newList, ...lists]);
      closeModal();
      navigate(`/profile/revision-lists/${newList.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.name?.[0] || 'La liste n’a pas pu être créée.');
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setNewListName('');
    setNewListDescription('');
    setNewLabels(EMPTY_LABELS);
    setError(null);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-5">
        <h1 className="fd-display text-[26px] leading-tight text-ink md:text-[30px]">Révisions</h1>
        <p className="mt-1 text-sm text-ink-soft">Prépare tes prochains DS et retravaille les exercices que tu as mis de côté.</p>
      </header>

      {/* Deux onglets : on ne mélange plus DS et listes. */}
      <div role="tablist" aria-label="Révisions" data-tour="revisions-onglets"
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[#f2f1ee] p-1 sm:inline-grid sm:w-auto">
        {([
          ['ds', 'Mes DS', CalendarCheck, tests === null ? null : upcomingCount],
          ['listes', 'Mes listes', ListChecks, loading ? null : lists.length],
        ] as const).map(([key, label, Icon, count]) => {
          const active = tab === key;
          return (
            <button key={key} type="button" role="tab" id={`onglet-${key}`} aria-selected={active} aria-controls={`panneau-${key}`}
              onClick={() => selectTab(key)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[14px] font-semibold transition-colors sm:min-w-[150px] ${
                active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(20,18,16,.08)]' : 'text-ink-soft hover:text-ink'}`}>
              <Icon className="h-4 w-4" /> {label}
              {count !== null && count > 0 && (
                <span className={`fd-nums rounded-full px-1.5 text-[11.5px] ${active ? 'bg-brand-soft text-brand-hover' : 'bg-white/70 text-ink-faint'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* « Mes DS » reste monté (caché) pour garder le compteur de l'onglet à jour. */}
      <div role="tabpanel" id="panneau-ds" aria-labelledby="onglet-ds" hidden={tab !== 'ds'}>
        <UpcomingTestsSection onTests={onTests} />
      </div>

      <section role="tabpanel" id="panneau-listes" aria-labelledby="onglet-listes" hidden={tab !== 'listes'}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-[13.5px] text-ink-soft">
            {loading ? '\u00a0' : lists.length === 0
              ? 'Regroupe les exercices à retravailler pour les refaire ou les imprimer.'
              : <>
                  <b className="fd-nums font-semibold text-ink">{lists.length}</b> liste{lists.length > 1 ? 's' : ''}
                  {' · '}<b className="fd-nums font-semibold text-ink">{totals.items}</b> exercice{totals.items > 1 ? 's' : ''}
                  {totals.success > 0 && <> · <b className="fd-nums font-semibold text-brand-hover">{totals.success}</b> réussi{totals.success > 1 ? 's' : ''}</>}
                  {totals.review > 0 && <> · <b className="fd-nums font-semibold text-[#8a6318]">{totals.review}</b> à revoir</>}
                </>}
          </p>
          {lists.length > 0 && (
            <button type="button" onClick={() => setShowCreateModal(true)} data-tour="revisions-nouvelle" className="fd-btn-ghost">
              <Plus className="h-4 w-4" /> Nouvelle liste
            </button>
          )}
        </div>

        {error && !showCreateModal && (
          <div role="alert" className="mb-3 flex items-center gap-3 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-sm text-[#9c3b2e]">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Filtres : seulement quand il y a beaucoup de listes. */}
        {!loading && lists.length > 6 && hasFacets && (
          <div className="mb-3 flex flex-wrap items-center gap-2" data-tour="revisions-filtres">
            {([
              ['Niveau', facets.levels, fLevel, setFLevel],
              ['Matière', facets.subjects, fSubject, setFSubject],
              ['Chapitre', facets.chapters, fChapter, setFChapter],
            ] as const).filter(([, opts]) => opts.length > 0).map(([label, opts, val, set]) => (
              <select key={label} value={val} onChange={(e) => set(e.target.value)} aria-label={label}
                className={`h-8 max-w-[14rem] rounded-lg border px-2 text-[12.5px] ${val ? 'border-brand bg-brand-soft font-semibold text-brand-hover' : 'border-line bg-white text-ink-soft'}`}>
                <option value="">{label} : tous</option>
                {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ))}
            {filtering && (
              <button type="button" onClick={() => { setFLevel(''); setFSubject(''); setFChapter(''); }}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-faint hover:text-ink">
                <X className="h-3.5 w-3.5" /> Effacer
              </button>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {suggestions.length > 0 && (
            <Suggestions items={suggestions} count={suggestionCount} adding={addingId} onAdd={addSuggestion} />
          )}
          {loading ? (
            <div aria-busy className="divide-y divide-line">
              {[0, 1].map((i) => <div key={i} className="h-[68px] animate-pulse" />)}
            </div>
          ) : lists.length === 0 ? (
            <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft">
                <ListPlus className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">Pas encore de liste</p>
                <p className="text-[13px] text-ink-faint">Range ici les exercices à retravailler : bouton « Liste » sur chaque exercice.</p>
              </div>
              <button type="button" className="fd-btn-primary" onClick={() => setShowCreateModal(true)} data-tour="revisions-nouvelle"><Plus className="h-4 w-4" /> Créer une liste</button>
            </div>
            <HowItWorks steps={LIST_STEPS} />
            </>
          ) : shown.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13.5px] text-ink-faint">
              Aucune liste avec ces étiquettes.{' '}
              <button className="font-semibold text-brand-hover hover:underline" onClick={() => { setFLevel(''); setFSubject(''); setFChapter(''); }}>Tout afficher</button>
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((list, i) => (
                <ListRow key={list.id} list={list} tour={i === 0} deleting={deletingId === list.id} onDelete={() => handleDelete(list)} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Création */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 overflow-y-auto [align-items:safe_center] z-[70] flex items-center justify-center bg-[rgba(20,18,16,.4)] p-4 backdrop-blur-[2px]" onClick={closeModal}>
            <motion.form
              onSubmit={handleCreate}
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_rgba(20,18,16,.22)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-list-title"
            >
              <h2 id="new-list-title" className="fd-display text-[20px] text-ink">Nouvelle liste</h2>
              <p className="mt-1 text-[13px] text-ink-soft">Tu pourras la renommer à tout moment.</p>

              <label className="mt-5 block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">Nom</span>
                <input
                  type="text"
                  value={newListName}
                  maxLength={100}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Ex. : Limites — DS 1"
                  autoFocus
                />
              </label>
              {!newListName && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {NAME_IDEAS.map(idea => (
                    <button key={idea} type="button" onClick={() => setNewListName(idea)}
                      className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-soft hover:border-ink-faint hover:text-ink">
                      {idea}
                    </button>
                  ))}
                </div>
              )}

              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Description <span className="font-normal text-ink-faint">(facultatif)</span>
                </span>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Pour le devoir du 12 novembre…"
                  rows={3}
                />
              </label>

              <div className="mt-4">
                <RevisionLabelPicker value={newLabels} onChange={setNewLabels} />
              </div>

              {error && (
                <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-3 py-2.5 text-[13px] text-[#9c3b2e]">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button type="button" className="fd-btn-ghost flex-1 justify-center" onClick={closeModal}>Annuler</button>
                <button type="submit" className="fd-btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={creating || !newListName.trim()}>
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Création…</> : 'Créer la liste'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Une liste : nom, nombre d'exercices et chapitres, réussis / à revoir en une barre. */
function ListRow({ list, tour, deleting, onDelete }: { list: RevisionList; tour: boolean; deleting: boolean; onDelete: () => void }) {
  const total = list.item_count ?? 0;
  const p = list.progress ?? { success: 0, review: 0, todo: total };
  const chapters = (list.chapters?.length ? list.chapters.map((c) => c.name) : list.item_chapters ?? []).slice(0, 2);
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <li className="group relative">
      <Link to={`/profile/revision-lists/${list.id}`} {...(tour ? { 'data-tour': 'revisions-liste' } : {})}
        className="flex items-center gap-4 py-3.5 pl-4 pr-12 transition-colors hover:bg-[#faf9f7] sm:pl-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{list.name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">
            {total} exercice{total > 1 ? 's' : ''}{chapters.length ? ` · ${chapters.join(', ')}` : ''}
          </p>
        </div>
        {total > 0 && (
          <div className="hidden w-40 shrink-0 sm:block">
            <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
              {p.success > 0 && <div className="h-full bg-brand" style={{ width: `${pct(p.success)}%` }} />}
              {p.review > 0 && <div className="h-full bg-gold" style={{ width: `${pct(p.review)}%` }} />}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-faint">
              {p.success + p.review === 0 ? <><span className="fd-nums font-semibold text-ink-soft">{p.todo}</span> à faire</> : <>
                <span className="fd-nums font-semibold text-brand-hover">{p.success}</span> réussi{p.success > 1 ? 's' : ''}
                {p.review > 0 && <> · <span className="fd-nums font-semibold text-[#8a6318]">{p.review}</span> à revoir</>}
              </>}
            </p>
          </div>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-[#cfcdc8] group-hover:text-ink-faint" />
      </Link>
      <button type="button" onClick={onDelete} disabled={deleting} aria-label={`Supprimer la liste ${list.name}`} title="Supprimer"
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint opacity-70 hover:bg-[#f2f1ee] hover:text-[#a23b34] focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
}

/** Exercices ratés rangés nulle part : une ligne, dépliable. */
function Suggestions({ items, count, adding, onAdd }: {
  items: RevisionSuggestion[]; count: number; adding: number | 'all' | null; onAdd: (ids: number[], key: number | 'all') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gold-line bg-gold-soft/60" data-tour="revisions-suggestions">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
        <Sparkles className="h-4 w-4 shrink-0 text-gold-strong" />
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-soft">
          <b className="font-semibold text-ink">{count} exercice{count > 1 ? 's' : ''} raté{count > 1 ? 's' : ''}</b> {count > 1 ? 'ne sont' : 'n’est'} dans aucune liste.
        </p>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-ink-soft hover:bg-white/70">
          {open ? 'Masquer' : 'Voir'} <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" disabled={adding !== null} onClick={() => onAdd(items.map((x) => x.id), 'all')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] font-semibold text-brand-hover ring-1 ring-gold-line hover:ring-brand disabled:opacity-50">
          {adding === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />} Les ranger dans « À revoir »
        </button>
      </div>
      {open && (
        <ul className="divide-y divide-gold-line/70 border-t border-gold-line/70">
          {items.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <div className="min-w-0 flex-1">
                <Link to={`/${x.type === 'exam' ? 'exams' : 'exercises'}/${x.id}`} className="line-clamp-1 text-[13.5px] font-semibold text-ink hover:underline">{x.title}</Link>
                <p className="line-clamp-1 text-[12px] text-ink-faint">
                  {[x.failed ? 'Marqué à revoir' : `${x.weak_questions} question${x.weak_questions > 1 ? 's' : ''} à reprendre`, x.chapters[0]].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" disabled={adding !== null} onClick={() => onAdd([x.id], x.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-hover hover:bg-white/70 disabled:opacity-50">
                {adding === x.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Ajouter
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

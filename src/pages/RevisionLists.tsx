import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRevisionLists, deleteRevisionList, createRevisionList, type RevisionList } from '@/lib/api/revisionListApi';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, ListPlus, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/** Ce que la carte montre d'une liste, calculé à partir de ses éléments (aucun chiffre inventé). */
function summarize(list: RevisionList) {
  const items = list.items || [];
  let success = 0, review = 0;
  const chapters = new Map<string, string>();
  items.forEach(item => {
    const c = item.content_object;
    if (c?.user_complete === 'success') success += 1;
    else if (c?.user_complete === 'review') review += 1;
    (c?.chapters || []).forEach((ch: { id: number; name: string }) => chapters.set(String(ch.id), ch.name));
  });
  const total = list.item_count ?? items.length;
  return { total, success, review, todo: Math.max(total - success - review, 0), chapters: Array.from(chapters.values()) };
}

const NAME_IDEAS = ['Limites — DS 1', 'Avant le bac blanc', 'Exercices ratés'];

const STEPS = [
  { icon: ListPlus, title: 'Crée une liste', text: 'Un thème, un devoir, une semaine : « Limites — DS 1 ».' },
  { icon: BookOpen, title: 'Ajoute des exercices', text: 'Depuis la page d’un exercice ou d’un examen, bouton « Liste ».' },
  { icon: CheckCircle2, title: 'Révise et coche', text: 'Marque chaque exercice réussi ou à revoir : la carte suit ta progression.' },
];

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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) fetchLists();
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
      const newList = await createRevisionList({ name: newListName.trim(), description: newListDescription.trim() });
      setLists([newList, ...lists]);
      closeModal();
      navigate(`/profile/revision-lists/${newList.id}`);
    } catch {
      setError('La liste n’a pas pu être créée.');
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setNewListName('');
    setNewListDescription('');
    setError(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="fd-display text-[26px] leading-tight text-ink md:text-[30px]">Révisions</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Tes listes d’exercices à retravailler, avec ce qui est réussi et ce qui reste à revoir.
          </p>
        </div>
        <button className="fd-btn-primary shrink-0" onClick={() => setShowCreateModal(true)} data-tour="revisions-nouvelle">
          <Plus className="h-4 w-4" /> Nouvelle liste
        </button>
      </header>

      {error && !showCreateModal && (
        <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-sm text-[#9c3b2e]">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
          {[0, 1, 2].map(i => (
            <div key={i} className="fd-card h-[210px] animate-pulse p-5">
              <div className="h-3 w-24 rounded bg-[#f2f1ee]" />
              <div className="mt-4 h-5 w-3/4 rounded bg-[#f2f1ee]" />
              <div className="mt-8 h-2 rounded-full bg-[#f7f6f3]" />
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <section className="fd-card px-5 py-10 md:px-10 md:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="fd-display text-[20px] text-ink">Ta première liste en trois gestes</h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              Regroupe les exercices qui te résistent pour les reprendre au bon moment.
            </p>
          </div>
          <ol className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-center gap-3">
                  <span className="fd-nums flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">{i + 1}</span>
                  <Icon className="h-4 w-4 text-brand" aria-hidden />
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <button className="fd-btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" /> Créer ma première liste
            </button>
            <Link to="/exercises" className="fd-btn-ghost">Parcourir les exercices</Link>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list, i) => {
            const s = summarize(list);
            const pct = (n: number) => (s.total ? (n / s.total) * 100 : 0);
            const open = () => navigate(`/profile/revision-lists/${list.id}`);
            return (
              <motion.article
                key={list.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
                className="fd-card group flex h-full cursor-pointer flex-col p-5 transition-shadow hover:shadow-[0_10px_30px_rgba(20,18,16,.08)]"
                onClick={open}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint">
                    <span className="fd-nums">{s.total}</span> exercice{s.total > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(list); }}
                    disabled={deletingId === list.id}
                    aria-label={`Supprimer la liste ${list.name}`}
                    className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint opacity-70 hover:bg-[#f2f1ee] hover:text-ink group-hover:opacity-100"
                  >
                    {deletingId === list.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                <h2 className="fd-display mt-1 line-clamp-2 text-[18px] leading-snug text-ink">{list.name}</h2>
                {list.description && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{list.description}</p>
                )}

                {s.chapters.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.chapters.slice(0, 3).map(name => (
                      <span key={name} className="max-w-full truncate rounded-full bg-[#f2f1ee] px-2.5 py-0.5 text-[11.5px] text-ink-soft">{name}</span>
                    ))}
                    {s.chapters.length > 3 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[11.5px] text-ink-faint">+{s.chapters.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex-1" />

                {/* Progression : réussis (vert), à revoir (or), à faire (vide). */}
                <div className="mt-5">
                  {s.total > 0 ? (
                    <>
                      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
                        {s.success > 0 && <div className="h-full bg-brand" style={{ width: `${pct(s.success)}%` }} />}
                        {s.review > 0 && <div className="h-full bg-gold" style={{ width: `${pct(s.review)}%` }} />}
                      </div>
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-soft">
                        <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-brand" aria-hidden /><span className="fd-nums">{s.success}</span> réussi{s.success > 1 ? 's' : ''}</span>
                        <span className="inline-flex items-center gap-1"><RotateCcw className="h-3 w-3 text-gold-strong" aria-hidden /><span className="fd-nums">{s.review}</span> à revoir</span>
                        <span><span className="fd-nums">{s.todo}</span> à faire</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-[12.5px] text-ink-faint">
                      Vide pour l’instant : ajoute des exercices avec le bouton « Liste ».
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f2f1ee] pt-3">
                  <span className="text-[11.5px] text-ink-faint">Modifiée le {formatDate(list.updated_at || list.created_at)}</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:text-brand-hover"
                    onClick={(e) => { e.stopPropagation(); open(); }}
                    {...(i === 0 ? { 'data-tour': 'revisions-liste' } : {})}
                  >
                    {s.todo + s.review > 0 || s.total === 0 ? 'Réviser' : 'Revoir'} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Création */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(20,18,16,.4)] p-4 backdrop-blur-[2px]" onClick={closeModal}>
            <motion.form
              onSubmit={handleCreate}
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_rgba(20,18,16,.22)]"
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

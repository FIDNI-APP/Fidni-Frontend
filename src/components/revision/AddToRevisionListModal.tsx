// « Ajouter à une liste de révision » (carte d'un exercice, liste « énoncés », page d'un exercice) : un clic
// sur une liste y range l'exercice ; « Nouvelle liste » la crée et l'y range directement. Même langage que
// la fenêtre « Nouvelle liste » de Réviser (components/revision/CreateListModal) ; portail au-dessus de tout.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  getRevisionLists,
  createRevisionList,
  addItemToRevisionList,
  type RevisionList
} from '@/lib/api';
import { AlertCircle, Check, ListChecks, Loader2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RevisionLabelPicker, EMPTY_LABELS, labelsToPayload, type RevisionLabels } from './RevisionLabelPicker';

interface AddToRevisionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'exercise' | 'exam';
  contentId: number;
  contentTitle?: string;
  /** Niveau, matière et chapitre de l'exercice : proposés comme étiquettes d'une nouvelle liste. */
  contentLabels?: RevisionLabels;
}

const field = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

export const AddToRevisionListModal: React.FC<AddToRevisionListModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
  contentLabels,
}) => {
  const [lists, setLists] = useState<RevisionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newLabels, setNewLabels] = useState<RevisionLabels>(EMPTY_LABELS);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);
  const [addedToLists, setAddedToLists] = useState<Set<number>>(new Set());
  const [processingListId, setProcessingListId] = useState<number | null>(null);

  const loadRevisionLists = async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const data = await getRevisionLists();
      setLists(data);
      // Les listes qui contiennent déjà cet exercice.
      const alreadyAdded = new Set<number>();
      data.forEach((list) => {
        if (list.items?.some((item) => item.object_id === contentId && item.content_type_name === contentType)) {
          alreadyAdded.add(list.id);
        }
      });
      setAddedToLists(alreadyAdded);
    } catch (error) {
      console.error('Failed to load revision lists:', error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadRevisionLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetForm = () => {
    setShowCreateForm(false);
    setNewListName('');
    setNewListDescription('');
    setCreateError(null);
  };

  const handleClose = () => {
    resetForm();
    setAddError(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || creating) return;
    try {
      setCreating(true);
      const newList = await createRevisionList({
        name: newListName.trim(),
        description: newListDescription,
        ...labelsToPayload(newLabels),
      });
      resetForm();
      // La nouvelle liste reçoit directement l'exercice : c'est pour ça qu'on l'a créée.
      await addItemToRevisionList(newList.id, { content_type: contentType, object_id: contentId });
      await loadRevisionLists();
    } catch (error) {
      setCreateError((error as { response?: { data?: { name?: string[] } } })?.response?.data?.name?.[0] || 'La liste n’a pas pu être créée.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddToList = async (listId: number) => {
    if (addedToLists.has(listId) || processingListId !== null) return;
    try {
      setProcessingListId(listId);
      setAddError(false);
      await addItemToRevisionList(listId, { content_type: contentType, object_id: contentId });
      setAddedToLists((prev) => new Set(prev).add(listId));
    } catch (error) {
      console.error('Failed to add to revision list:', error);
      setAddError(true);
    } finally {
      setProcessingListId(null);
    }
  };

  const word = contentType === 'exam' ? 'l’examen' : 'l’exercice';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="add-to-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(20,18,16,.4)] p-3 backdrop-blur-[2px] sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_rgba(20,18,16,.22)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="add-to-list-title"
          >
            {/* En-tête */}
            <div className="flex shrink-0 items-start gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="min-w-0 flex-1">
                <h2 id="add-to-list-title" className="fd-display text-[22px] leading-tight text-ink">Ajouter à une liste</h2>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">
                  {contentTitle ? <>«&nbsp;{contentTitle}&nbsp;»</> : `Range ${word} dans une liste de révision.`}
                </p>
              </div>
              <button type="button" onClick={handleClose} aria-label="Fermer"
                className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Les listes */}
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-4 sm:px-6">
              {loading ? (
                <div className="grid gap-2" role="status" aria-label="Chargement">
                  {[0, 1].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-xl border border-line bg-[#faf9f7]" />)}
                </div>
              ) : loadFailed ? (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
                  <p className="flex-1 text-[13px] font-medium text-[#a23b34]">Tes listes n’ont pas pu être chargées.</p>
                  <button type="button" onClick={loadRevisionLists} className="fd-btn-ghost min-h-9">Réessayer</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {lists.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Tes listes</h3>
                      <ul className="grid gap-2">
                        {lists.map((list) => {
                          const isAdded = addedToLists.has(list.id);
                          const isProcessing = processingListId === list.id;
                          const count = list.item_count ?? 0;
                          return (
                            <li key={list.id}>
                              <button type="button" onClick={() => handleAddToList(list.id)} disabled={isAdded || processingListId !== null}
                                aria-label={isAdded ? `${list.name} : déjà dans cette liste` : `Ajouter à ${list.name}`}
                                className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                                  isAdded ? 'cursor-default border-brand-line bg-brand-soft'
                                    : 'border-line bg-white hover:border-[#cfc9bf] hover:bg-[#fcfbf9] disabled:cursor-wait'}`}>
                                <ListChecks className={`h-4 w-4 shrink-0 ${isAdded ? 'text-brand-hover' : 'text-ink-faint'}`} aria-hidden />
                                <span className="min-w-0 flex-1">
                                  <span className={`block truncate text-[14.5px] font-semibold ${isAdded ? 'text-brand-hover' : 'text-ink'}`}>{list.name}</span>
                                  <span className="block truncate text-[12px] text-ink-faint">
                                    {count} exercice{count > 1 ? 's' : ''}{list.description ? ` · ${list.description}` : ''}
                                  </span>
                                </span>
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" aria-hidden />
                                ) : isAdded ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-hover">
                                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Ajouté
                                  </span>
                                ) : (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#f2f1ee] px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft">
                                    <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {addError && (
                        <p role="alert" className="mt-2 flex items-center gap-2 text-[12.5px] text-[#a23b34]">
                          <AlertCircle className="h-4 w-4 shrink-0" /> L’exercice n’a pas pu être ajouté. Réessaie.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Nouvelle liste : elle reçoit directement l'exercice */}
                  {!showCreateForm ? (
                    <div>
                      {lists.length === 0 && (
                        <p className="mb-3 text-[13.5px] leading-relaxed text-ink-faint">
                          Tu n’as pas encore de liste. Crée la première : {word} y sera rangé directement.
                        </p>
                      )}
                      <button type="button" onClick={() => { setNewLabels(contentLabels ?? EMPTY_LABELS); setShowCreateForm(true); }}
                        className={lists.length === 0 ? 'fd-btn-primary min-h-11 w-full justify-center'
                          : 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d8d4cc] text-[13.5px] font-semibold text-ink-soft transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'}>
                        <Plus className="h-4 w-4" /> {lists.length === 0 ? 'Créer ma première liste' : 'Nouvelle liste'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateList} className="rounded-xl border border-line bg-[#fcfbf9] p-4">
                      <h3 className="text-[14px] font-semibold text-ink">Nouvelle liste</h3>
                      <label className="mt-3 block">
                        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Nom</span>
                        <input type="text" value={newListName} maxLength={100} onChange={(e) => setNewListName(e.target.value)}
                          className={field} placeholder="Ex. : Limites — DS 1" required autoFocus />
                      </label>
                      <label className="mt-3 block">
                        <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                          Description <span className="font-normal text-ink-faint">(facultatif)</span>
                        </span>
                        <textarea value={newListDescription} onChange={(e) => setNewListDescription(e.target.value)} rows={2}
                          className={`${field} resize-none`} placeholder="Pour le devoir du 12 novembre…" />
                      </label>
                      <div className="mt-3"><RevisionLabelPicker value={newLabels} onChange={setNewLabels} /></div>
                      {createError && (
                        <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-3 py-2.5 text-[13px] text-[#a23b34]">
                          <AlertCircle className="h-4 w-4 shrink-0" /> {createError}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <button type="button" className="fd-btn-ghost min-h-10 flex-1 justify-center" onClick={resetForm}>Annuler</button>
                        <button type="submit" disabled={creating || !newListName.trim()}
                          className="fd-btn-primary min-h-10 flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50">
                          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Créer et ajouter
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Pied */}
            <div className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-3 sm:px-6">
              <Link to="/reviser#mes-listes" onClick={handleClose} className="inline-flex min-h-10 items-center text-[13px] font-semibold text-brand-hover hover:underline">
                Mes listes
              </Link>
              <button type="button" className="fd-btn-ghost ml-auto min-h-10 justify-center px-5" onClick={handleClose}>
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  getRevisionLists,
  createRevisionList,
  addItemToRevisionList,
  type RevisionList
} from '@/lib/api';
import { X, Plus, Check, ListChecks, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddToRevisionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'exercise' | 'exam';
  contentId: number;
  contentTitle?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e7e3dc', background: '#fff', fontSize: 14,
  color: '#1a1a1a', outline: 'none', transition: 'border-color .15s',
  fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33302b', marginBottom: 6,
};

export const AddToRevisionListModal: React.FC<AddToRevisionListModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle
}) => {
  const [lists, setLists] = useState<RevisionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [, setSelectedListId] = useState<number | null>(null);
  const [addedToLists, setAddedToLists] = useState<Set<number>>(new Set());
  const [processingListId, setProcessingListId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRevisionLists();
    }
  }, [isOpen]);

  const loadRevisionLists = async () => {
    try {
      setLoading(true);
      const data = await getRevisionLists();
      setLists(data);

      // Check which lists already contain this content
      const alreadyAdded = new Set<number>();
      data.forEach(list => {
        const hasItem = list.items?.some(
          item => item.object_id === contentId && item.content_type_name === contentType
        );
        if (hasItem) {
          alreadyAdded.add(list.id);
        }
      });
      setAddedToLists(alreadyAdded);
    } catch (error) {
      console.error('Failed to load revision lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const newList = await createRevisionList({
        name: newListName,
        description: newListDescription
      });
      setNewListName('');
      setNewListDescription('');
      setShowCreateForm(false);
      await loadRevisionLists();
      // Automatically select the newly created list
      setSelectedListId(newList.id);
    } catch (error) {
      console.error('Failed to create revision list:', error);
    }
  };

  const handleAddToList = async (listId: number) => {
    if (addedToLists.has(listId)) return;

    try {
      setProcessingListId(listId);
      await addItemToRevisionList(listId, {
        content_type: contentType,
        object_id: contentId
      });
      setAddedToLists(prev => new Set(prev).add(listId));
    } catch (error) {
      console.error('Failed to add to revision list:', error);
    } finally {
      setProcessingListId(null);
    }
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setNewListName('');
    setNewListDescription('');
    setSelectedListId(null);
    onClose();
  };

  const focusGreen = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = '#1a7a4a'; };
  const blurGrey = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = '#e7e3dc'; };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
          style={{ background: 'rgba(20,18,16,.45)', backdropFilter: 'blur(2px)' }}
          onClick={handleClose}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e3dc', boxShadow: '0 20px 50px rgba(20,18,16,.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — ink band, same language as the auth modal */}
            <div className="relative flex-shrink-0 p-5" style={{ background: '#1a1a1a' }}>
              <button
                onClick={handleClose}
                aria-label="Fermer"
                className="absolute top-4 right-4"
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'color .15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.7)'; }}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="flex items-center gap-2.5" style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
                <ListChecks className="w-5 h-5" />
                Ajouter à une liste de révision
              </h2>
              {contentTitle && (
                <p className="line-clamp-1 mt-1" style={{ fontSize: 13, color: '#b8b4ac' }}>{contentTitle}</p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex justify-center items-center py-14">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#9a958c' }} />
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Create New List Section */}
                  <div style={{ borderBottom: '1px solid #f2f1ee', paddingBottom: 18 }}>
                    {!showCreateForm ? (
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="w-full flex items-center justify-center gap-2"
                        style={{
                          height: 44, borderRadius: 12, border: '1.5px dashed #d8d4cc',
                          background: 'transparent', color: '#33302b', fontSize: 13.5, fontWeight: 600,
                          cursor: 'pointer', transition: 'border-color .16s, background .16s, color .16s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a7a4a'; e.currentTarget.style.color = '#15633c'; e.currentTarget.style.background = 'rgba(26,122,74,.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d8d4cc'; e.currentTarget.style.color = '#33302b'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Plus className="w-4 h-4" />
                        Créer une nouvelle liste
                      </button>
                    ) : (
                      <form
                        onSubmit={handleCreateList}
                        className="flex flex-col gap-3.5"
                        style={{ background: '#faf9f7', padding: 16, borderRadius: 12, border: '1px solid #f2f1ee' }}
                      >
                        <div>
                          <label style={labelStyle}>Nom de la liste *</label>
                          <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            style={inputStyle}
                            placeholder="Ex : Révision Bac 2026…"
                            required
                            autoFocus
                            onFocus={focusGreen}
                            onBlur={blurGrey}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Description (optionnel)</label>
                          <textarea
                            value={newListDescription}
                            onChange={(e) => setNewListDescription(e.target.value)}
                            style={{ ...inputStyle, resize: 'none' }}
                            placeholder="Ajoutez une description…"
                            rows={2}
                            onFocus={focusGreen}
                            onBlur={blurGrey}
                          />
                        </div>
                        <div className="flex gap-2.5">
                          <button type="submit" className="fd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                            <Plus className="w-4 h-4" />
                            Créer
                          </button>
                          <button
                            type="button"
                            className="fd-btn-ghost"
                            onClick={() => {
                              setShowCreateForm(false);
                              setNewListName('');
                              setNewListDescription('');
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Existing Lists */}
                  {lists.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="mx-auto mb-4 flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 14, background: '#f7f6f3' }}>
                        <ListChecks className="w-6 h-6" style={{ color: '#cfcdc8' }} />
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Aucune liste de révision</p>
                      <p style={{ fontSize: 13, color: '#6b6862', marginTop: 4 }}>Créez votre première liste ci-dessus</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <h3 style={{ fontSize: 10.5, fontWeight: 700, color: '#9a958c', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                        Vos listes de révision
                      </h3>
                      {lists.map((list) => {
                        const isAdded = addedToLists.has(list.id);
                        const isProcessing = processingListId === list.id;

                        return (
                          <div
                            key={list.id}
                            onClick={() => !isAdded && !isProcessing && handleAddToList(list.id)}
                            className="flex items-center justify-between gap-3"
                            style={{
                              padding: '13px 16px', borderRadius: 12,
                              border: `1px solid ${isAdded ? '#c4ddce' : '#e7e3dc'}`,
                              background: isAdded ? '#eaf3ed' : '#fff',
                              cursor: isAdded ? 'default' : 'pointer',
                              transition: 'border-color .15s, background .15s',
                            }}
                            onMouseEnter={(e) => { if (!isAdded) { e.currentTarget.style.borderColor = '#1a7a4a'; e.currentTarget.style.background = '#faf9f7'; } }}
                            onMouseLeave={(e) => { if (!isAdded) { e.currentTarget.style.borderColor = '#e7e3dc'; e.currentTarget.style.background = '#fff'; } }}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="line-clamp-1" style={{ fontSize: 14.5, fontWeight: 600, color: isAdded ? '#15633c' : '#1a1a1a' }}>
                                {list.name}
                              </h4>
                              {list.description && (
                                <p className="line-clamp-1 mt-0.5" style={{ fontSize: 12.5, color: '#6b6862' }}>
                                  {list.description}
                                </p>
                              )}
                              <span style={{ fontSize: 11.5, color: '#9a958c' }}>
                                {list.item_count} élément{list.item_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex-shrink-0">
                              {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1a7a4a' }} />
                              ) : isAdded ? (
                                <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: '#15633c' }}>
                                  <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 99, background: '#1a7a4a' }}>
                                    <Check className="w-3.5 h-3.5" style={{ color: '#fff' }} strokeWidth={3} />
                                  </span>
                                  Ajouté
                                </span>
                              ) : (
                                <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 99, background: '#f2f1ee', transition: 'background .15s' }}>
                                  <Plus className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#33302b' }} strokeWidth={2.5} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid #f2f1ee' }}>
              <button className="fd-btn-ghost w-full" style={{ justifyContent: 'center', padding: '10px 14px' }} onClick={handleClose}>
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

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  getRevisionLists,
  createRevisionList,
  addItemToRevisionList,
  type RevisionList
} from '@/lib/api';
import { X, Plus, Check, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface AddToRevisionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'exercise' | 'exam';
  contentId: number;
  contentTitle?: string;
}

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
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
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

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
          onClick={handleClose}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ListChecks className="w-7 h-7 text-indigo-600" />
                  Ajouter à une liste
                </h2>
                {contentTitle && (
                  <p className="text-sm text-gray-600 mt-2 ml-9 line-clamp-1">{contentTitle}</p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-md flex-shrink-0"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Create New List Section */}
                  <div className="border-b border-gray-200 pb-5">
                    {!showCreateForm ? (
                      <Button
                        onClick={() => setShowCreateForm(true)}
                        variant="ghost"
                        className="w-full justify-center h-12 border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-600 font-semibold transition-all"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Créer une nouvelle liste
                      </Button>
                    ) : (
                      <form
                        onSubmit={handleCreateList}
                        className="space-y-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100"
                      >
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nom de la liste *
                          </label>
                          <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            placeholder="Ex: Révision Bac 2024..."
                            required
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description (optionnel)
                          </label>
                          <textarea
                            value={newListDescription}
                            onChange={(e) => setNewListDescription(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                            placeholder="Ajoutez une description..."
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 shadow-md hover:shadow-lg transition-all"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Créer
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowCreateForm(false);
                              setNewListName('');
                              setNewListDescription('');
                            }}
                            variant="ghost"
                            className="px-6 h-11 border-2 hover:bg-gray-100"
                          >
                            Annuler
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Existing Lists */}
                  {lists.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ListChecks className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-gray-700 font-semibold text-lg">Aucune liste de révision</p>
                      <p className="text-sm text-gray-500 mt-2">Créez votre première liste ci-dessus</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                        Vos listes de révision
                      </h3>
                      {lists.map((list) => {
                        const isAdded = addedToLists.has(list.id);
                        const isProcessing = processingListId === list.id;

                        return (
                          <motion.div
                            key={list.id}
                            whileHover={!isAdded ? { scale: 1.02 } : {}}
                            whileTap={!isAdded ? { scale: 0.98 } : {}}
                            className={`
                              p-5 border-2 rounded-xl transition-all duration-200
                              ${
                                isAdded
                                  ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 cursor-default shadow-sm'
                                  : 'border-gray-200 hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 cursor-pointer shadow-sm hover:shadow-md'
                              }
                            `}
                            onClick={() => !isAdded && !isProcessing && handleAddToList(list.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
                                  {list.name}
                                </h4>
                                {list.description && (
                                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">
                                    {list.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-3">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                                    {list.item_count} exercice{list.item_count !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {isProcessing ? (
                                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                                ) : isAdded ? (
                                  <div className="flex flex-col items-center gap-1 text-green-600">
                                    <div className="bg-green-500 rounded-full p-1.5">
                                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs font-bold">Ajouté</span>
                                  </div>
                                ) : (
                                  <div className="bg-indigo-100 hover:bg-indigo-200 rounded-full p-2 transition-colors">
                                    <Plus className="w-6 h-6 text-indigo-600" strokeWidth={2.5} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold h-12 shadow-md hover:shadow-lg transition-all"
              >
                Fermer
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

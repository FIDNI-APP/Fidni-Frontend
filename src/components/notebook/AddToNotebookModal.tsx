import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, BookMarked, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api/apiClient';
import { addLessonToNotebook, addChapterToNotebook } from '@/lib/api/notebookApi';
import toast from 'react-hot-toast';

interface Notebook {
  id: string;
  title: string;
  subject: { id: string; name: string };
  class_level: { id: string; name: string };
  sections: NotebookSection[];
}

interface NotebookSection {
  id: string;
  chapter: { id: string; name: string };
  lesson_entries: { id: string; lesson: { id: string; title: string } }[];
}

interface AddToNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle?: string;
  lessonChapters?: { id: string; name: string }[];
}

export const AddToNotebookModal: React.FC<AddToNotebookModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  lessonChapters = []
}) => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [addedSections, setAddedSections] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotebooks();
      setSelectedNotebook(null);
      setAddedSections(new Set());
    }
  }, [isOpen]);

  const loadNotebooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notebooks/get_notebooks/');
      setNotebooks(response.data);
    } catch (error) {
      console.error('Failed to load notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotebookDetails = async (notebook: Notebook) => {
    try {
      setLoading(true);
      const response = await api.get(`/notebooks/${notebook.id}/`);
      setSelectedNotebook(response.data);

      // Pre-mark sections that already contain this lesson
      const alreadyAdded = new Set<string>();
      response.data.sections?.forEach((section: NotebookSection) => {
        const has = section.lesson_entries?.some(
          (entry: any) => String(entry.lesson?.id) === String(lessonId)
        );
        if (has) alreadyAdded.add(section.id);
      });
      setAddedSections(alreadyAdded);
    } catch (error) {
      console.error('Failed to load notebook details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSection = async (sectionId: string) => {
    if (addedSections.has(sectionId) || processing) return;
    setProcessing(true);
    try {
      await addLessonToNotebook(selectedNotebook!.id, sectionId, lessonId);
      setAddedSections(prev => new Set(prev).add(sectionId));
      toast.success('Leçon ajoutée au cahier');
    } catch (error) {
      console.error('Failed to add lesson:', error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateChapterAndAdd = async (chapterId: string, chapterName: string) => {
    if (processing || !selectedNotebook) return;
    setProcessing(true);
    try {
      // Create the chapter in notebook
      const newSection = await addChapterToNotebook(selectedNotebook.id, chapterId);
      // Add lesson to the new section
      await addLessonToNotebook(selectedNotebook.id, newSection.id, lessonId);
      toast.success(`Chapitre "${chapterName}" créé et leçon ajoutée`);
      // Reload details
      await loadNotebookDetails(selectedNotebook);
    } catch (error) {
      console.error('Failed to create chapter and add:', error);
      toast.error('Erreur lors de la création du chapitre');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedNotebook(null);
    onClose();
  };

  // Chapters from the lesson that are not yet in the selected notebook
  const missingChapters = selectedNotebook
    ? lessonChapters.filter(
        ch => !selectedNotebook.sections.some(s => String(s.chapter.id) === String(ch.id))
      )
    : [];

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="notebook-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
          onClick={handleClose}
        >
          <motion.div
            key="notebook-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedNotebook && (
                  <button
                    onClick={() => setSelectedNotebook(null)}
                    className="p-1.5 rounded-lg hover:bg-white transition-colors flex-shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">
                      {selectedNotebook ? selectedNotebook.title : 'Ajouter au cahier'}
                    </span>
                  </h2>
                  {lessonTitle && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{lessonTitle}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white rounded-lg transition-colors flex-shrink-0 ml-2"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : !selectedNotebook ? (
                /* Step 1 — pick notebook */
                notebooks.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookMarked className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-semibold">Aucun cahier</p>
                    <p className="text-sm text-gray-500 mt-1">Créez un cahier depuis votre profil</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => loadNotebookDetails(nb)}
                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                      >
                        <p className="font-semibold text-gray-900">{nb.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {nb.subject?.name} · {nb.class_level?.name}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                /* Step 2 — pick chapter in notebook */
                <div className="space-y-3">
                  {/* Existing chapters */}
                  {selectedNotebook.sections.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chapitres existants</p>
                      <div className="space-y-2">
                        {selectedNotebook.sections.map((section) => {
                          const isAdded = addedSections.has(section.id);
                          return (
                            <motion.button
                              key={section.id}
                              whileHover={!isAdded ? { scale: 1.01 } : {}}
                              whileTap={!isAdded ? { scale: 0.98 } : {}}
                              onClick={() => handleAddToSection(section.id)}
                              disabled={isAdded || processing}
                              className={`w-full text-left p-4 border-2 rounded-xl transition-all flex items-center justify-between ${
                                isAdded
                                  ? 'border-green-400 bg-green-50 cursor-default'
                                  : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{section.chapter.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {section.lesson_entries.length} leçon{section.lesson_entries.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              {isAdded ? (
                                <div className="bg-green-500 rounded-full p-1">
                                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                </div>
                              ) : processing ? (
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                              ) : (
                                <div className="bg-emerald-100 rounded-full p-1.5">
                                  <Plus className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Chapters from lesson not yet in notebook — offer to create */}
                  {missingChapters.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4">
                        Créer un chapitre
                      </p>
                      <div className="space-y-2">
                        {missingChapters.map((ch) => (
                          <button
                            key={ch.id}
                            onClick={() => handleCreateChapterAndAdd(ch.id, ch.name)}
                            disabled={processing}
                            className="w-full text-left p-4 border-2 border-dashed border-emerald-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-between disabled:opacity-60"
                          >
                            <div>
                              <p className="font-semibold text-emerald-700">{ch.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Créer + ajouter la leçon</p>
                            </div>
                            {processing ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            ) : (
                              <div className="bg-emerald-100 rounded-full p-1.5">
                                <Plus className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* No chapters at all and no chapters on the lesson */}
                  {selectedNotebook.sections.length === 0 && missingChapters.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">Aucun chapitre disponible dans ce cahier.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold h-11"
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

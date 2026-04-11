// src/components/profile/RevisionListsSection.tsx - Version épurée
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRevisionLists,
  createRevisionList,
  deleteRevisionList,
  type RevisionList
} from '@/lib/api';
import {
  ListChecks, Plus, Trash2, ChevronRight, Calendar, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const RevisionListsSection: React.FC = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState<RevisionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const data = await getRevisionLists();
      setLists(data);
    } catch (err) {
      console.error('Failed to load lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setCreating(true);
      const newList = await createRevisionList({ name: newName, description: newDescription });
      setLists([newList, ...lists]);
      setShowModal(false);
      setNewName('');
      setNewDescription('');
      navigate(`/profile/revision-lists/${newList.id}`);
    } catch (err) {
      console.error('Failed to create list:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette liste ?')) return;
    try {
      await deleteRevisionList(id);
      setLists(lists.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Listes de révision</h3>
              <p className="text-slate-400 text-sm">Organisez vos exercices par thème</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouvelle liste
          </button>
        </div>
      </div>

      {/* Liste */}
      {lists.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ListChecks className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">Aucune liste</h3>
          <p className="text-slate-500 text-sm mb-4">
            Créez des listes pour regrouper les exercices à réviser
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer une liste
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/profile/revision-lists/${list.id}`)}
              className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-900/10 hover:-translate-y-1 hover:border-slate-300 transition-all duration-300"
            >
              {/* Top accent line */}
              <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

              <div className="p-5">
                {/* Badge row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold tracking-wide">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>Liste</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(list.id, e)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 mb-3 group-hover:text-slate-700 transition-colors">
                  {list.name}
                </h4>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                    {list.item_count} exercice{list.item_count !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(list.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold text-white bg-blue-600 group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                  <span>Ouvrir</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de création */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <h3 className="font-semibold">Nouvelle liste</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Révision Bac"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description optionnelle..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RevisionListsSection;
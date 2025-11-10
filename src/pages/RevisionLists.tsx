import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRevisionLists, deleteRevisionList, createRevisionList } from '@/lib/api/revisionListApi';
import { ListChecks, AlertCircle, Plus, Trash2, ChevronRight, Calendar, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface RevisionListItem {
  id: number;
  name: string;
  description: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export const RevisionLists = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<RevisionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchLists();
  }, [isAuthenticated, navigate]);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const data = await getRevisionLists();
      setLists(data || []);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des listes de révision');
      console.error('Error fetching revision lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette liste de révision ?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteRevisionList(id);
      setLists(lists.filter(list => list.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression de la liste');
      console.error('Error deleting revision list:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newListName.trim()) {
      setError('Le nom de la liste est requis');
      return;
    }

    try {
      setCreating(true);
      const newList = await createRevisionList({
        name: newListName,
        description: newListDescription
      });
      setLists([newList, ...lists]);
      setShowCreateModal(false);
      setNewListName('');
      setNewListDescription('');
      setError(null);
      navigate(`/profile/revision-lists/${newList.id}`);
    } catch (err) {
      setError('Erreur lors de la création de la liste');
      console.error('Error creating revision list:', err);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Header Section */}
      <section className="relative bg-gradient-to-r from-gray-900 to-purple-800 text-white py-12 md:py-16 mb-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 bg-purple-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <ListChecks className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Listes de Révision</h1>
                <p className="text-white/80 mt-2">Organisez vos contenus pour une révision efficace</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-white/90 transition-all font-medium shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nouvelle liste
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : error && lists.length === 0 ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <span className="text-red-800">{error}</span>
          </div>
        ) : lists.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-gray-100 p-12 text-center">
            <ListChecks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune liste de révision</h3>
            <p className="text-gray-600 mb-6">
              Créez votre première liste pour organiser vos exercices, leçons et examens
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-700 to-purple-800 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer une liste
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                onClick={() => navigate(`/profile/revision-lists/${list.id}`)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                        {list.name}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(list.id);
                      }}
                      disabled={deletingId === list.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {list.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {list.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Package className="w-4 h-4" />
                      {list.item_count} élément{list.item_count > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(list.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nouvelle Liste de Révision</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la liste *
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all"
                  placeholder="Ex: Révision Mathématiques"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all resize-none"
                  placeholder="Décrivez le contenu de cette liste..."
                  rows={3}
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewListName('');
                  setNewListDescription('');
                  setError(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newListName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-700 to-purple-800 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

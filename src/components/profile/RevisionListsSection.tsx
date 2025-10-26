import React, { useState, useEffect } from 'react';
import {
  getRevisionLists,
  createRevisionList,
  deleteRevisionList,
  updateRevisionList,
  type RevisionList
} from '@/lib/api';
import {
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const RevisionListsSection: React.FC = () => {
  const [lists, setLists] = useState<RevisionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRevisionLists();
  }, []);

  const loadRevisionLists = async () => {
    try {
      setLoading(true);
      const data = await getRevisionLists();
      setLists(data);
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
      await createRevisionList({
        name: newListName,
        description: newListDescription
      });
      setNewListName('');
      setNewListDescription('');
      setShowCreateForm(false);
      loadRevisionLists();
    } catch (error) {
      console.error('Failed to create revision list:', error);
    }
  };

  const handleDeleteList = async (listId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette liste de révision ?')) return;

    try {
      await deleteRevisionList(listId);
      loadRevisionLists();
    } catch (error) {
      console.error('Failed to delete revision list:', error);
    }
  };

  const handleUpdateList = async (listId: number, name: string, description: string) => {
    try {
      await updateRevisionList(listId, { name, description });
      setEditingListId(null);
      loadRevisionLists();
    } catch (error) {
      console.error('Failed to update revision list:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              Listes de révision
            </h2>
            <p className="text-gray-600 mt-2">Organisez vos exercices pour réviser efficacement</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle liste
          </Button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
          >
            <form onSubmit={handleCreateList} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la liste *
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Révision Bac 2024, Mathématiques Chapitre 3..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ajoutez une description pour cette liste..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Créer la liste
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewListName('');
                    setNewListDescription('');
                  }}
                  variant="ghost"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lists Grid */}
      {lists.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune liste de révision
          </h3>
          <p className="text-gray-600 mb-6">
            Créez votre première liste pour organiser vos exercices
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer une liste
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white rounded-2xl shadow-lg border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Gradient accent bar */}
              <div className="h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {list.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => setEditingListId(list.id)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-semibold text-gray-900">{list.item_count}</span>
                    <span className="text-gray-600">exercice{list.item_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Créée le {formatDate(list.created_at)}</span>
                  </div>
                  {list.updated_at !== list.created_at && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Modifiée le {formatDate(list.updated_at)}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => navigate(`/profile/revision-lists/${list.id}`)}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  Voir les exercices
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

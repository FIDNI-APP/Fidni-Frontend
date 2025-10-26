import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRevisionList,
  removeItemFromRevisionList,
  updateRevisionList,
  type RevisionList,
  type RevisionListItem
} from '@/lib/api';
import {
  ArrowLeft,
  Trash2,
  Edit2,
  Save,
  X,
  BookOpen,
  Calendar,
  GraduationCap,
  Eye,
  MessageSquare,
  ListX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PrintRevisionList } from '@/components/revision/PrintRevisionList';

export const RevisionListDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState<RevisionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (id) {
      loadList();
    }
  }, [id]);

  const loadList = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getRevisionList(parseInt(id));
      setList(data);
      setEditName(data.name);
      setEditDescription(data.description);
    } catch (error) {
      console.error('Failed to load revision list:', error);
      if (user?.username) {
        navigate(`/profile/${user.username}`);
      } else {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!id || !list) return;
    if (!confirm('Êtes-vous sûr de vouloir retirer cet élément de la liste ?')) return;

    try {
      await removeItemFromRevisionList(parseInt(id), itemId);
      await loadList();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleUpdateList = async () => {
    if (!id) return;

    try {
      await updateRevisionList(parseInt(id), {
        name: editName,
        description: editDescription
      });
      setIsEditing(false);
      await loadList();
    } catch (error) {
      console.error('Failed to update list:', error);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'hard':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };

  const handleItemClick = (item: RevisionListItem) => {
    if (item.content_type_name === 'exercise') {
      navigate(`/exercises/${item.object_id}`);
    } else if (item.content_type_name === 'exam') {
      navigate(`/exams/${item.object_id}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Liste non trouvée</h2>
          <Button
            onClick={() => user?.username ? navigate(`/profile/${user.username}`) : navigate('/')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Retour aux listes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <Button
          onClick={() => user?.username ? navigate(`/profile/${user.username}`) : navigate('/')}
          variant="ghost"
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux listes
        </Button>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la liste
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateList}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(list.name);
                    setEditDescription(list.description);
                  }}
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{list.name}</h1>
                  {list.description && (
                    <p className="text-gray-600">{list.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <PrintRevisionList list={list} />
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{list.item_count} exercice{list.item_count !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>Créée le {formatDate(list.created_at)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items List */}
      {list.items && list.items.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence>
            {list.items.map((item) => {
              const content = item.content_object as Content;
              if (!content) return null;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {content.title}
                        </h3>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {content.subject && (
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center border border-indigo-100">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {content.subject.name}
                            </span>
                          )}

                          {content.difficulty && (
                            <span className={`px-3 py-1 rounded-full text-sm border ${getDifficultyColor(content.difficulty)}`}>
                              {getDifficultyLabel(content.difficulty)}
                            </span>
                          )}

                          {content.class_levels && content.class_levels.length > 0 && (
                            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center border border-purple-100">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              {content.class_levels[0].name}
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{content.view_count || 0} vues</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{(content.comments || []).length} commentaires</span>
                          </div>
                          {item.added_at && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Ajouté le {formatDate(item.added_at)}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Notes */}
                        {item.notes && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <p className="text-sm text-amber-900">{item.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                        variant="ghost"
                        className="ml-4 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <ListX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Liste vide
          </h3>
          <p className="text-gray-600 mb-6">
            Cette liste ne contient aucun exercice ou examen pour le moment.
          </p>
          <Button
            onClick={() => navigate('/exercises')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Parcourir les exercices
          </Button>
        </div>
      )}
    </div>
  );
};

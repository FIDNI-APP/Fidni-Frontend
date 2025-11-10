import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRevisionList,
  removeItemFromRevisionList,
  updateRevisionList,
  getRevisionListStatistics,
  type RevisionList,
  type RevisionListItem,
  type RevisionListStatistics
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
  ListX,
  Sparkles,
  Target,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  AlertCircle,
  Award
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
  const [statistics, setStatistics] = useState<RevisionListStatistics | null>(null);
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

      // Load statistics
      try {
        const stats = await getRevisionListStatistics(parseInt(id));
        setStatistics(stats);
      } catch (statsError) {
        console.error('Failed to load statistics:', statsError);
      }
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chargement de votre liste</h3>
            <p className="text-gray-600">Préparation de vos exercices de révision...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md w-full border border-gray-100"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-red-400 rounded-full blur-2xl opacity-20"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
              <ListX className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Liste non trouvée</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Cette liste de révision n'existe pas ou a été supprimée.
          </p>
          <Button
            onClick={() => navigate(`/revision-lists`)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux listes
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Modern Hero Header Section */}
      <section className="relative bg-gradient-to-br from-gray-900 to-purple-800 text-white py-16 mb-8 overflow-hidden">
        {/* Animated background elements - matching homepage */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 bg-purple-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-20 right-1/3 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          {/* Geometric patterns */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => user?.username ? navigate(`/profile/${user.username}?tab=revisionlists`) : navigate('/')}
              variant="ghost"
              className="text-white/90 hover:text-white hover:bg-white/10 border border-white/20 backdrop-blur-md"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux listes
            </Button>
          </motion.div>

          {/* Header Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl"
          >
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-3">
                  Nom de la liste
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                  placeholder="Nom de votre liste de révision..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-3">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all resize-none"
                  rows={3}
                  placeholder="Description de votre liste..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleUpdateList}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-lg hover:shadow-xl transition-all hover:scale-105"
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
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/10 border border-white/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white/90 text-sm font-medium mb-4">
                    <Target className="w-4 h-4" />
                    Liste de révision
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-4 leading-tight">
                    {list.name}
                  </h1>
                  {list.description && (
                    <p className="text-lg text-white/90 font-medium leading-relaxed max-w-3xl">
                      {list.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 flex-shrink-0 ml-6">
                  <PrintRevisionList list={list} />
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </div>
              
              {/* Enhanced Stats */}
              <div className="flex flex-wrap items-center gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Exercices</p>
                    <p className="font-bold text-lg">{list.item_count}</p>
                  </div>
                </div>
                {statistics && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-emerald-500/30 backdrop-blur-md rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-200" />
                      </div>
                      <div>
                        <p className="text-sm text-white/70">Complétés</p>
                        <p className="font-bold text-lg">{statistics.completed}/{statistics.total_items}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-white/70">Progression</p>
                        <p className="font-bold text-lg">{statistics.progress_percentage}%</p>
                      </div>
                    </div>
                    {statistics.total_time_seconds > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-500/30 backdrop-blur-md rounded-xl flex items-center justify-center">
                          <Clock className="w-5 h-5 text-blue-200" />
                        </div>
                        <div>
                          <p className="text-sm text-white/70">Temps total</p>
                          <p className="font-bold text-lg">{formatTime(statistics.total_time_seconds)}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Créée le</p>
                    <p className="font-bold text-lg">{formatDate(list.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          </motion.div>
        </div>
      </section>

      {/* Statistics Summary Panel */}
      {statistics && statistics.total_items > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Résumé de performance</h3>
                <p className="text-sm text-gray-600">Suivez votre progression sur cette liste</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Progression globale</span>
                <span className="text-lg font-bold text-purple-600">{statistics.progress_percentage}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${statistics.progress_percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <p className="text-xs font-medium text-gray-600">En attente</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{statistics.pending}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-medium text-emerald-700">Réussis</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{statistics.success}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-medium text-amber-700">À revoir</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{statistics.review}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-medium text-blue-700">Temps total</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{formatTime(statistics.total_time_seconds)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Items List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {list.items && list.items.length > 0 ? (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Vos exercices de révision</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                Contenu de la liste
              </h2>
              <p className="text-base md:text-lg text-gray-600">
                {list.item_count} exercice{list.item_count !== 1 ? 's' : ''} sélectionné{list.item_count !== 1 ? 's' : ''} pour votre révision
              </p>
            </div>

            <AnimatePresence>
              {list.items.map((item, index) => {
                const content = item.content_object as Content;
                if (!content) return null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-gradient-to-br from-gray-900 to-purple-800 text-white rounded-3xl shadow-2xl border border-white/20 hover:border-white/30 hover:shadow-3xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Animated background elements - matching header */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                      <div className="absolute top-10 -left-10 w-30 h-30 bg-purple-300/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <div className="absolute -bottom-10 right-1/4 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>

                    {/* Glassmorphism content container */}
                    <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl m-1">
                      <div className="p-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Content type and completion status badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white/90 text-sm font-medium">
                                <BookOpen className="w-4 h-4" />
                                Exercice
                              </div>
                              {content.user_complete && (
                                <div className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full border text-sm font-semibold ${
                                  content.user_complete === 'success'
                                    ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-100'
                                    : 'bg-amber-500/30 border-amber-400/50 text-amber-100'
                                }`}>
                                  {content.user_complete === 'success' ? (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      Réussi
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-4 h-4" />
                                      À revoir
                                    </>
                                  )}
                                </div>
                              )}
                              {content.user_timespent && content.user_timespent > 0 && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/30 backdrop-blur-md rounded-full border border-blue-400/50 text-blue-100 text-sm font-medium">
                                  <Clock className="w-4 h-4" />
                                  {formatTime(content.user_timespent)}
                                </div>
                              )}
                            </div>

                            <h3 className="text-lg md:text-xl font-extrabold text-white mb-4 group-hover:text-white/90 transition-colors line-clamp-2 leading-tight">
                              {content.title}
                            </h3>

                            {/* Enhanced Tags with glassmorphism */}
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                              {content.subject && (
                                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center border border-white/30 shadow-lg">
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  {content.subject.name}
                                </span>
                              )}

                              {content.difficulty && (
                                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center border border-white/30 shadow-lg">
                                  <Star className="w-4 h-4 mr-2" />
                                  {getDifficultyLabel(content.difficulty)}
                                </span>
                              )}

                              {content.class_levels && content.class_levels.length > 0 && (
                                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center border border-white/30 shadow-lg">
                                  <GraduationCap className="w-4 h-4 mr-2" />
                                  {content.class_levels[0].name}
                                </span>
                              )}
                            </div>

                            {/* Enhanced Stats with glassmorphism containers */}
                            <div className="flex flex-wrap items-center gap-6 text-white/90 mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                  <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm text-white/70">Vues</p>
                                  <p className="font-bold text-lg">{content.view_count || 0}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                  <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm text-white/70">Commentaires</p>
                                  <p className="font-bold text-lg">{(content.comments || []).length}</p>
                                </div>
                              </div>
                              {item.added_at && (
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-white/70">Ajouté le</p>
                                    <p className="font-bold text-lg">{formatDate(item.added_at)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Enhanced Notes with glassmorphism */}
                            {item.notes && (
                              <div className="mt-4 p-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl">
                                <div className="flex items-start gap-2">
                                  <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Clock className="w-3 h-3 text-white" />
                                  </div>
                                  <p className="text-sm text-white/90 font-medium leading-relaxed">{item.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Enhanced Remove Button with glassmorphism */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            variant="ghost"
                            className="ml-6 text-white/90 hover:text-white hover:bg-white/20 border border-white/30 backdrop-blur-md p-3 rounded-xl transition-all hover:scale-110 flex-shrink-0 shadow-lg hover:shadow-xl"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                </motion.div>
              );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-8 text-center bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl border-2 border-dashed border-purple-200"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-400 rounded-full blur-2xl opacity-20"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <ListX className="w-12 h-12 text-purple-600" />
              </div>
            </div>
            <div className="max-w-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Liste vide
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Cette liste ne contient aucun exercice ou examen pour le moment. Commencez à ajouter du contenu pour créer votre programme de révision personnalisé.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/exercises')}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Parcourir les exercices
                </Button>
                <Button
                  onClick={() => navigate('/exams')}
                  variant="ghost"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Voir les examens
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out backwards;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

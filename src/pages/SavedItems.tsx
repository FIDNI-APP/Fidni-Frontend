import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserSavedExercises, getUserSavedLessons, getUserSavedExams } from '@/lib/api/userApi';
import { Star, BookOpen, AlertCircle, PenTool, FileCheck, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface SavedItem {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  content_type?: string;
  subject?: {
    id?: number;
    name?: string;
  } | string;
  difficulty?: string;
  class_level?: {
    id?: number;
    name?: string;
  } | string;
}

export const SavedItems = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'exercise' | 'lesson' | 'exam'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchSavedItems = async () => {
      try {
        setLoading(true);
        if (user?.username) {
          // Fetch all types of saved items in parallel
          const [exercisesData, lessonsData, examsData] = await Promise.all([
            getUserSavedExercises(user.username).catch(() => []),
            getUserSavedLessons(user.username).catch(() => []),
            getUserSavedExams(user.username).catch(() => [])
          ]);

          // Handle both array and paginated response formats
          const exercises = Array.isArray(exercisesData) ? exercisesData : exercisesData?.results || [];
          const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.results || [];
          const exams = Array.isArray(examsData) ? examsData : examsData?.results || [];

          // Combine and mark each item type
          const allItems = [
            ...exercises.map((item: any) => ({ ...item, content_type: 'exercise' })),
            ...lessons.map((item: any) => ({ ...item, content_type: 'lesson' })),
            ...exams.map((item: any) => ({ ...item, content_type: 'exam' }))
          ];

          setSavedItems(allItems || []);
        }
      } catch (err) {
        setError('Erreur lors du chargement des éléments enregistrés');
        console.error('Error fetching saved items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedItems();
  }, [user, isAuthenticated, navigate]);

  const filteredItems = savedItems.filter(item => {
    const matchesType = filterType === 'all' || item.content_type === filterType;
    const matchesSearch = !searchQuery ||
      (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getContentTypeConfig = (type: string) => {
    switch (type) {
      case 'exercise':
        return {
          icon: PenTool,
          label: 'Exercice',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          hoverBg: 'hover:border-blue-200'
        };
      case 'lesson':
        return {
          icon: BookOpen,
          label: 'Leçon',
          color: 'text-green-600',
          bg: 'bg-green-50',
          hoverBg: 'hover:border-green-200'
        };
      case 'exam':
        return {
          icon: FileCheck,
          label: 'Examen',
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          hoverBg: 'hover:border-purple-200'
        };
      default:
        return {
          icon: BookOpen,
          label: 'Contenu',
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          hoverBg: 'hover:border-gray-200'
        };
    }
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
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Star className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Éléments Enregistrés</h1>
              <p className="text-white/80 mt-2">Tous vos contenus favoris en un seul endroit</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
              }`}
            >
              Tous ({savedItems.length})
            </button>
            <button
              onClick={() => setFilterType('exercise')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'exercise'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Exercices ({savedItems.filter(i => i.content_type === 'exercise').length})
            </button>
            <button
              onClick={() => setFilterType('lesson')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'lesson'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Leçons ({savedItems.filter(i => i.content_type === 'lesson').length})
            </button>
            <button
              onClick={() => setFilterType('exam')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'exam'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Examens ({savedItems.filter(i => i.content_type === 'exam').length})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans vos favoris..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <span className="text-red-800">{error}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-gray-100 p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucun élément enregistré'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Essayez avec d\'autres mots-clés'
                : 'Explorez les exercices, leçons et examens pour commencer'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/exercises')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-700 to-purple-800 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Découvrir les contenus
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const config = getContentTypeConfig(item.content_type || 'exercise');
              const Icon = config.icon;

              return (
                <motion.div
                  key={`${item.content_type}-${item.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    const route = item.content_type === 'exam' ? 'exams' : item.content_type === 'lesson' ? 'lessons' : 'exercises';
                    navigate(`/${route}/${item.id}`);
                  }}
                  className={`bg-white rounded-xl border-2 border-gray-100 ${config.hoverBg} hover:shadow-md transition-all cursor-pointer overflow-hidden group`}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                      </div>
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {item.title || item.name || 'Sans titre'}
                    </h3>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {item.subject && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium">
                          {typeof item.subject === 'string' ? item.subject : item.subject?.name || 'Matière'}
                        </span>
                      )}
                      {item.difficulty && (
                        <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                          item.difficulty === 'facile'
                            ? 'bg-green-100 text-green-700'
                            : item.difficulty === 'moyen'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                        </span>
                      )}
                      {item.class_level && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md font-medium">
                          {typeof item.class_level === 'string' ? item.class_level : item.class_level?.name || 'Niveau'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

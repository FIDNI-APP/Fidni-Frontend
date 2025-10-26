import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, GraduationCap, Award, Loader2, X } from 'lucide-react';
import { HomeContentCard } from '@/components/HomeContentCard';
import { getExercises, getLessons, getExams, voteExercise } from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';

export function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<'all' | 'exercise' | 'lesson' | 'exam'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [exercises, setExercises] = useState<Content[]>([]);
  const [lessons, setLessons] = useState<Content[]>([]);
  const [exams, setExams] = useState<Content[]>([]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setExercises([]);
      setLessons([]);
      setExams([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Search across all content types in parallel
      const [exercisesData, lessonsData, examsData] = await Promise.all([
        getExercises({ search: query, per_page: 20 }),
        getLessons({ search: query, per_page: 20 }),
        getExams({ search: query, per_page: 20 }),
      ]);

      setExercises(exercisesData.results);
      setLessons(lessonsData.results);
      setExams(examsData.results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleVote = async (id: string, value: VoteValue) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const updatedContent = await voteExercise(id, value);

      setExercises(prev => prev.map(item => item.id === id ? updatedContent : item));
      setLessons(prev => prev.map(item => item.id === id ? updatedContent : item));
      setExams(prev => prev.map(item => item.id === id ? updatedContent : item));
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setExercises([]);
    setLessons([]);
    setExams([]);
    navigate('/search');
  };

  const allResults = [...exercises, ...lessons, ...exams];
  const totalResults = exercises.length + lessons.length + exams.length;

  const getFilteredResults = () => {
    switch (activeTab) {
      case 'exercise':
        return exercises;
      case 'lesson':
        return lessons;
      case 'exam':
        return exams;
      default:
        return allResults;
    }
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={`Recherche: ${searchTerm} - Fidni`}
        description={`Résultats de recherche pour "${searchTerm}" - Exercices, leçons et examens de mathématiques`}
      />

      {/* Search Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-violet-900 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 text-center">
            Recherche intelligente
          </h1>

          <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un exercice, une leçon, un théorème..."
                className="w-full px-6 py-4 pr-24 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-16 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
                aria-label="Search"
              >
                <SearchIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {searchTerm && (
          <>
            {/* Tabs */}
            <div className="mb-8">
              <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                  Tout ({totalResults})
                </button>
                <button
                  onClick={() => setActiveTab('exercise')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'exercise'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  Exercices ({exercises.length})
                </button>
                <button
                  onClick={() => setActiveTab('lesson')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'lesson'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                  Leçons ({lessons.length})
                </button>
                <button
                  onClick={() => setActiveTab('exam')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'exam'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Award className="w-5 h-5" />
                  Examens ({exams.length})
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-4" />
                <p className="text-gray-600">Recherche en cours...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                <p className="font-medium">Erreur</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Results */}
            {!loading && !error && (
              <>
                {filteredResults.length > 0 ? (
                  <>
                    <div className="mb-4 text-gray-600">
                      <p className="text-sm">
                        {filteredResults.length} résultat{filteredResults.length > 1 ? 's' : ''} pour "{searchTerm}"
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredResults.map((content) => (
                        <div key={content.id}>
                          <HomeContentCard content={content} onVote={handleVote} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20">
                    <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Aucun résultat trouvé
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Aucun résultat pour "{searchTerm}". Essayez avec d'autres mots-clés.
                    </p>
                    <div className="text-sm text-gray-500">
                      <p className="mb-2">Suggestions :</p>
                      <ul className="space-y-1">
                        <li>• Vérifiez l'orthographe des mots-clés</li>
                        <li>• Essayez des termes plus généraux</li>
                        <li>• Essayez des mots-clés différents</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Empty State - No Search Term */}
        {!searchTerm && (
          <div className="text-center py-20">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Commencez votre recherche
            </h3>
            <p className="text-gray-600">
              Entrez un mot-clé pour rechercher des exercices, leçons ou examens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

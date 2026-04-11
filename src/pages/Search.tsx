import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, Loader2, X } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { getExercises, getLessons, getExams, voteExercise } from '@/lib/api';
import { Content, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';

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

  // Dynamic header colors based on active tab
  const getHeaderColors = () => {
    switch (activeTab) {
      case 'exam':
        return {
          gradient: 'from-violet-600 via-violet-700 to-purple-700',
          badge: 'bg-violet-500/20 border-violet-400/30 text-violet-200',
          underline: 'bg-violet-500',
        };
      case 'lesson':
        return {
          gradient: 'from-emerald-600 via-emerald-700 to-teal-700',
          badge: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200',
          underline: 'bg-emerald-500',
        };
      case 'exercise':
        return {
          gradient: 'from-blue-600 via-blue-700 to-indigo-700',
          badge: 'bg-blue-500/20 border-blue-400/30 text-blue-200',
          underline: 'bg-blue-500',
        };
      default: // 'all'
        return {
          gradient: 'from-blue-900 via-indigo-900 to-slate-900',
          badge: 'bg-blue-500/20 border-blue-400/30 text-blue-200',
          underline: 'bg-blue-500',
        };
    }
  };

  const headerColors = getHeaderColors();

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={`Recherche: ${searchTerm} - Fidni`}
        description={`Résultats de recherche pour "${searchTerm}" - Exercices, leçons et examens de mathématiques`}
      />

      {/* Search Header */}
      <div className={`relative bg-gradient-to-br ${headerColors.gradient} py-16 px-4 overflow-hidden transition-all duration-500`}>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <div className={`inline-block px-4 py-1 ${headerColors.badge} border text-xs font-bold uppercase tracking-widest mb-4 transition-all duration-500`} style={{ fontFamily: '"DM Sans", sans-serif' }}>
              Recherche
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: '"DM Sans", sans-serif' }}>
              Recherche intelligente
            </h1>
            <div className={`w-24 h-1 ${headerColors.underline} mx-auto transition-all duration-500`}></div>
          </div>

          <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un exercice, une leçon, un théorème..."
                className="w-full px-6 py-4 pr-24 bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base shadow-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{ fontFamily: '"DM Sans", sans-serif' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-16 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold transition-colors duration-200 shadow-md uppercase tracking-wide text-sm"
                aria-label="Search"
                style={{ fontFamily: '"DM Sans", sans-serif' }}
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
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors whitespace-nowrap uppercase tracking-wide text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  <SearchIcon className="w-5 h-5" />
                  Tout ({totalResults})
                </button>
                <button
                  onClick={() => setActiveTab('exercise')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors whitespace-nowrap uppercase tracking-wide text-sm ${
                    activeTab === 'exercise'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  <BookOpen className="w-5 h-5" />
                  Exercices ({exercises.length})
                </button>
                <button
                  onClick={() => setActiveTab('lesson')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors whitespace-nowrap uppercase tracking-wide text-sm ${
                    activeTab === 'lesson'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  <LessonIcon className="w-5 h-5" />
                  Leçons ({lessons.length})
                </button>
                <button
                  onClick={() => setActiveTab('exam')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors whitespace-nowrap uppercase tracking-wide text-sm ${
                    activeTab === 'exam'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ fontFamily: '"DM Sans", sans-serif' }}
                >
                  <APlusIcon className="w-5 h-5" />
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

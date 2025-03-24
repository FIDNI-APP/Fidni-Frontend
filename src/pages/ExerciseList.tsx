import { useState, useEffect } from 'react';
import { Loader2, Plus, Filter, SortAsc, BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getContents, voteExercise, deleteContent } from '../lib/api';
import { Content, SortOption, Difficulty, VoteValue } from '../types';
import { Filters } from '../components/Filters';
import { SortDropdown } from '../components/SortDropdown';
import { ContentList } from '../components/ContentList';
import { useNavigate } from 'react-router-dom';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

const ITEMS_PER_PAGE = 20;

export const ExerciseList = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState({
    classLevels: [] as string[],
    subjects: [] as string[],
    subfields: [] as string[],
    chapters: [] as string[],
    theorems: [] as string[],
    difficulties: [] as Difficulty[],
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const fetchContents = async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setLoading;
    try {
      setLoadingState(true);
      setError(null);
  
      const params = {
        classLevels: filters.classLevels,
        subjects: filters.subjects,
        chapters: filters.chapters,
        difficulties: filters.difficulties,
        // Ces propriétés doivent correspondre à ce qu'attend votre API
        subfields: filters.subfields,
        theorems: filters.theorems,
        sort: sortBy,
        page,
        type: 'exercise',
        per_page: ITEMS_PER_PAGE
      };
  
      console.log("Fetching contents with params:", params);
  
      const data = await getContents(params);
      
      console.log("Received data:", data);
  
      setContents(prev => isLoadMore ? [...prev, ...data.results] : data.results);
      setTotalCount(data.count);
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Error fetching contents:', err);
      setError('Failed to load exercises. Please try again.');
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    console.log("Sort or filters changed. New sort:", sortBy);
    setPage(1);
    fetchContents();
  }, [sortBy, filters]);
  
  useEffect(() => {
    if (page > 1) {
      fetchContents(true);
    }
  }, [page]);

  const handleVote = async (id: string, type: VoteValue) => {
    try {
      const updatedExercise = await voteExercise(id, type);
      setContents(prevContents => 
        prevContents.map(content => 
          content.id === id ? updatedExercise : content
        )
      );
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await deleteContent(id);
        setContents(prev => prev.filter(content => content.id !== id));
      } catch (err) {
        console.error('Failed to delete content:', err);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const toggleFilters = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleNewExerciseClick = () => {
    if (isAuthenticated) {
      navigate('/new');
    } else {
      openModal('/new');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - pleine largeur */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white py-12 px-4 mb-0 pt-24">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center">
                <BookOpen className="w-8 h-8 mr-3" /> 
                Exercises
              </h1>
              <p className="text-indigo-200 text-lg">
                Discover and practice with our collection of {totalCount} quality exercises
              </p>
            </div>
            <button 
              onClick={handleNewExerciseClick}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Ajouter un exercice
            </button>
          </div>
        </div>
      </div>

      {/* Layout principal sans padding gauche/droite */}
      <div className="flex flex-col md:flex-row">
        {/* Bouton pour afficher/masquer les filtres sur mobile */}
        <div className="md:hidden p-4">
          <button 
            onClick={toggleFilters}
            className="w-full bg-white rounded-lg shadow-md p-3 flex items-center justify-center space-x-2 text-indigo-800 font-medium"
          >
            <Filter className="w-5 h-5" />
            <span>{isFilterOpen ? 'Masquer les filtres' : 'Afficher les filtres'}</span>
          </button>
        </div>
        
        {/* Filtres - alignés complètement à gauche */}
        <div 
          className={`${isFilterOpen ? 'block' : 'hidden'} md:block w-full md:w-72 lg:w-80 xl:w-96 bg-white border-r border-gray-200`}
          style={{ minHeight: 'calc(100vh - 200px)' }}
        >
          <div className="sticky top-0 pt-4">
            <Filters onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Contenu - prend le reste de l'espace */}
        <div className="flex-1 p-4 md:p-8">
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <span className="text-gray-600 flex items-center">
                  <SortAsc className="w-5 h-5 mr-2 text-indigo-600" />
                  Trier par:
                </span>
                <SortDropdown 
                  value={sortBy} 
                  onChange={(newSort) => {
                    console.log("Sort changed to:", newSort);
                    setSortBy(newSort);
                  }} 
                />
              </div>
              <div className="text-indigo-600 font-medium">
                {totalCount} exercices trouvés
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-gray-500">Chargement des exercices...</p>
                </div>
              </div>
            ) : contents.length > 0 ? (
              <div className="space-y-4">
                <ContentList 
                  contents={contents} 
                  onVote={handleVote}
                  onDelete={handleDelete}
                  onEdit={(id) => navigate(`/edit/${id}`)}
                />
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun exercice trouvé</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Essayez d'ajuster vos filtres de recherche ou créez un nouvel exercice
                </p>
              </div>
            )}

            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-full shadow-md transition-all duration-200"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus d\'exercices'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
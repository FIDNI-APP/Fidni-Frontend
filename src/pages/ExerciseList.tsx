import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Plus, Filter, SortAsc, BookOpen, ArrowUpDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getContents, voteExercise, deleteContent } from '../lib/api';
import { Content, SortOption, Difficulty, VoteValue } from '../types';
import { Filters } from '../components/Filters';
import { SortDropdown } from '../components/SortDropdown';
import { ContentList } from '../components/ContentList';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

// Styles for the custom scrollbar
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(79, 70, 229, 0.3) transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(79, 70, 229, 0.3);
    border-radius: 10px;
    border: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(79, 70, 229, 0.5);
  }
`;

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
  
  // Add refs to track previous values
  const prevFiltersRef = useRef(filters);
  const prevSortByRef = useRef(sortBy);
  const prevPageRef = useRef(page);
  const isInitialRender = useRef(true);
  
  // Use useCallback to prevent fetchContents from being recreated on every render
  const fetchContents = useCallback(async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setLoading;
    try {
      setLoadingState(true);
      setError(null);
  
      const params = {
        classLevels: filters.classLevels,
        subjects: filters.subjects,
        chapters: filters.chapters,
        difficulties: filters.difficulties,
        subfields: filters.subfields,
        theorems: filters.theorems,
        sort: sortBy,
        page,
        per_page: ITEMS_PER_PAGE
      };
  
      const data = await getContents(params);
      
      setContents(prev => isLoadMore ? [...prev, ...data.results] : data.results);
      setTotalCount(data.count);
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Error fetching contents:', err);
      setError('Failed to load exercises. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }, [filters, sortBy, page]);  // Include dependencies here

  // Modified useEffect to prevent unnecessary API calls
  useEffect(() => {
    if (isInitialRender.current) {
      // On initial render, just fetch the data
      fetchContents();
      isInitialRender.current = false;
      return;
    }
    
    // Check if any values actually changed
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    const sortByChanged = prevSortByRef.current !== sortBy;
    const pageChanged = prevPageRef.current !== page;
    
    // Only fetch if something meaningful changed
    if (filtersChanged || sortByChanged || pageChanged) {
      // When filters or sort changed, reset to page 1 first if needed
      if ((filtersChanged || sortByChanged) && page !== 1) {
        setPage(1);
      } else {
        fetchContents(pageChanged && page > 1);
        
        // Update refs with current values
        prevFiltersRef.current = { ...filters };
        prevSortByRef.current = sortBy;
        prevPageRef.current = page;
      }
    }
  }, [sortBy, filters, page, fetchContents]); // Removed extra semicolon

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

  const handleSortChange = (newSortOption: SortOption) => {
    setSortBy(newSortOption);
    // Logging to debug
    console.log("Sorting changed to:", newSortOption);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Add the styles for the scrollbar */}
      <style>{scrollbarStyles}</style>
      
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white py-8 mb-8">
        <div className="container mx-auto px-4">
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
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un exercice
            </button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="container mx-auto px-4">
        {/* Mobile filter toggle */}
        <div className="md:hidden mb-6">
          <button 
            onClick={toggleFilters}
            className="w-full bg-white rounded-lg shadow-md p-3 flex items-center justify-center space-x-2 text-indigo-800 font-medium"
          >
            <Filter className="w-5 h-5" />
            <span>{isFilterOpen ? 'Masquer les filtres' : 'Afficher les filtres'}</span>
          </button>
        </div>

        {/* Fixed Left Filter + Content Layout */}
        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Left Filter avec barre de défilement personnalisée */}
          <div 
            className={`${isFilterOpen ? 'block' : 'hidden'} md:block md:w-64 lg:w-72 flex-shrink-0 custom-scrollbar bg-white rounded-xl shadow-sm`}
            style={{ 
              position: "sticky",
              top: "100px",
              height: "fit-content",
              maxHeight: "calc(100vh - 140px)",
              overflowY: "auto",
              padding: "4px"
            }}
          >
            <Filters onFilterChange={handleFilterChange} />
          </div>

          {/* Content Area */}
          <div className="flex-grow min-w-0">
            {/* Sort and Count Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="flex items-center gap-3 mb-4 sm:mb-0">
                  <span className="text-gray-600 flex items-center font-medium">
                    <ArrowUpDown className="w-5 h-5 mr-2 text-indigo-600" />
                    Trier par:
                  </span>
                  <SortDropdown 
                    value={sortBy} 
                    onChange={handleSortChange} 
                  />
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-medium">
                  {totalCount} exercices trouvés
                </div>
              </div>
            </div>

            {/* Error message if any */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
                {error}
              </div>
            )}

            {/* Exercise Content */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Chargement des exercices...</p>
                  </div>
                </div>
              ) : contents.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  <ContentList 
                    contents={contents} 
                    onVote={handleVote}
                    onDelete={handleDelete}
                    onEdit={(id) => navigate(`/edit/${id}`)}
                  />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun exercice trouvé</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Essayez d'ajuster vos filtres de recherche ou créez un nouvel exercice
                  </p>
                </div>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg shadow-sm transition-all"
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
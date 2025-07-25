import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Filter, 
  Search,
  Loader2,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';

import { LearningPathCard } from '@/components/learningpath/LearningPathCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getLearningPaths, startLearningPath, deleteLearningPath } from '@/lib/api/LearningPathApi';
import { LearningPath, ProgressFilter, LearningPathSortOption } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { cn } from '@/lib/utils';

export const LearningPathList: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [filteredPaths, setFilteredPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<LearningPathSortOption>('newest');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  useEffect(() => {
    filterAndSortPaths();
  }, [learningPaths, searchTerm, sortBy, progressFilter, selectedSubject, selectedDifficulty]);

  const fetchLearningPaths = async () => {
    try {
      setLoading(true);
      const data = await getLearningPaths();
      setLearningPaths(data);
    } catch (err) {
      console.error('Failed to fetch learning paths:', err);
      setError('Failed to load learning paths. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPaths = () => {
    let filtered = [...learningPaths];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(path =>
        path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        path.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        path.subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(path => path.subject.id === selectedSubject);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(path => {
        if (selectedDifficulty === 'beginner') return path.estimated_hours < 10;
        if (selectedDifficulty === 'intermediate') return path.estimated_hours >= 10 && path.estimated_hours < 30;
        if (selectedDifficulty === 'advanced') return path.estimated_hours >= 30;
        return true;
      });
    }

    // Progress filter
    if (progressFilter !== 'all') {
      filtered = filtered.filter(path => {
        const progress = path.user_progress?.progress_percentage || 0;
        if (progressFilter === 'not_started') return !path.user_progress;
        if (progressFilter === 'in_progress') return progress > 0 && progress < 100;
        if (progressFilter === 'completed') return progress === 100;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.total_chapters || 0) - (a.total_chapters || 0);
        case 'duration':
          return a.estimated_hours - b.estimated_hours;
        case 'difficulty':
          return a.estimated_hours - b.estimated_hours;
        default:
          return 0;
      }
    });

    setFilteredPaths(filtered);
  };

  const handleStartPath = async (pathId: string) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      await startLearningPath(pathId);
      navigate(`/learning-paths/${pathId}`);
    } catch (err) {
      console.error('Failed to start learning path:', err);
    }
  };

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(
    new Set(learningPaths.map(path => path.subject.id))
  ).map(id => {
    const path = learningPaths.find(p => p.subject.id === id);
    return path ? { id, name: path.subject.name } : null;
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')]"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <GraduationCap className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Learning Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Learning Paths
            </h1>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Structured courses to master any subject at your own pace. Start your journey today.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-xl -z-10"></div>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search learning paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-sm border-white/20 text-white placeholder-purple-200 rounded-xl focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-16 relative z-20">
        {/* Admin Controls */}
        {user?.is_superuser && (
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => navigate('/learning-paths/create')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Path
            </Button>
          </div>
        )}

        {/* Mobile Filters Button */}
        <div className="md:hidden mb-6">
          <Button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            variant="outline"
            className="w-full flex items-center justify-between"
          >
            <span className="flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              mobileFiltersOpen ? "transform rotate-180" : ""
            )} />
          </Button>
        </div>

        {/* Filters and Content */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Filters */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                Filters
              </h3>
              
              <div className="space-y-6">
                {/* Subject Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {uniqueSubjects.map(subject => (
                        <SelectItem key={subject!.id} value={subject!.id}>
                          {subject!.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="beginner">Beginner (&lt;10h)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (10-30h)</SelectItem>
                      <SelectItem value="advanced">Advanced (30h+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress Filter */}
                {isAuthenticated && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Progress
                    </label>
                    <Select value={progressFilter} onValueChange={(value) => setProgressFilter(value as ProgressFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Progress" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Progress</SelectItem>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as LearningPathSortOption)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="difficulty">Difficulty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Filters */}
          {mobileFiltersOpen && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 md:hidden">
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                Filters
              </h3>
              
              <div className="space-y-4">
                {/* Subject Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {uniqueSubjects.map(subject => (
                        <SelectItem key={subject!.id} value={subject!.id}>
                          {subject!.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="beginner">Beginner (&lt;10h)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (10-30h)</SelectItem>
                      <SelectItem value="advanced">Advanced (30h+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress Filter */}
                {isAuthenticated && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Progress
                    </label>
                    <Select value={progressFilter} onValueChange={(value) => setProgressFilter(value as ProgressFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Progress" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Progress</SelectItem>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as LearningPathSortOption)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="difficulty">Difficulty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1">
            {/* Results Count */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredPaths.length}</span> learning paths
              </div>
              <div className="hidden md:block">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as LearningPathSortOption)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : error ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
                <Button
                  onClick={fetchLearningPaths}
                  variant="outline"
                  className="mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : filteredPaths.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No learning paths found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSubject('all');
                    setSelectedDifficulty('all');
                    setProgressFilter('all');
                  }}
                  variant="outline"
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPaths.map(path => (
                  <LearningPathCard
                    key={path.id}
                    learningPath={path}
                    onStart={handleStartPath}
                    onEdit={(id) => navigate(`/learning-paths/${id}/edit`)}
                    onDelete={async (id) => {
                      try {
                        await deleteLearningPath(id);
                        fetchLearningPaths();
                      } catch (err) {
                        console.error('Failed to delete learning path:', err);
                      }
                    }}
                    isAdmin={user?.is_superuser}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
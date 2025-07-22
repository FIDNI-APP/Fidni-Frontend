// src/pages/learningpaths/LearningPathList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Users, 
  ChevronRight, 
  Plus,
  GraduationCap,
  TrendingUp,
  Award,
  PlayCircle,
  Sparkles,
  Search,
  Grid,
  List,
} from 'lucide-react';
import { getLearningPaths } from '@/lib/api/learningpathApi';
import { getClassLevels, getSubjects } from '@/lib/api';
import { LearningPath } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const LearningPathList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'difficulty'>('newest');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classLevels, setClassLevels] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadLearningPaths();
  }, [selectedSubject, selectedLevel, searchTerm, sortBy]);

  const loadInitialData = async () => {
    try {
      const [subjectsData, levelsData] = await Promise.all([
        getSubjects(),
        getClassLevels()
      ]);
      setSubjects(subjectsData);
      setClassLevels(levelsData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

const loadLearningPaths = async () => {
  try {
    setLoading(true);
    const params: any = {};
    if (selectedSubject) params.subject = selectedSubject;
    if (selectedLevel) params.class_level = selectedLevel;
    
    const data = await getLearningPaths(params);
    
    // Add this console log to see what the API returns
    console.log('API Response:', data);
    console.log('First path:', data[0]);
    console.log('First path ID:', data[0]?.id);
    
    // Filter by search term
    let filtered = data;
      if (searchTerm) {
        filtered = data.filter((path: LearningPath) => 
          path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          path.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Sort
      filtered.sort((a: LearningPath, b: LearningPath) => {
        switch (sortBy) {
          case 'popular':
            return (b.total_enrolled || 0) - (a.total_enrolled || 0);
          case 'difficulty':
            return a.estimated_hours - b.estimated_hours;
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      setLearningPaths(filtered);
    } catch (error) {
      console.error('Failed to load learning paths:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-300/20 to-transparent rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-300/20 to-transparent rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-br from-pink-300/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="absolute inset-0 animate-pulse bg-white/20 rounded-full blur-xl" />
                <GraduationCap className="w-20 h-20 relative" />
              </motion.div>
            </div>
            
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
              Learning Paths
            </h1>
            <p className="text-xl text-gray-100 max-w-2xl mx-auto">
              Master subjects step by step with our AI-powered, structured learning journeys
            </p>

            {user?.is_superuser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <Button
                  onClick={() => navigate('/learning-paths/create')}
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Learning Path
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16"
          >
            {[
              { label: 'Total Paths', value: learningPaths.length, icon: BookOpen, color: 'from-blue-400 to-blue-600' },
              { label: 'In Progress', value: learningPaths.filter(lp => lp.user_progress && lp.user_progress.progress_percentage > 0 && lp.user_progress.progress_percentage < 100).length, icon: TrendingUp, color: 'from-yellow-400 to-orange-600' },
              { label: 'Completed', value: learningPaths.filter(lp => lp.user_progress?.progress_percentage === 100).length, icon: Award, color: 'from-green-400 to-green-600' },
              { label: 'Total Hours', value: learningPaths.reduce((sum, lp) => sum + lp.estimated_hours, 0), icon: Clock, color: 'from-purple-400 to-pink-600' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <motion.span 
                      className="text-3xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                    >
                      {stat.value}
                    </motion.span>
                  </div>
                  <p className="text-gray-100">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search learning paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <select
                value={selectedSubject}
                title='Filter by Subject'
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedLevel}
                title='Filter by Class Level'
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">All Levels</option>
                {classLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                title='Sort by'
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="difficulty">By Difficulty</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  title='Grid View'
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-indigo-600 shadow-md' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title='Switch to List View'
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-md' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Learning Paths Grid/List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full"
            />
          </div>
        ) : learningPaths.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Learning Paths Found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" 
                : "space-y-6"
              }
            >
              {learningPaths.map((path, index) => (
                <PathCard
                  key={path.id}
                  path={path}
                  index={index}
                  viewMode={viewMode}
                  onNavigate={() => navigate(`/learning-paths/${path.id}`)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Path Card Component
const PathCard: React.FC<{
  path: LearningPath;
  index: number;
  viewMode: 'grid' | 'list';
  onNavigate: () => void;
}> = ({ path, index, viewMode, onNavigate }) => {
  const getDifficultyBadge = (hours: number) => {
    if (hours < 10) return { text: 'Beginner', color: 'bg-green-100 text-green-800 border-green-200' };
    if (hours < 30) return { text: 'Intermediate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { text: 'Advanced', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const difficulty = getDifficultyBadge(path.estimated_hours);

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        onClick={onNavigate}
        className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden"
      >
        <div className="flex items-center p-6">
          <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                {path.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficulty.color}`}>
                {difficulty.text}
              </span>
            </div>
            
            <p className="text-gray-600 mb-3 line-clamp-2">{path.description}</p>
            
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <PlayCircle className="w-4 h-4" />
                <span>{path.total_chapters} chapters</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{path.estimated_hours}h</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{path.total_enrolled || 0} enrolled</span>
              </div>
            </div>

            {path.user_progress && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-800 font-medium">
                    {path.user_progress.progress_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${path.user_progress.progress_percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                  />
                </div>
              </div>
            )}
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      onClick={onNavigate}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      {/* Card Header with Gradient */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficulty.color}`}>
              {difficulty.text}
            </span>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-sm text-white font-medium">
                {path.class_level.name}
              </span>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2">
            {path.title}
          </h3>
          <p className="text-indigo-100 text-sm">
            {path.subject.name}
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Card Content */}
      <div className="p-6">
        <p className="text-gray-600 mb-6 line-clamp-2">
          {path.description}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{path.total_chapters}</p>
            <p className="text-xs text-gray-500">Chapters</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{path.total_videos}</p>
            <p className="text-xs text-gray-500">Videos</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-pink-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{path.estimated_hours}h</p>
            <p className="text-xs text-gray-500">Duration</p>
          </div>
        </div>

        {/* Progress Bar */}
        {path.user_progress ? (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Your Progress</span>
              <span className="text-gray-800 font-semibold">
                {path.user_progress.progress_percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${path.user_progress.progress_percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 relative"
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>Start your learning journey</span>
          </div>
        )}

        {/* Action Button */}
        <Button
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all group"
        >
          {path.user_progress ? 'Continue Learning' : 'Start Learning'}
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
};
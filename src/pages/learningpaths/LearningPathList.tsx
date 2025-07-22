// src/pages/learningpaths/LearningPathList.tsx
/** @jsxImportSource react */
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
  Filter,
  Zap,
  Map,
  Target,
  Compass,
  Medal,
  ArrowUpRight,
  Star
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
  const [showFilters, setShowFilters] = useState(false);

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

  // Get user's current paths
  const activePaths = learningPaths.filter(lp => lp.user_progress && lp.user_progress.progress_percentage < 100);
  const completedPaths = learningPaths.filter(lp => lp.user_progress?.progress_percentage === 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Enhanced Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-white overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.1%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              rotate: [360, 0],
              scale: [1, 1.3, 1]
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Animated Icon */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-md rounded-full mb-8"
            >
              <Map className="w-12 h-12 text-white" />
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Your Learning Journey Starts Here
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Follow expertly crafted learning paths to master new skills. Each path is designed to take you from beginner to pro with hands-on projects and real-world applications.
            </p>

            {user?.is_superuser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={() => navigate('/learning-paths/create')}
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Learning Path
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Quick Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto"
          >
            {[
              { icon: Compass, label: 'Total Paths', value: learningPaths.length, color: 'from-blue-400 to-blue-600' },
              { icon: Zap, label: 'In Progress', value: activePaths.length, color: 'from-yellow-400 to-orange-500' },
              { icon: Medal, label: 'Completed', value: completedPaths.length, color: 'from-green-400 to-emerald-600' },
              { icon: Target, label: 'Skills to Learn', value: learningPaths.reduce((sum, lp) => sum + lp.total_chapters, 0), color: 'from-purple-400 to-pink-600' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} mb-2`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-blue-100">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-6 mb-8"
        >
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search learning paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2 px-6 py-4 rounded-2xl border-2 hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {(selectedSubject || selectedLevel) && (
                <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                  {[selectedSubject, selectedLevel].filter(Boolean).length}
                </span>
              )}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-2xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                title='Grid View'
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white text-indigo-600 shadow-md' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title='List View'
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-indigo-600 shadow-md' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <option value="difficulty">By Duration</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Learning Paths Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full"
            />
          </div>
        ) : learningPaths.length === 0 ? (
          <EmptyState />
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

// Empty State Component
const EmptyState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-20"
  >
    <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Compass className="w-16 h-16 text-indigo-600" />
    </div>
    <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Learning Paths Found</h3>
    <p className="text-gray-500 max-w-md mx-auto">
      Try adjusting your filters or search terms to discover amazing learning paths
    </p>
  </motion.div>
);

// Enhanced Path Card Component
const PathCard: React.FC<{
  path: LearningPath;
  index: number;
  viewMode: 'grid' | 'list';
  onNavigate: () => void;
}> = ({ path, index, viewMode, onNavigate }) => {
  const getDifficultyInfo = (hours: number) => {
    if (hours < 10) return { 
      text: 'Beginner', 
      color: 'from-green-400 to-emerald-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    };
    if (hours < 30) return { 
      text: 'Intermediate', 
      color: 'from-yellow-400 to-orange-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    };
    return { 
      text: 'Advanced', 
      color: 'from-red-400 to-pink-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    };
  };

  const difficulty = getDifficultyInfo(path.estimated_hours);
  const completionRate = path.user_progress ? path.user_progress.progress_percentage : 0;
  const isCompleted = completionRate === 100;
  const isInProgress = completionRate > 0 && completionRate < 100;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onNavigate}
        className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden"
      >
        <div className="flex items-stretch">
          {/* Visual Side */}
          <div className="relative w-48 bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/10" />
            <Map className="w-16 h-16 text-white relative z-10" />
            {isCompleted && (
              <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full">
                <Award className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Content Side */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors mb-2">
                  {path.title}
                </h3>
                <p className="text-gray-600 line-clamp-2">{path.description}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficulty.bgColor} ${difficulty.borderColor} border`}>
                {difficulty.text}
              </span>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{path.total_chapters} chapters</span>
                </div>
                <div className="flex items-center gap-1">
                  <PlayCircle className="w-4 h-4" />
                  <span>{path.total_videos} videos</span>
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
            </div>

            {/* Progress Bar */}
            {path.user_progress && (
              <div className="mt-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Your Progress</span>
                  <span className="font-semibold text-indigo-600">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`h-full bg-gradient-to-r ${
                      isCompleted 
                        ? 'from-green-500 to-emerald-600' 
                        : 'from-indigo-500 to-purple-600'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid View Card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      onClick={onNavigate}
      className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative"
    >
      {/* Card Header with Visual */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
          <div className="absolute bottom-4 right-4 w-32 h-32 bg-white/20 rounded-full blur-3xl" />
        </div>

        {/* Status Badge */}
        {isCompleted && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Award className="w-4 h-4" />
            Completed
          </div>
        )}
        {isInProgress && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Zap className="w-4 h-4" />
            In Progress
          </div>
        )}

        {/* Icon and Difficulty */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Map className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30`}>
              {difficulty.text} • {path.estimated_hours}h
            </span>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white">
                {path.subject.name}
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white">
                {path.class_level.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {path.title}
        </h3>
        <p className="text-gray-600 text-sm mb-6 line-clamp-2">
          {path.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <BookOpen className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{path.total_chapters}</p>
            <p className="text-xs text-gray-500">Chapters</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <PlayCircle className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{path.total_videos}</p>
            <p className="text-xs text-gray-500">Videos</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <Users className="w-5 h-5 text-pink-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{path.total_enrolled || 0}</p>
            <p className="text-xs text-gray-500">Students</p>
          </div>
        </div>

        {/* Progress or CTA */}
        {path.user_progress ? (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-indigo-600">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`h-full bg-gradient-to-r ${
                  isCompleted 
                    ? 'from-green-500 to-emerald-600' 
                    : 'from-indigo-500 to-purple-600'
                } relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
          </div>
        ) : (
          <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white group-hover:shadow-lg transition-all">
            Start Learning
            <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};
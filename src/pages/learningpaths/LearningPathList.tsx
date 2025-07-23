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
  PlayCircle,
  Search,
  Filter,
  Award,
  Star,
  CheckCircle,
  Lock
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
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classLevels, setClassLevels] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadLearningPaths();
  }, [selectedSubject, selectedLevel, searchTerm]);

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
      
      let filtered = data;
      if (searchTerm) {
        filtered = data.filter((path: LearningPath) => 
          path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          path.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setLearningPaths(filtered);
    } catch (error) {
      console.error('Failed to load learning paths:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Learning Paths</h1>
              <p className="text-gray-600 mt-1">Choose your learning journey</p>
            </div>
            {user?.is_superuser && (
              <Button
                onClick={() => navigate('/learning-paths/create')}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Path
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search learning paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
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
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              >
                <option value="">All Levels</option>
                {classLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Paths Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learningPaths.map((path, index) => (
              <PathCard
                key={path.id}
                path={path}
                index={index}
                onNavigate={() => navigate(`/learning-paths/${path.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Compact Path Card Component
const PathCard: React.FC<{
  path: LearningPath;
  index: number;
  onNavigate: () => void;
}> = ({ path, index, onNavigate }) => {
  const completionRate = path.user_progress ? path.user_progress.progress_percentage : 0;
  const isCompleted = completionRate === 100;
  const isInProgress = completionRate > 0 && completionRate < 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onNavigate}
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {path.title}
          </h3>
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
          )}
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {path.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{path.total_chapters} chapters</span>
          </div>
          <div className="flex items-center gap-1">
            <PlayCircle className="w-3 h-3" />
            <span>{path.total_videos} videos</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{path.estimated_hours}h</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="p-4">
        {path.user_progress ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-semibold text-indigo-600">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500' 
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
            {isCompleted && (
              <div className="flex items-center gap-1 mt-2 text-green-600">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </div>
        ) : (
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
          >
            Start Learning
          </Button>
        )}
      </div>

      {/* Tags */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            {path.subject.name}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            {path.class_level.name}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
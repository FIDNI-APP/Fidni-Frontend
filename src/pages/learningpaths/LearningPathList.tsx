// src/pages/learningPaths/LearningPathList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Users, 
  ChevronRight, 
  Plus,
  Filter,
  GraduationCap,
  TrendingUp,
  Award,
  PlayCircle
} from 'lucide-react';
import { getLearningPaths } from '@/lib/api/learningpathApi';
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

  useEffect(() => {
    loadLearningPaths();
  }, [selectedSubject, selectedLevel]);

  const loadLearningPaths = async () => {
    try {
      setLoading(true);
      const data = await getLearningPaths({
        subject: selectedSubject,
        class_level: selectedLevel
      });
      setLearningPaths(data);
    } catch (error) {
      console.error('Failed to load learning paths:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-200';
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-4 flex items-center">
                <GraduationCap className="w-10 h-10 mr-3" />
                Learning Paths
              </h1>
              <p className="text-xl text-indigo-100">
                Master subjects step by step with our structured learning journeys
              </p>
            </div>
            {user?.is_superuser && (
              <Button
                onClick={() => navigate('/learning-paths/create')}
                className="bg-white text-indigo-600 hover:bg-indigo-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Path
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100">Total Paths</p>
                  <p className="text-3xl font-bold">{learningPaths.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-indigo-200" />
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100">In Progress</p>
                  <p className="text-3xl font-bold">
                    {learningPaths.filter(lp => lp.user_progress && lp.user_progress.progress_percentage > 0 && lp.user_progress.progress_percentage < 100).length}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-indigo-200" />
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100">Completed</p>
                  <p className="text-3xl font-bold">
                    {learningPaths.filter(lp => lp.user_progress?.progress_percentage === 100).length}
                  </p>
                </div>
                <Award className="w-8 h-8 text-indigo-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-500" />
            {/* Add filter dropdowns here based on your needs */}
          </div>
        </div>

        {/* Learning Paths Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {learningPaths.map((path) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Path Header */}
                <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white">
                      {path.class_level.name}
                    </span>
                  </div>
                  <div className="flex flex-col justify-end h-full">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {path.title}
                    </h3>
                    <p className="text-indigo-100 text-sm">
                      {path.subject.name}
                    </p>
                  </div>
                </div>

                {/* Path Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {path.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {path.total_chapters}
                      </p>
                      <p className="text-xs text-gray-500">Chapters</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {path.total_videos}
                      </p>
                      <p className="text-xs text-gray-500">Videos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {path.estimated_hours}h
                      </p>
                      <p className="text-xs text-gray-500">Duration</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {path.user_progress && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-800 font-medium">
                          {path.user_progress.progress_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(path.user_progress.progress_percentage)}`}
                          style={{ width: `${path.user_progress.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={() => navigate(`/learning-paths/${path.id}`)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {path.user_progress ? 'Continue Learning' : 'Start Learning'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SavedContentSection } from '@/components/profile/SavedContentSection';
import { getUserSavedExercises } from '@/lib/api';
import { motion } from 'framer-motion';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Content } from '@/types';

export const SavedItems: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedExercises, setSavedExercises] = useState<Content[]>([]);
  const [savedLessons, setSavedLessons] = useState<Content[]>([]);
  const [savedExams, setSavedExams] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.username) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }

    loadSavedContent();
  }, [user]);

  const loadSavedContent = async () => {
    if (!user?.username) return;

    try {
      setIsLoading(true);

      // Load saved exercises
      const exercises = await getUserSavedExercises(user.username);
      setSavedExercises(exercises);

      // TODO: Add API calls for saved lessons and exams when available
      // For now, we'll just show exercises
      setSavedLessons([]);
      setSavedExams([]);
    } catch (error) {
      console.error('Failed to load saved content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with back button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-white group-hover:bg-gray-100 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Retour</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
              <Bookmark className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Éléments sauvegardés
              </h1>
              <p className="text-lg text-gray-600">
                Retrouvez tous vos exercices, leçons et examens sauvegardés
              </p>
            </div>
          </div>
        </motion.div>

        {/* Saved Content Section */}
        <SavedContentSection
          exercises={savedExercises}
          lessons={savedLessons}
          exams={savedExams}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

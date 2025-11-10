/**
 * ActivitySection Component - Compact & User-Friendly
 *
 * All stats visible on one screen for quick overview
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Zap,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  BookOpen,
  PenTool,
  FileCheck,
  Target,
  Award,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ContentStatistics } from '@/lib/api';

interface ActivitySectionProps {
  statistics: ContentStatistics | null;
  loading: boolean;
  contentType: 'exercise' | 'exam';
  onRemoveSolutionFlag?: () => void;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  statistics,
  loading,
  contentType,
  onRemoveSolutionFlag
}) => {
  const contentLabel = contentType === 'exercise' ? "l'exercice" : "l'examen";

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center py-16"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </motion.div>
    );
  }

  if (!statistics) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-md p-8 text-center"
      >
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Impossible de charger les statistiques</p>
      </motion.div>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHoursMinutes = (seconds: number) => {
    if (seconds === 0) return 'Aucun';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  };

  const solutionViewPercentage = statistics.solution_view_percentage || 0;
  const successfulUsersStudyStats = statistics.successful_users_study_stats || {
    exercises_avg_seconds: 0,
    lessons_avg_seconds: 0,
    exams_avg_seconds: 0,
    chapters: []
  };

  const hasStudyData = successfulUsersStudyStats.exercises_avg_seconds > 0 ||
    successfulUsersStudyStats.lessons_avg_seconds > 0 ||
    successfulUsersStudyStats.exams_avg_seconds > 0;

  const chapters = successfulUsersStudyStats.chapters || [];
  const chapterText = chapters.length > 0 ? chapters.join(', ') : 'Mêmes chapitres';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6"
    >
      {/* Main Stats Grid - 4 cards in one row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Success Rate */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-green-700 uppercase">Réussite</span>
          </div>
          <div className="text-3xl font-bold text-green-700 mb-1">
            {statistics.success_percentage}%
          </div>
          <div className="text-xs text-green-600">
            {statistics.success_count} / {statistics.total_participants} utilisateurs
          </div>
        </motion.div>

        {/* Average Time */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-sky-600 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-700 uppercase">Temps moyen</span>
          </div>
          <div className="text-3xl font-bold text-blue-700 mb-1">
            {formatTime(statistics.average_time_seconds)}
          </div>
          <div className="text-xs text-blue-600">
            Tous les utilisateurs
          </div>
        </motion.div>

        {/* Best Time */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-amber-700 uppercase">Record</span>
          </div>
          <div className="text-3xl font-bold text-amber-700 mb-1">
            {formatTime(statistics.best_time_seconds)}
          </div>
          <div className="text-xs text-amber-600">
            Meilleur temps global
          </div>
        </motion.div>

        {/* Solution Views - Compact Card */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-purple-700 uppercase">Solution</span>
          </div>
          <div className="text-3xl font-bold text-purple-700 mb-1">
            {solutionViewPercentage}%
          </div>
          <div className="text-xs text-purple-600">
            Taux de consultation
          </div>
          {statistics.user_viewed_solution && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <Eye className="w-3 h-3" />
              <span>Vous avez vu</span>
              {onRemoveSolutionFlag && (
                <button onClick={onRemoveSolutionFlag} className="ml-auto">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Study Time Comparison - Compact */}
      {hasStudyData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-gray-600 to-slate-700 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900">Temps d'étude des utilisateurs qui ont réussi</h4>
              <p className="text-xs text-gray-600">Chapitres: <span className="font-semibold">{chapterText}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Exercises */}
            {successfulUsersStudyStats.exercises_avg_seconds > 0 && (
              <div className="flex items-center gap-2 bg-white border border-purple-100 rounded-lg p-2">
                <PenTool className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-purple-600">
                    {formatHoursMinutes(successfulUsersStudyStats.exercises_avg_seconds)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">Exercices</p>
                </div>
              </div>
            )}

            {/* Lessons */}
            {successfulUsersStudyStats.lessons_avg_seconds > 0 && (
              <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg p-2">
                <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-600">
                    {formatHoursMinutes(successfulUsersStudyStats.lessons_avg_seconds)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">Leçons</p>
                </div>
              </div>
            )}

            {/* Exams */}
            {successfulUsersStudyStats.exams_avg_seconds > 0 && (
              <div className="flex items-center gap-2 bg-white border border-green-100 rounded-lg p-2">
                <FileCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-green-600">
                    {formatHoursMinutes(successfulUsersStudyStats.exams_avg_seconds)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">Examens</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <Award className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700">
              Les utilisateurs qui ont réussi {contentLabel} ont investi du temps dans ces contenus. Ne vous découragez pas!
            </p>
          </div>
        </motion.div>
      )}

      {/* Your Performance - Only if user has data */}
      {statistics.user_completed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Votre performance</h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Statut</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                statistics.user_completed === 'success'
                  ? 'bg-green-100 text-green-700'
                  : statistics.user_completed === 'review'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {statistics.user_completed === 'success' && '✓ Réussi'}
                {statistics.user_completed === 'review' && '🔄 À revoir'}
                {!statistics.user_completed && '⏳ En cours'}
              </span>
            </div>

            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Votre temps</p>
              <p className="text-lg font-bold text-orange-600">
                {statistics.user_time_seconds !== null
                  ? formatTime(statistics.user_time_seconds)
                  : 'N/A'}
              </p>
            </div>

            {statistics.user_time_percentile !== null && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Classement</p>
                <p className="text-lg font-bold text-orange-600">
                  Top {Math.max(0, 100 - statistics.user_time_percentile)}%
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

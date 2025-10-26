/**
 * ActivitySection Component
 *
 * Displays statistics and activity information for exercises and exams
 * Shows success rates, time tracking, and user performance comparisons
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Clock,
  Zap,
  Award,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentStatistics } from '@/lib/api/statisticsApi';

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
          <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
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
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPercentileColor = (percentile: number | null) => {
    if (percentile === null) return 'text-gray-400';
    if (percentile >= 90) return 'text-green-600';
    if (percentile >= 70) return 'text-blue-600';
    if (percentile >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPercentileLabel = (percentile: number | null) => {
    if (percentile === null) return 'Non classé';
    if (percentile >= 90) return 'Excellent ⭐';
    if (percentile >= 70) return 'Bon 👍';
    if (percentile >= 50) return 'Moyen 😊';
    return 'À améliorer 💪';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Success Rate */}
        <motion.div
          whileHover={{ translateY: -4 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Réussite</span>
          </div>
          <div className="text-3xl font-bold text-green-700 mb-1">
            {statistics.success_percentage}%
          </div>
          <p className="text-sm text-green-600">
            {statistics.success_count} / {statistics.total_participants} réussi
          </p>
        </motion.div>

        {/* Average Time */}
        <motion.div
          whileHover={{ translateY: -4 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Temps moyen</span>
          </div>
          <div className="text-3xl font-bold text-blue-700 mb-1">
            {formatTime(statistics.average_time_seconds)}
          </div>
          <p className="text-sm text-blue-600">Tous les utilisateurs</p>
        </motion.div>

        {/* Best Time */}
        <motion.div
          whileHover={{ translateY: -4 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-6 h-6 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">Meilleur temps</span>
          </div>
          <div className="text-3xl font-bold text-purple-700 mb-1">
            {formatTime(statistics.best_time_seconds)}
          </div>
          <p className="text-sm text-purple-600">Record personnel</p>
        </motion.div>

        {/* Your Percentile */}
        <motion.div
          whileHover={{ translateY: -4 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <Award className="w-6 h-6 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">Votre classement</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${getPercentileColor(statistics.user_time_percentile)}`}>
            {statistics.user_time_percentile !== null ? `${statistics.user_time_percentile}%` : 'N/A'}
          </div>
          <p className={`text-sm font-medium ${getPercentileColor(statistics.user_time_percentile)}`}>
            {getPercentileLabel(statistics.user_time_percentile)}
          </p>
        </motion.div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Solution Views Info */}
        <motion.div
          whileHover={{ translateY: -4 }}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Vue de la solution</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Utilisateurs ayant vu la solution avant succès:</span>
              <span className="text-lg font-bold text-indigo-600">
                {statistics.solution_views_before_success}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Ces utilisateurs ont consulté la solution avant de réussir {contentLabel}
            </p>
          </div>
        </motion.div>

        {/* Your Status */}
        <motion.div
          whileHover={{ translateY: -4 }}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Votre statut</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Statut de complétion:</span>
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                {statistics.user_completed === 'success' && '✓ Réussi'}
                {statistics.user_completed === 'review' && '🔄 À revoir'}
                {!statistics.user_completed && '⏳ En cours'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Votre temps:</span>
              <span className="font-mono font-bold">
                {statistics.user_time_seconds !== null
                  ? formatTime(statistics.user_time_seconds)
                  : 'Pas de temps enregistré'}
              </span>
            </div>
            {statistics.user_viewed_solution && (
              <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-700">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Vous avez consulté la solution</span>
                </div>
                {onRemoveSolutionFlag && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRemoveSolutionFlag}
                    className="h-5 w-5 p-0 text-amber-700 hover:bg-amber-100"
                    title="Annuler - Supprimer le marquage"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detailed Stats */}
      <motion.div
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Résumé</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.total_participants}
            </div>
            <div className="text-sm text-gray-600">Participants</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {statistics.success_count}
            </div>
            <div className="text-sm text-gray-600">Réussis</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {statistics.review_count}
            </div>
            <div className="text-sm text-gray-600">À revoir</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-600">
              {statistics.solution_views_before_success}
            </div>
            <div className="text-sm text-gray-600">Solutions vues</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {statistics.total_participants > 0 ? Math.round((statistics.solution_match_count / statistics.total_participants) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Solutions correspondantes</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

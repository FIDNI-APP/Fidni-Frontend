/**
 * TimeTrackingStatsRevised - Clean, simplified time tracking statistics
 * Removes sessions concept, focuses on total time and subject breakdown
 */
import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api/apiClient';
import { TaxonomyTimeStatsNew } from './TaxonomyTimeStatsNew';

interface TimeTrackingData {
  exercise_stats: {
    total_time_seconds: number;
    total_time_formatted: string;
    unique_content_studied: number;
  };
  lesson_stats: {
    total_time_seconds: number;
    total_time_formatted: string;
    unique_content_studied: number;
  };
  exam_stats: {
    total_time_seconds: number;
    total_time_formatted: string;
    unique_content_studied: number;
  };
  overall_stats: {
    total_time_all_content: number;
    total_time_formatted: string;
    current_study_streak: number;
  };
}

interface TimeTrackingStatsRevisedProps {
  username: string;
}

export const TimeTrackingStatsRevised: React.FC<TimeTrackingStatsRevisedProps> = ({ username }) => {
  const [data, setData] = useState<TimeTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects'>('overview');

  useEffect(() => {
    const fetchTimeStats = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${username}/study-stats/`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load study statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeStats();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p className="text-gray-500">{error || 'No data available'}</p>
      </div>
    );
  }

  const StatCard: React.FC<{
    label: string;
    value: string;
    subtitle?: string;
    color: string;
  }> = ({ label, value, subtitle, color }) => (
    <div className="bg-white rounded-xl p-5 border-2 border-gray-100 hover:border-gray-200 transition-colors">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color} mb-0.5`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Temps total d'étude"
          value={data.overall_stats.total_time_formatted}
          color="text-gray-800"
        />
        <StatCard
          label="Série d'étude"
          value={`${data.overall_stats.current_study_streak} jours`}
          color="text-orange-600"
        />
        <StatCard
          label="Exercices étudiés"
          value={data.exercise_stats.unique_content_studied.toString()}
          subtitle={data.exercise_stats.total_time_formatted}
          color="text-blue-600"
        />
        <StatCard
          label="Leçons étudiées"
          value={data.lesson_stats.unique_content_studied.toString()}
          subtitle={data.lesson_stats.total_time_formatted}
          color="text-green-600"
        />
      </div>

      {/* Content Type Breakdown */}
      <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Répartition par type de contenu</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex-1">
                <div className="text-sm text-blue-700 font-medium mb-1">Exercices</div>
                <div className="text-2xl font-bold text-blue-900">
                  {data.exercise_stats.total_time_formatted}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {data.exercise_stats.unique_content_studied} exercices
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
              <div className="flex-1">
                <div className="text-sm text-green-700 font-medium mb-1">Leçons</div>
                <div className="text-2xl font-bold text-green-900">
                  {data.lesson_stats.total_time_formatted}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {data.lesson_stats.unique_content_studied} leçons
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="flex-1">
                <div className="text-sm text-purple-700 font-medium mb-1">Examens</div>
                <div className="text-2xl font-bold text-purple-900">
                  {data.exam_stats.total_time_formatted}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {data.exam_stats.unique_content_studied} examens
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Statistiques d'étude</h2>
          <p className="text-gray-600">Vue d'ensemble de votre progression</p>
        </div>
      </div>

      {/* Tab Navigation - Colorful and modern */}
      <div className="bg-white rounded-xl border-2 border-gray-100 p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all relative ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all relative ${
            activeTab === 'subjects'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          Par sujet
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'subjects' && <TaxonomyTimeStatsNew />}
      </div>
    </div>
  );
};

export default TimeTrackingStatsRevised;

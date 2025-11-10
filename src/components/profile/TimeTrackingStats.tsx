import React, { useState, useEffect } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  BarChart3,
  Activity,
  Award,
  Flame,
  BookOpen,
  FileText,
  Timer,
  Zap,
  Star,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api/apiClient';
import { TaxonomyTimeStatsNew } from './TaxonomyTimeStatsNew';

interface TimeStats {
  content_type: string;
  total_sessions: number;
  total_time_seconds: number;
  total_time_formatted: string;
  average_session_time: number;
  average_session_formatted: string;
  best_time: number;
  best_time_formatted: string;
  longest_session: number;
  longest_session_formatted: string;
  unique_content_studied: number;
  session_types_distribution: Array<{
    session_type: string;
    count: number;
    total_duration: string;
  }>;
  weekly_progress: Array<{
    week_number: number;
    week_start: string;
    session_count: number;
    total_time_seconds: number;
    total_time_formatted: string;
  }>;
  improvement_trend: {
    trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    percentage: number;
  };
  consistency_score: number;
}

interface OverallStats {
  total_sessions_all_content: number;
  total_time_all_content: number;
  total_time_formatted: string;
  current_study_streak: number;
  most_active_day: {
    day: string;
    session_count: number;
  } | null;
  study_habits: {
    preferred_time: {
      morning: number;
      afternoon: number;
      evening: number;
    };
    average_sessions_per_week: number;
  };
}



interface TimeTrackingData {
  exercise_stats: TimeStats;
  lesson_stats: TimeStats;
  exam_stats: TimeStats;
  overall_stats: OverallStats;
}

interface TimeTrackingStatsProps {
  username: string;
}

export const TimeTrackingStats: React.FC<TimeTrackingStatsProps> = ({ username }) => {
  const [data, setData] = useState<TimeTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'exercises' | 'lessons' | 'exams'>('overview');

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
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200/50">
        <div className="text-center text-red-600">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const StatCard: React.FC<{
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
    trend?: { trend: string; percentage: number };
  }> = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200/50 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getTrendColor(trend.trend)}`}>
            {getTrendIcon(trend.trend)}
            {trend.percentage > 0 && <span>{trend.percentage}%</span>}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </motion.div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          title="Temps total d'étude"
          value={data.overall_stats.total_time_formatted}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Target}
          title="Sessions totales"
          value={data.overall_stats.total_sessions_all_content}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Flame}
          title="Série d'étude actuelle"
          value={`${data.overall_stats.current_study_streak} jours`}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={Star}
          title="Jour le plus actif"
          value={data.overall_stats.most_active_day?.day || 'N/A'}
          subtitle={data.overall_stats.most_active_day ? `${data.overall_stats.most_active_day.session_count} sessions` : undefined}
          color="bg-yellow-50 text-yellow-600"
        />
      </div>

      {/* Content Type Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200/50">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Exercices</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Temps total:</span>
              <span className="font-medium">{data.exercise_stats.total_time_formatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Entrées:</span>
              <span className="font-medium">{data.exercise_stats.total_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contenu étudié:</span>
              <span className="font-medium">{data.exercise_stats.unique_content_studied}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Régularité:</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConsistencyColor(data.exercise_stats.consistency_score)}`}>
                {data.exercise_stats.consistency_score}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200/50">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Leçons</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Temps total:</span>
              <span className="font-medium">{data.lesson_stats.total_time_formatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Entrées:</span>
              <span className="font-medium">{data.lesson_stats.total_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contenu étudié:</span>
              <span className="font-medium">{data.lesson_stats.unique_content_studied}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Régularité:</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConsistencyColor(data.lesson_stats.consistency_score)}`}>
                {data.lesson_stats.consistency_score}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200/50">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Examens</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Temps total:</span>
              <span className="font-medium">{data.exam_stats.total_time_formatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Entrées:</span>
              <span className="font-medium">{data.exam_stats.total_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contenu étudié:</span>
              <span className="font-medium">{data.exam_stats.unique_content_studied}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Régularité:</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConsistencyColor(data.exam_stats.consistency_score)}`}>
                {data.exam_stats.consistency_score}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Habits */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Habitudes d'étude
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {data.overall_stats.study_habits.preferred_time.morning}%
            </div>
            <div className="text-sm text-gray-600">Matin</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {data.overall_stats.study_habits.preferred_time.afternoon}%
            </div>
            <div className="text-sm text-gray-600">Après-midi</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {data.overall_stats.study_habits.preferred_time.evening}%
            </div>
            <div className="text-sm text-gray-600">Soir</div>
          </div>
        </div>
      </div>

      {/* Taxonomy Time Stats */}
      <TaxonomyTimeStatsNew />
    </div>
  );

  const ContentStatsTab: React.FC<{ stats: TimeStats; contentType: string }> = ({ stats, contentType }) => (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Timer}
          title="Temps moyen par session"
          value={stats.average_session_formatted}
          color="bg-blue-50 text-blue-600"
          trend={stats.improvement_trend}
        />
        <StatCard
          icon={Zap}
          title="Meilleur temps"
          value={stats.best_time_formatted}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={Clock}
          title="Session la plus longue"
          value={stats.longest_session_formatted}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Award}
          title="Score de régularité"
          value={`${stats.consistency_score}%`}
          color={getConsistencyColor(stats.consistency_score)}
        />
      </div>

      {/* Weekly Progress */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Progression hebdomadaire
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.weekly_progress.map((week, index) => (
            <div key={week.week_number} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Semaine {week.week_number}</div>
              <div className="text-xl font-bold text-gray-800 mb-1">{week.total_time_formatted}</div>
              <div className="text-xs text-gray-500">{week.session_count} sessions</div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Types Distribution */}
      {stats.session_types_distribution && stats.session_types_distribution.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-md border border-gray-200/50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Types de sessions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.session_types_distribution.map((type) => (
              <div key={type.session_type} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-800 mb-1">{type.count}</div>
                <div className="text-sm text-gray-600 capitalize">{type.session_type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Statistiques de temps d'étude
        </h2>
        <p className="text-indigo-100">Suivez votre progression et vos habitudes d'étude</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-1 shadow-md border border-gray-200/50">
        <div className="flex gap-1 flex-wrap">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'exercises', label: 'Exercices', icon: BookOpen },
            { id: 'lessons', label: 'Leçons', icon: GraduationCap },
            { id: 'exams', label: 'Examens', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'exercises' && <ContentStatsTab stats={data.exercise_stats} contentType="exercises" />}
          {activeTab === 'lessons' && <ContentStatsTab stats={data.lesson_stats} contentType="lessons" />}
          {activeTab === 'exams' && <ContentStatsTab stats={data.exam_stats} contentType="exams" />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TimeTrackingStats;
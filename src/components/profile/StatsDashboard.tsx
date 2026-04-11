// src/components/profile/StatsDashboard.tsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { 
  Clock, Target, BookOpen, CheckCircle, Eye, MessageSquare, 
  TrendingUp, Award, GraduationCap, PenTool, FileCheck,
  Search, Layers, FileText, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { api } from '@/lib/api/apiClient';
import { getTaxonomyTimeStats, type TaxonomyTimeItem } from '@/lib/api';

// Types pour les données de l'API
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

interface StatsDashboardProps {
  username: string;
  contributionStats?: {
    exercises: number;
    solutions: number;
    comments: number;
    total_contributions: number;
    upvotes_received: number;
    view_count: number;
  };
  learningStats?: {
    exercises_completed: number;
    exercises_in_review: number;
    exercises_saved: number;
    subjects_studied: string[];
    total_viewed: number;
  };
}

// Configuration pour les types de taxonomie
const TAXONOMY_CONFIG = {
  subject: {
    icon: GraduationCap,
    label: 'Matières',
    singularLabel: 'Matière',
    borderColor: 'border-l-blue-500',
  },
  subfield: {
    icon: Layers,
    label: 'Sous-domaines',
    singularLabel: 'Sous-domaine',
    borderColor: 'border-l-violet-500',
  },
  chapter: {
    icon: FileText,
    label: 'Chapitres',
    singularLabel: 'Chapitre',
    borderColor: 'border-l-emerald-500',
  },
  theorem: {
    icon: Award,
    label: 'Théorèmes',
    singularLabel: 'Théorème',
    borderColor: 'border-l-amber-500',
  },
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  username,
  contributionStats,
  learningStats
}) => {
  const [activeTab, setActiveTab] = useState<'time' | 'subjects' | 'learning' | 'contributions'>('time');
  
  // États pour les données de temps
  const [timeData, setTimeData] = useState<TimeTrackingData | null>(null);
  const [timeLoading, setTimeLoading] = useState(true);
  const [timeError, setTimeError] = useState<string | null>(null);

  // États pour les données taxonomiques
  const [taxonomyData, setTaxonomyData] = useState<TaxonomyTimeItem[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [taxonomyFilter, setTaxonomyFilter] = useState<'all' | 'subject' | 'subfield' | 'chapter' | 'theorem'>('all');
  const [taxonomySearch, setTaxonomySearch] = useState('');

  // Charger les stats de temps
  useEffect(() => {
    const fetchTimeStats = async () => {
      try {
        setTimeLoading(true);
        setTimeError(null);
        const response = await api.get(`/users/${username}/study-stats/`);
        setTimeData(response.data);
      } catch (err: any) {
        console.error('Error fetching time stats:', err);
        setTimeError(err.response?.data?.error || 'Échec du chargement des statistiques');
      } finally {
        setTimeLoading(false);
      }
    };

    if (username && activeTab === 'time') {
      fetchTimeStats();
    }
  }, [username, activeTab]);

  // Charger les données taxonomiques quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'subjects') {
      loadTaxonomyData();
    }
  }, [activeTab, taxonomyFilter]);

  const loadTaxonomyData = async () => {
    try {
      setTaxonomyLoading(true);
      setTaxonomyError(null);
      const params = taxonomyFilter !== 'all' ? { taxonomy_type: taxonomyFilter as any } : undefined;
      const response = await getTaxonomyTimeStats(params);
      setTaxonomyData(response.results || []);
    } catch (error: any) {
      console.error('Failed to load taxonomy time stats:', error);
      setTaxonomyError('Échec du chargement des données');
      setTaxonomyData([]);
    } finally {
      setTaxonomyLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const totalExercises = (learningStats?.exercises_completed || 0) + 
                         (learningStats?.exercises_in_review || 0);
  const successRate = totalExercises > 0 
    ? Math.round((learningStats?.exercises_completed || 0) / totalExercises * 100) 
    : 0;

  // Filtrer les données taxonomiques
  const filteredTaxonomyData = taxonomyData.filter(item =>
    item.name.toLowerCase().includes(taxonomySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Segmented Tab Bar */}
      <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'time', label: 'Temps d\'étude', icon: Clock },
          { id: 'subjects', label: 'Par sujet', icon: GraduationCap },
          { id: 'learning', label: 'Apprentissage', icon: Target },
          { id: 'contributions', label: 'Contributions', icon: Award }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB: Temps d'étude */}
        {activeTab === 'time' && (
          <motion.div
            key="time"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {timeLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800"></div>
              </div>
            ) : timeError ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">{timeError}</p>
                <button 
                  onClick={() => setActiveTab('time')}
                  className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
                >
                  Réessayer
                </button>
              </div>
            ) : timeData ? (
              <>
                {/* Stats principales */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 text-white rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400 font-medium">Temps total</span>
                    </div>
                    <div className="text-2xl font-bold">{timeData.overall_stats.total_time_formatted}</div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-slate-500 font-medium">Série d'étude</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {timeData.overall_stats.current_study_streak} <span className="text-base font-normal text-slate-500">jours</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <PenTool className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-slate-500 font-medium">Exercices</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{timeData.exercise_stats.unique_content_studied}</div>
                    <div className="text-xs text-slate-500 mt-1">{timeData.exercise_stats.total_time_formatted}</div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-slate-500 font-medium">Leçons</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{timeData.lesson_stats.unique_content_studied}</div>
                    <div className="text-xs text-slate-500 mt-1">{timeData.lesson_stats.total_time_formatted}</div>
                  </div>
                </div>

                {/* Répartition par type de contenu */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Répartition par type de contenu</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {[
                      { label: 'Exercices', icon: PenTool, color: 'bg-blue-500', time: timeData.exercise_stats.total_time_seconds, formatted: timeData.exercise_stats.total_time_formatted, count: timeData.exercise_stats.unique_content_studied },
                      { label: 'Leçons', icon: BookOpen, color: 'bg-indigo-500', time: timeData.lesson_stats.total_time_seconds, formatted: timeData.lesson_stats.total_time_formatted, count: timeData.lesson_stats.unique_content_studied },
                      { label: 'Examens', icon: FileCheck, color: 'bg-violet-500', time: timeData.exam_stats.total_time_seconds, formatted: timeData.exam_stats.total_time_formatted, count: timeData.exam_stats.unique_content_studied },
                    ].map((row) => {
                      const Icon = row.icon;
                      const maxTime = Math.max(timeData.exercise_stats.total_time_seconds, timeData.lesson_stats.total_time_seconds, timeData.exam_stats.total_time_seconds, 1);
                      const barPercent = Math.round((row.time / maxTime) * 100);
                      return (
                        <div key={row.label} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-28 flex-shrink-0">
                            <Icon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{row.label}</span>
                          </div>
                          <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barPercent}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full ${row.color} rounded-full`}
                            />
                          </div>
                          <div className="text-right w-20 flex-shrink-0">
                            <span className="text-sm font-bold text-slate-900">{row.formatted}</span>
                            <span className="text-[11px] text-slate-400 ml-1">({row.count})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Message si pas de données */}
                {timeData.overall_stats.total_time_all_content === 0 && (
                  <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-1">Aucune donnée de temps d'étude</p>
                    <p className="text-sm text-slate-500">
                      Commencez à étudier des exercices, leçons ou examens pour voir vos statistiques !
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
        )}

        {/* TAB: Par sujet */}
        {activeTab === 'subjects' && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Filtres de taxonomie */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTaxonomyFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  taxonomyFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Tous
              </button>
              {Object.entries(TAXONOMY_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setTaxonomyFilter(key as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      taxonomyFilter === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={taxonomySearch}
                onChange={(e) => setTaxonomySearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Liste */}
            {taxonomyLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800"></div>
              </div>
            ) : taxonomyError ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{taxonomyError}</p>
                <button 
                  onClick={loadTaxonomyData}
                  className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
                >
                  Réessayer
                </button>
              </div>
            ) : filteredTaxonomyData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {taxonomySearch ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTaxonomyData.map((item) => {
                  const config = TAXONOMY_CONFIG[item.taxonomy_type];
                  const Icon = config.icon;
                  const hasBreakdown = item.exercise_time_seconds > 0 || item.lesson_time_seconds > 0 || item.exam_time_seconds > 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white p-5 rounded-xl border border-slate-200 border-l-4 ${config.borderColor} hover:border-slate-300 transition-colors`}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-2.5 rounded-lg bg-slate-900">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{item.name}</h4>
                          <p className="text-xs text-slate-500">{config.singularLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">
                            {item.total_time_formatted}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown par type de contenu */}
                      {hasBreakdown && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                          {item.exercise_time_seconds > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50">
                              <PenTool className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                {formatTime(item.exercise_time_seconds)}
                              </span>
                              <span className="text-xs text-blue-600">exercices</span>
                            </div>
                          )}
                          {item.lesson_time_seconds > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-900">
                                {formatTime(item.lesson_time_seconds)}
                              </span>
                              <span className="text-xs text-emerald-600">leçons</span>
                            </div>
                          )}
                          {item.exam_time_seconds > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50">
                              <FileCheck className="w-3.5 h-3.5 text-violet-600" />
                              <span className="text-sm font-medium text-violet-900">
                                {formatTime(item.exam_time_seconds)}
                              </span>
                              <span className="text-xs text-violet-600">examens</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: Apprentissage */}
        {activeTab === 'learning' && (
          <motion.div
            key="learning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-6 gap-4">
              {/* Featured: Success Rate with ProgressRing */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-6 sm:col-span-3 lg:col-span-2 bg-blue-600 text-white rounded-2xl p-6 flex items-center gap-6"
              >
                <ProgressRing percentage={successRate} size={80} strokeWidth={6} trackColor="rgba(255,255,255,0.2)" progressColor="#ffffff">
                  <span className="text-lg font-bold text-white">{successRate}%</span>
                </ProgressRing>
                <div>
                  <div className="text-2xl font-bold">{totalExercises}</div>
                  <div className="text-sm text-blue-200">exercices au total</div>
                  <div className="mt-2 h-1.5 w-24 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${successRate}%` }} />
                  </div>
                </div>
              </motion.div>
              {/* Smaller stat cards */}
              {[
                { label: 'Validés', value: learningStats?.exercises_completed || 0, icon: CheckCircle, dot: 'bg-emerald-500' },
                { label: 'Échoués', value: learningStats?.exercises_in_review || 0, icon: Clock, dot: 'bg-red-500' },
                { label: 'Sauvegardés', value: learningStats?.exercises_saved || 0, icon: Target, dot: 'bg-blue-500' },
                { label: 'Consultés', value: learningStats?.total_viewed || 0, icon: Eye, dot: 'bg-slate-400' }
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-3 sm:col-span-3 lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${stat.dot}`} />
                      <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Progression globale</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Taux de complétion</span>
                    <span className="font-semibold text-slate-900">{successRate}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${successRate}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">
                      {learningStats?.exercises_completed || 0}
                    </div>
                    <div className="text-xs text-emerald-700">Validés</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {learningStats?.exercises_in_review || 0}
                    </div>
                    <div className="text-xs text-red-700">Échoués</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {learningStats?.exercises_saved || 0}
                    </div>
                    <div className="text-xs text-blue-700">Sauvegardés</div>
                  </div>
                </div>
              </div>
            </div>

            {learningStats?.subjects_studied && learningStats.subjects_studied.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Matières étudiées</h3>
                <div className="flex flex-wrap gap-2">
                  {learningStats.subjects_studied.map((subject, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: Contributions */}
        {activeTab === 'contributions' && (
          <motion.div
            key="contributions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Exercices créés', value: contributionStats?.exercises || 0, icon: BookOpen },
                { label: 'Commentaires', value: contributionStats?.comments || 0, icon: MessageSquare },
                { label: 'Votes reçus', value: contributionStats?.upvotes_received || 0, icon: TrendingUp },
                { label: 'Vues totales', value: contributionStats?.view_count || 0, icon: Eye }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{(stat.value || 0).toLocaleString()}</div>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-slate-900 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Score d'impact</h3>
                  <p className="text-sm text-slate-400">Votre contribution à la communauté</p>
                </div>
                <div className="text-4xl font-bold">
                  {(contributionStats?.upvotes_received || 0) * 10 + (contributionStats?.exercises || 0) * 50}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatsDashboard;
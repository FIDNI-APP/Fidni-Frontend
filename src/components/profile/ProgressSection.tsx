// src/components/profile/ProgressSection.tsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Content } from '@/types';
import {
  CheckCircle, Clock, Target, ChevronRight, BookOpen,
  Search, TrendingUp, ChevronDown, Layers, FileText,
  BarChart3, PenTool, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressRing } from '@/components/ui/ProgressRing';

interface ProgressSectionProps {
  successExercises: Content[];
  reviewExercises: Content[];
  isLoading: boolean;
}

type ViewMode = 'list' | 'by-subject' | 'by-chapter';

interface ExerciseWithStatus extends Content {
  status: 'success' | 'review';
}

interface TaxonomyStats {
  name: string;
  id: string | number;
  success: number;
  review: number;
  total: number;
  successRate: number;
  totalTime: number;
  exercises: ExerciseWithStatus[];
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  successExercises = [],
  reviewExercises = [],
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'success' | 'review'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'time' | 'subject'>('date');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const safeSuccessExercises = Array.isArray(successExercises) ? successExercises : [];
  const safeReviewExercises = Array.isArray(reviewExercises) ? reviewExercises : [];

  const totalExercises = safeSuccessExercises.length + safeReviewExercises.length;
  const successRate = totalExercises > 0
    ? Math.round((safeSuccessExercises.length / totalExercises) * 100)
    : 0;

  const totalTimeSpent = [...safeSuccessExercises, ...safeReviewExercises].reduce(
    (sum, ex) => sum + (ex.user_timespent || 0), 0
  );

  const allExercises = useMemo(() => [
    ...safeSuccessExercises.map(ex => ({ ...ex, status: 'success' as const })),
    ...safeReviewExercises.map(ex => ({ ...ex, status: 'review' as const }))
  ], [safeSuccessExercises, safeReviewExercises]);

  const subjectStats = useMemo((): TaxonomyStats[] => {
    const subjectMap = new Map<string, TaxonomyStats>();
    allExercises.forEach(ex => {
      const subjectName = ex.subject?.name || 'Sans matière';
      const subjectId = ex.subject?.id || 'none';
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          name: subjectName, id: subjectId,
          success: 0, review: 0, total: 0, successRate: 0, totalTime: 0, exercises: []
        });
      }
      const stats = subjectMap.get(subjectName)!;
      stats.total++;
      stats.totalTime += ex.user_timespent || 0;
      stats.exercises.push(ex);
      if (ex.status === 'success') stats.success++;
      else stats.review++;
    });
    subjectMap.forEach(stats => {
      stats.successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
    });
    return Array.from(subjectMap.values()).sort((a, b) => b.total - a.total);
  }, [allExercises]);

  const chapterStats = useMemo((): TaxonomyStats[] => {
    const chapterMap = new Map<string, TaxonomyStats>();
    allExercises.forEach(ex => {
      const chapters = ex.chapters || [];
      if (chapters.length === 0) {
        const key = 'no-chapter';
        if (!chapterMap.has(key)) {
          chapterMap.set(key, {
            name: 'Sans chapitre', id: 'none',
            success: 0, review: 0, total: 0, successRate: 0, totalTime: 0, exercises: []
          });
        }
        const stats = chapterMap.get(key)!;
        stats.total++;
        stats.totalTime += ex.user_timespent || 0;
        stats.exercises.push(ex);
        if (ex.status === 'success') stats.success++;
        else stats.review++;
      } else {
        chapters.forEach((chapter: any) => {
          const chapterName = chapter.name || chapter;
          const chapterId = chapter.id || chapter;
          const key = `${chapterId}`;
          if (!chapterMap.has(key)) {
            chapterMap.set(key, {
              name: chapterName, id: chapterId,
              success: 0, review: 0, total: 0, successRate: 0, totalTime: 0, exercises: []
            });
          }
          const stats = chapterMap.get(key)!;
          stats.total++;
          stats.totalTime += ex.user_timespent || 0;
          stats.exercises.push(ex);
          if (ex.status === 'success') stats.success++;
          else stats.review++;
        });
      }
    });
    chapterMap.forEach(stats => {
      stats.successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
    });
    return Array.from(chapterMap.values()).sort((a, b) => b.total - a.total);
  }, [allExercises]);

  const filteredExercises = allExercises
    .filter(ex => {
      if (activeTab === 'success') return ex.status === 'success';
      if (activeTab === 'review') return ex.status === 'review';
      return true;
    })
    .filter(ex => {
      if (!searchQuery) return true;
      return ex.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'time') return (b.user_timespent || 0) - (a.user_timespent || 0);
      if (sortBy === 'subject') return (a.subject?.name || '').localeCompare(b.subject?.name || '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Asymmetric Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Featured card */}
        <div className="col-span-2 bg-blue-600 rounded-2xl p-6 text-white flex items-center gap-5">
          <ProgressRing
            percentage={successRate}
            size={80}
            strokeWidth={6}
            trackColor="rgba(255,255,255,0.2)"
            progressColor="#ffffff"
          >
            <span className="text-lg font-bold text-white">{successRate}%</span>
          </ProgressRing>
          <div>
            <div className="text-3xl font-bold">{totalExercises}</div>
            <div className="text-blue-200 text-sm">exercices au total</div>
            <div className="mt-2 h-1.5 w-32 bg-blue-500/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Smaller stat cards */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">Validés</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{safeSuccessExercises.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-slate-500 font-medium">Échoués</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{safeReviewExercises.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-500 font-medium">Réussite</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{successRate}%</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Temps total</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatTime(totalTimeSpent)}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* View mode pills */}
        <div className="flex bg-slate-100 rounded-full p-1">
          {[
            { id: 'list', label: 'Liste', icon: FileText },
            { id: 'by-subject', label: 'Par matière', icon: BookOpen },
            { id: 'by-chapter', label: 'Par chapitre', icon: Layers }
          ].map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  viewMode === mode.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status + search */}
        <div className="flex items-center gap-2">
          {viewMode === 'list' && (
            <>
              <div className="flex bg-slate-100 rounded-full p-1">
                {[
                  { id: 'all', label: 'Tous', count: totalExercises },
                  { id: 'success', label: 'Validés', count: safeSuccessExercises.length },
                  { id: 'review', label: 'Échoués', count: safeReviewExercises.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Récents</option>
                <option value="time">Temps</option>
                <option value="subject">Matière</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Taxonomy View */}
      {(viewMode === 'by-subject' || viewMode === 'by-chapter') && (
        <div className="space-y-3">
          {(viewMode === 'by-subject' ? subjectStats : chapterStats).map((stat) => (
            <div
              key={`${stat.id}`}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => toggleExpanded(`${stat.id}`)}
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors"
              >
                <ProgressRing percentage={stat.successRate} size={44} strokeWidth={3}>
                  <span className="text-xs font-bold text-slate-700">{stat.successRate}%</span>
                </ProgressRing>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-semibold text-slate-900 truncate">{stat.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{stat.total} exercice{stat.total > 1 ? 's' : ''}</span>
                    <span className="text-emerald-600 font-medium">{stat.success} validés</span>
                  </div>
                </div>

                <div className="hidden md:block w-24">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${stat.successRate}%` }}
                    />
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-900">{formatTime(stat.totalTime)}</div>
                </div>

                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                  expandedItems.has(`${stat.id}`) ? 'rotate-180' : ''
                }`} />
              </button>

              <AnimatePresence>
                {expandedItems.has(`${stat.id}`) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-100"
                  >
                    <div className="p-2">
                      {stat.exercises.map((exercise) => (
                        <Link
                          key={exercise.id}
                          to={`/exercises/${exercise.id}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border-l-4 hover:bg-slate-50 transition-colors group ${
                            exercise.status === 'success'
                              ? 'border-l-emerald-400 bg-emerald-50/30'
                              : 'border-l-red-400 bg-red-50/30'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            exercise.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                          }`}>
                            {exercise.status === 'success'
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              : <X className="w-3.5 h-3.5 text-red-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                              {exercise.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatTime(exercise.user_timespent || 0)}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {(viewMode === 'by-subject' ? subjectStats : chapterStats).length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Aucune donnée</h3>
              <p className="text-slate-500 text-sm">
                Commencez à faire des exercices pour voir votre progression
              </p>
            </div>
          )}
        </div>
      )}

      {/* List View — Card Grid */}
      {viewMode === 'list' && (
        <>
          {filteredExercises.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Target className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Aucun exercice trouvé</h3>
              <p className="text-slate-500 text-sm mb-5">
                {searchQuery ? 'Essayez une autre recherche' : 'Commencez à faire des exercices'}
              </p>
              <Link
                to="/exercises"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Explorer les exercices
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredExercises.map((exercise) => (
                <Link
                  key={exercise.id}
                  to={`/exercises/${exercise.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {exercise.title}
                    </h4>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {exercise.subject?.name || 'Sans matière'}
                      </span>
                      <span className="text-xs text-slate-400">{formatTime(exercise.user_timespent || 0)}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      exercise.status === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {exercise.status === 'success' ? 'Validé' : 'Échoué'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Summary */}
          {filteredExercises.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>
                    Temps total sur <span className="font-semibold text-slate-900">{filteredExercises.length}</span> exercice{filteredExercises.length > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="font-bold text-lg text-slate-900">
                  {formatTime(filteredExercises.reduce((sum, ex) => sum + (ex.user_timespent || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProgressSection;

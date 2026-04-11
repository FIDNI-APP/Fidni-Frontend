// src/components/profile/ProfileOverviewSection.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target, NotebookPen, ListChecks, Bookmark,
  ChevronRight, CheckCircle, Clock,
  PenTool, FileText, Brain
} from 'lucide-react';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Link } from 'react-router-dom';
import { getUserDashboardStats, type DashboardStats } from '@/lib/api/dashboardApi';

interface ProfileOverviewSectionProps {
  user: any;
  stats: any;
  progressData: {
    successExercises: any[];
    reviewExercises: any[];
  };
  savedData: {
    exercises: any[];
    lessons: any[];
    exams: any[];
  };
  onNavigate: (section: string) => void;
}

export const ProfileOverviewSection: React.FC<ProfileOverviewSectionProps> = ({
  user,
  stats,
  progressData,
  savedData,
  onNavigate
}) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const exercisesCompleted = progressData.successExercises.length;
  const exercisesToReview = progressData.reviewExercises.length;
  const totalProgress = exercisesCompleted + exercisesToReview;
  const successRate = totalProgress > 0 ? Math.round((exercisesCompleted / totalProgress) * 100) : 0;
  const savedCount = savedData.exercises.length + savedData.lessons.length + savedData.exams.length;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserDashboardStats();
        setDashboardStats(data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const recentExercises = [
    ...progressData.successExercises.slice(0, 3).map((ex: any) => ({ ...ex, status: 'success' as const })),
    ...progressData.reviewExercises.slice(0, 2).map((ex: any) => ({ ...ex, status: 'review' as const }))
  ].slice(0, 5);

  const navItems = [
    { id: 'progress', label: 'Progression', icon: Target, tint: 'bg-blue-50 text-blue-600' },
    { id: 'skilliq', label: 'Skill IQ', icon: Brain, tint: 'bg-violet-50 text-violet-600' },
    { id: 'notebooks', label: 'Cahiers', icon: NotebookPen, tint: 'bg-indigo-50 text-indigo-600' },
    { id: 'saved', label: 'Favoris', icon: Bookmark, tint: 'bg-rose-50 text-rose-600' },
  ];

  const quickActionPills = [
    { id: 'progress', icon: Target },
    { id: 'skilliq', icon: Brain },
    { id: 'notebooks', icon: NotebookPen },
    { id: 'revisionlists', icon: ListChecks },
    { id: 'saved', icon: Bookmark },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">
            Bonjour, {user?.username || user?.first_name || 'étudiant'}
          </h2>
          <p className="text-blue-200 text-sm mt-1">
            {loading
              ? 'Chargement...'
              : dashboardStats?.study_time
                ? `${dashboardStats.study_time} d'étude cette semaine`
                : 'Commencez votre session d\'étude'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quickActionPills.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                title={action.id}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Success Rate Feature Card (col-span-2) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-8"
        >
          <ProgressRing percentage={successRate} size={120} strokeWidth={8}>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{successRate}%</div>
              <div className="text-[11px] text-slate-400 font-medium">réussite</div>
            </div>
          </ProgressRing>
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Progression</h3>
              <button
                onClick={() => onNavigate('progress')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                Détails <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-600">Réussis</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{exercisesCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-600">À revoir</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{exercisesToReview}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-600">Sauvegardés</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{savedCount}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Study Time Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Temps d'étude</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-4">
            {loading ? '...' : dashboardStats?.study_time || '0h'}
          </div>
          {!loading && dashboardStats?.time_breakdown && (
            <div className="space-y-2.5 mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <PenTool className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-slate-500">Exercices</span>
                </div>
                <span className="font-semibold text-slate-700">{dashboardStats.time_breakdown.exercises?.formatted || '0m'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <LessonIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-slate-500">Leçons</span>
                </div>
                <span className="font-semibold text-slate-700">{dashboardStats.time_breakdown.lessons?.formatted || '0m'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-slate-500">Examens</span>
                </div>
                <span className="font-semibold text-slate-700">{dashboardStats.time_breakdown.exams?.formatted || '0m'}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Recent Exercises — horizontal scroll (col-span-2) */}
        {recentExercises.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Derniers exercices</h3>
              <button
                onClick={() => onNavigate('progress')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                Voir tout <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {recentExercises.map((exercise: any) => (
                <Link
                  key={exercise.id}
                  to={`/exercises/${exercise.id}`}
                  className="flex-shrink-0 w-48 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      exercise.status === 'success'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      {exercise.status === 'success'
                        ? <CheckCircle className="w-3 h-3" />
                        : <Clock className="w-3 h-3" />
                      }
                    </div>
                    {exercise.subject?.name && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 truncate max-w-[100px]">
                        {exercise.subject.name}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {exercise.title}
                  </h4>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5"
        >
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Explorer</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl hover:opacity-80 transition-opacity ${item.tint}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileOverviewSection;

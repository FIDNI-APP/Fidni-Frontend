/**
 * ProfileStatsCard - Displays user statistics in the overview section
 * Shows: total study time, exercises completed, contributions, etc.
 */
import React from 'react';
import { Clock, CheckCircle, BookOpen, TrendingUp, Award, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileStatsCardProps {
  stats: any; // TODO: Type this properly based on your stats structure
}

export const ProfileStatsCard: React.FC<ProfileStatsCardProps> = ({ stats }) => {
  // Calculate stats
  const totalExercisesCompleted = stats?.learning_stats?.exercises_completed || 0;
  const totalContributions = stats?.contribution_stats?.exercises || 0;
  const totalUpvotes = stats?.contribution_stats?.upvotes_received || 0;
  const totalViews = stats?.contribution_stats?.view_count || 0;

  const statsConfig = [
    {
      icon: CheckCircle,
      label: 'Exercices complétés',
      value: totalExercisesCompleted,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-500',
      suffix: ''
    },
    {
      icon: BookOpen,
      label: 'Contributions',
      value: totalContributions,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      suffix: ''
    },
    {
      icon: Award,
      label: 'Réputation',
      value: totalUpvotes,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500',
      suffix: ''
    },
    {
      icon: TrendingUp,
      label: 'Vues totales',
      value: totalViews,
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
      suffix: ''
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Statistiques</h3>
            <p className="text-sm text-slate-300">Votre progression et activité</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6 grid grid-cols-2 gap-4">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity rounded-xl"></div>
              <div className="relative p-4 rounded-xl bg-slate-50 border-2 border-slate-200 hover:border-slate-300 transition-all">
                <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${stat.gradient} mb-3 shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {stat.value.toLocaleString()}{stat.suffix}
                  </p>
                  <p className="text-xs font-medium text-slate-600">
                    {stat.label}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Insights */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Continuez comme ça!</h4>
              <p className="text-sm text-blue-700">
                Vous avez complété <span className="font-bold">{totalExercisesCompleted}</span> exercices.
                {totalContributions > 0 && (
                  <> Vous avez également contribué <span className="font-bold">{totalContributions}</span> exercice(s) à la communauté!</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

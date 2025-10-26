// src/components/profile/StatsOverviewCard.tsx - Amélioré
import React from 'react';
import { Activity, BookOpen, ChevronUp, MessageSquare, Eye, CheckCircle, XCircle, Bookmark, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsOverviewCardProps {
  contributionStats: {
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
  isLoading: boolean;
  userType: 'student' | 'teacher'; // Add userType to differentiate stats display
}

export const StatsOverviewCard: React.FC<StatsOverviewCardProps> = ({
  contributionStats,
  learningStats,
  isLoading,
  userType
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-7 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 h-28 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Different stats for students vs teachers
  const statsList = [];

  if (userType === 'student') {
    // For students: focus on learning progress and success
    if (learningStats) {
      statsList.push(
        { icon: CheckCircle, value: learningStats?.exercises_completed || 0, label: 'Exercices Complétés', color: 'green', gradient: 'from-green-50 via-lime-50 to-yellow-50', iconBgColor: 'bg-green-100', iconColor: 'text-green-600', borderColor: 'border-green-100', textColor: 'text-green-800' },
        { icon: XCircle, value: learningStats?.exercises_in_review || 0, label: 'À Revoir', color: 'amber', gradient: 'from-amber-50 via-yellow-50 to-orange-50', iconBgColor: 'bg-amber-100', iconColor: 'text-amber-600', borderColor: 'border-amber-100', textColor: 'text-amber-800' },
        { icon: Bookmark, value: learningStats?.exercises_saved || 0, label: 'Exercices Sauvegardés', color: 'blue', gradient: 'from-blue-50 via-cyan-50 to-teal-50', iconBgColor: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'border-blue-100', textColor: 'text-blue-800' },
        { icon: BarChart3, value: learningStats?.subjects_studied?.length || 0, label: 'Matières Étudiées', color: 'purple', gradient: 'from-purple-50 via-pink-50 to-rose-50', iconBgColor: 'bg-purple-100', iconColor: 'text-purple-600', borderColor: 'border-purple-100', textColor: 'text-purple-800' }
      );
    }
  } else {
    // For teachers: focus on contributions and impact
    statsList.push(
      { icon: BookOpen, value: contributionStats?.exercises || 0, label: 'Exercices Créés', color: 'indigo', gradient: 'from-indigo-50 via-purple-50 to-pink-50', iconBgColor: 'bg-indigo-100', iconColor: 'text-indigo-600', borderColor: 'border-indigo-100', textColor: 'text-indigo-800' },
      { icon: MessageSquare, value: contributionStats?.comments || 0, label: 'Commentaires', color: 'purple', gradient: 'from-purple-50 via-pink-50 to-rose-50', iconBgColor: 'bg-purple-100', iconColor: 'text-purple-600', borderColor: 'border-purple-100', textColor: 'text-purple-800' },
      { icon: ChevronUp, value: contributionStats?.upvotes_received || 0, label: 'Votes Reçus', color: 'blue', gradient: 'from-blue-50 via-cyan-50 to-teal-50', iconBgColor: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'border-blue-100', textColor: 'text-blue-800' },
      { icon: Eye, value: contributionStats?.view_count || 0, label: 'Vues Contenu', color: 'emerald', gradient: 'from-emerald-50 via-green-50 to-lime-50', iconBgColor: 'bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'border-emerald-100', textColor: 'text-emerald-800' }
    );

    // Also add learning stats for teachers if available
    if (learningStats) {
      statsList.push(
        { icon: CheckCircle, value: learningStats?.exercises_completed || 0, label: 'Exercices Complétés', color: 'green', gradient: 'from-green-50 via-lime-50 to-yellow-50', iconBgColor: 'bg-green-100', iconColor: 'text-green-600', borderColor: 'border-green-100', textColor: 'text-green-800' },
        { icon: Bookmark, value: learningStats?.exercises_saved || 0, label: 'Exercices Sauvegardés', color: 'yellow', gradient: 'from-yellow-50 via-orange-50 to-red-50', iconBgColor: 'bg-yellow-100', iconColor: 'text-yellow-600', borderColor: 'border-yellow-100', textColor: 'text-yellow-800' }
      );
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-semibold mb-6 flex items-center text-gray-800"
        >
          <Activity className="w-6 h-6 mr-3 text-indigo-600" />
          Aperçu des Statistiques
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {statsList.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="group"
              >
                <div className={`relative p-4 rounded-xl bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-indigo-500/10`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 ${stat.iconBgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <span className={`text-3xl font-bold ${stat.textColor}`}>{stat.value.toLocaleString()}</span>
                  </div>
                  <p className={`text-sm font-medium ${stat.textColor}/80`}>{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {learningStats && learningStats.subjects_studied && learningStats.subjects_studied.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + statsList.length * 0.05 }}
            className="mt-8 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-5 border border-slate-200 shadow-inner"
          >
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-500"/>
              Matières Étudiées Récemment
            </h3>
            <div className="flex flex-wrap gap-2">
              {learningStats.subjects_studied.slice(0, 5).map((subject, index) => (
                <motion.span
                  key={index}
                  whileHover={{ scale: 1.05, y: -1 }}
                  className="bg-white text-indigo-700 px-3 py-1.5 rounded-full text-sm border border-indigo-200 shadow-sm font-medium cursor-default"
                >
                  {subject}
                </motion.span>
              ))}
              {learningStats.subjects_studied.length > 5 && (
                 <span className="text-indigo-600 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer hover:bg-indigo-50">
                    + {learningStats.subjects_studied.length - 5} autres
                 </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

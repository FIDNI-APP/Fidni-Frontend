// src/components/profile/StatsOverviewCard.tsx - Amélioré
import React from 'react';
import { Activity, BookOpen, ChevronUp, MessageSquare, Eye, CheckCircle, XCircle, Bookmark, BarChart3 } from 'lucide-react'; // Added BarChart3 for consistency
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
}

const StatBlock: React.FC<{
  icon: React.ElementType;
  value: number;
  label: string;
  gradient: string;
  iconBgColor: string;
  iconColor: string;
  borderColor: string;
  textColor: string;
  index: number;
}> = ({ icon: Icon, value, label, gradient, iconBgColor, iconColor, borderColor, textColor, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
    whileHover={{ scale: 1.03, y: -2 }}
    className={`group ${gradient} rounded-xl p-4 border ${borderColor} transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-indigo-500/10`}
  >
    <div className="flex items-center justify-between mb-2">
      <div className={`w-10 h-10 ${iconBgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <span className={`text-3xl font-bold ${textColor}`}>{value.toLocaleString()}</span>
    </div>
    <p className={`text-sm font-medium ${textColor}/80`}>{label}</p>
  </motion.div>
);


export const StatsOverviewCard: React.FC<StatsOverviewCardProps> = ({
  contributionStats,
  learningStats,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6"> {/* Consistent rounding and shadow */}
        <div className="animate-pulse">
          <div className="h-7 bg-gray-200 rounded mb-6 w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statsList = [
    { icon: BookOpen, value: contributionStats.exercises, label: 'Exercices Créés', gradient: 'from-indigo-50 via-purple-50 to-pink-50', iconBgColor: 'bg-indigo-100', iconColor: 'text-indigo-600', borderColor: 'border-indigo-100', textColor: 'text-indigo-800' },
    { icon: MessageSquare, value: contributionStats.comments, label: 'Commentaires', gradient: 'from-purple-50 via-pink-50 to-rose-50', iconBgColor: 'bg-purple-100', iconColor: 'text-purple-600', borderColor: 'border-purple-100', textColor: 'text-purple-800' },
    { icon: ChevronUp, value: contributionStats.upvotes_received, label: 'Votes Reçus', gradient: 'from-blue-50 via-cyan-50 to-teal-50', iconBgColor: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'border-blue-100', textColor: 'text-blue-800' },
    { icon: Eye, value: contributionStats.view_count, label: 'Vues Contenu', gradient: 'from-emerald-50 via-green-50 to-lime-50', iconBgColor: 'bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'border-emerald-100', textColor: 'text-emerald-800' },
  ];

  if (learningStats) {
    statsList.push(
      { icon: CheckCircle, value: learningStats.exercises_completed, label: 'Exercices Complétés', gradient: 'from-green-50 via-lime-50 to-yellow-50', iconBgColor: 'bg-green-100', iconColor: 'text-green-600', borderColor: 'border-green-100', textColor: 'text-green-800' },
      { icon: XCircle, value: learningStats.exercises_in_review, label: 'À Revoir', gradient: 'from-amber-50 via-yellow-50 to-orange-50', iconBgColor: 'bg-amber-100', iconColor: 'text-amber-600', borderColor: 'border-amber-100', textColor: 'text-amber-800' },
      { icon: Bookmark, value: learningStats.exercises_saved, label: 'Exercices Sauvegardés', gradient: 'from-yellow-50 via-orange-50 to-red-50', iconBgColor: 'bg-yellow-100', iconColor: 'text-yellow-600', borderColor: 'border-yellow-100', textColor: 'text-yellow-800' },
      { icon: BarChart3, value: learningStats.subjects_studied.length, label: 'Matières Étudiées', gradient: 'from-rose-50 via-red-50 to-fuchsia-50', iconBgColor: 'bg-rose-100', iconColor: 'text-rose-600', borderColor: 'border-rose-100', textColor: 'text-rose-800' }
    );
  }


  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden"> {/* Consistent rounding and shadow */}
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
          {statsList.map((stat, index) => (
            <StatBlock key={stat.label} {...stat} index={index} />
          ))}
        </div>

        {learningStats && learningStats.subjects_studied.length > 0 && (
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
              {learningStats.subjects_studied.slice(0, 5).map((subject, index) => ( // Show a few
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
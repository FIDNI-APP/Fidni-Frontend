import React from 'react';
import { Target, Clock, CheckCircle, Flame } from 'lucide-react';
import { StudyTimeBreakdown } from './StudyTimeBreakdown';
import type { TimeBreakdown, LearningInsights } from '@/lib/api/dashboardApi';

interface QuickStatsProps {
  exercisesStarted: number;
  studyTime: string;
  perfectCompletions: number;
  totalExercises: number;
  streakDays: number;
  timeBreakdown?: TimeBreakdown;
  insights?: LearningInsights;
}

export const QuickStatsDashboard: React.FC<QuickStatsProps> = ({
  exercisesStarted,
  studyTime,
  perfectCompletions,
  totalExercises,
  streakDays,
  timeBreakdown,
  insights
}) => {
  return (
    <div className="space-y-6 mb-8">
      {/* Quick Stats Summary */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cette semaine</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Exercises Started */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-purple-200">
              <Target className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{exercisesStarted}</p>
            <p className="text-xs text-gray-600 leading-tight">Exercices<br/>commencés</p>
          </div>
        </div>

        {/* Study Time */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-blue-200">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{studyTime}</p>
            <p className="text-xs text-gray-600 leading-tight">Temps<br/>d'étude</p>
          </div>
        </div>

        {/* Perfect Completions */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-green-200">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{perfectCompletions}/{totalExercises}</p>
            <p className="text-xs text-gray-600 leading-tight">Complétés<br/>parfaits</p>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-orange-200">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{streakDays}</p>
            <p className="text-xs text-gray-600 leading-tight">Jours<br/>Série</p>
          </div>
        </div>
      </div>
    </div>

      {/* Detailed Time Breakdown */}
      {timeBreakdown && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <StudyTimeBreakdown timeBreakdown={timeBreakdown} insights={insights} />
        </div>
      )}
    </div>
  );
};

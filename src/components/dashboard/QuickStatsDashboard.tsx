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
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: '"DM Sans", sans-serif' }}>Cette semaine</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Exercises Started */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-xl hover:-translate-y-1 transition-all">
          <div className="flex flex-col items-start text-left">
            <div className="w-11 h-11 bg-emerald-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: '"DM Sans", sans-serif' }}>{exercisesStarted}</p>
            <p className="text-xs text-slate-600 font-semibold" style={{ fontFamily: '"DM Sans", sans-serif' }}>Exercices</p>
          </div>
        </div>

        {/* Study Time */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-5 rounded-xl hover:-translate-y-1 transition-all">
          <div className="flex flex-col items-start text-left">
            <div className="w-11 h-11 bg-orange-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: '"DM Sans", sans-serif' }}>{studyTime}</p>
            <p className="text-xs text-slate-600 font-semibold" style={{ fontFamily: '"DM Sans", sans-serif' }}>Temps</p>
          </div>
        </div>

        {/* Perfect Completions */}
        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 p-5 rounded-xl hover:-translate-y-1 transition-all">
          <div className="flex flex-col items-start text-left">
            <div className="w-11 h-11 bg-violet-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: '"DM Sans", sans-serif' }}>{perfectCompletions}/{totalExercises}</p>
            <p className="text-xs text-slate-600 font-semibold" style={{ fontFamily: '"DM Sans", sans-serif' }}>Parfaits</p>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-xl hover:-translate-y-1 transition-all">
          <div className="flex flex-col items-start text-left">
            <div className="w-11 h-11 bg-amber-500 rounded-lg flex items-center justify-center mb-3 shadow-sm">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: '"DM Sans", sans-serif' }}>{streakDays}</p>
            <p className="text-xs text-slate-600 font-semibold" style={{ fontFamily: '"DM Sans", sans-serif' }}>Série</p>
          </div>
        </div>
      </div>
    </div>

      {/* Detailed Time Breakdown */}
      {timeBreakdown && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
          <StudyTimeBreakdown timeBreakdown={timeBreakdown} insights={insights} />
        </div>
      )}
    </div>
  );
};

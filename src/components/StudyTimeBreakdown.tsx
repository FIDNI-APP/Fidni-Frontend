import React from 'react';
import { BookOpen, GraduationCap, Award, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { TimeBreakdown, LearningInsights } from '@/lib/api/dashboardApi';

interface StudyTimeBreakdownProps {
  timeBreakdown: TimeBreakdown;
  insights?: LearningInsights;
}

export const StudyTimeBreakdown: React.FC<StudyTimeBreakdownProps> = ({ timeBreakdown, insights }) => {
  const contentTypes = [
    {
      key: 'exercises',
      label: 'Exercices',
      icon: BookOpen,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      data: timeBreakdown.exercises
    },
    {
      key: 'lessons',
      label: 'Leçons',
      icon: GraduationCap,
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
      data: timeBreakdown.lessons
    },
    {
      key: 'exams',
      label: 'Examens',
      icon: Award,
      color: 'orange',
      gradient: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      data: timeBreakdown.exams
    }
  ];

  const getInsightMessage = () => {
    if (!insights) return null;

    if (insights.balanced_study) {
      return {
        type: 'success',
        icon: CheckCircle,
        message: 'Excellent ! Votre temps d\'étude est bien équilibré entre les différents types de contenu.',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    if (insights.needs_more_lessons) {
      return {
        type: 'warning',
        icon: AlertCircle,
        message: 'Conseil : Passez plus de temps sur les leçons. Les leçons sont essentielles pour construire une base solide !',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    }

    const mostStudied = contentTypes.find(ct => ct.key === insights.most_studied_type);
    const leastStudied = contentTypes.find(ct => ct.key === insights.least_studied_type);

    return {
      type: 'info',
      icon: TrendingUp,
      message: `Vous passez le plus de temps sur les ${mostStudied?.label.toLowerCase()}. Pensez aussi à travailler les ${leastStudied?.label.toLowerCase()} !`,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    };
  };

  const insightData = getInsightMessage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-800">Temps d'étude par type de contenu</h3>
        <span className="text-sm text-gray-500 ml-auto">Cette semaine</span>
      </div>

      {/* Content Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contentTypes.map((type) => {
          const Icon = type.icon;
          const hasTime = type.data.total_seconds > 0;

          return (
            <div
              key={type.key}
              className={`relative overflow-hidden rounded-xl border-2 ${type.borderColor} ${type.bgColor} p-4 transition-all duration-300 hover:shadow-lg ${
                hasTime ? 'hover:scale-105' : ''
              }`}
            >
              {/* Icon and Label */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${type.gradient} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`font-semibold ${type.textColor}`}>{type.label}</span>
                </div>
              </div>

              {/* Time Display */}
              <div className="space-y-2">
                <div>
                  <div className="text-3xl font-bold text-gray-800">
                    {type.data.formatted || '0s'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {type.data.percentage.toFixed(1)}% du temps total
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${type.gradient} transition-all duration-500`}
                    style={{ width: `${type.data.percentage}%` }}
                  />
                </div>
              </div>

              {/* Highlight most studied */}
              {insights && insights.most_studied_type === type.key && hasTime && (
                <div className="absolute top-2 right-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${type.textColor} bg-white/80 border ${type.borderColor}`}>
                    Le plus étudié
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insight Message */}
      {insightData && (
        <div className={`rounded-lg border-2 ${insightData.borderColor} ${insightData.bgColor} p-4`}>
          <div className="flex items-start gap-3">
            <insightData.icon className={`w-5 h-5 ${insightData.color} flex-shrink-0 mt-0.5`} />
            <p className={`text-sm font-medium ${insightData.color}`}>
              {insightData.message}
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {timeBreakdown.total_seconds > 0 && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-300 mb-1">Temps total d'étude cette semaine</div>
              <div className="text-2xl font-bold">
                {(() => {
                  const hours = Math.floor(timeBreakdown.total_seconds / 3600);
                  const minutes = Math.floor((timeBreakdown.total_seconds % 3600) / 60);
                  if (hours > 0) return `${hours}h ${minutes}m`;
                  if (minutes > 0) return `${minutes}m`;
                  return `${timeBreakdown.total_seconds}s`;
                })()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Suivi automatique pendant votre navigation</div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {timeBreakdown.total_seconds === 0 && (
        <div className="text-center py-8 px-4 bg-gray-50 rounded-xl border-2 border-gray-200 border-dashed">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-1">Aucune donnée de temps d'étude</p>
          <p className="text-sm text-gray-500">
            Commencez à étudier des exercices, leçons ou examens pour voir vos statistiques !
          </p>
        </div>
      )}
    </div>
  );
};

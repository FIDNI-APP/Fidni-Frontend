import React from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

interface PathStep {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'locked';
}

interface LearningPathTrackerProps {
  steps: PathStep[];
  overallProgress: number;
  streak: number;
  level: number;
}

export const LearningPathTracker: React.FC<LearningPathTrackerProps> = ({
  steps,
  overallProgress,
  streak,
  level
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Votre parcours d'apprentissage</h2>

      {/* Progress Steps */}
      <div className="relative mb-6">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step.status === 'completed'
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-200'
                      : step.status === 'current'
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200 animate-pulse'
                      : 'bg-gray-200'
                  }`}
                >
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  )}
                  {step.status === 'current' && (
                    <Circle className="w-6 h-6 text-white fill-white" />
                  )}
                  {step.status === 'locked' && (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center max-w-[80px]">
                  <p className={`text-xs font-medium ${
                    step.status === 'locked' ? 'text-gray-400' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${
                    step.status === 'completed'
                      ? 'text-green-600 font-semibold'
                      : step.status === 'current'
                      ? 'text-purple-600 font-semibold'
                      : 'text-gray-400'
                  }`}>
                    {step.status === 'completed' ? 'Terminé' : step.status === 'current' ? 'En cours' : 'Bloqué'}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 relative" style={{ top: '-28px' }}>
                  <div
                    className={`h-full ${
                      steps[index + 1].status === 'completed'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : steps[index + 1].status === 'current'
                        ? 'bg-gradient-to-r from-gray-300 to-purple-500'
                        : 'bg-gray-300'
                    } ${steps[index + 1].status === 'locked' ? 'border-dashed border-2 border-gray-300 bg-transparent' : ''}`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">📊</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Progression</p>
            <p className="text-sm font-bold text-gray-900">{overallProgress}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">🔥</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Série</p>
            <p className="text-sm font-bold text-gray-900">{streak} jours</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">⭐</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Niveau</p>
            <p className="text-sm font-bold text-gray-900">{level}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

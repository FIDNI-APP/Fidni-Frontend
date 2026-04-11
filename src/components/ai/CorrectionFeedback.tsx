/**
 * CorrectionFeedback Component
 * Displays AI correction results with score and detailed feedback
 */

import React from 'react';
import { Check, X, HelpCircle, TrendingUp } from 'lucide-react';
import type { AICorrection } from '@/types/aiCorrection';

interface CorrectionFeedbackProps {
  correction: AICorrection;
}

export const CorrectionFeedback: React.FC<CorrectionFeedbackProps> = ({ correction }) => {
  const { score_awarded, score_total, feedback } = correction;

  const scorePercentage = score_total ? (score_awarded || 0) / score_total * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'correct':
        return <Check className="w-4 h-4 text-emerald-600" />;
      case 'partial':
        return <HelpCircle className="w-4 h-4 text-amber-600" />;
      case 'incorrect':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'bg-emerald-50 border-emerald-200';
      case 'partial':
        return 'bg-amber-50 border-amber-200';
      case 'incorrect':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = () => {
    if (scorePercentage >= 80) return 'text-emerald-600';
    if (scorePercentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Score</h3>
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className={`text-4xl font-bold ${getScoreColor()}`}>
            {Number(score_awarded)?.toFixed(1) || 0}
          </span>
          <span className="text-2xl font-medium text-gray-400 mb-1">
            / {score_total}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              scorePercentage >= 80
                ? 'bg-emerald-500'
                : scorePercentage >= 60
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${scorePercentage}%` }}
          />
        </div>

        <p className="text-sm text-gray-600 mt-2">
          {scorePercentage >= 80
            ? 'Excellent work! 🎉'
            : scorePercentage >= 60
            ? 'Good effort! Keep practicing.'
            : 'Keep working on it!'}
        </p>
      </div>

      {/* Overall Comment */}
      {feedback.overall_comment && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Overall Feedback</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {feedback.overall_comment}
          </p>
        </div>
      )}

      {/* Question-by-Question Feedback */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Question Breakdown</h4>

        {Object.entries(feedback)
          .filter(([key]) => key !== 'overall_comment' && key !== 'error')
          .map(([questionId, questionFeedback]) => {
            if (typeof questionFeedback !== 'object') return null;

            const qFeedback = questionFeedback as any;

            return (
              <div
                key={questionId}
                className={`rounded-lg p-4 border ${getStatusColor(qFeedback.status)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(qFeedback.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        Question {questionId.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {qFeedback.points} pts
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      {qFeedback.comment}
                    </p>

                    {qFeedback.suggestions && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          💡 Suggestion:
                        </p>
                        <p className="text-xs text-gray-600">
                          {qFeedback.suggestions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Processing Time */}
      {correction.processing_time_ms && (
        <p className="text-xs text-gray-400 text-center">
          Analyzed in {(correction.processing_time_ms / 1000).toFixed(1)}s
        </p>
      )}
    </div>
  );
};

// src/components/learningpath/ProgressTracker.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle
} from 'lucide-react';

interface ProgressTrackerProps {
  totalChapters: number;
  completedChapters: number;
  currentStreak: number;
  totalTimeSpent: number;
  averageQuizScore: number;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  totalChapters,
  completedChapters,
  currentStreak,
  totalTimeSpent,
  averageQuizScore
}) => {
  const progressPercentage = (completedChapters / totalChapters) * 100;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Overall Progress</span>
          <span className="text-sm font-semibold text-indigo-600">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-3 bg-indigo-600 rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {completedChapters} of {totalChapters} chapters completed
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-lg font-bold text-gray-800">{currentStreak}</span>
          </div>
          <p className="text-xs text-gray-600">Day Streak</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-lg font-bold text-gray-800">{Math.round(averageQuizScore)}%</span>
          </div>
          <p className="text-xs text-gray-600">Avg Quiz Score</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-lg font-bold text-gray-800">{formatTime(totalTimeSpent)}</span>
          </div>
          <p className="text-xs text-gray-600">Time Spent</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-lg font-bold text-gray-800">{Math.round(progressPercentage)}%</span>
          </div>
          <p className="text-xs text-gray-600">Complete</p>
        </div>
      </div>

      {/* Completion Message */}
      {progressPercentage === 100 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-4 p-3 bg-green-50 rounded-lg text-center border border-green-200"
        >
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-semibold text-sm">Path Completed! 🎉</p>
        </motion.div>
      )}
    </div>
  );
};
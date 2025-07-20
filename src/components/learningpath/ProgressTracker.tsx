// src/components/learningPath/ProgressTracker.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle,
  Circle
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">Your Progress</h3>

      {/* Overall Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Overall Progress</span>
          <span className="text-sm font-bold text-indigo-600">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full relative"
            >
              <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Chapter Progress */}
        <div className="mt-4 flex items-center gap-2">
          {Array.from({ length: totalChapters }).map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                index < completedChapters
                  ? 'bg-green-500'
                  : index === completedChapters
                  ? 'bg-indigo-500 animate-pulse'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {completedChapters} of {totalChapters} chapters completed
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-800">{currentStreak}</span>
          </div>
          <p className="text-sm text-gray-600">Day Streak</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-800">{Math.round(averageQuizScore)}%</span>
          </div>
          <p className="text-sm text-gray-600">Avg Quiz Score</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-600" />
            <span className="text-xl font-bold text-gray-800">{formatTime(totalTimeSpent)}</span>
          </div>
          <p className="text-sm text-gray-600">Time Spent</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-800">
              {Math.round((completedChapters / totalChapters) * 100)}%
            </span>
          </div>
          <p className="text-sm text-gray-600">Complete</p>
        </motion.div>
      </div>

      {/* Motivational Message */}
      {progressPercentage > 0 && progressPercentage < 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg"
        >
          <p className="text-sm text-indigo-800 font-medium">
            {progressPercentage < 25 && "🚀 Great start! Keep up the momentum!"}
            {progressPercentage >= 25 && progressPercentage < 50 && "💪 You're making excellent progress!"}
            {progressPercentage >= 50 && progressPercentage < 75 && "🔥 Halfway there! You're doing amazing!"}
            {progressPercentage >= 75 && progressPercentage < 100 && "🏆 Almost there! The finish line is in sight!"}
          </p>
        </motion.div>
      )}

      {progressPercentage === 100 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg text-center"
        >
          <Trophy className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-bold">Congratulations! You've completed this learning path! 🎉</p>
        </motion.div>
      )}
    </div>
  );
};
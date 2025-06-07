// src/components/learningPath/ProgressTracker.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame} from 'lucide-react';

interface ProgressTrackerProps {
  totalProgress: number;
  streak: number;
  level: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  totalProgress,
  streak,
}) => {
  return (
    <div className="flex items-center gap-6">
      {/* Progress Circle */}
      <div className="relative w-16 h-16">
        <svg className="transform -rotate-90 w-16 h-16">
          <circle
            cx="32"
            cy="32"
            r="28"
            strokeWidth="4"
            fill="none"
            className="stroke-white/20"
          />
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            strokeWidth="4"
            fill="none"
            className="stroke-white"
            strokeLinecap="round"
            initial={{ strokeDasharray: '0 176' }}
            animate={{ strokeDasharray: `${(totalProgress / 100) * 176} 176` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{totalProgress}%</span>
        </div>
      </div>

      {/* Streak */}
      <div className="text-center">
        <div className="flex items-center gap-1 text-white">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="font-bold text-lg">{streak}</span>
        </div>
        <p className="text-xs text-white/70">Jours</p>
      </div>

      {/* Level */}
      <div className="text-center">
        <div className="flex items-center gap-1 text-white">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg">3</span>
        </div>
        <p className="text-xs text-white/70">Niveau</p>
      </div>
    </div>
  );
};
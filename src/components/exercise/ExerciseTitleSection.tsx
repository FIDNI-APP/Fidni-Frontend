import React from 'react';
import { User, Calendar, Eye } from 'lucide-react';
import { Content, Difficulty } from '@/types';

interface ExerciseTitleSectionProps {
  exercise: Content;
  formatTimeAgo: (dateString: string) => string;
}

const getDifficultyColor = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy':
      return 'from-emerald-500 to-emerald-400 text-white';
    case 'medium':
      return 'from-amber-500 to-amber-400 text-white';
    case 'hard':
      return 'from-rose-500 to-rose-400 text-white';
    default:
      return 'from-gray-500 to-gray-400 text-white';
  }
};

const getDifficultyLabel = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy':
      return 'Facile';
    case 'medium':
      return 'Moyen';
    case 'hard':
      return 'Difficile';
    default:
      return difficulty;
  }
};

const DifficultyIcon = ({ difficulty }: { difficulty: Difficulty }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18"/>
      <path d={
        difficulty === 'easy'
          ? "M18 17H9V8"
          : difficulty === 'medium'
            ? "M18 12H9v-4M9 16v-4"
            : "M18 8H9v4M9 16v-4M18 12h-4"
      }/>
    </svg>
  );
};

export const ExerciseTitleSection: React.FC<ExerciseTitleSectionProps> = ({
  exercise,
  formatTimeAgo
}) => {
  return (
    <div className="liquid-glass bg-gradient-to-r from-gray-700 to-purple-800 text-white px-6 py-6 rounded-xl mb-6">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />
        </svg>
      </div>
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-4">{exercise.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1.5 text-indigo-300" />
              <span className="text-white/60">Créé par:</span>
              <span className="text-white font-medium ml-1">{exercise.author.username}</span>
            </div>

            <span className="text-white/40">|</span>

            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-indigo-300" />
              <span className="text-white/60">Dernière mise à jour:</span>
              <span className="text-indigo-100 ml-1">{formatTimeAgo(exercise.created_at)}</span>
            </div>

            <span className="text-white/40">|</span>

            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1.5 text-indigo-300" />
              <span className="text-indigo-100">{exercise.view_count} vues</span>
            </div>
          </div>
        </div>

        {/* Difficulty badge on the right */}
        <span className={`bg-gradient-to-r ${getDifficultyColor(exercise.difficulty)} px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg flex-shrink-0`}>
          <DifficultyIcon difficulty={exercise.difficulty} />
          <span>{getDifficultyLabel(exercise.difficulty)}</span>
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import { User, Calendar, Eye } from 'lucide-react';
import { Lesson } from '@/types';

interface LessonTitleSectionProps {
  lesson: Lesson;
  formatTimeAgo: (dateString: string) => string;
}

export const LessonTitleSection: React.FC<LessonTitleSectionProps> = ({
  lesson,
  formatTimeAgo
}) => {
  return (
    <div className="liquid-glass bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-6 rounded-xl mb-6">
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

      <div className="flex items-start justify-between gap-4 relative">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1.5 text-indigo-300" />
              <span className="text-white/60">Créé par:</span>
              <span className="text-white font-medium ml-1">{lesson.author.username}</span>
            </div>

            <span className="text-white/40">|</span>

            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-indigo-300" />
              <span className="text-white/60">Dernière mise à jour:</span>
              <span className="text-indigo-100 ml-1">{formatTimeAgo(lesson.created_at)}</span>
            </div>

            <span className="text-white/40">|</span>

            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1.5 text-indigo-300" />
              <span className="text-indigo-100">{lesson.view_count} vues</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Unified Lesson Card - Combines Title + Content
 * Eye-friendly design matching ExerciseMainCard
 */

import React from 'react';
import { User, Calendar, Eye } from 'lucide-react';
import { Lesson } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import RealPaginatedRenderer from '@/components/editor/RealPaginatedRenderer';
import { VoteValue } from '@/types';

interface LessonMainCardProps {
  lesson: Lesson;
  handleVote: (value: VoteValue) => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
}

export const LessonMainCard: React.FC<LessonMainCardProps> = ({
  lesson,
  handleVote,
  formatTimeAgo,
}) => {
  return (
    <div>
      {/* Header - Matches ExerciseHeader purple gradient style */}
      <div className="liquid-glass liquid-effect bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-xl overflow-hidden shadow-lg mb-6 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lessonTitleGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lessonTitleGrid)" />
          </svg>
        </div>

        <div className="px-6 py-6 relative">
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white leading-tight">
              {lesson.title}
            </h1>
          </div>

          {/* Compact metadata row - white text on purple */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-white/60" />
              {lesson.author.username}
            </span>

            <span className="text-white/40">•</span>

            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-white/60" />
              {formatTimeAgo(lesson.created_at)}
            </span>

            <span className="text-white/40">•</span>

            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-white/60" />
              {lesson.view_count} vues
            </span>

            {/* Subject - keep minimal */}
            {lesson.subject && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-white font-medium">
                  {lesson.subject.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content - Clean view */}
      <div className="mb-6">
        <RealPaginatedRenderer content={lesson.content} />
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4">
        {/* Vote buttons */}
        <VoteButtons
          initialVotes={lesson.vote_count}
          onVote={(value) => handleVote(value)}
          vertical={false}
          userVote={lesson.user_vote}
          size="sm"
        />
      </div>
    </div>
  );
};

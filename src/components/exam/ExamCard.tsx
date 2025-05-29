// src/components/exam/ExamCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flag, 
  Clock, 
  User, 
  Eye, 
  Calendar,
  ChevronRight,
  Edit2,
  Trash2,
  BarChart3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { VoteButtons } from '../VoteButtons';
import TipTapRenderer from '../editor/TipTapRenderer';
import { Exam, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface ExamCardProps {
  exam: Exam;
  onVote: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({ 
  exam, 
  onVote, 
  onDelete, 
  onEdit 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthor = user?.id === exam.author.id;

  // Format time spent
  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  // Get difficulty color
  const getDifficultyColor = () => {
    switch (exam.difficulty) {
      case 'easy':
        return 'from-emerald-500 to-green-500';
      case 'medium':
        return 'from-amber-500 to-yellow-500';
      case 'hard':
        return 'from-rose-500 to-pink-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getDifficultyLabel = () => {
    switch (exam.difficulty) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="group hover:bg-gray-50 transition-all duration-200 p-6 relative">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Vote section */}
        <div className="flex lg:flex-col items-center lg:items-center gap-2 lg:gap-0 order-2 lg:order-1">
          <VoteButtons
            initialVotes={exam.vote_count}
            onVote={(value) => onVote(exam.id, value)}
            userVote={exam.user_vote}
            size="sm"
            vertical={false}
          />
        </div>

        {/* Main content */}
        <div className="flex-grow order-1 lg:order-2">
          {/* Header with national exam badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-2">
                {exam.is_national_exam && (
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                    <Flag className="w-3 h-3" />
                    Examen National
                  </div>
                )}
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getDifficultyColor()} text-white shadow-sm`}>
                  {getDifficultyLabel()}
                </span>

                {exam.national_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(exam.national_date)}</span>
                  </div>
                )}
              </div>

              <h3 
                onClick={() => navigate(`/exams/${exam.id}`)}
                className="text-lg font-semibold text-gray-900 hover:text-indigo-600 cursor-pointer transition-colors duration-200 line-clamp-2 mb-2"
              >
                {exam.title}
              </h3>
            </div>

            {/* Action buttons */}
            {isAuthor && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(exam.id)}
                  className="text-gray-500 hover:text-indigo-600 p-1.5"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.(exam.id)}
                  className="text-gray-500 hover:text-red-600 p-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Content preview */}
          <div className="prose prose-sm max-w-none text-gray-600 mb-3 line-clamp-3">
            <TipTapRenderer content={exam.content} isCompact={true} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {exam.subject && (
              <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-medium border border-purple-100">
                {exam.subject.name}
              </span>
            )}
            
            {exam.class_levels && exam.class_levels.map((level) => (
              <span
                key={level.id}
                className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100"
              >
                {level.name}
              </span>
            ))}

            {exam.chapters && exam.chapters.slice(0, 2).map((chapter) => (
              <span
                key={chapter.id}
                className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs"
              >
                {chapter.name}
              </span>
            ))}
            
            {exam.chapters && exam.chapters.length > 2 && (
              <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-xs">
                +{exam.chapters.length - 2} more
              </span>
            )}
          </div>

          {/* Footer with metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span className="font-medium">{exam.author.username}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{exam.view_count.toLocaleString()} views</span>
            </div>

            {exam.average_time_spent > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatTimeSpent(exam.average_time_spent)} avg</span>
              </div>
            )}

            {exam.success_count > 0 && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{exam.success_count} completed</span>
              </div>
            )}

            {exam.review_count > 0 && (
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" />
                <span>{exam.review_count} reviews</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <span>{formatRelativeTime(exam.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Navigate arrow */}
        <div className="hidden lg:flex items-center order-3">
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" />
        </div>
      </div>
    </div>
  );
};
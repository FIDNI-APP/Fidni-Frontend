import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Play,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { LearningPath } from '@/types/index';
import { ProgressBadge } from './ProgressBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LearningPathCardProps {
  learningPath: LearningPath;
  onStart?: (pathId: string) => void;
  className?: string;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({ 
  learningPath, 
  onStart,
  className
}) => {
  const navigate = useNavigate();
  const progress = learningPath.user_progress?.progress_percentage || 0;
  const isStarted = !!learningPath.user_progress;
  const isCompleted = progress === 100;

  const handleCardClick = () => {
    navigate(`/learning-paths/${learningPath.id}`);
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart?.(learningPath.id) ?? navigate(`/learning-paths/${learningPath.id}`);
  };

  const difficulty = (() => {
    if (learningPath.estimated_hours < 10) return {
      color: 'text-emerald-600 bg-emerald-50',
      label: 'Beginner'
    };
    if (learningPath.estimated_hours < 30) return {
      color: 'text-amber-600 bg-amber-50',
      label: 'Intermediate'
    };
    return {
      color: 'text-rose-600 bg-rose-50',
      label: 'Advanced'
    };
  })();

  return (
    <div 
      className={cn(
        "group relative bg-white rounded-3xl border border-gray-100 overflow-hidden",
        "hover:shadow-md transition-shadow duration-200 cursor-pointer",
        "flex flex-col h-full",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Progress indicator */}
      {isStarted && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 z-10">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header with gradient */}
      <div className="relative h-36 bg-gradient-to-br from-blue-600 to-indigo-700 p-4 flex flex-col">
        <div className="flex justify-between items-start z-10">
          <span className="inline-flex items-center px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            <BookOpen className="w-3 h-3 mr-1.5" />
            {learningPath.subject.name}
          </span>
          
          {isCompleted && (
            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-500 rounded-full text-white text-xs font-medium">
              <CheckCircle className="w-3 h-3 mr-1.5" />
              Completed
            </span>
          )}
        </div>

        <h3 className="mt-auto text-lg font-semibold text-white line-clamp-2">
          {learningPath.title}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {learningPath.description || 'Master the fundamentals and advanced concepts in this comprehensive learning path.'}
        </p>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
          <div className="flex items-center text-gray-500">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <span>{learningPath.estimated_hours}h</span>
          </div>
          
          <div className="flex items-center text-gray-500">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <span>{learningPath.total_chapters || learningPath.path_chapters.length} chapters</span>
          </div>
        </div>

        {/* Difficulty and levels */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            difficulty.color
          )}>
            <TrendingUp className="w-3 h-3 mr-1" />
            {difficulty.label}
          </span>
          
          <div className="flex items-center gap-1">
            {learningPath.class_level.slice(0, 2).map(level => (
              <span 
                key={level.id}
                className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
              >
                {level.name}
              </span>
            ))}
            {learningPath.class_level.length > 2 && (
              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                +{learningPath.class_level.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        {isStarted && (
          <div className="mb-3">
            <ProgressBadge 
              percentage={progress}
              size="sm"
              showLabel
              className="w-full"
            />
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={handleStartClick}
          className=" bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg mt-auto w-full"
          size="sm"
        >
          {isCompleted ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Review
            </>
          ) : isStarted ? (
            <>
              <Play className="w-4 h-4 mr-2" />
              Continue
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start
            </>
          )}
          <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
        </Button>
      </div>
    </div>
  );
};
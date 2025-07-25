// src/components/learningpath/LearningPathHeader.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Clock,
  BookOpen,
  Users,
  Play,
  Award,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LearningPath } from '@/types/index';
import { ProgressBadge } from './ProgressBadge';

interface LearningPathHeaderProps {
  learningPath: LearningPath;
  onStart: () => void;
  stats?: any;
}

export const LearningPathHeader: React.FC<LearningPathHeaderProps> = ({
  learningPath,
  onStart,
  stats
}) => {
  const navigate = useNavigate();
  const progress = learningPath.user_progress?.progress_percentage || 0;
  const isStarted = !!learningPath.user_progress;
  const isCompleted = progress === 100;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/learning-paths')}
          className="text-white hover:bg-white/10 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Learning Paths
        </Button>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2">
              {/* Subject Badge */}
              <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
                <BookOpen className="w-4 h-4 mr-1.5" />
                {learningPath.subject.name}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {learningPath.title}
              </h1>

              {/* Description */}
              <p className="text-xl text-purple-100 mb-6">
                {learningPath.description}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-300" />
                  <span>{learningPath.estimated_hours}h total</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-300" />
                  <span>{learningPath.path_chapters.length} chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-300" />
                  <span>
                    {learningPath.estimated_hours < 10 ? 'Beginner' :
                     learningPath.estimated_hours < 30 ? 'Intermediate' : 'Advanced'}
                  </span>
                </div>
              </div>

              {/* Progress */}
              {isStarted && (
                <div className="mb-6">
                  <ProgressBadge
                    percentage={progress}
                    size="lg"
                    showLabel
                    className="max-w-md"
                  />
                </div>
              )}

              {/* CTA Button */}
              <Button
                size="lg"
                onClick={onStart}
                className="bg-white text-indigo-900 hover:bg-gray-100"
              >
                {isCompleted ? (
                  <>
                    <Award className="w-5 h-5 mr-2" />
                    View Certificate
                  </>
                ) : isStarted ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Continue Learning
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Learning Path
                  </>
                )}
              </Button>
            </div>

            {/* Side Panel */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">What you'll learn</h3>
              <ul className="space-y-3">
                {learningPath.path_chapters.slice(0, 5).map((chapter, index) => (
                  <li key={chapter.id} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">{index + 1}</span>
                    </div>
                    <span className="text-sm">{chapter.title}</span>
                  </li>
                ))}
                {learningPath.path_chapters.length > 5 && (
                  <li className="text-sm text-purple-200">
                    ...and {learningPath.path_chapters.length - 5} more chapters
                  </li>
                )}
              </ul>

              {/* Class Levels */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <h4 className="text-sm font-medium mb-2">Suitable for</h4>
                <div className="flex flex-wrap gap-2">
                  {learningPath.class_level.map(level => (
                    <span 
                      key={level.id}
                      className="px-2 py-1 bg-white/20 rounded text-xs"
                    >
                      {level.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
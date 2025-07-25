// src/components/learningpath/ChapterAccordion.tsx
import React from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Lock, 
  CheckCircle,
  Clock,
  FileText,
  Video as VideoIcon
} from 'lucide-react';
import { PathChapter, Video } from '@/types/index';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChapterAccordionProps {
  chapter: PathChapter;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onStartChapter: () => void;
  isLocked?: boolean;
  isCurrent?: boolean;
}

export const ChapterAccordion: React.FC<ChapterAccordionProps> = ({
  chapter,
  index,
  isExpanded,
  onToggle,
  onStartChapter,
  isLocked = false,
  isCurrent = false
}) => {
  const progress = chapter.user_progress?.progress_percentage || 0;
  const isCompleted = chapter.user_progress?.is_completed || false;
  const isStarted = !!chapter.user_progress;

  const getVideoIcon = (video: Video) => {
    const Icon = video.video_type === 'quiz' ? FileText : VideoIcon;
    const isVideoCompleted = video.user_progress?.is_completed || false;
    
    return (
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        isVideoCompleted ? "bg-green-100" : "bg-gray-100"
      )}>
        {isVideoCompleted ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <Icon className="w-4 h-4 text-gray-600" />
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border transition-all duration-200",
      isCurrent ? "border-indigo-500 shadow-md" : "border-gray-200",
      isLocked && "opacity-60"
    )}>
      {/* Chapter Header */}
      <div 
        className={cn(
          "p-6 cursor-pointer",
          !isLocked && "hover:bg-gray-50"
        )}
        onClick={!isLocked ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-grow">
            {/* Chapter Number */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
              isCompleted ? "bg-green-100 text-green-700" : 
              isCurrent ? "bg-indigo-100 text-indigo-700" :
              isLocked ? "bg-gray-100 text-gray-400" :
              "bg-gray-100 text-gray-700"
            )}>
              {isCompleted ? (
                <CheckCircle className="w-6 h-6" />
              ) : isLocked ? (
                <Lock className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>

            {/* Chapter Info */}
            <div className="flex-grow">
              <h3 className={cn(
                "text-lg font-semibold mb-1",
                isLocked ? "text-gray-400" : "text-gray-900"
              )}>
                {chapter.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <VideoIcon className="w-4 h-4" />
                  {chapter.videos.length} videos
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {chapter.total_duration}
                </span>
                {chapter.quiz && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Quiz ({chapter.quiz.estimated_duration})
                  </span>
                )}
              </div>
            </div>

            {/* Progress */}
            {isStarted && !isCompleted && (
              <div className="w-32">
                <div className="text-right text-sm text-gray-600 mb-1">
                  {progress}% complete
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            {!isLocked && (
              <Button
                size="sm"
                variant={isCompleted ? "ghost" : isCurrent ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChapter();
                }}
                className={cn(
                  isCurrent && "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {isCompleted ? (
                  <>Review</>
                ) : isStarted ? (
                  <>Continue</>
                ) : (
                  <>Start</>
                )}
              </Button>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <div className="ml-4">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Chapter Content */}
      {isExpanded && !isLocked && (
        <div className="border-t border-gray-200">
          <div className="p-6 pt-4">
            {chapter.description && (
              <p className="text-gray-600 mb-4">{chapter.description}</p>
            )}

            {/* Videos List */}
            <div className="space-y-3">
              {chapter.videos.map((video, videoIndex) => (
                <div
                  key={video.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {getVideoIcon(video)}
                  <div className="flex-grow">
                    <h4 className="font-medium text-gray-900">
                      {videoIndex + 1}. {video.title}
                    </h4>
                    <div className="text-sm text-gray-500">
                      {video.video_type} • {video.duration}
                    </div>
                  </div>
                  {video.resources.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {video.resources.length} resources
                    </span>
                  )}
                </div>
              ))}

              {/* Quiz */}
              {chapter.quiz && (
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border-t pt-4 mt-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    chapter.user_progress?.quiz_passed ? "bg-green-100" : "bg-yellow-100"
                  )}>
                    {chapter.user_progress?.quiz_passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-yellow-700" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-medium text-gray-900">
                      {chapter.quiz.title}
                    </h4>
                    <div className="text-sm text-gray-500">
                      {chapter.quiz.questions.length} questions • {chapter.quiz.estimated_duration}
                      {chapter.user_progress?.quiz_score && (
                        <span className="ml-2">
                          • Score: {chapter.user_progress.quiz_score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
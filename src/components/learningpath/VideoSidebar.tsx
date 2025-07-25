// src/components/learningpath/VideoSidebar.tsx
import React from 'react';
import { 
  ChevronRight,
  CheckCircle,
  Lock,
  FileText,
  Video as VideoIcon,
  Download,
  ExternalLink
} from 'lucide-react';
import { PathChapter, Video } from '@/types/index';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoSidebarProps {
  chapters: PathChapter[];
  currentVideoId: string;
  currentChapterId: string;
  onVideoSelect: (chapterId: string, videoId: string) => void;
  onQuizSelect: (chapterId: string) => void;
}

export const VideoSidebar: React.FC<VideoSidebarProps> = ({
  chapters,
  currentVideoId,
  currentChapterId,
  onVideoSelect,
  onQuizSelect
}) => {
  const isVideoAccessible = (chapterIndex: number, videoIndex: number) => {
    // Logic to determine if video is accessible based on progress
    // For now, we'll make all videos accessible
    return true;
  };

  const isQuizAccessible = (chapter: PathChapter) => {
    // Quiz is accessible if all required videos in the chapter are completed
    const requiredVideos = chapter.videos;
    return requiredVideos.every(v => v.user_progress?.is_completed);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Course Content</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id} className="border-b border-gray-100">
            {/* Chapter Header */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  chapter.user_progress?.is_completed 
                    ? "bg-green-100 text-green-700"
                    : chapter.id === currentChapterId
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {chapter.user_progress?.is_completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    chapterIndex + 1
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">
                    Chapter {chapterIndex + 1}: {chapter.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {chapter.user_progress?.progress_percentage || 0}% complete
                  </p>
                </div>
              </div>
            </div>

            {/* Videos */}
            <div className="p-2">
              {chapter.videos.map((video, videoIndex) => {
                const isAccessible = isVideoAccessible(chapterIndex, videoIndex);
                const isCurrent = video.id === currentVideoId;
                const isCompleted = video.user_progress?.is_completed || false;

                return (
                  <button
                    key={video.id}
                    onClick={() => isAccessible && onVideoSelect(chapter.id, video.id)}
                    disabled={!isAccessible}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-colors flex items-center gap-3",
                      isCurrent ? "bg-indigo-50 border border-indigo-200" :
                      isAccessible ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isCompleted ? "bg-green-100" :
                      isCurrent ? "bg-indigo-100" : "bg-gray-100"
                    )}>
                      {!isAccessible ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <VideoIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-sm truncate",
                          isCurrent ? "font-medium text-indigo-700" : "text-gray-700"
                        )}>
                          {videoIndex + 1}. {video.title}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {video.duration} • {video.video_type}
                      </div>
                    </div>

                    {isCurrent && (
                      <ChevronRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}

              {/* Chapter Quiz */}
              {chapter.quiz && (
                <button
                  onClick={() => isQuizAccessible(chapter) && onQuizSelect(chapter.id)}
                  disabled={!isQuizAccessible(chapter)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 mt-2 border-t pt-3",
                    isQuizAccessible(chapter) ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    chapter.user_progress?.quiz_passed ? "bg-green-100" : "bg-yellow-100"
                  )}>
                    {!isQuizAccessible(chapter) ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : chapter.user_progress?.quiz_passed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-yellow-700" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">
                      Chapter Quiz
                    </div>
                    <div className="text-xs text-gray-500">
                      {chapter.quiz.questions.length} questions
                      {chapter.user_progress?.quiz_score && (
                        <span className="ml-2">
                          • Last score: {chapter.user_progress.quiz_score}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
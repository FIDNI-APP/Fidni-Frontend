// src/components/learningpath/VideoSidebar.tsx
import React from 'react';
import { ChevronRight, CheckCircle, Lock, FileText, Video as VideoIcon } from 'lucide-react';
import { PathChapter } from '@/types/index';
import { computeProgress, sameId } from '@/components/parcours/progression';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

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
  const progress = computeProgress({ path_chapters: chapters });
  const isVideoAccessible = (chapterIndex: number, videoIndex: number) => {
    const step = progress.steps.find((s) => sameId(s.chapter.id, chapters[chapterIndex].id));
    const video = step?.videos.find((v) => sameId(v.video.id, chapters[chapterIndex].videos[videoIndex].id));
    return !!video && video.state !== 'locked';
  };
  const isQuizAccessible = (chapter: PathChapter) => {
    const step = progress.steps.find((s) => sameId(s.chapter.id, chapter.id));
    return !!step && (step.quizDue || step.quizPassed);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-line h-full overflow-hidden flex flex-col">
      <div className="p-4 border-b border-line">
        <h3 className="font-semibold text-ink">{t('Vidéos du chapitre')}</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id} className="border-b border-[#f2f1ee]">
            {/* Chapter Header */}
            <div className="p-4 bg-[#faf9f7]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  chapter.user_progress?.is_completed 
                    ? "bg-green-100 text-green-700"
                    : sameId(chapter.id, currentChapterId)
                    ? "bg-brand-soft text-brand-hover"
                    : "bg-line text-ink-soft"
                )}>
                  {chapter.user_progress?.is_completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    chapterIndex + 1
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-ink text-sm">
                    {t('Chapter {n}: {title}', { n: chapterIndex + 1, title: chapter.title })}
                  </h4>
                  <p className="text-xs text-ink-faint">
                    {t('{p}% complete', { p: chapter.user_progress?.progress_percentage || 0 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Videos */}
            <div className="p-2">
              {chapter.videos.map((video, videoIndex) => {
                const isAccessible = isVideoAccessible(chapterIndex, videoIndex);
                const isCurrent = sameId(video.id, currentVideoId);
                const isCompleted = video.user_progress?.is_completed || false;

                return (
                  <button
                    key={video.id}
                    onClick={() => isAccessible && onVideoSelect(chapter.id, video.id)}
                    disabled={!isAccessible}
                    className={cn(
                      "w-full text-start p-3 rounded-lg mb-1 transition-colors flex items-center gap-3",
                      isCurrent ? "bg-brand-soft border border-brand-line" :
                      isAccessible ? "hover:bg-[#faf9f7]" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isCompleted ? "bg-green-100" :
                      isCurrent ? "bg-brand-soft" : "bg-[#f2f1ee]"
                    )}>
                      {!isAccessible ? (
                        <Lock className="w-4 h-4 text-ink-faint" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <VideoIcon className="w-4 h-4 text-ink-soft" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-sm truncate",
                          isCurrent ? "font-medium text-brand-hover" : "text-ink-soft"
                        )}>
                          {videoIndex + 1}. {video.title}
                        </span>
                      </div>
                      <div className="text-xs text-ink-faint">
                        {video.duration} • {video.video_type}
                      </div>
                    </div>

                    {isCurrent && (
                      <ChevronRight className="w-4 h-4 text-brand flex-shrink-0" />
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
                    "w-full text-start p-3 rounded-lg transition-colors flex items-center gap-3 mt-2 border-t pt-3",
                    isQuizAccessible(chapter) ? "hover:bg-[#faf9f7]" : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    chapter.user_progress?.quiz_passed ? "bg-green-100" : "bg-yellow-100"
                  )}>
                    {!isQuizAccessible(chapter) ? (
                      <Lock className="w-4 h-4 text-ink-faint" />
                    ) : chapter.user_progress?.quiz_passed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-yellow-700" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink-soft">
                      {t('Quiz du chapitre')}
                    </div>
                    <div className="text-xs text-ink-faint">
                      {t('{n} questions', { n: chapter.quiz.questions.length })}
                      {chapter.user_progress?.quiz_score && (
                        <span className="ms-2">
                          {t('• Last score: {s}%', { s: chapter.user_progress.quiz_score })}
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
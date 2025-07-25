// src/pages/learningpaths/ChapterVideo.tsx
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  ExternalLink,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/learningpath/VideoPlayer';
import { VideoSidebar } from '@/components/learningpath/VideoSidebar';
import { TranscriptTab } from '@/components/learningpath/TranscriptTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getLearningPath,
  updateVideoProgress,
  startChapter
} from '@/lib/api/LearningPathApi';
import { LearningPath, Video, PathChapter } from '@/types/index';
import { useLearningPathStore } from '@/stores/LearningPathStore';
import { useAuth } from '@/contexts/AuthContext';

export const ChapterVideo: React.FC = () => {
  const { pathId, chapterId, videoId } = useParams<{ 
    pathId: string; 
    chapterId: string; 
    videoId: string; 
  }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setCurrentPath, setCurrentChapter, setCurrentVideo } = useLearningPathStore();
  
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [currentChapter, setCurrentChapterState] = useState<PathChapter | null>(null);
  const [currentVideo, setCurrentVideoState] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);

  useEffect(() => {
    if (pathId) {
      fetchLearningPath();
    }
  }, [pathId, chapterId, videoId]);

  const fetchLearningPath = async () => {
    try {
      setLoading(true);
      const pathData = await getLearningPath(pathId!);
      setLearningPath(pathData);
      setCurrentPath(pathData);
      
      // Find current chapter and video
      const chapter = pathData.path_chapters.find(ch => ch.id === chapterId);
      if (chapter) {
        setCurrentChapterState(chapter);
        setCurrentChapter(chapter);
        
        // Start chapter if not started
        if (!chapter.user_progress) {
          await startChapter(chapterId!);
        }
        
        const video = chapter.videos.find(v => v.id === videoId);
        if (video) {
          setCurrentVideoState(video);
          setCurrentVideo(video);
        }
      }
    } catch (err) {
      console.error('Failed to fetch learning path:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoProgress = async (progress: { playedSeconds: number; played: number }) => {
    if (!currentVideo || !isAuthenticated) return;
    
    // Save progress every 10 seconds
    const currentSeconds = Math.floor(progress.playedSeconds);
    if (currentSeconds > 0 && currentSeconds % 10 === 0 && currentSeconds !== lastSavedProgress) {
      setLastSavedProgress(currentSeconds);
      
      try {
        await updateVideoProgress(currentVideo.id, {
          watched_seconds: currentSeconds,
          is_completed: progress.played > 0.9
        });
      } catch (err) {
        console.error('Failed to save video progress:', err);
      }
    }
  };


  const navigateToNextVideo = () => {
    if (!currentChapter || !currentVideo || !learningPath) return;
    
    const currentVideoIndex = currentChapter.videos.findIndex(v => v.id === currentVideo.id);
    
    // Check if there's a next video in the current chapter
    if (currentVideoIndex < currentChapter.videos.length - 1) {
      const nextVideo = currentChapter.videos[currentVideoIndex + 1];
      navigate(`/learning-paths/${pathId}/chapters/${chapterId}/videos/${nextVideo.id}`);
    } else if (currentChapter.quiz) {
      // Navigate to chapter quiz
      navigate(`/learning-paths/${pathId}/chapters/${chapterId}/quiz`);
    } else {
      // Find next chapter
      const currentChapterIndex = learningPath.path_chapters.findIndex(ch => ch.id === chapterId);
      if (currentChapterIndex < learningPath.path_chapters.length - 1) {
        const nextChapter = learningPath.path_chapters[currentChapterIndex + 1];
        if (nextChapter.videos.length > 0) {
          navigate(`/learning-paths/${pathId}/chapters/${nextChapter.id}/videos/${nextChapter.videos[0].id}`);
        }
      }
    }
  };

  const navigateToPreviousVideo = () => {
    if (!currentChapter || !currentVideo || !learningPath) return;
    
    const currentVideoIndex = currentChapter.videos.findIndex(v => v.id === currentVideo.id);
    
    // Check if there's a previous video in the current chapter
    if (currentVideoIndex > 0) {
      const previousVideo = currentChapter.videos[currentVideoIndex - 1];
      navigate(`/learning-paths/${pathId}/chapters/${chapterId}/videos/${previousVideo.id}`);
    } else {
      // Find previous chapter
      const currentChapterIndex = learningPath.path_chapters.findIndex(ch => ch.id === chapterId);
      if (currentChapterIndex > 0) {
        const previousChapter = learningPath.path_chapters[currentChapterIndex - 1];
        if (previousChapter.videos.length > 0) {
          const lastVideo = previousChapter.videos[previousChapter.videos.length - 1];
          navigate(`/learning-paths/${pathId}/chapters/${previousChapter.id}/videos/${lastVideo.id}`);
        }
      }
    }
  };

  const handleVideoSelect = (newChapterId: string, newVideoId: string) => {
    navigate(`/learning-paths/${pathId}/chapters/${newChapterId}/videos/${newVideoId}`);
  };

  const handleQuizSelect = (quizChapterId: string) => {
    navigate(`/learning-paths/${pathId}/chapters/${quizChapterId}/quiz`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!learningPath || !currentChapter || !currentVideo) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate(`/learning-paths/${pathId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Path
          </Button>
          <div className="mt-4 text-center text-gray-600">
            Video not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/learning-paths/${pathId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Overview
            </Button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {learningPath.title}
              </h1>
              <p className="text-sm text-gray-600">
                Chapter {currentChapter.order}: {currentChapter.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToPreviousVideo}
              disabled={!currentChapter || currentChapter.videos[0].id === currentVideo.id}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToNextVideo}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Content */}
        <div className={cn(
          "flex-1 p-6 transition-all duration-300",
          sidebarCollapsed ? "mr-0" : "mr-80"
        )}>
          <div className="max-w-5xl mx-auto">
            {/* Video Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentVideo.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{currentVideo.video_type}</span>
                <span>•</span>
                <span>{currentVideo.duration}</span>
                {currentVideo.user_progress?.is_completed && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Completed
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Video Player */}
            <div className="mb-8">
              <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
                <VideoPlayer
                  url={currentVideo.url}
                  onProgress={handleVideoProgress}
                  onEnded={handleVideoEnd}
                  initialTime={currentVideo.user_progress?.watched_seconds || 0}
                  autoPlay={false}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="resources" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resources" className="mt-6">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Learning Resources</h3>
                  {currentVideo.resources.length > 0 ? (
                    <div className="space-y-3">
                      {currentVideo.resources.map(resource => (
                        <a
                        
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              {resource.resource_type === 'pdf' ? (
                                <FileText className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <ExternalLink className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {resource.title}
                              </h4>
                              {resource.description && (
                                <p className="text-sm text-gray-600">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Download className="w-5 h-5 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No resources available for this video.</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="transcript" className="mt-6">
                <TranscriptTab videoId={currentVideo.id} />
              </TabsContent>
              
              <TabsContent value="notes" className="mt-6">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Notes</h3>
                  <textarea
                    className="w-full h-64 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Take notes while watching the video..."
                    defaultValue={currentVideo.user_progress?.notes || ''}
                    onBlur={async (e) => {
                      if (isAuthenticated) {
                        await updateVideoProgress(currentVideo.id, {
                          watched_seconds: currentVideo.user_progress?.watched_seconds || 0,
                          notes: e.target.value
                        });
                      }
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar */}
        <div className={cn(
          "fixed right-0 top-[57px] bottom-0 transition-all duration-300",
          sidebarCollapsed ? "w-0" : "w-80"
        )}>
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-gray-200 rounded-l-lg p-2 hover:bg-gray-50"
          >
            {sidebarCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {!sidebarCollapsed && (
            <VideoSidebar
              chapters={learningPath.path_chapters}
              currentVideoId={currentVideo.id}
              currentChapterId={currentChapter.id}
              onVideoSelect={handleVideoSelect}
              onQuizSelect={handleQuizSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
};
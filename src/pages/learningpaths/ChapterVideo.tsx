// src/pages/learningpaths/ChapterVideo.tsx
import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { t } from '@/i18n';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getLearningPath,
  updateVideoProgress,
  startChapter
} from '@/lib/api/LearningPathApi';
import { LearningPath, Video, PathChapter, UserVideoProgress } from '@/types/index';
import { useLearningPathStore } from '@/stores/LearningPathStore';
import { computeProgress, sameId } from '@/components/parcours/progression';
import { useAuth } from '@/contexts/AuthContext';

export const ChapterVideo: React.FC = () => {
  const { pathId, chapterId, videoId } = useParams();
  return <ChapterVideoContent key={[pathId, chapterId, videoId].join('/')} />;
};

const ChapterVideoContent: React.FC = () => {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);

  const [error, setError] = useState(false);
  const saving = useRef(false);
  const saved = useRef(0);
  const loadId = useRef(0);

  useEffect(() => {
    if (pathId) {
      fetchLearningPath();
    }
    return () => { loadId.current += 1; };
  }, [pathId, chapterId, videoId]);

  const fetchLearningPath = async () => {
    const requestId = ++loadId.current;
    try {
      setLoading(true);
      setError(false);
      setCurrentVideoState(null);
      setCurrentChapterState(null);
      const pathData = await getLearningPath(pathId!);
      if (requestId !== loadId.current) return;
      pathData.path_chapters.sort((a, b) => a.order - b.order);
      pathData.path_chapters.forEach((c) => c.videos.sort((a, b) => a.order - b.order));
      const progression = computeProgress(pathData);
      const step = progression.steps.find((item) => sameId(item.chapter.id, chapterId));
      if (!step || step.state === 'locked' || !step.videos.some((v) => sameId(v.video.id, videoId) && v.state !== 'locked')) {
        navigate(`/parcours?parcours=${pathId}&chapitre=${chapterId}`, { replace: true });
        return;
      }
      setLearningPath(pathData);
      setCurrentPath(pathData);
      
      // Find current chapter and video
      const chapter = pathData.path_chapters.find(ch => String(ch.id) === chapterId);
      if (chapter) {
        setCurrentChapterState(chapter);
        setCurrentChapter(chapter);
        
        // Start chapter if not started
        if (!chapter.user_progress) {
          await startChapter(chapterId!);
          if (requestId !== loadId.current) return;
        }
        
        const video = chapter.videos.find(v => String(v.id) === videoId);
        if (video) {
          saved.current = video.user_progress?.watched_seconds ?? 0;
          setLastSavedProgress(saved.current);
          setCurrentVideoState(video);
          setCurrentVideo(video);
        }
      }
    } catch (err) {
      if (requestId !== loadId.current) return;
      setError(true);
      console.error('Failed to fetch learning path:', err);
    } finally {
      if (requestId === loadId.current) setLoading(false);
    }
  };

  const applyVideoProgress = (result: UserVideoProgress) => {
    if (!currentVideo) return;
    const updated = { ...currentVideo, user_progress: { ...currentVideo.user_progress, ...result } };
    setCurrentVideoState(updated);
    setLearningPath((path) => path ? {
      ...path, path_chapters: path.path_chapters.map((chapter) => ({
        ...chapter, videos: chapter.videos.map((video) => sameId(video.id, updated.id) ? updated : video),
      })),
    } : path);
  };

  const handleVideoProgress = async (progress: { playedSeconds: number; played: number }) => {
    if (!currentVideo || !isAuthenticated) return;
    
    const seconds = Math.floor(progress.playedSeconds);
    const reachedCompletion = progress.played >= 0.9 && !currentVideo.user_progress?.is_completed;
    if (saving.current || seconds <= 0 || seconds - saved.current < 10 && !reachedCompletion) return;
    saving.current = true;
    try {
      const result = await updateVideoProgress(currentVideo.id, { watched_seconds: seconds });
      setError(false);
      saved.current = Math.max(saved.current, seconds);
      setLastSavedProgress(saved.current);
      applyVideoProgress(result);
    } catch (err) {
      setError(true);
      console.error('Failed to save video progress:', err);
    } finally {
      saving.current = false;
    }
  };

  const handleVideoEnd = async () => {
    if (!currentVideo || !isAuthenticated) return;
    try {
      const result = await updateVideoProgress(currentVideo.id, {
        watched_seconds: Math.max(lastSavedProgress, currentVideo.duration_seconds),
        is_completed: true,
      });
      setError(false);
      applyVideoProgress(result);
    } catch {
      setError(true);
    }
  };

  const navigateToNextVideo = () => {
    if (!currentChapter || !currentVideo || !learningPath) return;
    if (!currentVideo.user_progress?.is_completed) {
      navigate(`/parcours?parcours=${pathId}&chapitre=${chapterId}`);
      return;
    }
    const currentVideoIndex = currentChapter.videos.findIndex(v => v.id === currentVideo.id);
    
    // Check if there's a next video in the current chapter
    if (currentVideoIndex < currentChapter.videos.length - 1) {
      const nextVideo = currentChapter.videos[currentVideoIndex + 1];
      navigate(`/learning-path/${pathId}/chapters/${chapterId}/videos/${nextVideo.id}`);
    } else if (currentChapter.quiz) {
      // Navigate to chapter quiz
      navigate(`/learning-path/${pathId}/chapters/${chapterId}/quiz`);
    } else {
      // Find next chapter
      const currentChapterIndex = learningPath.path_chapters.findIndex(ch => String(ch.id) === chapterId);
      if (currentChapterIndex < learningPath.path_chapters.length - 1) {
        const nextChapter = learningPath.path_chapters[currentChapterIndex + 1];
        if (nextChapter.videos.length > 0) {
          navigate(`/learning-path/${pathId}/chapters/${nextChapter.id}/videos/${nextChapter.videos[0].id}`);
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
      navigate(`/learning-path/${pathId}/chapters/${chapterId}/videos/${previousVideo.id}`);
    } else {
      // Find previous chapter
      const currentChapterIndex = learningPath.path_chapters.findIndex(ch => String(ch.id) === chapterId);
      if (currentChapterIndex > 0) {
        const previousChapter = learningPath.path_chapters[currentChapterIndex - 1];
        if (previousChapter.videos.length > 0) {
          const lastVideo = previousChapter.videos[previousChapter.videos.length - 1];
          navigate(`/learning-path/${pathId}/chapters/${previousChapter.id}/videos/${lastVideo.id}`);
        }
      }
    }
  };

  const handleVideoSelect = (newChapterId: string, newVideoId: string) => {
    navigate(`/learning-path/${pathId}/chapters/${newChapterId}/videos/${newVideoId}`);
  };

  const handleQuizSelect = (quizChapterId: string) => {
    navigate(`/learning-path/${pathId}/chapters/${quizChapterId}/quiz`);
  };

  if (error && !currentVideo) {
    return <div role="alert" className="mx-auto max-w-xl p-6">
      <p>{t('Le parcours n’a pas pu se charger. Vérifie ta connexion.')}</p>
      <Button onClick={fetchLearningPath} className="mt-4">{t('Réessayer')}</Button>
    </div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!learningPath || !currentChapter || !currentVideo) {
    return (
      <div className="min-h-screen bg-[#faf9f7] p-8">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate(`/parcours?parcours=${pathId}&chapitre=${chapterId}`)}>
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('Retour au parcours')}
          </Button>
          <div className="mt-4 text-center text-ink-soft">
            {t('Vidéo introuvable')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/parcours?parcours=${pathId}&chapitre=${chapterId}`)}
            >
              <ArrowLeft className="w-4 h-4 me-2" />
              {t('Retour au parcours')}
            </Button>
            
            <div className="h-6 w-px bg-[#d8d4cc]" />
            
            <div>
              <h1 className="text-lg font-semibold text-ink">
                {learningPath.title}
              </h1>
              <p className="text-sm text-ink-soft">
                {t('Chapter {n}: {title}', { n: currentChapter.order, title: currentChapter.title })}
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
              <ChevronLeft className="w-4 h-4 me-1" />
              {t('Précédent')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToNextVideo}
            >
              {t('Suivant')}
              <ChevronRight className="w-4 h-4 ms-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Content */}
        <div className={cn(
          "min-w-0 flex-1 p-4 sm:p-6 transition-all duration-300",
          sidebarCollapsed ? "lg:me-0" : "lg:me-80"
        )}>
          <div className="max-w-5xl mx-auto">
            {/* Video Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-ink mb-2">
                {currentVideo.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-ink-soft">
                <span>{currentVideo.video_type}</span>
                <span>•</span>
                <span>{currentVideo.duration}</span>
                {currentVideo.user_progress?.is_completed && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {t('Terminé')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {error && <p role="alert" className="mb-4 text-sm text-red-700">{t('La progression n’a pas pu être enregistrée. Vérifie ta connexion.')}</p>}
            {/* Video Player */}
            <div className="mb-8">
              <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
                <VideoPlayer
                  key={currentVideo.id}
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
              {/* L'onglet « Transcription » n'affichait qu'un « bientôt disponible » : retiré. */}
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resources">{t('Ressources')}</TabsTrigger>
                <TabsTrigger value="notes">{t('Notes')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resources" className="mt-6">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('Ressources')}</h3>
                  {currentVideo.resources.length > 0 ? (
                    <div className="space-y-3">
                      {currentVideo.resources.map(resource => (
                        <a
                        
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-lg border border-line hover:bg-[#faf9f7] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-soft rounded-lg flex items-center justify-center">
                              {resource.resource_type === 'pdf' ? (
                                <FileText className="w-5 h-5 text-brand" />
                              ) : (
                                <ExternalLink className="w-5 h-5 text-brand" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-ink">
                                {resource.title}
                              </h4>
                              {resource.description && (
                                <p className="text-sm text-ink-soft">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Download className="w-5 h-5 text-ink-faint" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-ink-soft">{t('Aucune ressource pour cette vidéo.')}</p>
                  )}
                </div>
              </TabsContent>
              
              
              <TabsContent value="notes" className="mt-6">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('Tes notes')}</h3>
                  <textarea
                    className="w-full h-64 p-4 border border-line rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder={t('Prends des notes pendant la vidéo…')}
                    defaultValue={currentVideo.user_progress?.notes || ''}
                    onBlur={async (e) => {
                      if (isAuthenticated) {
                        await updateVideoProgress(currentVideo.id, {
                          // Le serveur garde la plus grande position : envoyer 0 ne fait pas reculer.
                          watched_seconds: lastSavedProgress,
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
          "fixed end-0 top-[57px] bottom-0 transition-all duration-300",
          sidebarCollapsed ? "w-0" : "w-80"
        )}>
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-full rtl:translate-x-full bg-white border border-line rounded-s-lg p-2 hover:bg-[#faf9f7]"
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
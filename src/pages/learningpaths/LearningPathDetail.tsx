// src/pages/learningPaths/LearningPathDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle, 
  Lock, 
  ChevronRight,
  Clock,
  BookOpen,
  FileText,
  ChevronLeft,
  Edit,
  Plus
} from 'lucide-react';
import { getLearningPath, startLearningPath, startChapter } from '@/lib/api/learningpathApi';
import { LearningPath, PathChapter } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/learningpath/VideoPlayer';
import { ChapterQuizModal } from '@/components/learningpath/ChapterQuizModal';

export const LearningPathDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<PathChapter | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (id) {
      loadLearningPath();
    }
  }, [id]);

  const loadLearningPath = async () => {
    try {
      setLoading(true);
      const data = await getLearningPath(id!);
      setLearningPath(data);
    } catch (error) {
      console.error('Failed to load learning path:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPath = async () => {
    try {
      await startLearningPath(id!);
      loadLearningPath();
    } catch (error) {
      console.error('Failed to start learning path:', error);
    }
  };

  const handleChapterClick = async (chapter: PathChapter) => {
    if (chapter.is_locked) {
      return;
    }

    try {
      if (!chapter.user_progress) {
        await startChapter(chapter.id);
      }
      setSelectedChapter(chapter);
      setCurrentVideoIndex(0);
      setShowVideoPlayer(true);
    } catch (error) {
      console.error('Failed to start chapter:', error);
    }
  };

  const getChapterStatus = (chapter: PathChapter) => {
    if (chapter.is_locked) return 'locked';
    if (chapter.user_progress?.is_completed) return 'completed';
    if (chapter.user_progress?.progress_percentage > 0) return 'in-progress';
    return 'not-started';
  };

  const getChapterColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'from-green-400 to-green-600';
      case 'in-progress':
        return 'from-yellow-400 to-orange-500';
      case 'locked':
        return 'from-gray-300 to-gray-400';
      default:
        return 'from-indigo-400 to-purple-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!learningPath) {
    return <div>Learning path not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <button
            onClick={() => navigate('/learning-paths')}
            className="flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Learning Paths
          </button>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">{learningPath.title}</h1>
              <p className="text-xl text-indigo-100 mb-6">{learningPath.description}</p>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{learningPath.total_chapters} Chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  <span>{learningPath.total_videos} Videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{learningPath.estimated_hours} Hours</span>
                </div>
              </div>
            </div>

            {user?.is_superuser && (
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/learning-paths/${id}/edit`)}
                  className="bg-white/20 hover:bg-white/30"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => navigate(`/learning-paths/${id}/chapters/create`)}
                  className="bg-white/20 hover:bg-white/30"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Chapter
                </Button>
              </div>
            )}
          </div>

          {/* Progress Overview */}
          {learningPath.user_progress && (
            <div className="mt-8 bg-white/20 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Your Progress</h3>
                <span className="text-2xl font-bold">
                  {learningPath.user_progress.progress_percentage}%
                </span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-3">
                <div
                  className="h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${learningPath.user_progress.progress_percentage}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-indigo-100">
                {learningPath.user_progress.completed_chapters} of {learningPath.total_chapters} chapters completed
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Learning Path Visual */}
      <div className="container mx-auto px-4 py-12">
        <div className="relative">
          {/* Path Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-indigo-200 to-purple-200 z-0" />

          {/* Chapters */}
          <div className="relative z-10 space-y-16">
            {learningPath.path_chapters.map((chapter, index) => {
              const status = getChapterStatus(chapter);
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center ${isLeft ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`w-1/2 ${isLeft ? 'pr-12' : 'pl-12'}`}>
                    <div
                      onClick={() => handleChapterClick(chapter)}
                      className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                        status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl'
                      }`}
                    >
                      {/* Chapter Number Badge */}
                      <div className={`absolute ${isLeft ? '-right-6' : '-left-6'} top-1/2 transform -translate-y-1/2`}>
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getChapterColor(status)} flex items-center justify-center text-white font-bold shadow-lg`}>
                          {status === 'completed' ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : status === 'locked' ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            index + 1
                          )}
                        </div>
                      </div>

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {chapter.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {chapter.description}
                          </p>
                        </div>
                      </div>

                      {/* Chapter Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          <span>{chapter.total_videos} videos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(chapter.estimated_minutes / 60)}h {chapter.estimated_minutes % 60}m</span>
                        </div>
                        {chapter.quiz && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{chapter.total_quiz_questions} questions</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {chapter.user_progress && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="text-gray-800 font-medium">
                              {chapter.user_progress.progress_percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${chapter.user_progress.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button
                        className={`w-full mt-4 ${
                          status === 'locked' 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                        }`}
                        disabled={status === 'locked'}
                      >
                        {status === 'completed' ? 'Review Chapter' : 
                         status === 'in-progress' ? 'Continue Learning' : 
                         status === 'locked' ? 'Locked' : 'Start Chapter'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Start Path Button */}
        {!learningPath.user_progress && (
          <div className="text-center mt-12">
            <Button
              onClick={handleStartPath}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Start Learning Path
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {showVideoPlayer && selectedChapter && (
          <VideoPlayer
            chapter={selectedChapter}
            currentVideoIndex={currentVideoIndex}
            onClose={() => setShowVideoPlayer(false)}
            onVideoComplete={(index) => {
              if (index < selectedChapter.videos.length - 1) {
                setCurrentVideoIndex(index + 1);
              } else if (selectedChapter.quiz) {
                setShowVideoPlayer(false);
                setShowQuiz(true);
              }
            }}
            onVideoChange={setCurrentVideoIndex}
          />
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && selectedChapter?.quiz && (
          <ChapterQuizModal
            quiz={selectedChapter.quiz}
            onClose={() => setShowQuiz(false)}
            onComplete={() => {
              setShowQuiz(false);
              loadLearningPath();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
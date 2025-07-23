// src/pages/learningpaths/LearningPathDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle, 
  Lock, 
  ChevronRight,
  Clock,
  ChevronLeft,
  PlayCircle,
  Award,
  Brain,
  Users,
  BookOpen
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
    if (chapter.is_locked) return;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Learning Path Not Found</h2>
          <Button onClick={() => navigate('/learning-paths')}>
            Back to Learning Paths
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/learning-paths')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Learning Paths
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {learningPath.subject.name}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {learningPath.class_level.name}
                </span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {learningPath.title}
              </h1>
              <p className="text-gray-600 mb-6">
                {learningPath.description}
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{learningPath.total_chapters} chapters</span>
                </div>
                <div className="flex items-center gap-1">
                  <PlayCircle className="w-4 h-4" />
                  <span>{learningPath.total_videos} videos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{learningPath.estimated_hours} hours</span>
                </div>
                <div className="flex items-center gap-1">
                  <Brain className="w-4 h-4" />
                  <span>{learningPath.total_quiz_questions} questions</span>
                </div>
              </div>

              {/* Action Button */}
              {!learningPath.user_progress ? (
                <Button
                  onClick={handleStartPath}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Learning Path
                </Button>
              ) : (
                learningPath.user_progress.progress_percentage === 100 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Award className="w-5 h-5" />
                    <span className="font-semibold">Completed!</span>
                  </div>
                ) : null
              )}
            </div>

            {/* Progress Card */}
            <div className="lg:col-span-1">
              {learningPath.user_progress && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>
                  
                  {/* Circular Progress */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - learningPath.user_progress.progress_percentage / 100)}`}
                          className="text-indigo-600 transition-all duration-300"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">
                          {learningPath.user_progress.progress_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chapters Completed</span>
                      <span className="font-medium">
                        {learningPath.user_progress.completed_chapters}/{learningPath.total_chapters}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Started</span>
                      <span className="font-medium">
                        {new Date(learningPath.user_progress.started_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Content</h2>
        
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {learningPath.path_chapters.map((chapter, index) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              index={index}
              onClick={() => handleChapterClick(chapter)}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
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

// Compact Chapter Item Component
const ChapterItem: React.FC<{
  chapter: PathChapter;
  index: number;
  onClick: () => void;
}> = ({ chapter, index, onClick }) => {
  const isCompleted = chapter.user_progress?.is_completed;
  const isLocked = chapter.is_locked;
  const progress = chapter.user_progress?.progress_percentage || 0;

  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      className={`p-4 hover:bg-gray-50 transition-colors ${
        isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : isLocked ? (
              <Lock className="w-6 h-6 text-gray-400" />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-indigo-600 flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
              </div>
            )}
          </div>

          {/* Chapter Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 mb-1">
              {chapter.title}
            </h3>
            {chapter.description && (
              <p className="text-sm text-gray-600 mb-2">
                {chapter.description}
              </p>
            )}
            
            {/* Meta Info */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <PlayCircle className="w-3 h-3" />
                <span>{chapter.total_videos} videos</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{Math.floor(chapter.estimated_minutes / 60)}h {chapter.estimated_minutes % 60}m</span>
              </div>
              {chapter.quiz && (
                <div className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  <span>Quiz</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {chapter.user_progress && progress > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        {!isLocked && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );
};
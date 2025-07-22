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
  BookOpen,
  FileText,
  ChevronLeft,
  Edit,
  Plus,
  Trophy,
  Target,
  Star,
  Zap,
  Calendar,
  Users,
  BarChart,
  Award
} from 'lucide-react';
import { getLearningPath, startLearningPath, startChapter } from '@/lib/api/learningpathApi';
import { LearningPath, PathChapter } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/learningpath/VideoPlayer';
import { ChapterQuizModal } from '@/components/learningpath/ChapterQuizModal';
import { ProgressTracker } from '@/components/learningpath/ProgressTracker';

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
  const [activeView, setActiveView] = useState<'timeline' | 'list'>('timeline');

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'in-progress':
        return <Play className="w-6 h-6 text-yellow-500" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Learning Path Not Found</h2>
          <p className="text-gray-500 mb-6">The learning path you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/learning-paths')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Learning Paths
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          {/* Navigation */}
          <button
            onClick={() => navigate('/learning-paths')}
            className="flex items-center text-white/80 hover:text-white mb-8 transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Learning Paths
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                    {learningPath.subject.name}
                  </span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                    {learningPath.class_level.name}
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{learningPath.title}</h1>
                <p className="text-xl text-white/90 mb-8">{learningPath.description}</p>
                
                <div className="flex flex-wrap items-center gap-6 text-sm">
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
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <span>{learningPath.total_quiz_questions} Quiz Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>{learningPath.total_enrolled || 0} Students</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mt-8">
                  {!learningPath.user_progress ? (
                    <Button
                      onClick={handleStartPath}
                      size="lg"
                      className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Start Learning Journey
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Continue Learning
                    </Button>
                  )}
                  
                  {user?.is_superuser && (
                    <>
                      <Button
                        onClick={() => navigate(`/learning-paths/${id}/edit`)}
                        className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/30"
                        size="lg"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => navigate(`/learning-paths/${id}/chapters/create`)}
                        className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/30"
                        size="lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Chapter
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Progress Card */}
            <div className="lg:col-span-1">
              {learningPath.user_progress ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Your Progress
                  </h3>
                  
                  {/* Circular Progress */}
                  <div className="flex justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="white"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - learningPath.user_progress.progress_percentage / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">
                          {learningPath.user_progress.progress_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Completed</span>
                      <span className="font-medium">
                        {learningPath.user_progress.completed_chapters}/{learningPath.total_chapters} chapters
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Started</span>
                      <span className="font-medium">
                        {new Date(learningPath.user_progress.started_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center"
                >
                  <Star className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Begin?</h3>
                  <p className="text-white/80 text-sm">
                    Start your learning journey and track your progress here
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* View Toggle */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Course Content</h2>
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeView === 'timeline' 
                  ? 'bg-white text-indigo-600 shadow-md' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Timeline View
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeView === 'list' 
                  ? 'bg-white text-indigo-600 shadow-md' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Progress Tracker Component */}
        {learningPath.user_progress && (
          <div className="mb-12">
            <ProgressTracker
              totalChapters={learningPath.total_chapters}
              completedChapters={learningPath.user_progress.completed_chapters}
              currentStreak={0} // You'll need to add this to your API
              totalTimeSpent={0} // You'll need to add this to your API
              averageQuizScore={0} // You'll need to add this to your API
            />
          </div>
        )}

        {/* Chapters Display */}
        {activeView === 'timeline' ? (
          <TimelineView 
            chapters={learningPath.path_chapters}
            onChapterClick={handleChapterClick}
            getChapterStatus={getChapterStatus}
          />
        ) : (
          <ListView
            chapters={learningPath.path_chapters}
            onChapterClick={handleChapterClick}
            getChapterStatus={getChapterStatus}
          />
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

// Timeline View Component
const TimelineView: React.FC<{
  chapters: PathChapter[];
  onChapterClick: (chapter: PathChapter) => void;
  getChapterStatus: (chapter: PathChapter) => string;
}> = ({ chapters, onChapterClick, getChapterStatus }) => {
  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 z-0" />

      {/* Chapters */}
      <div className="relative z-10 space-y-24">
        {chapters.map((chapter, index) => {
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
              <div className={`w-1/2 ${isLeft ? 'pr-16' : 'pl-16'}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onChapterClick(chapter)}
                  className={`bg-white rounded-2xl shadow-xl p-6 cursor-pointer transition-all border-2 ${
                    status === 'locked' 
                      ? 'border-gray-200 opacity-60 cursor-not-allowed' 
                      : status === 'completed'
                      ? 'border-green-500 hover:shadow-2xl'
                      : status === 'in-progress'
                      ? 'border-yellow-500 hover:shadow-2xl'
                      : 'border-transparent hover:shadow-2xl hover:border-indigo-200'
                  }`}
                >
                  {/* Chapter Number Badge */}
                  <div className={`absolute ${isLeft ? '-right-8' : '-left-8'} top-1/2 transform -translate-y-1/2 z-20`}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                        status === 'completed' 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' 
                          : status === 'in-progress'
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                          : status === 'locked'
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : status === 'locked' ? (
                        <Lock className="w-6 h-6" />
                      ) : (
                        <span className="text-xl font-bold">{index + 1}</span>
                      )}
                    </motion.div>
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

                  {/* Chapter Meta */}
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
                        <span>Quiz: {chapter.total_quiz_questions} questions</span>
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
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${chapter.user_progress.progress_percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
                          className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Achievements */}
                  {status === 'completed' && chapter.user_progress?.quiz_score && (
                    <div className="mt-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-gray-700">
                        Quiz Score: {chapter.user_progress.quiz_score}%
                      </span>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// List View Component
const ListView: React.FC<{
  chapters: PathChapter[];
  onChapterClick: (chapter: PathChapter) => void;
  getChapterStatus: (chapter: PathChapter) => string;
}> = ({ chapters, onChapterClick, getChapterStatus }) => {
  return (
    <div className="space-y-4">
      {chapters.map((chapter, index) => {
        const status = getChapterStatus(chapter);
        
        return (
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onChapterClick(chapter)}
            className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer ${
              status === 'locked' ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <div className="p-6">
              <div className="flex items-center gap-6">
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${
                  status === 'completed' 
                    ? 'bg-green-100' 
                    : status === 'in-progress'
                    ? 'bg-yellow-100'
                    : status === 'locked'
                    ? 'bg-gray-100'
                    : 'bg-indigo-100'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : status === 'in-progress' ? (
                    <Play className="w-7 h-7 text-yellow-600" />
                    // src/pages/learningpaths/LearningPathDetail.tsx (ListView continued)
                  ) : status === 'locked' ? (
                    <Lock className="w-6 h-6 text-gray-400" />
                  ) : (
                    <div className="text-lg font-bold text-indigo-600">{index + 1}</div>
                  )}
                </div>

                {/* Chapter Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {chapter.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {chapter.description}
                      </p>
                    </div>
                    <ChevronRight className={`w-6 h-6 flex-shrink-0 transition-transform ${
                      status === 'locked' ? 'text-gray-300' : 'text-gray-400 group-hover:translate-x-1'
                    }`} />
                  </div>

                  {/* Chapter Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-3">
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
                        <span>Quiz ({chapter.total_quiz_questions} questions)</span>
                      </div>
                    )}
                    {chapter.user_progress?.quiz_score && (
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-600 font-medium">
                          Score: {chapter.user_progress.quiz_score}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {chapter.user_progress && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${chapter.user_progress.progress_percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
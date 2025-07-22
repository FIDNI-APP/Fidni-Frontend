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
  Edit,
  Plus,
  Trophy,
  Award,
  Map,
  Flag,
  PlayCircle,
  AlertCircle,
  Sparkles,
  Video,
  Brain,
  Activity
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
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null);

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
    return 'not-started';
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!learningPath) {
    return <NotFoundState onBack={() => navigate('/learning-paths')} />;
  }

  const currentChapterIndex = learningPath.path_chapters.findIndex(
    ch => ch.user_progress && !ch.user_progress.is_completed
  );
  const nextChapter = currentChapterIndex >= 0 ? learningPath.path_chapters[currentChapterIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.08%22%3E%3Cpath d=%22M0 40L40 0H20L0 20M40 40V20L20 40%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          {/* Navigation */}
          <button
            onClick={() => navigate('/learning-paths')}
            className="flex items-center text-white/80 hover:text-white mb-6 transition-colors group"
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
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                    {learningPath.subject.name}
                  </span>
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                    {learningPath.class_level.name}
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{learningPath.title}</h1>
                <p className="text-xl text-blue-100 mb-6">{learningPath.description}</p>
                
                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm mb-8">
                  <div className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-blue-200" />
                    <span>{learningPath.total_chapters} Checkpoints</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-200" />
                    <span>{learningPath.total_videos} Videos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-200" />
                    <span>{learningPath.estimated_hours} Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-200" />
                    <span>{learningPath.total_quiz_questions} Quiz Questions</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  {!learningPath.user_progress ? (
                    <Button
                      onClick={handleStartPath}
                      size="lg"
                      className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all"
                    >
                      <Flag className="w-5 h-5 mr-2" />
                      Start Your Journey
                    </Button>
                  ) : nextChapter ? (
                    <Button
                      size="lg"
                      onClick={() => handleChapterClick(nextChapter)}
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-xl transform hover:scale-105 transition-all"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Continue: {nextChapter.title}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg">
                      <Trophy className="w-5 h-5" />
                      <span className="font-semibold">Path Completed!</span>
                    </div>
                  )}
                  
                  {user?.is_superuser && (
                    <>
                      <Button
                        onClick={() => navigate(`/learning-paths/${id}/edit`)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                        size="lg"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => navigate(`/learning-paths/${id}/chapters/create`)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
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

            {/* Progress Overview Card */}
            <div className="lg:col-span-1">
              {learningPath.user_progress ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20"
                >
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Your Progress
                  </h3>
                  
                  {/* Circular Progress */}
                  <div className="flex justify-center mb-6">
                    <div className="relative w-40 h-40">
                      <svg className="w-40 h-40 transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="url(#progressGradient)"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 70}`}
                          strokeDashoffset={`${2 * Math.PI * 70 * (1 - learningPath.user_progress.progress_percentage / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FBBF24" />
                            <stop offset="100%" stopColor="#F97316" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">
                          {learningPath.user_progress.progress_percentage}%
                        </span>
                        <span className="text-sm text-blue-100">Complete</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                      <span className="text-blue-100">Checkpoints</span>
                      <span className="font-medium">
                        {learningPath.user_progress.completed_chapters}/{learningPath.total_chapters}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                      <span className="text-blue-100">Started</span>
                      <span className="font-medium">
                        {new Date(learningPath.user_progress.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    {learningPath.user_progress.progress_percentage === 100 && (
                      <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                        <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="font-semibold">Congratulations!</p>
                        <p className="text-sm text-blue-100">You've mastered this path!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 text-center"
                >
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Begin?</h3>
                  <p className="text-blue-100 text-sm mb-4">
                    Start your learning journey and track your progress here
                  </p>
                  <div className="flex justify-center gap-4 text-5xl">
                    <span role="img" aria-label="rocket">🚀</span>
                    <span role="img" aria-label="brain">🧠</span>
                    <span role="img" aria-label="trophy">🏆</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Roadmap */}
      <div className="container mx-auto px-4 py-12">
        {/* Progress Tracker Component */}
        {learningPath.user_progress && (
          <div className="mb-12">
            <ProgressTracker
              totalChapters={learningPath.total_chapters}
              completedChapters={learningPath.user_progress.completed_chapters}
              currentStreak={0}
              totalTimeSpent={0}
              averageQuizScore={0}
            />
          </div>
        )}

        {/* Roadmap Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Learning Roadmap</h2>
          <p className="text-gray-600">Follow the path from start to finish to master this subject</p>
        </div>

        {/* Roadmap Visualization */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 z-0" />

          {/* Chapters as Checkpoints */}
          <div className="relative z-10 space-y-12">
            {learningPath.path_chapters.map((chapter, index) => {
              const status = getChapterStatus(chapter);
              const isLeft = index % 2 === 0;
              const isHovered = hoveredChapter === chapter.id;

              return (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center ${isLeft ? 'justify-start' : 'justify-end'}`}
                  onMouseEnter={() => setHoveredChapter(chapter.id)}
                  onMouseLeave={() => setHoveredChapter(null)}
                >
                  {/* Chapter Card */}
                  <motion.div 
                    className={`w-full md:w-1/2 ${isLeft ? 'pr-0 md:pr-20' : 'pl-0 md:pl-20'}`}
                    animate={{ scale: isHovered ? 1.02 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      onClick={() => handleChapterClick(chapter)}
                      className={`relative bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all border-2 ${
                        status === 'locked' 
                          ? 'border-gray-200 opacity-60 cursor-not-allowed' 
                          : status === 'completed'
                          ? 'border-green-500 hover:shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50'
                          : 'border-transparent hover:shadow-2xl hover:border-indigo-300'
                      }`}
                    >
                      {/* Checkpoint Number/Icon - Positioned on the line */}
                      <div className={`absolute ${isLeft ? '-right-10' : '-left-10'} top-1/2 transform -translate-y-1/2 z-20`}>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl border-4 border-white ${
                            status === 'completed' 
                              ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white' 
                              : status === 'locked'
                              ? 'bg-gray-300 text-gray-500'
                              : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:shadow-2xl'
                          }`}
                        >
                          {status === 'completed' ? (
                            <CheckCircle className="w-10 h-10" />
                          ) : status === 'locked' ? (
                            <Lock className="w-8 h-8" />
                          ) : (
                            <span className="text-2xl font-bold">{index + 1}</span>
                          )}
                        </motion.div>
                      </div>

                      {/* Chapter Content */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                            {chapter.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {chapter.description}
                          </p>
                        </div>
                        {status !== 'locked' && (
                          <ChevronRight className={`w-6 h-6 flex-shrink-0 transition-transform ml-4 ${
                            isHovered ? 'translate-x-1 text-indigo-600' : 'text-gray-400'
                          }`} />
                        )}
                      </div>

                      {/* Chapter Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <PlayCircle className="w-4 h-4" />
                          <span>{chapter.total_videos} videos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(chapter.estimated_minutes / 60)}h {chapter.estimated_minutes % 60}m</span>
                        </div>
                        {chapter.quiz && (
                          <div className="flex items-center gap-1">
                            <Brain className="w-4 h-4" />
                            <span>Quiz ({chapter.total_quiz_questions} questions)</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {chapter.user_progress && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Chapter Progress</span>
                            <span className="font-medium">
                              {chapter.user_progress.progress_percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${chapter.user_progress.progress_percentage}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className={`h-2 bg-gradient-to-r ${
                                chapter.user_progress.is_completed
                                  ? 'from-green-500 to-emerald-600'
                                  : 'from-yellow-400 to-orange-500'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Quiz Score Badge */}
                      {status === 'completed' && chapter.user_progress?.quiz_score && (
                        <div className="mt-4 flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700">Quiz Score</span>
                          </div>
                          <span className="text-lg font-bold text-indigo-600">
                            {chapter.user_progress.quiz_score}%
                          </span>
                        </div>
                      )}

                      {/* Action Button */}
                      {status !== 'locked' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: isHovered ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4"
                        >
                          <Button 
                            className={`w-full ${
                              status === 'completed'
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                            } text-white`}
                          >
                            {status === 'completed' ? (
                              <>
                                <Award className="w-4 h-4 mr-2" />
                                Review Chapter
                              </>
                            ) : (
                              <>
                                <Flag className="w-4 h-4 mr-2" />
                                Start Chapter
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}

            {/* Finish Line */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: learningPath.path_chapters.length * 0.1 }}
              className="flex justify-center mt-12"
            >
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-3xl p-8 text-center shadow-2xl max-w-md">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-2xl font-bold mb-2">Journey Complete!</h3>
                <p className="text-indigo-100">
                  Master all checkpoints to earn your achievement badge
                </p>
              </div>
            </motion.div>
          </div>
        </div>
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

// Loading State Component
const LoadingState: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"
      />
      <h3 className="text-xl font-semibold text-gray-700">Loading your learning path...</h3>
    </motion.div>
  </div>
);

// Not Found State Component
const NotFoundState: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-16 h-16 text-gray-400" />
      </div>
      <h2 className="text-3xl font-semibold text-gray-700 mb-2">Learning Path Not Found</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        The learning path you're looking for doesn't exist or has been removed.
      </p>
      <Button onClick={onBack} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Learning Paths
      </Button>
    </motion.div>
  </div>
);